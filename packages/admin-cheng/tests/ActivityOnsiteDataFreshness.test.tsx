import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ActivityOnsite from '@/pages/operation/ActivityOnsite';

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
});

/** 签到墙名单（含签到时间，构建 wall 用；甲有 vbegin 头像、乙无头像） */
const WALL_RECORDS = vi.hoisted(() => [
  { id: 'reg1', user_id: 'u1', gender: 1, onsite_number: 1, checkin_at: '2026-11-16T10:00:00+08:00', extra_data: '{}', user_profile: { nickname: '甲', avatar: 'https://img.vbegin.com.cn/a.jpg' } },
  { id: 'reg2', user_id: 'u2', gender: 2, onsite_number: 2, checkin_at: '2026-11-16T10:01:00+08:00', extra_data: '{}', user_profile: { nickname: '乙', avatar: '' } },
]);

/** 两对互相心动（互不共享用户） */
const COUPLE = vi.hoisted(() => ({
  couple_id: 'cp1', onsite_loves_count: 1, female_loves_count: 1, male_loves_count: 1,
  female: { onsite_number: 2, profile: { nickname: '乙', avatar: '' }, user: { user_id: 'u2' } },
  male: { onsite_number: 1, profile: { nickname: '甲', avatar: '' }, user: { user_id: 'u1' } },
}));
const COUPLE2 = vi.hoisted(() => ({
  couple_id: 'cp2', onsite_loves_count: 1, female_loves_count: 1, male_loves_count: 1,
  female: { onsite_number: 4, profile: { nickname: '丁', avatar: '' }, user: { user_id: 'u4' } },
  male: { onsite_number: 3, profile: { nickname: '丙', avatar: '' }, user: { user_id: 'u3' } },
}));

const getRegistersMock = vi.hoisted(() => vi.fn().mockResolvedValue(WALL_RECORDS));
const getOnsiteLovesCouplesMock = vi.hoisted(() => vi.fn().mockResolvedValue([COUPLE, COUPLE2]));
const getDetailMock = vi.hoisted(() => vi.fn().mockResolvedValue({ onsite_config: '{}' }));

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getDetail: getDetailMock,
    getRegisters: getRegistersMock,
    getOnsiteLovesCouples: getOnsiteLovesCouplesMock,
    getOnsitePairings: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/api/services/user', () => ({
  userApi: { getUserDetail: vi.fn().mockResolvedValue({}) },
}));

const renderPage = () => render(
  <App>
    <MemoryRouter initialEntries={['/activity-onsite/a1']}>
      <Routes>
        <Route path="/activity-onsite/:id" element={<ActivityOnsite />} />
      </Routes>
    </MemoryRouter>
  </App>,
);

describe('ActivityOnsite 数据新鲜度', () => {
  it('心动互选：每次按 ↓ 都重新拉取一次最新配对', async () => {
    renderPage();
    // 等初始加载完成
    await waitFor(() => expect(getOnsiteLovesCouplesMock).toHaveBeenCalled());
    const afterInit = getOnsiteLovesCouplesMock.mock.calls.length;
    // 进入心动互选（2）：拉取一次
    fireEvent.keyDown(document.body, { key: '2' });
    await waitFor(() => expect(getOnsiteLovesCouplesMock.mock.calls.length).toBe(afterInit + 1));
    // 第一次 ↓：再拉取一次
    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    await waitFor(() => expect(getOnsiteLovesCouplesMock.mock.calls.length).toBe(afterInit + 2));
    // 第二次 ↓：仍然再拉取一次
    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    await waitFor(() => expect(getOnsiteLovesCouplesMock.mock.calls.length).toBe(afterInit + 3));
  });

  it('各组代表(6)与单组选人(8)：进入时刷新签到名单', async () => {
    renderPage();
    await waitFor(() => expect(getRegistersMock).toHaveBeenCalled());
    const baseline = getRegistersMock.mock.calls.length;
    // 按 6 进入各组代表：应重新拉取签到名单
    fireEvent.keyDown(document.body, { key: '6' });
    await waitFor(() => expect(getRegistersMock.mock.calls.length).toBeGreaterThan(baseline));
    const afterSix = getRegistersMock.mock.calls.length;
    // 按 8 进入单组选人：同样重新拉取
    fireEvent.keyDown(document.body, { key: '8' });
    await waitFor(() => expect(getRegistersMock.mock.calls.length).toBeGreaterThan(afterSix));
  });

  it('心动互选：已加载的组合用↑↓来回切换，仅在末尾再按↓才拉取新配对', async () => {
    renderPage();
    await waitFor(() => expect(getOnsiteLovesCouplesMock).toHaveBeenCalled());
    const afterInit = getOnsiteLovesCouplesMock.mock.calls.length;
    fireEvent.keyDown(document.body, { key: '2' });
    await waitFor(() => expect(getOnsiteLovesCouplesMock.mock.calls.length).toBe(afterInit + 1));
    // ↓ 第一对（拉新）
    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    await waitFor(() => expect(getOnsiteLovesCouplesMock.mock.calls.length).toBe(afterInit + 2));
    // ↓ 第二对（拉新）
    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    await waitFor(() => expect(getOnsiteLovesCouplesMock.mock.calls.length).toBe(afterInit + 3));
    // ↑ 回第一对（不拉新）
    fireEvent.keyDown(document.body, { key: 'ArrowUp' });
    // ↓ 应回到第二对（历史内切换，不拉新）
    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    await waitFor(() => expect(getOnsiteLovesCouplesMock.mock.calls.length).toBe(afterInit + 3));
    // 末尾再按 ↓ 才拉新（无新对 → 耗尽提示）
    fireEvent.keyDown(document.body, { key: 'ArrowDown' });
    await waitFor(() => expect(getOnsiteLovesCouplesMock.mock.calls.length).toBe(afterInit + 4));
    await waitFor(() => expect(screen.getByText('暂无更多互相心动的CP')).toBeInTheDocument());
  }, 30000);

  it('嘉宾展示墙照片挂载即带 _cb 缓存击穿参数', async () => {
    renderPage();
    const img = await screen.findByAltText('甲');
    expect((img as HTMLImageElement).src).toContain('_cb=');
  });

  it('按键 1/6/8 进入时先刷新分组配置（消除 10 秒轮询窗口）', async () => {
    renderPage();
    await waitFor(() => expect(getRegistersMock).toHaveBeenCalled());
    // 等初始轮询外的一切就绪：记录 getDetail 基数（初始加载 + 可能已发生的轮询）
    const baseline = getDetailMock.mock.calls.length;
    fireEvent.keyDown(document.body, { key: '1' });
    await waitFor(() => expect(getDetailMock.mock.calls.length).toBe(baseline + 1));
    fireEvent.keyDown(document.body, { key: '6' });
    await waitFor(() => expect(getDetailMock.mock.calls.length).toBe(baseline + 2));
    fireEvent.keyDown(document.body, { key: '8' });
    await waitFor(() => expect(getDetailMock.mock.calls.length).toBe(baseline + 3));
  });

  it('人员换组信号：轮询检测 groups_updated_at 变化后重建签到墙', async () => {
    vi.useFakeTimers();
    getDetailMock.mockResolvedValue({
      onsite_config: JSON.stringify({ groups: '甲组|乙组', groups_updated_at: '2026-11-16T10:00:00+08:00' }),
    });
    renderPage();
    // 初始加载（含首次 refreshConfig + 数据源拉取）
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    const baseline = getRegistersMock.mock.calls.length;
    // 模拟后台保存人员换组：groups_updated_at 变化（组名不变）
    getDetailMock.mockResolvedValue({
      onsite_config: JSON.stringify({ groups: '甲组|乙组', groups_updated_at: '2026-11-16T10:01:00+08:00' }),
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(getRegistersMock.mock.calls.length).toBeGreaterThan(baseline);
    vi.useRealTimers();
  });
});
