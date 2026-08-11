// 广播投稿相关枚举

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
