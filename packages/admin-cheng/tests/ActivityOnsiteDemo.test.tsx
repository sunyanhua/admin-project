import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ActivityOnsite from '@/pages/operation/ActivityOnsite';
import { activityApi } from '@/api/services/activity-v1';

afterEach(() => {
  vi.useRealTimers();
});

/** 演示模式竞态复现：初始加载的真实签到墙取数挂起（迟到返回），按 0 进入演示后迟到的真实数据不得覆盖演示墙 */
const mocks = vi.hoisted(() => {
  let resolveReal!: (v: unknown) => void;
  const realDeferred = new Promise((res) => { resolveReal = res; });
  return {
    /** 演示取数（audit_status=1 入选用户，未签到）立即返回 */
    demoRecords: [
      { user_id: 'u-demo-1', gender: 1, onsite_number: 1, user_profile: { nickname: '演示甲', avatar: 'https://cdn.example.com/a1.jpg' }, extra_data: '{}' },
      { user_id: 'u-demo-2', gender: 2, onsite_number: 2, user_profile: { nickname: '演示乙', avatar: 'https://cdn.example.com/a2.jpg' }, extra_data: '{}' },
    ],
    /** 真实签到墙取数挂起，测试最后才返回 */
    realDeferred,
    resolveReal: (v: unknown) => resolveReal(v),
  };
});

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getDetail: vi.fn().mockResolvedValue({ onsite_config: '{}' }),
    getRegisters: vi.fn((_id: string, params?: { audit_status?: number }) =>
      (params?.audit_status === 1 ? Promise.resolve(mocks.demoRecords) : mocks.realDeferred)),
    getOnsiteLovesCouples: vi.fn().mockResolvedValue([]),
    getOnsitePairings: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/api/services/user', () => ({
  userApi: { getUserDetail: vi.fn().mockResolvedValue({}) },
}));

describe('ActivityOnsite 演示模式', () => {
  it('进入演示后，迟到的真实签到墙取数不覆盖演示名单', async () => {
    // Arrange
    render(
      <App>
        <MemoryRouter initialEntries={['/activity-onsite/a1']}>
          <Routes>
            <Route path="/activity-onsite/:id" element={<ActivityOnsite />} />
          </Routes>
        </MemoryRouter>
      </App>,
    );

    // Act：初始真实取数仍在途时按 0 进入演示模式
    fireEvent.keyDown(document.body, { key: '0' });
    await screen.findByText('演示模式');
    expect(screen.getByAltText('演示甲')).toBeInTheDocument();

    // 初始加载的真实签到数据此刻才返回（迟到的响应）
    await act(async () => {
      mocks.resolveReal([
        { user_id: 'u-real-1', checkin_at: '2026-11-13T08:00:00Z', gender: 2, onsite_number: 3, user_profile: { nickname: '签到乙', avatar: 'https://cdn.example.com/a3.jpg' }, extra_data: '{}' },
      ]);
    });

    // Assert：演示墙保持不动，真实签到用户不得上墙
    await waitFor(() => {
      expect(screen.getByAltText('演示甲')).toBeInTheDocument();
      expect(screen.getByAltText('演示乙')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.queryByAltText('签到乙')).toBeNull();
    expect(screen.getByText('演示模式')).toBeInTheDocument();
  });

  it('演示中后台分组变更触发的重建迟到落地时，退出演示后不覆盖真实墙', async () => {
    vi.useFakeTimers();
    const getDetailMock = vi.mocked(activityApi.getDetail);
    const getRegistersMock = vi.mocked(activityApi.getRegisters);
    // 首次读取无分组；第 2 次起返回新分组 → 10s 轮询触发演示重建
    let detailCalls = 0;
    getDetailMock.mockReset().mockImplementation(() =>
      Promise.resolve({ onsite_config: JSON.stringify(detailCalls++ === 0 ? {} : { groups: '甲组|乙组' }) }));
    // 演示取数：第 1 次（按 0）立即返回；第 2 次（轮询重建）挂起，退出演示后才落地
    let demoCalls = 0;
    let resolveDemo2!: (v: unknown) => void;
    const demoDeferred2 = new Promise((res) => { resolveDemo2 = res; });
    // 真实取数：本测试独立挂起，退出演示后先落地
    let resolveReal2!: (v: unknown) => void;
    const realDeferred2 = new Promise((res) => { resolveReal2 = res; });
    getRegistersMock.mockImplementation((_id: string, params?: { audit_status?: number }) => {
      if (params?.audit_status === 1) {
        demoCalls++;
        return demoCalls === 1 ? Promise.resolve(mocks.demoRecords) : demoDeferred2;
      }
      return realDeferred2;
    });

    render(
      <App>
        <MemoryRouter initialEntries={['/activity-onsite/a1']}>
          <Routes>
            <Route path="/activity-onsite/:id" element={<ActivityOnsite />} />
          </Routes>
        </MemoryRouter>
      </App>,
    );

    // 进入演示模式
    fireEvent.keyDown(document.body, { key: '0' });
    await act(async () => {});
    expect(screen.getByText('演示模式')).toBeInTheDocument();

    // 10s 轮询读到新分组 → 触发演示重建（挂起中）
    await act(async () => { vi.advanceTimersByTime(10000); });

    // 退出演示 → 真实签到墙落地
    fireEvent.keyDown(document.body, { key: '0' });
    await act(async () => { resolveReal2([
      { user_id: 'u-real-1', checkin_at: '2026-11-13T08:00:00Z', gender: 2, onsite_number: 3, user_profile: { nickname: '签到乙', avatar: 'https://cdn.example.com/a3.jpg' }, extra_data: '{}' },
    ]); });
    expect(screen.getByAltText('签到乙')).toBeInTheDocument();

    // 迟到的演示重建此刻才返回 → 不得覆盖真实墙
    await act(async () => { resolveDemo2(mocks.demoRecords); });
    expect(screen.getByAltText('签到乙')).toBeInTheDocument();
    expect(screen.queryByAltText('演示甲')).toBeNull();
    expect(screen.queryByText('演示模式')).toBeNull();
  });
});
