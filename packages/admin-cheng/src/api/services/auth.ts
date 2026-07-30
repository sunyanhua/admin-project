import request from '..';
import type { AdminLoginRequest, AdminLoginResponse, AdminChangePasswordRequest, AdminProfileResponse } from '../types/auth';

// 认证相关API（BizMall 接口）
export const authApi = {
  // 管理员登录 — POST /admin/v1/login
  login: (data: AdminLoginRequest): Promise<AdminLoginResponse> => {
    return request.post('/admin/v1/login', data);
  },

  // 退出登录 — POST /admin/v1/logout
  logout: () => {
    return request.post('/admin/v1/logout');
  },

  // 修改密码 — PUT /admin/v1/login/change-password
  changePassword: (data: AdminChangePasswordRequest) => {
    return request.put('/admin/v1/login/change-password', data);
  },

  // 管理员 Token 续期 — POST /admin/v1/login/refresh
  refreshToken: (data: { refresh_token: string }) => {
    return request.post('/admin/v1/login/refresh', data);
  },

  // 我的操作日志 — GET /admin/v1/login/logs
  getMyLogs: (params: { page?: number; size?: number; keyword?: string }) => {
    return request.get('/admin/v1/login/logs', { params });
  },

  // 当前管理员信息 — GET /admin/v1/login/profile
  getProfile: (): Promise<AdminProfileResponse> => {
    return request.get('/admin/v1/login/profile');
  },
};
