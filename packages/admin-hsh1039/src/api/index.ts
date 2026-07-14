import axios from 'axios';

// 全局消息处理（由 App 组件注入，解决 antd v5 静态方法无法消费 Context 的警告）
let showError: (msg: string) => void = (msg) => {
  // 兜底：如果 App 还未挂载，直接用 alert
  console.error(msg);
};

export function setGlobalErrorHandler(fn: (msg: string) => void) {
  showError = fn;
}

// Token 存储 key
const ACCESS_TOKEN_KEY = 'admin_access_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY);
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

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
            const { token: newToken } = refreshResponse.data.data;
            setTokens(newToken, '');
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
      localStorage.removeItem('admin_user');
      window.location.href = '/#/login';
      return Promise.reject(error);
    }

    // HTTP 错误统一 reject，不做 UI 提示（由调用方自行处理，避免重复弹窗）
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        clearTokens();
        localStorage.removeItem('admin_user');
        window.location.href = '/#/login';
      }
    }
    return Promise.reject(error);
  },
);

export default instance;
