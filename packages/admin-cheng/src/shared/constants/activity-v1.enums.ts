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

// 活动类型（报名方式）
export enum ActivityType {
  FREE_FCFS = 0,   // 免费，先到先得
  PAID_FCFS = 1,   // 收费，先交费先得
  FREE_REVIEW = 2, // 免费，审核筛选
}

export const ActivityTypeLabels: Record<number, string> = {
  [ActivityType.FREE_FCFS]: '免费，先到先得',
  [ActivityType.PAID_FCFS]: '收费，先交费先得',
  [ActivityType.FREE_REVIEW]: '免费，审核筛选',
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

// 报名状态（免费FCFS：0=已完成 1=已取消）
export enum RegisterStatus {
  COMPLETED = 0,
  CANCELLED = 1,
}

export const RegisterStatusLabels: Record<number, string> = {
  [RegisterStatus.COMPLETED]: '已完成',
  [RegisterStatus.CANCELLED]: '已取消',
};

export const RegisterStatusColors: Record<number, string> = {
  [RegisterStatus.COMPLETED]: 'success',
  [RegisterStatus.CANCELLED]: 'default',
};

// 报名用户性别（0=未设置 1=男 2=女）
export enum RegisterGender {
  UNSET = 0,
  MALE = 1,
  FEMALE = 2,
}

export const RegisterGenderLabels: Record<number, string> = {
  [RegisterGender.UNSET]: '未设置',
  [RegisterGender.MALE]: '男',
  [RegisterGender.FEMALE]: '女',
};
