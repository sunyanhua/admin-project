import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App, Tabs } from 'antd';
import OnsiteConfigTab from '@/components/operation/OnsiteConfigTab';

const ACTIVITY = vi.hoisted(() => ({
  id: 'a1',
  title: '测试活动',
  activity_type: 0,
  checkin_enabled: true,
  checkin_start: '2026-10-29T08:00:00Z',
  onsite_loves_chances: 3,
  onsite_config: JSON.stringify({ bg_screen: 'https://cdn.example.com/bg.png' }),
  extra_params: JSON.stringify({ onsite_qrcode: 'https://cdn.example.com/qr.png' }),
}));

// 模拟 activity-v1 服务：getDetail 返回含 onsite_config / extra_params 的活动
vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getDetail: vi.fn().mockResolvedValue(ACTIVITY),
    update: vi.fn().mockResolvedValue({}),
  },
}));

// 模拟 ImageUpload：仅回显 value（复现图片是否回填）
vi.mock('@/components/common/ImageUpload', () => ({
  default: ({ value }: { value?: string }) => (
    <span data-testid="image-upload-value">{value || '(空)'}</span>
  ),
}));

beforeAll(() => {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
});

const imageValues = () => screen.getAllByTestId('image-upload-value').map((n) => n.textContent);

describe('OnsiteConfigTab 回填', () => {
  it('传入列表数据（与编辑弹窗同源）时两张图片回填显示', async () => {
    render(
      <App>
        <OnsiteConfigTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    await waitFor(() => {
      expect(imageValues()).toContain('https://cdn.example.com/bg.png');
      expect(imageValues()).toContain('https://cdn.example.com/qr.png');
    });
  });

  it('穿过 Tabs 挂载时两张图片仍回填显示（现场弹窗实际结构）', async () => {
    render(
      <App>
        <Tabs
          activeKey="config"
          items={[
            { key: 'config', label: '现场配置', children: <OnsiteConfigTab activityId="a1" activity={ACTIVITY as any} /> },
            { key: 'list', label: '入选名单', children: <div>list</div> },
          ]}
        />
      </App>,
    );
    await waitFor(() => {
      expect(imageValues()).toContain('https://cdn.example.com/bg.png');
      expect(imageValues()).toContain('https://cdn.example.com/qr.png');
    });
  });

  it('未传列表数据时走详情接口兜底回填', async () => {
    render(
      <App>
        <OnsiteConfigTab activityId="a1" />
      </App>,
    );
    await waitFor(() => {
      expect(imageValues()).toContain('https://cdn.example.com/bg.png');
      expect(imageValues()).toContain('https://cdn.example.com/qr.png');
    });
  });
});
