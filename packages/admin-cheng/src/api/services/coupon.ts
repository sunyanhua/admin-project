import request from '..';

// 优惠券 API（v1 mall — Coupons 模块）
export const couponApi = {
  // 分页查询优惠券模板列表
  getCoupons: (params?: { page?: number; page_size?: number; status?: number }) => {
    return request.get('/admin/v1/mall/coupons', { params });
  },

  // 创建优惠券模板
  createCoupon: (data: {
    name: string;
    discount_amount: number;
    threshold_amount: number;
    total_stock: number;
    start_time?: string;
    end_time?: string;
    scope_type: 'all' | 'category' | 'product';
    scope_ids?: number[];
    allow_rollback?: boolean;
  }) => {
    return request.post('/admin/v1/mall/coupons', data);
  },

  // 查询优惠券模板详情
  getCouponDetail: (id: number) => {
    return request.get(`/admin/v1/mall/coupons/${id}`);
  },

  // 编辑优惠券模板
  updateCoupon: (id: number, data: {
    discount_amount?: number;
    threshold_amount?: number;
    total_stock?: number;
    start_time?: string;
    end_time?: string;
    scope_type?: 'all' | 'category' | 'product';
    scope_ids?: number[];
    allow_rollback?: boolean;
  }) => {
    return request.put(`/admin/v1/mall/coupons/${id}`, data);
  },

  // 删除优惠券模板
  deleteCoupon: (id: number) => {
    return request.delete(`/admin/v1/mall/coupons/${id}`);
  },

  // 启用/停用优惠券模板
  toggleCouponStatus: (id: number, status: number) => {
    return request.put(`/admin/v1/mall/coupons/${id}/status`, { status });
  },

  // 后台手动发放优惠券
  sendCoupon: (data: { coupon_id: number; user_ids: string[] }) => {
    return request.post('/admin/v1/mall/coupons/send', data);
  },

  // 查询兑换配置列表
  getExchangeConfigs: (params?: { page?: number; page_size?: number }) => {
    return request.get('/admin/v1/mall/coupons/exchange-configs', { params });
  },

  // 创建兑换配置
  createExchangeConfig: (data: {
    coupon_id: number;
    points_required: number;
    start_time?: string;
    end_time?: string;
    total_limit?: number;
    user_daily_limit?: number;
    user_total_limit?: number;
    sort_order?: number;
  }) => {
    return request.post('/admin/v1/mall/coupons/exchange-configs', data);
  },

  // 编辑兑换配置
  updateExchangeConfig: (id: number, data: Record<string, unknown>) => {
    return request.put(`/admin/v1/mall/coupons/exchange-configs/${id}`, data);
  },
};
