import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import AdminLogs from '@/pages/system/AdminLogs';

const getLogsMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  list: [{
    id: 1, admin_username: 'admin01', action: '审核报名',
    target_type: 'register', target_id: 'r-123', ip_address: '1.2.3.4', created_at: '2026-11-20T10:00:00+08:00',
  }],
  total: 1,
}));

vi.mock('@/api/services/admin', () => ({
  adminApi: { getLogs: getLogsMock },
}));

describe('AdminLogs 管理日志', () => {
  it('管理员显示 admin_username，操作内容 action 并换行显示操作类型及目标ID，IP 用 ip_address', async () => {
    render(<App><AdminLogs /></App>);
    await waitFor(() => expect(getLogsMock).toHaveBeenCalled());
    expect(await screen.findByText('admin01')).toBeInTheDocument();
    expect(screen.getByText('审核报名')).toBeInTheDocument();
    expect(screen.getByText('操作类型及目标ID：register【r-123】')).toBeInTheDocument();
    expect(screen.getByText('1.2.3.4')).toBeInTheDocument();
  });
});
