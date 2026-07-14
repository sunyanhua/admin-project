import axios from 'axios';
import { notification } from 'antd';

// 创建axios实例
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // 允许携带凭证（Cookie）
  withCredentials: true,
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const { data } = response;

    // 检查多种可能的响应格式
    // 格式1: { code: 0, data: ..., msg: ... } - 文档规范
    // 格式2: { status: 200, data: ..., error: ... } - 实际返回

    // 格式1处理
    if (data.code !== undefined) {
      if (data.code === 0) {
        // 检查data是否为false
        if (data.data === false) {
          return Promise.reject({ response: { data: { msg: '权限校验失败，请检查密码和登录状态' } } });
        }
        return data.data;
      } else {
        return Promise.reject({ response: { data: { msg: data.msg || '请求失败' } } });
      }
    }

    // 格式2处理 (后台管理接口标准格式)
    if (data.status !== undefined) {
      if (data.status === 200 && data.error === null) {
        // 成功响应，返回data字段的业务数据
        // 检查data是否为false
        if (data.data === false) {
          return Promise.reject({ response: { data: { msg: '权限校验失败，请检查密码和登录状态' } } });
        }
        return data.data;
      } else if (data.status !== 200) {
        return Promise.reject({ response: { data: { error: data.error || '请求失败' } } });
      } else if (data.error !== null) {
        return Promise.reject({ response: { data: { error: data.error || '请求失败' } } });
      }
    }

    // 未知格式，直接返回
    return data;
  },
  (error) => {
    // 统一处理错误
    if (error.response) {
      const { data, status } = error.response;
      switch (status) {
        case 401:
          notification.error({ message: '未授权，请重新登录', placement: 'top' });
          localStorage.removeItem('admin_user');
          window.location.href = '/#/login';
          break;
        case 403:
          notification.error({ message: '权限不足', placement: 'top' });
          break;
        case 404:
          notification.error({ message: '请求的资源不存在', placement: 'top' });
          break;
        case 500:
          notification.error({ message: '服务器错误', placement: 'top' });
          break;
        default:
          notification.error({ message: data?.msg || data?.error || `请求失败 (${status})`, placement: 'top' });
      }
    } else if (error.request) {
      notification.error({ message: '网络错误，请检查网络连接或服务器地址', placement: 'top' });
    } else {
      notification.error({ message: '请求配置错误: ' + error.message, placement: 'top' });
    }
    return Promise.reject(error);
  }
);

export default instance;
