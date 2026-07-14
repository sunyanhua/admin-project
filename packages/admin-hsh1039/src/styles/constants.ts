/**
 * 样式常量 - 用于在JS/TS中访问CSS变量
 * 这些常量应与variables.css中定义的变量保持一致
 */

// 响应式断点
export const BREAKPOINTS = {
  XS: 375,   // 手机端
  SM: 576,   // 小屏幕
  MD: 768,   // 平板
  LG: 992,   // 桌面
  XL: 1200,  // 大桌面
  XXL: 1600, // 超大桌面
} as const;

// 布局变量
export const LAYOUT = {
  HEADER_HEIGHT: 64,
  SIDER_WIDTH: 200,
  SIDER_COLLAPSED_WIDTH: 80,
  CONTAINER_MAX_WIDTH: 1400,
} as const;

// 间距系统
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 24,
  XXL: 32,
} as const;

// 圆角
export const BORDER_RADIUS = {
  SM: 4,
  MD: 6,
  LG: 8,
  XL: 12,
} as const;

// 字体大小
export const FONT_SIZE = {
  XS: 12,
  SM: 14,
  MD: 16,
  LG: 18,
  XL: 20,
  XXL: 24,
} as const;

// 响应式内容区域间距
export const CONTENT_SPACING = {
  // 移动端
  MOBILE: {
    MARGIN: '12px 8px',
    PADDING: 16,
  },
  // 平板
  TABLET: {
    MARGIN: '16px 12px',
    PADDING: 20,
  },
  // 桌面
  DESKTOP: {
    MARGIN: '24px auto',
    PADDING: 24,
  },
} as const;

// 工具函数：将数字转换为像素字符串
export const px = (value: number) => `${value}px`;

// 工具函数：获取间距值
export const spacing = (level: keyof typeof SPACING) => px(SPACING[level]);

// 工具函数：获取圆角值
export const borderRadius = (level: keyof typeof BORDER_RADIUS) => px(BORDER_RADIUS[level]);

// 工具函数：获取字体大小
export const fontSize = (level: keyof typeof FONT_SIZE) => px(FONT_SIZE[level]);