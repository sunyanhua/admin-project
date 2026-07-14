import request from '..';

// 用户相关API（v6）
export const userApi = {
  // 查询用户列表
  getUsers: (params?: { gender?: number; status?: number; start?: number; length?: number }) => {
    return request.get('/admin/v6/user', { params });
  },

  // 获取用户详情
  getUserDetail: (id: string) => {
    return request.get(`/admin/v6/user/${id}`);
  },

  // 更新用户状态
  updateUserStatus: (id: string, status: number) => {
    return request.post('/admin/v6/user/status', { id, status });
  },

  // 更新用户可见性
  updateUserVisible: (id: string, visible: boolean) => {
    return request.post('/admin/v6/user/visible', { id, visible });
  },

  // 设置/取消官方用户
  setOfficialUser: (id: string, isOfficial: boolean) => {
    return request.post('/admin/v6/user/coop', { id, coop_role: isOfficial ? 3 : undefined, coop_auth: isOfficial ? 1 : undefined });
  },

  // 设置/取消推荐用户
  setRecommendUser: (id: string, recom: boolean) => {
    return request.post('/admin/v6/user/recom', { id, recom });
  },
};
