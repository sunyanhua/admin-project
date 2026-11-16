import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import ZoneApplicationReviewModal from '@/components/operation/ZoneApplicationReviewModal';

const APPLICATION = vi.hoisted(() => ({
  id: 'a1', zone_id: 'z1', user_id: 'u1', status: 0,
  form_data: JSON.stringify({ field_photo: '文字说明' }),
  attachments: [
    { file_type: 1, url: 'https://img.vbegin.com.cn/photo.jpg', tags: 'field_photo' },
    { file_type: 1, url: 'https://img.vbegin.com.cn/other.jpg', tags: '' },
    { file_type: 3, url: 'https://img.vbegin.com.cn/v.mp4', tags: '' },
  ],
  user_profile: { nickname: '张三', avatar: '', gender: 1, age: 28 },
}));

const getDetailMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  id: 'z1',
  form_config: JSON.stringify([{ id: 'field_photo', label: '照片', type: 'image' }]),
}));

vi.mock('@/api/services/zone', () => ({
  zoneApi: { getDetail: getDetailMock, review: vi.fn(), revoke: vi.fn() },
}));

describe('ZoneApplicationReviewModal 附件展示', () => {
  it('图片附件内联用缩略图地址（/512.0），点击预览仍用原图；音频/视频附件渲染为链接', async () => {
    render(
      <App>
        <ZoneApplicationReviewModal
          visible
          zoneId="z1"
          application={APPLICATION as any}
          readonly
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      </App>,
    );
    await waitFor(() => expect(getDetailMock).toHaveBeenCalledWith('z1'));
    await screen.findByText(/照片/);
    // 字段附件：内联缩略图
    const imgs = document.querySelectorAll('.ant-image img');
    expect(imgs.length).toBeGreaterThanOrEqual(2);
    const fieldImg = Array.from(imgs).find((i) => (i as HTMLImageElement).src.includes('photo.jpg'));
    expect(fieldImg).toBeTruthy();
    expect((fieldImg as HTMLImageElement).src).toContain('/512.0');
    // 视频附件：链接
    expect(screen.getByText('视频')).toBeTruthy();
  });
});
