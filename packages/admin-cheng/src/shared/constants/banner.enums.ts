// Banner 相关枚举（v1 BizOps CMS）

// 广告位状态（v1 bizops/cms/banners）
// 注意：Swagger 文档写反了，实际 API 为 0=上线 1=下线
export enum BannerStatus {
  ONLINE = 0,   // 上线
  OFFLINE = 1,  // 下线
}

// 广告展示位状态（v1 bizops/cms/banner-slots）
export enum BannerSlotStatus {
  ENABLED = 0,   // 启用
  DISABLED = 1,  // 停用
}

// 链接类型
export enum BannerLinkType {
  NONE = 0,      // 无链接
  EXTERNAL = 1,  // 外链
  INTERNAL = 2,  // 内部页
}

export const BannerLinkTypeLabels: Record<number, string> = {
  [BannerLinkType.NONE]: '无链接',
  [BannerLinkType.EXTERNAL]: '外链',
  [BannerLinkType.INTERNAL]: '内部页',
};

// 旧版展示位置（保留兼容，但新接口已使用 slot_ids 替代）
export enum BannerPosition {
  HOME = 'home',
  ACTIVITY = 'activity',
}

// 旧版展示位置标签映射（保留兼容）
export const BannerPositionLabels: Record<string, string> = {
  home: '首页',
  activity: '活动页',
};
