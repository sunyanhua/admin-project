/**
 * 画布裁切工具：将 react-easy-crop 的 croppedAreaPixels 区域从源图裁出。
 * 仅支持缩放+拖拽（无旋转），坐标可直接映射到自然像素。
 */

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.src = url;
  });

/**
 * 从源图裁出指定区域并输出为 JPEG Blob
 * @param imageSrc 源图（objectURL / 图片 URL）
 * @param pixelCrop 自然像素坐标的裁切区域
 * @param quality 输出质量 0-1
 */
export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: PixelCrop,
  quality = 0.9,
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('浏览器不支持 Canvas');

  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片裁切失败'))),
      'image/jpeg',
      quality,
    );
  });
};

export default getCroppedImg;
