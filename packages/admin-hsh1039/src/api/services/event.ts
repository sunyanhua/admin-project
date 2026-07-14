import request from '..';

// 活动相关API（v6）
export const eventApi = {
  // 获取活动列表
  getEvents: (params?: { start?: number; length?: number; keyword?: string; status?: number }) => {
    return request.get('/admin/v6/event', { params });
  },

  // 获取活动详情
  getEventDetail: (id: number) => {
    return request.get(`/admin/v6/event/${id}`);
  },

  // 更新活动
  updateEvent: (id: number, data: any) => {
    return request.post(`/admin/v6/event/${id}`, data);
  },

  // 推荐活动
  recommendEvent: (id: number) => {
    return request.post(`/admin/v6/event/recom`, { id });
  },

  // 更新活动排序
  updateEventOrder: (id: number, orderon: number | undefined) => {
    return request.post('/admin/v6/event/orderon', { id, orderon });
  },

  // 更新活动状态
  updateEventStatus: (id: number, status: number, statusReason?: string, inbox?: boolean, inboxTitle?: string, inboxIntro?: string) => {
    return request.post('/admin/v6/event/status', { id, status, status_reason: statusReason, inbox, inbox_title: inboxTitle, inbox_intro: inboxIntro });
  },
};
