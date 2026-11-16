import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ActivityOnsite from '@/pages/operation/ActivityOnsite';

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
});

/** 签到墙名单（含签到时间，构建 wall 用） */
const WALL_RECORDS = vi.hoisted(() => [
  { id: 'reg1', user_id: 'u1', gender: 1, onsite_number: 1, checkin_at: '2026-11-16T10:00:00+08:00', extra_data: '{}', user_profile: { nickname: '甲', avatar: '' } },
  { id: 'reg2', user_id: 'u2', gender: 2, onsite_number: 2, checkin_at: '2026-11-16T10:01:00+08:00', extra_data: '{}', user_profile: { nickname: '乙', avatar: '' } },
]);

/** 一对互相心动（池非空：旧行为 ↓ 直接推进不重拉，新行为每次 ↓ 都重拉） */
const COUPLE = vi.hoisted(() => ({
  couple_id: 'cp1', onsite_loves_count: 1, female_loves_count: 1, male_loves_count: 1,
  female: { onsite_number: 2, profile: { nickname: '乙', avatar: '' }, user: { user_id: 'u2' } },
  male: { onsite_number: 1, profile: { nickname: '甲', avatar: '' }, user: { user_id: 'u1' } },
}));

const getRegistersMock = vi.hoisted(() => vi.fn().mockResolvedValue(WALL_RECORDS));
const getOnsiteLovesCouplesMock = vi.hoisted(() => vi.fn().mockResolvedValue([COUPLE]));

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getDetail: vi.fn().mockResolvedValue({ onsite_config: '{}' }),
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
});
