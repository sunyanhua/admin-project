// 专区相关枚举

// 专区状态（0=启用 1=禁用）
export enum ZoneStatus {
  ENABLED = 0,
  DISABLED = 1,
}

export const ZoneStatusLabels: Record<number, string> = {
  [ZoneStatus.ENABLED]: '启用',
  [ZoneStatus.DISABLED]: '禁用',
};

// 申请审核状态（0=待审核 1=通过 2=拒绝 3=已撤销）
export enum ApplicationReviewStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  REVOKED = 3,
}

export const ApplicationReviewStatusLabels: Record<number, string> = {
  [ApplicationReviewStatus.PENDING]: '待审核',
  [ApplicationReviewStatus.APPROVED]: '通过',
  [ApplicationReviewStatus.REJECTED]: '拒绝',
  [ApplicationReviewStatus.REVOKED]: '已撤销',
};

export const ApplicationReviewStatusColors: Record<number, string> = {
  [ApplicationReviewStatus.PENDING]: 'processing',
  [ApplicationReviewStatus.APPROVED]: 'success',
  [ApplicationReviewStatus.REJECTED]: 'error',
  [ApplicationReviewStatus.REVOKED]: 'default',
};
