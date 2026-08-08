// 礼物相关枚举

// 礼物状态（0=启用 1=禁用）
export enum GiftStatus {
  ENABLED = 0,
  DISABLED = 1,
}

export const GiftStatusLabels: Record<number, string> = {
  [GiftStatus.ENABLED]: '启用',
  [GiftStatus.DISABLED]: '禁用',
};

// 礼物类型（1=普通 2=特殊）
export enum GiftType {
  NORMAL = 1,
  SPECIAL = 2,
}

export const GiftTypeLabels: Record<number, string> = {
  [GiftType.NORMAL]: '普通',
  [GiftType.SPECIAL]: '特殊',
};
