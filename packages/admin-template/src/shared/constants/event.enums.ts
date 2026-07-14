// Event 活动相关枚举

// 活动状态
export enum EventStatus {
  PENDING = 0,    // 待审核
  APPROVED = 1,  // 已通过
  REJECTED = 2,  // 已拒绝
  LOCKED = 4,    // 已锁定
  CANCEL = 8,    // 已取消
  FINISH = 128,  // 已完成
}

// 活动可见性
export enum EventVisible {
  PUBLIC = 0,      // 公开
  PRIVATE = 1,    // 私有
  FOLLOWERS = 2,  // 仅粉丝
}

// 活动费用类型
export enum EventFeeType {
  FREE = 0,     // 免费
  SPLIT = 1,   // AA制
}
