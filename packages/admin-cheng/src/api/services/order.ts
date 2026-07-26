import request from '..';

// 订单 API（v1 mall）
export const orderApi = {
  // 后台订单列表
  getOrders: (params?: {
    order_no?: string;
    status?: number;
    order_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }) => {
    return request.get('/admin/v1/mall/orders', { params });
  },

  // 后台订单详情
  getOrderDetail: (id: number) => {
    return request.get(`/admin/v1/mall/orders/${id}`);
  },

  // 添加订单备注
  addRemark: (id: number, remark: string) => {
    return request.post(`/admin/v1/mall/orders/${id}/remark`, { remark });
  },

  // 导出订单
  exportOrders: (params?: { start_date?: string; end_date?: string; status?: number; order_type?: string }) => {
    return request.get('/admin/v1/mall/orders/export', { params });
  },
};

// 退款记录 API（v1 mall — AfterSale 模块）
export const refundApi = {
  // 退款记录列表（分页）
  getRefunds: (params?: { page?: number; page_size?: number }) => {
    return request.get('/admin/v1/mall/refunds', { params });
  },
};
