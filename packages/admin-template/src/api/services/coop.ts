import request from '..';

// 合作认证相关API（v6）
export const coopApi = {
  // 获取合作认证列表
  getCoopList: (params?: { start?: number; length?: number; word?: string; auth_role?: number }) => {
    return request.get('/admin/v6/user/coop', { params });
  },

  // 获取合作认证详情
  getCoopDetail: (id: number) => {
    return request.get(`/admin/v6/user/coop/${id}`);
  },

  // 审核合作认证
  auditCoop: (id: number, status: number, statusReason?: string, expiry?: string, coopCommission?: number, inbox?: boolean, inboxTitle?: string, inboxIntro?: string) => {
    return request.post('/admin/v6/user/coop/status', { id, status, status_reason: statusReason, expiry, coop_commission: coopCommission, inbox, inbox_title: inboxTitle, inbox_intro: inboxIntro });
  },

  // 取消认证
  cancelCoop: (id: number, inbox?: boolean, inboxTitle?: string, inboxIntro?: string) => {
    return request.post('/admin/v6/user/coop/revoke', { id, inbox, inbox_title: inboxTitle, inbox_intro: inboxIntro });
  },
};
