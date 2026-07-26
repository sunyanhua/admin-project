// Wallet 钱包相关枚举 (v6版本)

// 钱包提现状态
export enum V6UserWalletWithdrawStatus {
  PENDING = 0,    // 待处理
  APPROVED = 1,  // 已通过
  REJECTED = 2,  // 已拒绝
  LOCKED = 4,    // 已锁定
}
