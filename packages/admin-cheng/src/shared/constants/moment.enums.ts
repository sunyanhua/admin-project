// 动态相关枚举

// 动态状态
export enum MomentStatus {
  NORMAL = 1, // 正常
  HIDDEN = 2, // 隐藏
  DELETED = 3, // 已删除
}

// 动态类型
export enum MomentType {
  TEXT = 1, // 纯文本
  IMAGE = 2, // 图片
  VIDEO = 3, // 视频
  LINK = 4, // 链接
}

// 审核状态
export enum MomentAuditStatus {
  PENDING = 0, // 待审核
  APPROVED = 1, // 已通过
  REJECTED = 2, // 已拒绝
}