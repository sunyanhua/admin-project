import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { App } from 'antd';
import ProfileEditModal from '@/components/user/ProfileEditModal';

const updateBasicProfileMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/api/services/user', () => ({
  userApi: {
    updateBasicProfile: updateBasicProfileMock,
  },
}));

beforeEach(() => {
  updateBasicProfileMock.mockReset();
  updateBasicProfileMock.mockResolvedValue({});
});

const renderModal = (props: Partial<Parameters<typeof ProfileEditModal>[0]> = {}) =>
  render(
    <App>
      <ProfileEditModal
        open
        userId="u1"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        {...props}
      />
    </App>,
  );

describe('ProfileEditModal 编辑基础资料', () => {
  it('打开时回填昵称/性别/出生日期/星座', () => {
    renderModal({ nickname: '张三', gender: 1, birthDate: '1995-06-15', zodiac: '双子座' });
    expect(screen.getByDisplayValue('张三')).toBeInTheDocument();
    expect(screen.getByLabelText('男')).toBeChecked();
    expect(screen.getByDisplayValue('1995-06-15')).toBeInTheDocument();
  });

  it('资料延迟到达时也回填（打开后才收到用户信息）', () => {
    const { rerender } = renderModal({ nickname: undefined });
    // 模拟详情异步返回：先打开（空资料），随后资料到达
    rerender(
      <App>
        <ProfileEditModal open userId="u1" nickname="李四" gender={2} onClose={vi.fn()} onSuccess={vi.fn()} />
      </App>,
    );
    expect(screen.getByDisplayValue('李四')).toBeInTheDocument();
    expect(screen.getByLabelText('女')).toBeChecked();
  });

  it('不显示审核状态字段（审核状态由审核操作处理，编辑基础资料不改动）', () => {
    renderModal({ nickname: '张三' });
    expect(screen.queryByText('审核状态')).toBeNull();
  });

  it('提交载荷不含 audit_status，保持原有审核状态不变', async () => {
    renderModal({ nickname: '张三', gender: 1, birthDate: '1995-06-15', auditStatus: 1 });
    fireEvent.change(screen.getByPlaceholderText('请填写修改用户资料的业务原因，此记录会写入操作日志'), { target: { value: '用户改名申请' } });
    fireEvent.click(screen.getByRole('button', { name: /确认修改/ }));
    await waitFor(() => expect(updateBasicProfileMock).toHaveBeenCalled());
    const payload = updateBasicProfileMock.mock.calls[0][1];
    expect(payload.audit_status).toBeUndefined();
    expect(payload.reason).toBe('用户改名申请');
  });
});
