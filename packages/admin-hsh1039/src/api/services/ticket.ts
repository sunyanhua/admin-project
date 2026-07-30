import request from '..';

// 票夹 API（v1 mall — Tickets-Admin）
export const ticketApi = {
  // 管理后台票夹列表
  getTickets: (params?: {
    page?: number;
    page_size?: number;
    order_id?: number;
    parent_order_id?: number;
    order_item_id?: number;
    holder_id?: string;
    category_id?: number;
    root_category_id?: number;
    booking_slot_id?: number;
    is_verified?: boolean;
    is_transferred?: boolean;
    is_refunded?: boolean;
  }) => {
    return request.get('/admin/v1/mall/tickets', { params });
  },

  // 扫码查询票夹
  getTicketByCode: (code: string) => {
    return request.get(`/admin/v1/mall/tickets/${encodeURIComponent(code)}`);
  },

  // 核销卡券
  verifyTicket: (id: number) => {
    return request.post(`/admin/v1/mall/tickets/${id}/verify`);
  },

  // 批量核销
  batchVerify: (ids: number[]) => {
    return request.post('/admin/v1/mall/tickets/batch-verify', { ids });
  },

  // 管理后台取消预约
  cancelBooking: (id: number) => {
    return request.put(`/admin/v1/mall/tickets/${id}/booking/cancel`);
  },
};
