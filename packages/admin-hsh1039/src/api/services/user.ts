import request from '..';

// C端用户相关API（v1）
export const userApi = {
  // 查询C端用户列表（v1）
  getUsers: (params?: { page?: number; page_size?: number; keyword?: string; status?: number; gender?: number }) => {
    return request.get('/admin/v1/mall/users', { params });
  },

  // 获取C端用户详情（v1）
  getUserDetail: (id: string) => {
    return request.get(`/admin/v1/mall/users/${encodeURIComponent(id)}`);
  },

  // 修改C端用户状态 0=启用 1=禁用（v1）
  updateUserStatus: (id: string, status: number) => {
    return request.patch(`/admin/v1/mall/users/${encodeURIComponent(id)}/status`, { status });
  },

  // 以下为旧版 v6 API，详情弹窗管理操作仍在使用
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
