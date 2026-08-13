// 广播投稿相关枚举

// 投稿类型（1=我要展示 2=我要表白 3=我要报喜）
export enum SubmissionType {
  DISPLAY = 1,
  CONFESS = 2,
  ANNOUNCE = 3,
}

export const SubmissionTypeLabels: Record<number, string> = {
  [SubmissionType.DISPLAY]: '我要展示',
  [SubmissionType.CONFESS]: '我要表白',
  [SubmissionType.ANNOUNCE]: '我要报喜',
};

export const SubmissionTypeColors: Record<number, string> = {
  [SubmissionType.DISPLAY]: 'blue',
  [SubmissionType.CONFESS]: 'magenta',
  [SubmissionType.ANNOUNCE]: 'orange',
};

// 投稿审核状态（0=待审核 1=通过 2=拒绝）
export enum SubmissionAuditStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
}

export const SubmissionAuditStatusLabels: Record<number, string> = {
  [SubmissionAuditStatus.PENDING]: '待审核',
  [SubmissionAuditStatus.APPROVED]: '通过',
  [SubmissionAuditStatus.REJECTED]: '拒绝',
};

export const SubmissionAuditStatusColors: Record<number, string> = {
  [SubmissionAuditStatus.PENDING]: 'processing',
  [SubmissionAuditStatus.APPROVED]: 'success',
  [SubmissionAuditStatus.REJECTED]: 'error',
};
