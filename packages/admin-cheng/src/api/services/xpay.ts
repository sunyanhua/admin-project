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

/** 账单渠道 */
export enum PayBillChannel {
  WECHAT = 1, // 微信普通虚拟支付
  APPLE = 2, // Apple IAP
}

/** 投诉处理状态（列表筛选含 1=处理中） */
export enum PayComplaintStatus {
  PENDING = 0, // 待处理
  PROCESSING = 1, // 处理中（仅列表筛选值）
  REPLIED = 2, // 已回复
  COMPLETED = 3, // 已结案
  CLOSED = 4, // 已关闭
}

/** 投诉消息方向 */
export enum PayComplaintDirection {
  USER = 1, // 用户
  MERCHANT = 2, // 商家
}

/** 投诉消息条目（详情内 messages） */
export interface AdminComplaintMessageItem {
  id: string;
  content: string;
  direction: number;
  media_ids: string;
  operator_id: string;
  created_at: string;
}

/** 投诉列表项 */
export interface AdminComplaintItem {
  id: string;
  complaint_id: string;
  status: number;
  complaint_detail: string;
  complaint_time: string;
  mch_order_id: string;
  wx_order_id: string;
  transaction_id: string;
  open_id: string;
  last_reply_at: string;
  completed_at: string;
  handler_admin_id: string;
  created_at: string;
  updated_at: string;
}

/** 投诉详情（列表项 + 消息留痕 + 原始推送报文） */
export interface AdminComplaintDetail extends AdminComplaintItem {
  deadline_at: string;
  request_id: string;
  raw_payload: string;
  messages: AdminComplaintMessageItem[];
}

/** 订单/退款挂载的用户简报（UserBriefForAdmin） */
export interface XpayUserBrief {
  user_id?: string;
  nickname?: string;
  avatar?: string;
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
  /** 下单用户简报（后端挂载，可能为 null） */
  user?: XpayUserBrief | null;
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
  /** 退款用户简报（后端挂载，可能为 null） */
  user?: XpayUserBrief | null;
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

/** 支付汇总·业务类型拆分 */
export interface AdminFundPayBizTypeItem {
  biz_type: number;
  /** 金额（分） */
  cents: number;
  count: number;
  /** 其中当前状态=已退款 */
  refunded_count: number;
}

/** 支付汇总（paid_at 成功订单，含后来退款） */
export interface AdminFundPaySummary {
  /** 金额（分） */
  cents: number;
  count: number;
  refunded_count: number;
  by_biz_type: AdminFundPayBizTypeItem[];
}

/** 退费汇总（成功退款流水） */
export interface AdminFundRefundSummary {
  /** 成功退款金额（分） */
  success_cents: number;
  success_count: number;
  failed_count: number;
  processing_count: number;
}

/** 入账汇总（bill_date 账单明细） */
export interface AdminFundSettleSummary {
  count: number;
  /** 毛收入（分） */
  gross_cents: number;
  /** 手续费（分） */
  fee_cents: number;
  /** 净收入（分） */
  net_cents: number;
  /** 对账一致数 */
  matched_count: number;
  /** 对账差异数 */
  diff_count: number;
}

/** 提现汇总（成功提现流水） */
export interface AdminFundWithdrawSummary {
  /** 成功提现金额（分） */
  success_cents: number;
  success_count: number;
  failed_count: number;
  pending_review_count: number;
  processing_count: number;
}

/** 资金汇总统计响应 */
export interface AdminFundSummaryResponse {
  /** YYYYMMDD（北京时间自然日，含） */
  start_date: string;
  end_date: string;
  pay: AdminFundPaySummary;
  refund: AdminFundRefundSummary;
  settle: AdminFundSettleSummary;
  withdraw: AdminFundWithdrawSummary;
}

/** 对账汇总条目（按账期日 + 渠道） */
export interface AdminReconcileSummaryItem {
  /** 账期日 YYYYMMDD */
  bill_date: string;
  channel: number;
  trade_count: number;
  /** 交易额（分） */
  gross_amount_cents: number;
  /** 手续费（分） */
  fee_cents: number;
  /** 净额（分） */
  net_amount_cents: number;
  /** 一致笔数 */
  matched_count: number;
  /** 差异笔数 */
  diff_count: number;
}

export const xpayApi = {
  /** 支付订单列表（按创建时间倒序） */
  getOrders: (params?: { page?: number; size?: number; biz_type?: number; status?: number; user_id?: string }) => {
    return request.get('/admin/v1/xpay/orders', { params });
  },

  /** 资金汇总统计（北京时间自然日，缺省近 30 天，显式窗口 ≤366 天，超限后端返回 400） */
  getFundSummary: (params?: { from_date?: string; to_date?: string }) => {
    return request.get('/admin/v1/xpay/fund/summary', { params });
  },

  /** 对账汇总（按账期日 + 渠道；start/end 必填，channel 缺省=全部渠道） */
  getReconcileSummary: (params: { start_date: string; end_date: string; channel?: number }) => {
    return request.get('/admin/v1/xpay/reconcile-summary', { params });
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

  /** 投诉列表（created_at 倒序） */
  getComplaints: (params?: { page?: number; size?: number; status?: number; keyword?: string }) => {
    return request.get('/admin/v1/xpay/complaints', { params });
  },

  /** 投诉详情（本地投诉记录、商家回复留痕与原始推送报文） */
  getComplaint: (id: string) => {
    return request.get(`/admin/v1/xpay/complaints/${id}`);
  },

  /** 回复投诉用户（先调微信 response_complaint，成功后本地留痕并推进状态；已结案/已关闭不可回复） */
  replyComplaint: (id: string, data: { content: string; image_file_ids?: string[] }) => {
    return request.post(`/admin/v1/xpay/complaints/${id}/reply`, data);
  },

  /** 完成投诉处理（先调微信 complete_complaint，成功后本地置已结案；已结案/已关闭不可重复结案） */
  completeComplaint: (id: string) => {
    return request.post(`/admin/v1/xpay/complaints/${id}/complete`);
  },

  /** 投诉协商历史（实时调用微信 get_negotiation_history，分页转 offset/limit） */
  getComplaintNegotiationHistory: (id: string, params?: { page?: number; size?: number }) => {
    return request.get(`/admin/v1/xpay/complaints/${id}/negotiation-history`, { params });
  },
};
