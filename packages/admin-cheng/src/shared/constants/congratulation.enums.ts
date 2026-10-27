/** 报喜状态：0=已提交 1=已通过 2=未通过 */
export enum CongratulationStatus {
  SUBMITTED = 0,
  APPROVED = 1,
  REJECTED = 2,
}

export const CongratulationStatusLabels: Record<number, string> = {
  [CongratulationStatus.SUBMITTED]: '已提交',
  [CongratulationStatus.APPROVED]: '已通过',
  [CongratulationStatus.REJECTED]: '未通过',
};

export const CongratulationStatusColors: Record<number, string> = {
  [CongratulationStatus.SUBMITTED]: 'processing',
  [CongratulationStatus.APPROVED]: 'success',
  [CongratulationStatus.REJECTED]: 'error',
};
