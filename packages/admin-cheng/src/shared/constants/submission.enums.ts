// 广播投稿相关枚举

// 投稿类型（1=我要报喜 2=我要表白 3=我要展示；其他数值=其他）
export enum SubmissionType {
  ANNOUNCE = 1,
  CONFESS = 2,
  DISPLAY = 3,
}

export const SubmissionTypeLabels: Record<number, string> = {
  [SubmissionType.ANNOUNCE]: '我要报喜',
  [SubmissionType.CONFESS]: '我要表白',
  [SubmissionType.DISPLAY]: '我要展示',
};

export const SubmissionTypeColors: Record<number, string> = {
  [SubmissionType.ANNOUNCE]: 'orange',
  [SubmissionType.CONFESS]: 'magenta',
  [SubmissionType.DISPLAY]: 'blue',
};

/** 投稿类型标签（含"其他"兜底） */
export function submissionTypeLabel(v: number | null | undefined): string {
  return v != null ? (SubmissionTypeLabels[v] || '其他') : '其他';
}

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
