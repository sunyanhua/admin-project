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
 * 大屏统一照片图片（挂载即带缓存击穿参数 + 失败重试）：
 * CDN 裁剪图（...jpg/crop.x.y.w.h.jpg）在 Chrome 下响应 200 但读磁盘缓存报
 * ERR_CACHE_READ_FAILURE（磁盘缓存全局共享，新窗口也复现），因此：
 * - 挂载时直接加 _cb 时间戳绕开磁盘缓存，每次直连取图；
 * - 加载失败再换新时间戳重试一次；
 * - 带查询参数（可能为签名）的地址不动，避免签名失效；
 * - 空地址不渲染（避免空 src 请求当前页面）。
 */
export const OnsitePhotoImg: React.FC<OnsitePhotoImgProps> = ({ photo, alt = '', className, style, onLoad }) => {
  const [src, setSrc] = useState(() => (photo.includes('?') ? photo : `${photo}?_cb=${Date.now()}`));
  if (!photo) return null;
  const handleError = () => {
    if (!photo.includes('?')) setSrc(`${photo}?_cb=${Date.now()}`);
  };
  return <img src={src} alt={alt} className={className} style={style} onLoad={onLoad} onError={handleError} />;
};

export default OnsitePhotoImg;
