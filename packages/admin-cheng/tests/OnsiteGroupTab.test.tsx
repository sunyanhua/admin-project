import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import OnsiteGroupTab from '@/components/operation/OnsiteGroupTab';

const ACTIVITY = vi.hoisted(() => ({
  id: 'a1',
  title: '测试活动',
  activity_type: 0,
  onsite_config: JSON.stringify({ bg_screen: 'https://cdn.example.com/bg.png', groups: 'A|B|C' }),
}));

const REGISTERS = vi.hoisted(() => [
  {
    id: 'r1',
    user_id: 'u1',
    onsite_number: 1,
    user_profile: { nickname: '张三', gender: 1, age: 28 },
    user_match_profile: { real_name: '张三' },
    extra_data: JSON.stringify({ foo: 'bar' }),
    form_data: '{}',
    attachments: [],
    audit_status: 1,
    pay_status: 0,
    gender: 1,
  },
  {
    id: 'r2',
    user_id: 'u2',
    onsite_number: 2,
    user_profile: { nickname: '李四', gender: 2, age: 26 },
    user_match_profile: { real_name: '李四' },
    extra_data: '',
    form_data: '{}',
    attachments: [],
    audit_status: 1,
    pay_status: 0,
    gender: 2,
  },
  {
    // 免报名入选：user_id 为 null（后端「可取 null」），验证排序与分配不崩溃
    id: 'r3',
    user_id: null,
    onsite_number: 3,
    user_profile: undefined,
    user_match_profile: undefined,
    extra_data: '',
    form_data: '{}',
    attachments: [],
    audit_status: 1,
    pay_status: 0,
    gender: 1,
    presign_real_name: '王五',
  },
]);

const updateMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const updateExtraMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getDetail: vi.fn().mockResolvedValue(ACTIVITY),
    update: updateMock,
    getRegisters: vi.fn().mockResolvedValue(REGISTERS),
    getOnsitePairings: vi.fn().mockResolvedValue([]),
    updateRegisterExtraData: updateExtraMock,
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
  updateExtraMock.mockClear();
});

/** 按按钮完整文字查找（忽略 antd 两字按钮插空格与图标名） */
const btnByText = (text: string) =>
  screen.getAllByRole('button').find((b) => (b.textContent || '').replace(/\s/g, '') === text)!;

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

  it('保存分组名称时 onsite_config 原对象透传——仅更新 groups 键，其他内容保留', async () => {
    render(
      <App>
        <OnsiteGroupTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    const input = await screen.findByPlaceholderText('A|B|C|D|E|F|G') as HTMLInputElement;
    // 等回填定时器稳定后直接改写值
    await waitFor(() => expect(input.value).toBe('A|B|C'));
    fireEvent.change(input, { target: { value: 'A|B|C|D' } });
    await userEvent.click(btnByText('保存'));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
      const payload = updateMock.mock.calls[0][1];
      const obj = JSON.parse(payload.onsite_config);
      expect(obj.groups).toBe('A|B|C|D');
      expect(obj.bg_screen).toBe('https://cdn.example.com/bg.png');
    });
  });

  it('快速设置：默认汉字 + 组数自动生成分组名称', async () => {
    render(
      <App>
        <OnsiteGroupTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    const input = await screen.findByPlaceholderText('A|B|C|D|E|F|G') as HTMLInputElement;
    const countInput = screen.getByPlaceholderText('组数') as HTMLInputElement;
    await userEvent.clear(countInput);
    await userEvent.type(countInput, '3');
    await userEvent.click(btnByText('应用'));
    await waitFor(() => {
      expect(input.value).toBe('一|二|三');
    });
  });

  it('快速设置：汉字 11 组生成 一|…|十一', async () => {
    render(
      <App>
        <OnsiteGroupTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    const input = await screen.findByPlaceholderText('A|B|C|D|E|F|G') as HTMLInputElement;
    const countInput = screen.getByPlaceholderText('组数') as HTMLInputElement;
    await userEvent.clear(countInput);
    await userEvent.type(countInput, '11');
    await userEvent.click(btnByText('应用'));
    await waitFor(() => {
      expect(input.value).toContain('十一');
      expect(input.value.startsWith('一|二|')).toBe(true);
    });
  });

  it('点击自动分组后成员卡片进入各组列（不再留在未分组）', async () => {
    render(
      <App>
        <OnsiteGroupTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    await waitFor(() => {
      expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0);
    });
    // 分组前：张三在「未分组」列
    expect(screen.getByText('未分组').parentElement?.parentElement?.textContent).toContain('张三');
    await userEvent.click(btnByText('自动分组'));
    await waitFor(() => {
      // 分组后：未分组列不再包含张三
      const ungrouped = screen.getByText('未分组').parentElement?.parentElement?.textContent || '';
      expect(ungrouped).not.toContain('张三');
    });
  });

  it('自动分组后保存分组：逐条更新 extra_data 且原有键保留', async () => {
    render(
      <App>
        <OnsiteGroupTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    // 等成员加载（卡片中张三出现两处：昵称行与姓名行）
    await waitFor(() => {
      expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0);
    });
    await userEvent.click(btnByText('自动分组'));
    await userEvent.click(btnByText('保存分组'));

    await waitFor(() => {
      expect(updateExtraMock).toHaveBeenCalledTimes(3);
    });
    const first = updateExtraMock.mock.calls[0];
    expect(first[0]).toBe('a1');
    expect(first[1]).toBe('r1');
    const obj = JSON.parse(first[2]);
    expect(obj.group_index).toBeGreaterThanOrEqual(1);
    expect(['A', 'B', 'C']).toContain(obj.group_name);
    expect(obj.foo).toBe('bar'); // 原有 extra_data 内容保留
  });

  it('保存分组名称后触发 onSaved 回调（弹窗层据此同步刷新其它 TAB）', async () => {
    const onSaved = vi.fn();
    render(
      <App>
        <OnsiteGroupTab activityId="a1" activity={ACTIVITY as any} onSaved={onSaved} />
      </App>,
    );
    const input = await screen.findByPlaceholderText('A|B|C|D|E|F|G') as HTMLInputElement;
    await waitFor(() => expect(input.value).toBe('A|B|C'));
    fireEvent.change(input, { target: { value: 'A|B|C|D' } });
    await userEvent.click(btnByText('保存'));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });
});
