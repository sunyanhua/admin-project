import request, { setTokens } from '..';

// 认证相关API（BizMall 接口）
export const authApi = {
  // 管理员登录
  // POST /admin/v1/login
  // Body: { username, password }
  // Response: { code: 0, data: { access_token, refresh_token, user, menu, page } }
  login: (data: { username: string; password: string }) => {
    return request.post('/admin/v1/login', data);
  },

  // 退出登录
  // POST /admin/v1/logout
  logout: () => {
    return request.post('/admin/v1/logout');
  },

  // 获取当前管理员登录状态
  // GET /admin/v1/login
  getLoginStatus: () => {
    return request.get('/admin/v1/login');
  },

  // 修改密码
  // PUT /admin/v1/login/change-password
  // Body: { old_password, new_password }
  changePassword: (data: { old_password: string; new_password: string }) => {
    return request.put('/admin/v1/login/change-password', data);
  },

  // 管理员Token续期
  // POST /admin/v1/login/refresh
  // Body: { refresh_token }
  // Response: { code: 0, data: { access_token, refresh_token } }
  refreshToken: (data: { refresh_token: string }) => {
    return request.post('/admin/v1/login/refresh', data);
  },

  // 获取我的操作日志
  // GET /admin/v1/login/logs?page={page}&size={size}
  getMyLogs: (params: { page?: number; size?: number; keyword?: string }) => {
    return request.get('/admin/v1/login/logs', { params });
  },
};
