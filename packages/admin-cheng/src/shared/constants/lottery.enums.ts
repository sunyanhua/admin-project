// 抽奖相关枚举

// 奖池类型（0=一次性奖池 1=次数奖池）
export enum PoolType {
  ONCE = 0,
  MULTI = 1,
}

export const PoolTypeLabels: Record<number, string> = {
  [PoolType.ONCE]: '活动抽',
  [PoolType.MULTI]: '次数抽',
};

// 奖品类型（1=现金红包 2=兑换券 3=实物）
export enum PrizeType {
  COINS = 1,
  VOUCHER = 2,
  PHYSICAL = 3,
}

export const PrizeTypeLabels: Record<number, string> = {
  [PrizeType.COINS]: '红包',
  [PrizeType.VOUCHER]: '券码',
  [PrizeType.PHYSICAL]: '实物',
};

export const PrizeTypeColors: Record<number, string> = {
  [PrizeType.COINS]: 'red',
  [PrizeType.VOUCHER]: 'blue',
  [PrizeType.PHYSICAL]: 'green',
};

// 发货状态
export enum ShipStatus {
  UNREGISTERED = 0,
  REGISTERED = 1,
  SHIPPED = 2,
}

export const ShipStatusLabels: Record<number, string> = {
  [ShipStatus.UNREGISTERED]: '未登记',
  [ShipStatus.REGISTERED]: '已登记',
  [ShipStatus.SHIPPED]: '已发货',
};

export const ShipStatusColors: Record<number, string> = {
  [ShipStatus.UNREGISTERED]: 'default',
  [ShipStatus.REGISTERED]: 'processing',
  [ShipStatus.SHIPPED]: 'success',
};

// 投放批次状态
export enum BatchStatus {
  PENDING = 0,
  PROCESSING = 1,
  COMPLETED = 2,
  FAILED = 3,
}

export const BatchStatusLabels: Record<number, string> = {
  [BatchStatus.PENDING]: '待处理',
  [BatchStatus.PROCESSING]: '处理中',
  [BatchStatus.COMPLETED]: '已完成',
  [BatchStatus.FAILED]: '失败',
};
