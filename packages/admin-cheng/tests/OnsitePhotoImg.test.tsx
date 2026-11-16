import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import OnsitePhotoImg from '@/components/operation/OnsitePhotoImg';

describe('OnsitePhotoImg 大屏照片图片', () => {
  it('挂载即带 _cb 缓存击穿参数（绕开磁盘缓存）', () => {
    const { container } = render(<OnsitePhotoImg photo="https://img.vbegin.com.cn/p.jpg" alt="甲" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.src).toContain('_cb=');
    expect(img.src).toContain('p.jpg');
  });

  it('加载失败时换新的 _cb 参数重试', () => {
    const { container } = render(<OnsitePhotoImg photo="https://img.vbegin.com.cn/p.jpg" alt="甲" />);
    const img = container.querySelector('img') as HTMLImageElement;
    const before = img.src;
    fireEvent.error(img);
    expect(img.src).not.toBe(before);
    expect(img.src).toContain('_cb=');
  });

  it('带查询参数的地址（可能为签名）不加缓存击穿参数', () => {
    const { container } = render(<OnsitePhotoImg photo="https://cdn.example.com/p.jpg?sig=abc" alt="甲" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.src).toBe('https://cdn.example.com/p.jpg?sig=abc');
    fireEvent.error(img);
    expect(img.src).toBe('https://cdn.example.com/p.jpg?sig=abc');
  });

  it('空地址不渲染 img', () => {
    const { container } = render(<OnsitePhotoImg photo="" alt="甲" />);
    expect(container.querySelector('img')).toBeNull();
  });
});
