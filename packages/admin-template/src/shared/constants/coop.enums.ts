// User Coop 相关枚举

// 用户合作认证状态
export enum UserCoopStatus {
  PENDING = 0,    // 待审核
  APPROVED = 1,  // 已通过
  REJECTED = 2,  // 已拒绝
  LOCKED = 4,    // 已锁定
}

// 用户合作角色
export enum UserCoopRole {
  MERCHANT = 1,    // 商户
  PRINCIPAL = 2,  // 负责人
}
