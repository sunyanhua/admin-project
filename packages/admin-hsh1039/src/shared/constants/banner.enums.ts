// Banner 相关枚举

// Banner 状态
export enum BannerStatus {
  ENABLED = 0,   // 启用
  DISABLED = 1,  // 禁用
}

// Banner 链接类型
export enum BannerLinkType {
  MINIAPP_LINK = 1,   // 小程序链接
  NO_LINK = 100,      // 无链接
}

// Banner 链接类型标签映射
export const BannerLinkTypeLabels: Record<BannerLinkType, string> = {
  [BannerLinkType.MINIAPP_LINK]: '小程序链接',
  [BannerLinkType.NO_LINK]: '无链接',
};
