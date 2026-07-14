import request from '..';

// 认证相关API
export const authApi = {
  // 登录
  login: (data: { name: string; pass: string }) => {
    return request.post('/admin/login', data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      transformRequest: [(data) => {
        const params = new URLSearchParams();
        params.append('name', data.name);
        params.append('pass', data.pass);
        return params.toString();
      }],
    });
  },

  // 退出登录
  logout: () => {
    return request.post('/admin/logout');
  },

  // 获取当前登录状态
  getLoginStatus: () => {
    return request.get('/admin/login');
  },

  // 修改密码
  changePassword: (data: { opass: string; npass: string; rpass: string }) => {
    return request.post('/admin/login/pass', data);
  },

  // 获取登录日志列表
  // GET /admin/login/logs?start={start}&length={length}&word={word}
  getMyLogs: (params: { start: number; length: number; word?: string }) => {
    return request.get('/admin/login/logs', { params });
  },
};
