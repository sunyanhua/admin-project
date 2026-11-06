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

// 阻断真实 API 模块链（src/api/index.ts 顶层依赖 localStorage，jsdom 下不可用）
vi.mock('@/api/services/user', () => ({
  userApi: {
    getCommunityUser: vi.fn(),
    getCommunityUserPrivacy: vi.fn(),
    auditMatchProfile: vi.fn(),
    getMatchProfile: vi.fn(),
  },
}));

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getRegisters: getRegistersMock,
    getPresigns: vi.fn().mockResolvedValue([]),
    getDetail: vi.fn().mockResolvedValue(ACTIVITY),
    update: vi.fn().mockResolvedValue({}),
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
  const renderModal = () =>
    render(
      <App>
        <OnsiteManageModal
          visible
          activityId="a1"
          activityTitle="测试活动"
          activity={ACTIVITY as any}
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
});
