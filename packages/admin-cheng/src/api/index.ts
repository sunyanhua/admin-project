import axios from 'axios';

// 全局消息处理（由 App 组件注入，解决 antd v5 静态方法无法消费 Context 的警告）
let showError: (msg: string) => void = (msg) => {
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

// ====== Token 自动刷新（POST /admin/v1/login/refresh：用当前有效 Token 换全新 Token） ======

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** 单次刷新：当前 Bearer Token → 新 Token；失败返回 null（Token 失效）或 ''（网络故障，可稍后重试） */
async function tryRefreshOnce(): Promise<string | null | ''> {
  const current = getAccessToken();
  if (!current) return null;
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || ''}/admin/v1/login/refresh`,
      null,
      { headers: { Authorization: `Bearer ${current}` } },
    );
    if (res.data?.code === 0 && res.data?.data?.access_token) {
      const { access_token, expires_at } = res.data.data;
      const expiresIn = expires_at ? Math.max(0, expires_at - Math.floor(Date.now() / 1000)) : 43200;
      setTokens(access_token, '', expiresIn);
      scheduleTokenRefresh();
      return access_token;
    }
  } catch (err: any) {
    // 无响应 = 网络故障（部署重启/抖动），不是 Token 失效
    if (!err?.response) return '';
  }
  return null;
}

/**
 * 刷新：瞬时网络故障延迟 2s 重试一次。
 * 返回 { token } 成功；{ network: true } 网络故障（会话保留，稍后可重试）；否则 Token 确已失效。
 */
async function doRefresh(): Promise<{ token: string | null; network: boolean }> {
  let t = await tryRefreshOnce();
  if (t) return { token: t, network: false };
  if (t === '') {
    await new Promise((r) => setTimeout(r, 2000));
    t = await tryRefreshOnce();
    if (t) return { token: t, network: false };
    if (t === '') return { token: null, network: true };
  }
  return { token: null, network: false };
}

/** 到期前自动刷新（存储的到期时间已提前 5 分钟），保证活跃会话永不掉线 */
export function scheduleTokenRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  const expiry = getTokenExpiry();
  if (!expiry) return;
  const delay = Math.max(0, expiry - Date.now());
  const onResult = (r: { token: string | null; network: boolean }) => {
    // 网络故障不判定失效：10 秒后重试（部署重启/抖动场景不掉线）
    if (r.network) {
      refreshTimer = setTimeout(() => scheduleTokenRefresh(), 10000);
    }
  };
  if (delay <= 0) {
    // 已到提前刷新点：立即刷新兜底（失败交由 401 拦截器处理）
    doRefresh().then(onResult);
    return;
  }
  refreshTimer = setTimeout(() => { doRefresh().then(onResult); }, delay);
}

// 浏览器节流/休眠恢复后重同步：标签页重新可见、窗口聚焦、网络恢复时重新校准刷新时机
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleTokenRefresh();
  });
  window.addEventListener('focus', scheduleTokenRefresh);
  window.addEventListener('online', scheduleTokenRefresh);
}

export function cancelTokenRefreshScheduler() {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
}

// 初始化时恢复调度
(function () {
  if (getAccessToken()) scheduleTokenRefresh();
})();

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshSuccess(token: string) {
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
      if (data.code === 0) {
        if (data.pagination) return { list: data.data, total: data.pagination.total, pagination: data.pagination };
        return data.data;
      }
      return Promise.reject({ response: { data: { message: data.message || '请求失败' } } });
    }
    if (data.data !== undefined) return data.data;
    return data;
  },
  async (error) => {
    const originalRequest = error.config;

    // 401 → 用当前 Token 调 refresh 换新 Token 后重试（多客户端互不影响）
    if (error.response?.status === 401) {
      if (originalRequest._retry) {
        // 已重试过一次仍 401 → 再完整刷新一轮，成功则重试原请求
        const second = await doRefresh();
        if (second.token) {
          originalRequest.headers.Authorization = `Bearer ${second.token}`;
          return instance(originalRequest);
        }
        // 网络故障（部署重启/抖动）：保留会话，仅让本次请求失败
        if (second.network) return Promise.reject(error);
      } else if (!isRefreshing) {
        originalRequest._retry = true;
        isRefreshing = true;
        const res = await doRefresh();
        isRefreshing = false;
        if (res.token) {
          onRefreshSuccess(res.token);
          originalRequest.headers.Authorization = `Bearer ${res.token}`;
          return instance(originalRequest);
        }
        refreshSubscribers = [];
        // 网络故障（部署重启/抖动）：保留会话，仅让本次请求失败
        if (res.network) return Promise.reject(error);
      } else {
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(instance(originalRequest));
          });
        });
      }

      // 刷新失败（Token 已过期或账号停用/改密）→ 会话失效，退回登录页
      cancelTokenRefreshScheduler();
      clearTokens();
      localStorage.removeItem(ADMIN_USER_KEY);
      window.location.href = window.location.pathname + '#/login';
      return Promise.reject(error);
    }

    // 其他 HTTP 错误统一 reject
    return Promise.reject(error);
  },
);

export default instance;
