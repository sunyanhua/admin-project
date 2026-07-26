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
  // POST /admin/v1/login/pass
  // Body: { old_password, new_password }
  changePassword: (data: { old_password: string; new_password: string }) => {
    return request.post('/admin/v1/login/pass', data);
  },

  // 管理员Token续期
  // POST /admin/v1/login/refresh
  // Body: { refresh_token }
  // Response: { code: 0, data: { access_token, refresh_token } }
  refreshToken: (data: { refresh_token: string }) => {
    return request.post('/admin/v1/login/refresh', data);
  },

  // 获取登录日志列表 (我的日志)
  // GET /admin/v1/logs/my?page={page}&page_size={page_size}&keyword={keyword}
  getMyLogs: (params: { page?: number; page_size?: number; keyword?: string }) => {
    return request.get('/admin/v1/logs/my', { params });
  },
};
