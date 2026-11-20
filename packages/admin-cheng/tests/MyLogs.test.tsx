import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import MyLogs from '@/pages/system/MyLogs';

const getMyLogsMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  list: [{
    id: 1, action: '修改分组', target_type: 'activity', target_id: 'a-9', ip_address: '5.6.7.8', created_at: '2026-11-20T10:00:00+08:00',
  }],
  total: 1,
}));

vi.mock('@/api/services/auth', () => ({
  authApi: { getMyLogs: getMyLogsMock },
}));

describe('MyLogs 我的操作日志', () => {
  it('无管理员列；操作内容 action 并换行显示操作类型及目标ID，IP 用 ip_address', async () => {
    render(<App><MyLogs /></App>);
    await waitFor(() => expect(getMyLogsMock).toHaveBeenCalled());
    expect(await screen.findByText('修改分组')).toBeInTheDocument();
    expect(screen.getByText('操作类型及目标ID：activity【a-9】')).toBeInTheDocument();
    expect(screen.getByText('5.6.7.8')).toBeInTheDocument();
    expect(screen.queryByText('管理员')).toBeNull();
  });
});
