// 订单相关枚举

// 订单状态
export enum OrderStatus {
  PENDING_PAYMENT = 1, // 待支付
  PAID = 2, // 已支付
  REFUNDING = 3, // 退款中
  REFUNDED = 4, // 已退款
  CANCELED = 5, // 已取消
  COMPLETED = 6, // 已完成
}

// 支付方式
export enum PaymentMethod {
  WECHAT = 1, // 微信支付
  ALIPAY = 2, // 支付宝
  BALANCE = 3, // 余额支付
}

// 订单类型
export enum OrderType {
  ACTIVITY_FEE = 1, // 活动费用
  DEPOSIT = 2, // 押金
  SERVICE_FEE = 3, // 服务费
}