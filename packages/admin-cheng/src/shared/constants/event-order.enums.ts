// Event Order 活动订单相关枚举

// 活动订单状态
export enum EventOrderStatus {
  APPLIED = 0,    // 已申请
  CANCELLED = 1, // 已取消
  PAID = 2,      // 已支付
  REFUNDED = 3,  // 已退款
  REFUND_CANCELLED = 12, // 已退费取消
}

// 活动订单支付状态
export enum EventOrderPaymentStatus {
  APPLIED = 0,   // 已申请
  PAID = 1,     // 已支付
  REFUNDED = 2, // 已退款
}

// 活动订单退款状态
export enum EventOrderRefundStatus {
  APPLIED = 0,   // 已申请
  REFUNDED = 1, // 已退款
  FAILED = 2,   // 失败
}
