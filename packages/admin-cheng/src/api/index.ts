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
const CREDENTIALS_KEY = prefixed('admin_credentials');

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

// ====== 凭据存储（用于无 refresh 接口时自动重新登录） ======

function encodeCredentials(username: string, password: string): string {
  return btoa(`${username}:${password}`);
}

function decodeCredentials(encoded: string): { username: string; password: string } | null {
  try {
    const decoded = atob(encoded);
    const idx = decoded.indexOf(':');
    if (idx <= 0) return null;
    return { username: decoded.substring(0, idx), password: decoded.substring(idx + 1) };
  } catch { return null; }
}

export function storeCredentials(username: string, password: string) {
  localStorage.setItem(CREDENTIALS_KEY, encodeCredentials(username, password));
}

export function getStoredCredentials(): { username: string; password: string } | null {
  const encoded = localStorage.getItem(CREDENTIALS_KEY);
  return encoded ? decodeCredentials(encoded) : null;
}

export function clearCredentials() {
  localStorage.removeItem(CREDENTIALS_KEY);
}

// ====== 自动重新登录（替代不存在的 refresh 接口） ======

let relayinTimer: ReturnType<typeof setTimeout> | null = null;

async function tryReloginOnce(): Promise<string | null> {
  const creds = getStoredCredentials();
  if (!creds) return null;
  try {
    const res = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL || ''}/admin/v1/login`,
      { username: creds.username, password: creds.password },
      { headers: { 'Content-Type': 'application/json' } },
    );
    if (res.data?.code === 0 && res.data?.data?.access_token) {
      const { access_token, expires_at } = res.data.data;
      const expiresIn = expires_at ? Math.max(0, expires_at - Math.floor(Date.now() / 1000)) : 43200;
      setTokens(access_token, '', expiresIn);
      scheduleRelogin();
      return access_token;
    }
  } catch { /* ignore */ }
  return null;
}

/** 重新登录：瞬时故障（网络抖动/限流）延迟 2s 重试一次 */
async function doRelogin(): Promise<string | null> {
  const token = await tryReloginOnce();
  if (token) return token;
  await new Promise((r) => setTimeout(r, 2000));
  return tryReloginOnce();
}

export function scheduleRelogin() {
  if (relayinTimer) clearTimeout(relayinTimer);
  const expiry = getTokenExpiry();
  if (!expiry) return;
  const delay = Math.max(0, expiry - Date.now());
  if (delay <= 0) return;
  relayinTimer = setTimeout(() => doRelogin(), delay);
}

export function cancelReloginScheduler() {
  if (relayinTimer) { clearTimeout(relayinTimer); relayinTimer = null; }
}

// 初始化时恢复调度
(function () {
  if (getAccessToken()) scheduleRelogin();
})();

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let isRelogging = false;
let reloginSubscribers: ((token: string) => void)[] = [];

function onReloginSuccess(token: string) {
  reloginSubscribers.forEach(cb => cb(token));
  reloginSubscribers = [];
}

function addReloginSubscriber(cb: (token: string) => void) {
  reloginSubscribers.push(cb);
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

    // 401 → 用存储的凭据重新登录获取新 token（无 refresh 接口的替代方案）
    if (error.response?.status === 401) {
      if (originalRequest._retry) {
        // 已重试过一次仍 401（如多端登录互踢）→ 再完整重登一轮，成功则重试原请求
        const secondToken = await doRelogin();
        if (secondToken) {
          originalRequest.headers.Authorization = `Bearer ${secondToken}`;
          return instance(originalRequest);
        }
      } else if (!isRelogging) {
        originalRequest._retry = true;
        isRelogging = true;
        const newToken = await doRelogin();
        isRelogging = false;
        if (newToken) {
          onReloginSuccess(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        }
        reloginSubscribers = [];
      } else {
        return new Promise((resolve) => {
          addReloginSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(instance(originalRequest));
          });
        });
      }

      // 重新登录失败 → 退回登录页
      cancelReloginScheduler();
      clearTokens();
      clearCredentials();
      localStorage.removeItem(ADMIN_USER_KEY);
      window.location.href = window.location.pathname + '#/login';
      return Promise.reject(error);
    }

    // 其他 HTTP 错误统一 reject
    return Promise.reject(error);
  },
);

export default instance;
