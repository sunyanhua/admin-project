import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import OnsiteManageModal from '@/components/operation/OnsiteManageModal';

const ACTIVITY = vi.hoisted(() => ({
  id: 'a1',
  title: '测试活动',
  activity_type: 0,
  // 签到开始时间已过 → 默认落在「入选名单」TAB
  checkin_start: '2026-11-05T12:00:00+08:00',
  onsite_config: '{}',
  extra_params: '{}',
}));

const REGISTERS = vi.hoisted(() => [
  {
    id: 'r1',
    user_id: 'u1',
    onsite_number: 1,
    user_profile: { nickname: '张三', gender: 1 },
    user_match_profile: { real_name: '张三', is_real_verified: true },
    audit_status: 1,
    checkin_at: '2026-11-05T12:30:00+08:00',
  },
  {
    id: 'r2',
    user_id: 'u2',
    onsite_number: 2,
    user_profile: { nickname: '李四', gender: 2 },
    user_match_profile: { real_name: '李四', is_real_verified: false },
    audit_status: 1,
    checkin_at: null,
  },
]);

const getRegistersMock = vi.hoisted(() => vi.fn().mockResolvedValue(REGISTERS));
const adjustReliabilityMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const updateMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const getDetailMock = vi.hoisted(() => vi.fn().mockResolvedValue(ACTIVITY));

// 阻断真实 API 模块链（src/api/index.ts 顶层依赖 localStorage，jsdom 下不可用）
vi.mock('@/api/services/user', () => ({
  userApi: {
    getCommunityUser: vi.fn(),
    getCommunityUserPrivacy: vi.fn(),
    auditMatchProfile: vi.fn(),
    getMatchProfile: vi.fn(),
    adjustReliabilityScore: adjustReliabilityMock,
  },
}));

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getRegisters: getRegistersMock,
    getPresigns: vi.fn().mockResolvedValue([]),
    getDetail: getDetailMock,
    update: updateMock,
    getRegisterUser: vi.fn(),
    getRegisterUserPrivacy: vi.fn(),
    checkinRegister: vi.fn(),
    updateOnsiteNumber: vi.fn(),
    clearOnsiteNumber: vi.fn(),
    assignOnsiteNumbers: vi.fn(),
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
  getRegistersMock.mockClear();
  adjustReliabilityMock.mockClear();
  updateMock.mockClear();
  getDetailMock.mockClear();
  getDetailMock.mockImplementation(() => Promise.resolve(ACTIVITY));
});

/** 打开签到状态下拉并选择指定选项（rc-select 选项带 title 属性，避开状态列同名 Tag 文本） */
const selectCheckStatus = async (label: string) => {
  const selector = document.querySelector('.ant-select-selector');
  expect(selector).not.toBeNull();
  fireEvent.mouseDown(selector!);
  const option = await screen.findByTitle(label);
  await userEvent.click(option);
};

describe('OnsiteManageModal 入选名单签到筛选', () => {
  const renderModal = (activity?: any) =>
    render(
      <App>
        <OnsiteManageModal
          visible
          activityId="a1"
          activityTitle="测试活动"
          activity={(activity ?? ACTIVITY) as any}
          onClose={vi.fn()}
        />
      </App>,
    );

  it('签到筛选下拉包含「已签到」「未签到」两个选项', async () => {
    renderModal();
    // 等入选名单加载完成（张三出现在列表）
    await waitFor(() => expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0));

    fireEvent.mouseDown(document.querySelector('.ant-select-selector')!);
    await waitFor(() => {
      expect(screen.getByTitle('已签到')).toBeInTheDocument();
      expect(screen.getByTitle('未签到')).toBeInTheDocument();
    });
  });

  it('默认不过滤签到状态（checked_in 不传）', async () => {
    renderModal();
    await waitFor(() => expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0));

    const calls = getRegistersMock.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    calls.forEach((call) => {
      expect(call[1].checked_in).toBeUndefined();
    });
  });

  it('选择「未签到」后按 checked_in=false 查询', async () => {
    renderModal();
    await waitFor(() => expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0));
    getRegistersMock.mockClear();

    await selectCheckStatus('未签到');

    await waitFor(() => {
      expect(getRegistersMock).toHaveBeenCalledWith('a1', expect.objectContaining({ checked_in: false }));
    });
  });

  it('选择「已签到」后按 checked_in=true 查询', async () => {
    renderModal();
    await waitFor(() => expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0));
    getRegistersMock.mockClear();

    await selectCheckStatus('已签到');

    await waitFor(() => {
      expect(getRegistersMock).toHaveBeenCalledWith('a1', expect.objectContaining({ checked_in: true }));
    });
  });

  it('扣分按钮仅在「未签到」筛选下显示', async () => {
    renderModal();
    await waitFor(() => expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0));
    // 未选中未签到时不显示
    expect(screen.queryByRole('button', { name: /扣分/ })).toBeNull();

    await selectCheckStatus('未签到');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /扣分/ })).toBeInTheDocument();
    });
  }, 30000);

  it('扣分弹窗默认 10 分：确认后按 -10 逐条扣除未签到用户靠谱值', async () => {
    renderModal();
    await waitFor(() => expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0));
    await selectCheckStatus('未签到');

    fireEvent.click(screen.getByRole('button', { name: /扣分/ }));
    await screen.findByText('扣除未签到用户靠谱值');
    // 默认扣除值 10：扣分弹窗是嵌套弹窗（DOM 中最后一个 .ant-modal），外层弹窗序号列也有数字输入框
    await waitFor(() => {
      const modals = document.querySelectorAll('.ant-modal');
      const deductModal = modals[modals.length - 1] as HTMLElement | undefined;
      const scoreInput = deductModal?.querySelector('.ant-input-number input') as HTMLInputElement | null;
      expect(scoreInput?.value).toBe('10');
    });

    fireEvent.click(screen.getByRole('button', { name: /确认扣分/ }));

    await waitFor(() => {
      expect(adjustReliabilityMock).toHaveBeenCalledTimes(2);
    });
    expect(adjustReliabilityMock).toHaveBeenCalledWith('u1', -10, expect.stringContaining('测试活动'));
    expect(adjustReliabilityMock).toHaveBeenCalledWith('u2', -10, expect.stringContaining('测试活动'));
    // 扣分完成后将活动标记为已完成扣分（写入 onsite_config.deduct_done_at）
    await waitFor(() => {
      const markCall = updateMock.mock.calls.find((c: any[]) =>
        typeof c?.[1]?.onsite_config === 'string' && c[1].onsite_config.includes('deduct_done_at'));
      expect(markCall).toBeTruthy();
    });
  }, 30000);

  it('已完成扣分的活动：未签到筛选下显示标记且不再提供扣分按钮', async () => {
    const marked = { ...ACTIVITY, onsite_config: JSON.stringify({ deduct_done_at: '2026-11-10T10:00:00+08:00' }) };
    // 弹窗打开即重拉详情——mock 返回带标记的最新数据
    getDetailMock.mockImplementation(() => Promise.resolve(marked));
    renderModal(marked);
    await waitFor(() => expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0));
    await selectCheckStatus('未签到');

    await waitFor(() => {
      expect(screen.getByText('已完成扣分')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /扣分/ })).toBeNull();
  }, 30000);
});
