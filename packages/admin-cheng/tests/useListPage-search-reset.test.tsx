import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useListPage } from '@/hooks/useListPage';

describe('useListPage 搜索重置页码', () => {
  it('翻页后调用 search 应回到第 1 页', async () => {
    const fetchFn = vi.fn(async (params: any) => {
      // 模拟分页数据
      return {
        list: [{ id: params.page }],
        total: 30,
      };
    });

    const { result } = renderHook(() =>
      useListPage({
        fetchFn,
        formatResponse: (res: any) => ({ list: res.list, count: res.total }),
      }),
    );

    // 初始加载
    await waitFor(() => expect(result.current.pagination.current).toBe(1));

    // 翻到第 2 页
    act(() => { result.current.onPageChange(2, 10); });
    await waitFor(() => expect(result.current.pagination.current).toBe(2));

    // 触发搜索
    act(() => { result.current.search({ status: 1 }); });
    await waitFor(() => expect(result.current.pagination.current).toBe(1));

    // 最后几次 fetch 的参数 page 应为 1，且带 status=1
    const calls = fetchFn.mock.calls.map((c) => c[0]);
    const lastCall = calls[calls.length - 1];
    expect(lastCall.page).toBe(1);
    expect(lastCall.status).toBe(1);
  });
});
