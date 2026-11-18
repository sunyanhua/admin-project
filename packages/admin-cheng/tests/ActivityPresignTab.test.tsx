import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getPresigns: getPresignsMock,
    registerPresign: registerPresignMock,
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
});

const renderTab = () => render(<App><ActivityPresignTab activityId="a1" /></App>);

describe('ActivityPresignTab 导入报名·全部入选', () => {
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
