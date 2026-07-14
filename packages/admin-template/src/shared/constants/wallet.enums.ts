// 钱包相关枚举

// 钱包操作类型
export enum WalletOperationType {
  RECHARGE = 1, // 充值
  WITHDRAW = 2, // 提现
  PAYMENT = 3, // 支付
  REFUND = 4, // 退款
  REWARD = 5, // 奖励
}

// 钱包操作状态
export enum WalletOperationStatus {
  PENDING = 0, // 处理中
  SUCCESS = 1, // 成功
  FAILED = 2, // 失败
}

// 充值方式
export enum RechargeMethod {
  WECHAT = 1, // 微信支付
  ALIPAY = 2, // 支付宝
  BANK_CARD = 3, // 银行卡
}