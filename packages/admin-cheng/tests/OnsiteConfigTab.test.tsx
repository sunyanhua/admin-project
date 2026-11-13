import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

const updateMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

// 模拟 activity-v1 服务：getDetail 返回含 onsite_config / extra_params 的活动
vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getDetail: vi.fn().mockResolvedValue(ACTIVITY),
    update: updateMock,
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

beforeEach(() => {
  updateMock.mockClear();
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

describe('OnsiteConfigTab 用户显示配置', () => {
  it('未配置时「用户显示」默认选中昵称', async () => {
    render(
      <App>
        <OnsiteConfigTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    await waitFor(() => expect(screen.getByText('用户显示')).toBeInTheDocument());
    expect(screen.getByRole('radio', { name: '昵称' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '姓名' })).not.toBeChecked();
  });

  it('选择「姓名」保存：onsite_config 写入 user_display=real_name，其余键透传', async () => {
    render(
      <App>
        <OnsiteConfigTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    await waitFor(() => expect(screen.getByRole('radio', { name: '姓名' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('radio', { name: '姓名' }));
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    const payload = updateMock.mock.calls[0][1] as any;
    const cfg = JSON.parse(payload.onsite_config);
    expect(cfg.user_display).toBe('real_name');
    expect(cfg.bg_screen).toBe('https://cdn.example.com/bg.png');
  });

  it('回填已配置姓名的活动，改回「昵称」保存：移除 user_display 键', async () => {
    const namedActivity = {
      ...ACTIVITY,
      onsite_config: JSON.stringify({ bg_screen: 'https://cdn.example.com/bg.png', user_display: 'real_name' }),
    };
    render(
      <App>
        <OnsiteConfigTab activityId="a1" activity={namedActivity as any} />
      </App>,
    );
    // 回填为姓名选中
    await waitFor(() => expect(screen.getByRole('radio', { name: '姓名' })).toBeChecked());

    fireEvent.click(screen.getByRole('radio', { name: '昵称' }));
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    const payload = updateMock.mock.calls[0][1] as any;
    const cfg = JSON.parse(payload.onsite_config);
    expect(cfg.user_display).toBeUndefined();
    expect(cfg.bg_screen).toBe('https://cdn.example.com/bg.png');
  });
});
