/**
 * 后台图片缩略图处理工具
 *
 * 规则：
 * 1. 只有上传到 vbegin CDN 的图片才需要添加缩略后缀
 * 2. 已经有后缀的图片不再重复添加
 * 3. 内联展示用缩略图，点击预览弹出的大图用原图
 * 4. 编辑页/证件照/二维码等保持原图
 */

// ==================== 内部方法 ====================

/**
 * 检查 URL 是否应添加缩略后缀：只有包含 "vbegin" 的 URL 才处理
 */
export const shouldAddThumbnail = (url: string): boolean => {
  if (!url) return false;
  return url.includes('vbegin');
};

/**
 * 检查是否已有缩略后缀，避免重复添加
 * 匹配形如 "/256.0"、"/1024.0" 的后缀
 */
export const hasThumbnailSuffix = (url: string): boolean => {
  return /\/\d+\.\d+$/.test(url);
};

/**
 * 通用转换方法
 * @param url  原始图片 URL
 * @param size 缩略尺寸（宽度像素），CDN 会自动等比例缩放
 */
export const getThumbnailUrl = (url: string | undefined | null, size: number): string => {
  if (!url) return '';
  if (!shouldAddThumbnail(url)) return url;
  if (hasThumbnailSuffix(url)) return url;
  return `${url}/${size}.0`;
};

// ==================== 按场景命名的派生方法 ====================

/** 用户头像 — 256px */
export const getAvatarUrl = (url: string | undefined | null) => getThumbnailUrl(url, 256);

/** 全屏宽大图（首页Banner、活动封面、活动内页详情图、动态内页图片、个人主页封面）— 1024px */
export const getFullWidthUrl = (url: string | undefined | null) => getThumbnailUrl(url, 1024);

/** 双列/列表展示（动态列表封面、个人主页动态列表、收藏列表等）— 512px */
export const getMediumUrl = (url: string | undefined | null) => getThumbnailUrl(url, 512);

/** 方形小图（发现页活动Tab列表、话题封面、分类封面）— 256px */
export const getSmallUrl = (url: string | undefined | null) => getThumbnailUrl(url, 256);
