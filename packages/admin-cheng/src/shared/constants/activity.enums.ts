// 活动相关枚举

// 活动状态
export enum ActivityStatus {
  DRAFT = 0, // 草稿
  PENDING_REVIEW = 1, // 待审核
  APPROVED = 2, // 已通过
  REJECTED = 3, // 已拒绝
  PUBLISHED = 4, // 已发布
  CANCELED = 5, // 已取消
  COMPLETED = 6, // 已完成
}

// 活动分类
export enum ActivityCategory {
  MEAL = 1, // 吃饭
  CYCLING = 2, // 骑行
  HIKING = 3, // 徒步
  SPORTS = 4, // 运动
  ENTERTAINMENT = 5, // 娱乐
  LEARNING = 6, // 学习
  OTHER = 99, // 其他
}

// 费用模式
export enum FeeMode {
  FREE = 1, // 免费
  AA = 2, // AA制
  HOST_PAYS = 3, // 主办方支付
}

// 审核状态
export enum AuditStatus {
  PENDING = 0, // 待审核
  APPROVED = 1, // 已通过
  REJECTED = 2, // 已拒绝
}