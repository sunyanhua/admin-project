// Feed 相关枚举

// Feed 状态
export enum FeedStatus {
  PENDING = 0,    // 待审核
  APPROVED = 1,  // 已通过
  REJECTED = 2,  // 已拒绝
  LOCKED = 4,    // 已锁定
}

// Feed 可见性
export enum FeedVisible {
  PUBLIC = 0,      // 公开
  PRIVATE = 1,    // 私有
  FOLLOWERS = 2,  // 仅粉丝
}
