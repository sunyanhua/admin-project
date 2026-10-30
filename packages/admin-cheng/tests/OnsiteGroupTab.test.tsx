import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import OnsiteGroupTab from '@/components/operation/OnsiteGroupTab';

const ACTIVITY = vi.hoisted(() => ({
  id: 'a1',
  title: '测试活动',
  activity_type: 0,
  onsite_config: JSON.stringify({ bg_screen: 'https://cdn.example.com/bg.png', groups: 'A|B|C' }),
}));

const updateMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getDetail: vi.fn().mockResolvedValue(ACTIVITY),
    update: updateMock,
  },
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

describe('OnsiteGroupTab', () => {
  it('回填 onsite_config.groups 到分组名称输入框', async () => {
    render(
      <App>
        <OnsiteGroupTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    await waitFor(() => {
      const input = screen.getByPlaceholderText('A|B|C|D|E|F|G') as HTMLInputElement;
      expect(input.value).toBe('A|B|C');
    });
  });

  it('保存时 onsite_config 原对象透传——仅更新 groups 键，其他内容保留', async () => {
    render(
      <App>
        <OnsiteGroupTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    await waitFor(() => {
      const input = screen.getByPlaceholderText('A|B|C|D|E|F|G') as HTMLInputElement;
      expect(input.value).toBe('A|B|C');
    });
    const input = screen.getByPlaceholderText('A|B|C|D|E|F|G') as HTMLInputElement;
    await userEvent.clear(input);
    await userEvent.type(input, 'A|B|C|D');
    await userEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
      const payload = updateMock.mock.calls[0][1];
      const obj = JSON.parse(payload.onsite_config);
      expect(obj.groups).toBe('A|B|C|D');
      expect(obj.bg_screen).toBe('https://cdn.example.com/bg.png'); // 原有内容保留
    });
  });
});
