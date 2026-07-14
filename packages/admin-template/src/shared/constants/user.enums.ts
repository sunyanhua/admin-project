// 用户相关枚举

// 用户状态
export enum UserStatus {
  NORMAL = 1, // 正常
  BANNED = 2, // 封禁
  DELETED = 3, // 已删除
}

// 用户角色
export enum UserRole {
  USER = 1, // 普通用户
  ADMIN = 2, // 管理员
  SUPER_ADMIN = 3, // 超级管理员
}

// 实名认证状态
export enum RealNameAuthStatus {
  NOT_AUTH = 0, // 未认证
  PENDING = 1, // 审核中
  APPROVED = 2, // 已认证
  REJECTED = 3, // 已拒绝
}

// 合作认证状态
export enum PartnerAuthStatus {
  NOT_AUTH = 0, // 未认证
  PENDING = 1, // 审核中
  APPROVED = 2, // 已认证
  REJECTED = 3, // 已拒绝
}