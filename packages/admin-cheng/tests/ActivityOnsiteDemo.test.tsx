import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { App } from 'antd';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ActivityOnsite from '@/pages/operation/ActivityOnsite';
import { activityApi } from '@/api/services/activity-v1';

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
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

  it('编排步骤填写流程名称时，大屏环节名显示该名称', async () => {
    vi.mocked(activityApi.getDetail).mockReset().mockResolvedValue({
      onsite_config: JSON.stringify({
        groups: '甲组|乙组',
        routine: [{ type: 'groupDraw', count: 1, name: '第一轮组队' }],
      }),
    });
    vi.mocked(activityApi.getRegisters).mockReset().mockImplementation((_id: string, params?: { audit_status?: number }) =>
      Promise.resolve(params?.audit_status === 1 ? mocks.demoRecords : []));

    render(
      <App>
        <MemoryRouter initialEntries={['/activity-onsite/a1']}>
          <Routes>
            <Route path="/activity-onsite/:id" element={<ActivityOnsite />} />
          </Routes>
        </MemoryRouter>
      </App>,
    );

    // 等待编排配置回填（工具区出现「流程编排(9)」入口）后按 9 进入编排执行
    await waitFor(() => expect(screen.getByText('流程编排(9)')).toBeInTheDocument());
    fireEvent.keyDown(document.body, { key: '9' });
    await waitFor(() => expect(screen.getByText('第一轮组队')).toBeInTheDocument());
    expect(screen.queryByText('组中抽组')).toBeNull();
  });

  it('编排步骤未填写流程名称时，大屏显示默认环节名', async () => {
    vi.mocked(activityApi.getDetail).mockReset().mockResolvedValue({
      onsite_config: JSON.stringify({
        groups: '甲组|乙组',
        routine: [{ type: 'groupDraw', count: 1 }],
      }),
    });
    vi.mocked(activityApi.getRegisters).mockReset().mockImplementation((_id: string, params?: { audit_status?: number }) =>
      Promise.resolve(params?.audit_status === 1 ? mocks.demoRecords : []));

    render(
      <App>
        <MemoryRouter initialEntries={['/activity-onsite/a1']}>
          <Routes>
            <Route path="/activity-onsite/:id" element={<ActivityOnsite />} />
          </Routes>
        </MemoryRouter>
      </App>,
    );

    await waitFor(() => expect(screen.getByText('流程编排(9)')).toBeInTheDocument());
    fireEvent.keyDown(document.body, { key: '9' });
    await waitFor(() => expect(screen.getByText('组中抽组')).toBeInTheDocument());
    expect(screen.queryByText('第一轮组队')).toBeNull();
  });

  it('各组代表滚动时每个转轮上方显示组名', async () => {
    vi.mocked(activityApi.getDetail).mockReset().mockResolvedValue({
      onsite_config: JSON.stringify({ groups: '甲组|乙组' }),
    });
    vi.mocked(activityApi.getRegisters).mockReset().mockImplementation((_id: string, params?: { audit_status?: number }) =>
      Promise.resolve(params?.audit_status === 1 ? mocks.demoRecords : [
        { user_id: 'u1', checkin_at: '2026-11-13T08:00:00Z', gender: 1, onsite_number: 1, user_profile: { nickname: '张三', avatar: 'https://cdn.example.com/a1.jpg' }, extra_data: '{"group_index":1}' },
        { user_id: 'u2', checkin_at: '2026-11-13T08:00:00Z', gender: 2, onsite_number: 2, user_profile: { nickname: '李四', avatar: 'https://cdn.example.com/a2.jpg' }, extra_data: '{"group_index":2}' },
      ]));

    render(
      <App>
        <MemoryRouter initialEntries={['/activity-onsite/a1']}>
          <Routes>
            <Route path="/activity-onsite/:id" element={<ActivityOnsite />} />
          </Routes>
        </MemoryRouter>
      </App>,
    );

    // 等待分组配置与签到墙就绪后，按 6 进入各组代表、按 O 开始滚动
    await waitFor(() => {
      expect(screen.getByText('各组代表(6)')).toBeInTheDocument();
      expect(screen.getByAltText('张三')).toBeInTheDocument();
    });
    fireEvent.keyDown(document.body, { key: '6' });
    fireEvent.keyDown(document.body, { key: 'o' });
    await waitFor(() => {
      expect(screen.getByText('甲组')).toBeInTheDocument();
      expect(screen.getByText('乙组')).toBeInTheDocument();
    }, { timeout: 3000 });
    // 重置回封面并停掉滚动定时器
    fireEvent.keyDown(document.body, { key: '6' });
  });

  it('单组选人卡片 3 排时整体等比缩小，保证上下完整显示', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 });
    vi.mocked(activityApi.getDetail).mockReset().mockResolvedValue({ onsite_config: JSON.stringify({ groups: '甲组|乙组' }) });
    const people = (n: number, group: number) => Array.from({ length: n }, (_, i) => ({
      user_id: `p${i}`, checkin_at: '2026-11-13T08:00:00Z', gender: i % 2 === 0 ? 1 : 2, onsite_number: i + 1,
      user_profile: { nickname: `成员${i}`, avatar: 'https://cdn.example.com/a.jpg' },
      extra_data: `{"group_index":${group}}`,
    }));
    vi.mocked(activityApi.getRegisters).mockReset().mockImplementation((_id: string, params?: { audit_status?: number }) =>
      Promise.resolve(params?.audit_status === 1 ? mocks.demoRecords : people(13, 1)));

    render(
      <App>
        <MemoryRouter initialEntries={['/activity-onsite/a1']}>
          <Routes>
            <Route path="/activity-onsite/:id" element={<ActivityOnsite />} />
          </Routes>
        </MemoryRouter>
      </App>,
    );

    // 等待分组配置与签到墙就绪后，按 8 进入单组选人、按 O 开始跳动
    await waitFor(() => {
      expect(screen.getByText('单组选人(8)')).toBeInTheDocument();
      expect(screen.getByAltText('成员0')).toBeInTheDocument();
    });
    fireEvent.keyDown(document.body, { key: '8' });
    fireEvent.keyDown(document.body, { key: 'o' });
    // 13 人 3 排（5+4+4）：卡片区按 86vh 预算等比缩小（1920×1080 下 48.375/52 ≈ 0.930）
    const rows = await screen.findByTestId('block-rows');
    expect(rows.style.transform).toMatch(/^scale\(0\.93/);
    // 重置回封面并停掉跳动定时器
    fireEvent.keyDown(document.body, { key: '8' });
  });

  it('单组选人卡片较少（单行）时不缩放', async () => {
    vi.mocked(activityApi.getDetail).mockReset().mockResolvedValue({ onsite_config: JSON.stringify({ groups: '甲组|乙组' }) });
    const people = (n: number, group: number) => Array.from({ length: n }, (_, i) => ({
      user_id: `q${i}`, checkin_at: '2026-11-13T08:00:00Z', gender: i % 2 === 0 ? 1 : 2, onsite_number: i + 1,
      user_profile: { nickname: `成员${i}`, avatar: 'https://cdn.example.com/a.jpg' },
      extra_data: `{"group_index":${group}}`,
    }));
    vi.mocked(activityApi.getRegisters).mockReset().mockImplementation((_id: string, params?: { audit_status?: number }) =>
      Promise.resolve(params?.audit_status === 1 ? mocks.demoRecords : people(5, 1)));

    render(
      <App>
        <MemoryRouter initialEntries={['/activity-onsite/a1']}>
          <Routes>
            <Route path="/activity-onsite/:id" element={<ActivityOnsite />} />
          </Routes>
        </MemoryRouter>
      </App>,
    );

    await waitFor(() => {
      expect(screen.getByText('单组选人(8)')).toBeInTheDocument();
      expect(screen.getByAltText('成员0')).toBeInTheDocument();
    });
    fireEvent.keyDown(document.body, { key: '8' });
    fireEvent.keyDown(document.body, { key: 'o' });
    const rows = await screen.findByTestId('block-rows');
    expect(rows.style.transform).toBe('');
    fireEvent.keyDown(document.body, { key: '8' });
  });
});
