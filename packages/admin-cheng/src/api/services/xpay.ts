import request from '..';

// ========================
// 虚拟支付（xpay）
// 接口文档：docs/api/cheng-swagger.json → /admin/v1/xpay/*
// ========================

/** 业务类型 */
export enum PayBizType {
  CONGRATULATION_CASH = 2, // 报喜现金红包
  COIN_RECHARGE = 3, // 代币充值
  ID_VERIFY = 4, // 实人认证
}

/** 订单状态 */
export enum OrderStatus {
  PENDING = 0, // 待支付
  PAID = 1, // 已支付
  REFUNDED = 2, // 已退款
  CLOSED = 3, // 已关闭
}

/** 退款状态 */
export enum RefundStatus {
  PROCESSING = 0, // 处理中
  SUCCESS = 1, // 退款成功
  FAILED = 2, // 退款失败
}

/** iOS 退款问询决策 */
export enum IOSRefundDecision {
  REFUND = 0, // 建议退款（允许退款）
  BLOCK = 1, // 拦截，拒绝退款
}

/** iOS 退款决策来源 */
export enum IOSRefundDecisionSource {
  RULE = 1, // 命中规则
  DEFAULT = 2, // 命中兜底规则
  FALLBACK = 3, // 降级（规则缺失/查询异常）
  POLICY = 4, // 业务硬规则
}

/** iOS 发货状态 */
export enum IOSProvideStatus {
  NOT_DELIVERED = 0, // 未发货
  DELIVERED = 1, // 已发货
  DELIVERING = 2, // 发货中
}

/** 支付订单列表项 */
export interface XpayOrder {
  id: string;
  order_no: string;
  wx_order_id: string;
  wx_transaction_id: string;
  biz_type: number;
  status: number;
  /** 金额（分） */
  amount_cents: number;
  description: string;
  biz_id: string;
  user_id: string;
  created_at: string;
  paid_at: string;
  refunded_at: string;
  closed_at: string;
}

/** 退款流水列表项 */
export interface XpayRefund {
  id: string;
  refund_no: string;
  wx_refund_id: string;
  order_id: string;
  /** 金额（分） */
  amount_cents: number;
  reason: string;
  status: number;
  created_at: string;
  updated_at: string;
}

/** iOS 退款问询列表项（含决策快照） */
export interface IosRefundInquiry {
  id: string;
  pay_order_id: string;
  order_no: string;
  decision: number;
  decision_source: number;
  rule_id: string;
  rule_name: string;
  provide_status: number;
  inquiry_count: number;
  response_ms: number;
  refund_reason: string;
  evidence: string;
  result_info: string;
  p_count: number;
  product_id: string;
  channel_bill: string;
  dedup_key: string;
  first_inquired_at: string;
  last_inquired_at: string;
}

export const xpayApi = {
  /** 支付订单列表（按创建时间倒序） */
  getOrders: (params?: { page?: number; size?: number; biz_type?: number; status?: number; user_id?: string }) => {
    return request.get('/admin/v1/xpay/orders', { params });
  },

  /** 退款流水列表（按创建时间倒序；无操作接口，退款由系统/微信驱动） */
  getRefunds: (params?: { page?: number; size?: number; order_id?: string; status?: number }) => {
    return request.get('/admin/v1/xpay/refunds', { params });
  },

  /** iOS 退款问询列表（含决策快照） */
  getIosRefundInquiries: (params?: {
    page?: number; size?: number; order_no?: string; decision?: number; rule_id?: string;
    start_at?: string; end_at?: string;
  }) => {
    return request.get('/admin/v1/xpay/ios-refund-inquiries', { params });
  },

  /** iOS 退款问询详情（决策、证据快照与原始报文） */
  getIosRefundInquiry: (id: string) => {
    return request.get(`/admin/v1/xpay/ios-refund-inquiries/${id}`);
  },
};
