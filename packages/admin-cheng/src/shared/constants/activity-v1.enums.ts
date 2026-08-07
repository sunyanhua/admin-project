// 活动相关枚举（v1 Admin-Activity）

// 活动状态（0=启用 1=禁用）
export enum ActivityV1Status {
  ENABLED = 0,
  DISABLED = 1,
}

export const ActivityV1StatusLabels: Record<number, string> = {
  [ActivityV1Status.ENABLED]: '启用',
  [ActivityV1Status.DISABLED]: '禁用',
};

// 活动类型（待确认：0/1/2 具体含义）
export enum ActivityType {
  TYPE_0 = 0,
  TYPE_1 = 1,
  TYPE_2 = 2,
}

export const ActivityTypeLabels: Record<number, string> = {
  [ActivityType.TYPE_0]: '类型0',
  [ActivityType.TYPE_1]: '类型1',
  [ActivityType.TYPE_2]: '类型2',
};

// 报名审核状态
export enum RegisterAuditStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
}

export const RegisterAuditStatusLabels: Record<number, string> = {
  [RegisterAuditStatus.PENDING]: '待审核',
  [RegisterAuditStatus.APPROVED]: '通过',
  [RegisterAuditStatus.REJECTED]: '拒绝',
};

export const RegisterAuditStatusColors: Record<number, string> = {
  [RegisterAuditStatus.PENDING]: 'processing',
  [RegisterAuditStatus.APPROVED]: 'success',
  [RegisterAuditStatus.REJECTED]: 'error',
};

// 报名支付状态
export enum RegisterPayStatus {
  UNPAID = 0,
  PAID = 1,
  REFUNDED = 2,
}

export const RegisterPayStatusLabels: Record<number, string> = {
  [RegisterPayStatus.UNPAID]: '未支付',
  [RegisterPayStatus.PAID]: '已支付',
  [RegisterPayStatus.REFUNDED]: '已退款',
};

export const RegisterPayStatusColors: Record<number, string> = {
  [RegisterPayStatus.UNPAID]: 'default',
  [RegisterPayStatus.PAID]: 'success',
  [RegisterPayStatus.REFUNDED]: 'warning',
};
