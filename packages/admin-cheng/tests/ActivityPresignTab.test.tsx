import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { App } from 'antd';
import ActivityPresignTab from '@/components/operation/ActivityPresignTab';

/** 101 条未报名预报名（验证每次操作最多 100 人） */
const PRESIGNS = vi.hoisted(() =>
  Array.from({ length: 101 }, (_, i) => ({
    id: `p${i}`, phone: `138000000${String(i).padStart(2, '0')}`, real_name: `预报名${i}`, status: 0,
    created_at: '2026-11-18T09:00:00+08:00',
  })),
);

const getPresignsMock = vi.hoisted(() => vi.fn().mockResolvedValue(PRESIGNS));
const registerPresignMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const revokePresignMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getPresigns: getPresignsMock,
    registerPresign: registerPresignMock,
    revokePresign: revokePresignMock,
    getDetail: vi.fn().mockResolvedValue({ presign_bind_deadline: null }),
    update: vi.fn(),
    deletePresign: vi.fn(),
  },
}));

beforeEach(() => {
  getPresignsMock.mockClear();
  getPresignsMock.mockImplementation((_id: string, params?: { status?: number }) =>
    // 列表分页拉取与全部入选拉取共用：按 status 区分
    Promise.resolve(params?.status != null ? PRESIGNS.slice(0, 100) : PRESIGNS.slice(0, 20)));
  registerPresignMock.mockClear();
  revokePresignMock.mockClear();
});

const renderTab = () => render(<App><ActivityPresignTab activityId="a1" /></App>);

describe('ActivityPresignTab 导入报名·全部入选', () => {
  it('状态筛选选项：未报名也未入选/已入选未报名/已入选，选中后按对应 status 传参', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('导入列表')).toBeInTheDocument());
    // 打开状态下拉
    fireEvent.mouseDown(document.querySelector('.ant-select-selector')!);
    const dropdown = await waitFor(() => {
      const el = document.querySelector('.ant-select-dropdown');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(within(dropdown).getByText('未报名也未入选')).toBeTruthy();
    expect(within(dropdown).getByText('已入选未报名')).toBeTruthy();
    expect(within(dropdown).getByText('已报名或已入选')).toBeTruthy();
    // 选「已入选未报名」→ status=2
    getPresignsMock.mockClear();
    fireEvent.click(within(dropdown).getByText('已入选未报名'));
    await waitFor(() => {
      const call = getPresignsMock.mock.calls.find((c: any[]) => c[1]?.status != null);
      expect(call?.[1].status).toBe(2);
    });
    // 选「已报名或已入选」→ status=1
    fireEvent.mouseDown(document.querySelector('.ant-select-selector')!);
    const dropdown2 = await waitFor(() => document.querySelector('.ant-select-dropdown') as HTMLElement);
    fireEvent.click(within(dropdown2).getByText('已报名或已入选'));
    await waitFor(() => {
      const call = getPresignsMock.mock.calls.find((c: any[]) => c[1]?.status === 1);
      expect(call?.[1].status).toBe(1);
    });
  }, 30000);

  it('筛选后切走再切回（reloadKey 变化）：列表仍按筛选条件加载，刷新也按筛选', async () => {
    const { rerender } = render(<App><ActivityPresignTab activityId="a1" reloadKey={0} /></App>);
    await waitFor(() => expect(screen.getByText('导入列表')).toBeInTheDocument());
    // 选择筛选「已入选未报名」（status=2）
    fireEvent.mouseDown(document.querySelector('.ant-select-selector')!);
    const dropdown = await waitFor(() => document.querySelector('.ant-select-dropdown') as HTMLElement);
    fireEvent.click(within(dropdown).getByText('已入选未报名'));
    await waitFor(() => {
      expect(getPresignsMock.mock.calls.some((c: any[]) => c[1]?.status === 2)).toBe(true);
    });
    // 模拟切走再切回：reloadKey +1
    getPresignsMock.mockClear();
    rerender(<App><ActivityPresignTab activityId="a1" reloadKey={1} /></App>);
    // 重拉仍带筛选 status=2
    await waitFor(() => {
      expect(getPresignsMock.mock.calls.some((c: any[]) => c[1]?.status === 2)).toBe(true);
    });
    // 点刷新也按筛选条件加载
    getPresignsMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
    await waitFor(() => {
      expect(getPresignsMock.mock.calls.some((c: any[]) => c[1]?.status === 2)).toBe(true);
    });
  }, 90000);

  it('已入选未报名行显示撤销入选：确认后调用撤销接口并刷新，未报名行无撤销按钮', async () => {
    getPresignsMock.mockImplementation(() => Promise.resolve([
      { id: 'p1', phone: '13800000001', real_name: '张三', status: 2, register_id: 'rr1', created_at: '2026-11-18T09:00:00+08:00' },
      { id: 'p2', phone: '13800000002', real_name: '李四', status: 0, created_at: '2026-11-18T09:00:00+08:00' },
    ]));
    renderTab();
    await waitFor(() => expect(screen.getByText('张三')).toBeInTheDocument());
    // 仅已报名行有撤销按钮
    expect(screen.getAllByRole('button', { name: /撤销入选/ }).length).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: /撤销入选/ }));
    await screen.findAllByText('确认撤销入选');
    const callsBefore = getPresignsMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /确认撤销/ }));
    await waitFor(() => expect(revokePresignMock).toHaveBeenCalledWith('a1', 'p1'));
    await waitFor(() => expect(getPresignsMock.mock.calls.length).toBeGreaterThan(callsBefore));
  }, 30000);

  it('全部入选：确认弹窗提示每次最多 100 人，确认后仅处理 100 条未报名记录', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('导入列表')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /全部入选/ }));
    await screen.findAllByText('确认全部入选');
    expect(screen.getByText(/每次操作最多 100 人/)).toBeInTheDocument();
    expect(screen.getByText(/请再次执行/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /确认入选/ }));
    await waitFor(() => expect(registerPresignMock).toHaveBeenCalled());
    expect(registerPresignMock).toHaveBeenCalledTimes(100);
    // 只拉取一批（page 1 size 100），不循环拉第二页
    const listCalls = getPresignsMock.mock.calls.filter((c: any[]) => c[1]?.status != null);
    expect(listCalls.length).toBe(1);
    expect(listCalls[0][1]).toEqual({ page: 1, size: 100, status: 0 });
  }, 60000);
});
