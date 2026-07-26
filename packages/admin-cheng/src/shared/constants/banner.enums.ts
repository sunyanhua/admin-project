// Banner 相关枚举（v1 CMS）

// Banner 状态
export enum BannerStatus {
  ENABLED = 0,   // 启用
  DISABLED = 1,  // 禁用
}

// Banner 展示位置
export enum BannerPosition {
  HOME = 'home',
  ACTIVITY = 'activity',
}

// Banner 展示位置标签映射
export const BannerPositionLabels: Record<string, string> = {
  home: '首页',
  activity: '活动页',
};
