// User Real 实名认证相关枚举

// 用户实名认证状态
export enum UserRealStatus {
  PENDING = 0,    // 待审核
  APPROVED = 1,  // 已通过
  REJECTED = 2,  // 已拒绝
  LOCKED = 4,    // 已锁定
}
