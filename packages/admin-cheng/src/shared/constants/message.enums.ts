// 消息相关枚举

// 消息类型
export enum MessageType {
  SYSTEM = 1, // 系统消息
  ACTIVITY = 2, // 活动消息
  ORDER = 3, // 订单消息
  CHAT = 4, // 聊天消息
}

// 消息状态
export enum MessageStatus {
  UNREAD = 0, // 未读
  READ = 1, // 已读
  DELETED = 2, // 已删除
}

// 通知类型
export enum NotificationType {
  ACTIVITY_APPROVED = 1, // 活动审核通过
  ACTIVITY_REJECTED = 2, // 活动审核拒绝
  ORDER_CREATED = 3, // 订单创建
  ORDER_PAID = 4, // 订单支付成功
  ORDER_REFUNDED = 5, // 订单退款
}