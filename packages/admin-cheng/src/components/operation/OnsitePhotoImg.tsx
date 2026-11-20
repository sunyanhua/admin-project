import { useState } from 'react';

export interface OnsitePhotoImgProps {
  /** 原图地址（空串不渲染） */
  photo: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * 大屏统一照片图片（稳定缓存击穿参数 + 失败重试）：
 * CDN 裁剪图（...jpg/crop.x.y.w.h.jpg）在 Chrome 下响应 200 但读磁盘缓存报
 * ERR_CACHE_READ_FAILURE（磁盘缓存全局共享，新窗口也复现），因此：
 * - 同一地址使用稳定的 _cb=1 击穿参数：新 URL 绕开历史坏缓存条目，
 *   同时浏览器可正常缓存——首次加载后各环节复用，不重复下载；
 * - 加载失败再换新时间戳重试一次（兜底个别坏条目）；
 * - 带查询参数（可能为签名）的地址不动，避免签名失效；
 * - 空地址不渲染（避免空 src 请求当前页面）。
 */
export const OnsitePhotoImg: React.FC<OnsitePhotoImgProps> = ({ photo, alt = '', className, style, onLoad }) => {
  const [src, setSrc] = useState(() => (photo.includes('?') ? photo : `${photo}?_cb=1`));
  if (!photo) return null;
  const handleError = () => {
    if (!photo.includes('?')) setSrc(`${photo}?_cb=${Date.now()}`);
  };
  return <img src={src} alt={alt} className={className} style={style} onLoad={onLoad} onError={handleError} />;
};

export default OnsitePhotoImg;
