import axios from 'axios';

// 全局消息处理（由 App 组件注入，解决 antd v5 静态方法无法消费 Context 的警告）
let showError: (msg: string) => void = (msg) => {
  // 兜底：如果 App 还未挂载，直接用 alert
  console.error(msg);
};

export function setGlobalErrorHandler(fn: (msg: string) => void) {
  showError = fn;
}

// 项目标识（区分多项目部署在同一域名的场景）
const PROJECT_ID = import.meta.env.VITE_PROJECT_ID || '';

// 带项目前缀的 localStorage key
const prefixed = (key: string) => PROJECT_ID ? `${PROJECT_ID}_${key}` : key;

export const ADMIN_USER_KEY = prefixed('admin_user');

// Token 存储 key
const ACCESS_TOKEN_KEY = prefixed('admin_access_token');
const TOKEN_EXPIRY_KEY = prefixed('admin_token_expiry');

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getTokenExpiry = (): number => {
  const v = localStorage.getItem(TOKEN_EXPIRY_KEY);
  return v ? Number(v) : 0;
};

export const setTokens = (access: string, refresh: string, expiresIn?: number) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (expiresIn && expiresIn > 0) {
    // 记录到期时间戳（提前 5 分钟，保守刷新）
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + (expiresIn - 300) * 1000));
  }
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

// ====== 主动刷新调度 ======
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  const expiry = getTokenExpiry();
  if (!expiry) return;
  const delay = expiry - Date.now();
  if (delay <= 0) return; // 已经过期，等自然 401 触发刷新
  // 在到期时间点自动刷新
  refreshTimer = setTimeout(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || ''}/admin/v1/login/refresh`,
        null,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      );
      if (res.data?.code === 0 && res.data?.data?.token) {
        const { token: newToken } = res.data.data;
        setTokens(newToken, '', 7200); // 刷新成功后重新调度
        scheduleRefresh();
      }
    } catch { /* 刷新失败不处理，自然 401 会触发重新登录 */ }
  }, delay);
}

export function cancelRefreshScheduler() {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
}

// 初始化时恢复调度
(function () {
  if (getAccessToken()) scheduleRefresh();
})();

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

instance.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  },
);

instance.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (data.code !== undefined) {
      if (data.code === 0) return data.data;
      return Promise.reject({ response: { data: { message: data.message || '请求失败' } } });
    }
    if (data.data !== undefined) return data.data;
    return data;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 → 尝试刷新 Token（文档：POST /admin/v1/login/refresh，需 AdminAuth，无 body）
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (!isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;
        try {
          const oldToken = getAccessToken();
          const refreshResponse = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || ''}/admin/v1/login/refresh`,
            null,
            {
              headers: {
                'Content-Type': 'application/json',
                ...(oldToken ? { Authorization: `Bearer ${oldToken}` } : {}),
              },
            },
          );
          if (refreshResponse.data?.code === 0 && refreshResponse.data?.data?.token) {
            const { token: newToken, expires_in } = refreshResponse.data.data;
            setTokens(newToken, '', expires_in || 7200);
            isRefreshing = false;
            onTokenRefreshed(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          }
        } catch {
          isRefreshing = false;
          refreshSubscribers = [];
        }
      } else {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(instance(originalRequest));
          });
        });
      }

      // 刷新失败 → 退回登录
      clearTokens();
      localStorage.removeItem(ADMIN_USER_KEY);
      window.location.href = '/#/login';
      return Promise.reject(error);
    }

    // HTTP 错误统一 reject，不做 UI 提示（由调用方自行处理，避免重复弹窗）
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        clearTokens();
        localStorage.removeItem(ADMIN_USER_KEY);
        window.location.href = '/#/login';
      }
    }
    return Promise.reject(error);
  },
);

export default instance;
