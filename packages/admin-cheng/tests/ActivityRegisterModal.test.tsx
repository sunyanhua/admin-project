import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { App } from 'antd';
import { ActivityType, RegisterAuditStatus } from '@shared/constants';
import ActivityRegisterModal from '@/components/operation/ActivityRegisterModal';

const REGISTERS = [
  {
    id: 'r1', activity_id: 'a1', user_id: 'u1', audit_status: RegisterAuditStatus.PENDING, pay_status: 0, gender: 1,
    form_data: '', checkin_at: null, created_at: '2026-11-10T09:00:00+08:00', completed_at: null,
    user_profile: { nickname: '张三', avatar: '' }, user_data: { phone: '13800000000' },
    user_match_profile: { real_name: '张三', is_real_verified: false },
  },
  {
    id: 'r2', activity_id: 'a1', user_id: 'u2', audit_status: RegisterAuditStatus.PENDING, pay_status: 0, gender: 2,
    form_data: '', checkin_at: null, created_at: '2026-11-10T10:00:00+08:00', completed_at: null,
    user_profile: { nickname: '李四', avatar: '' }, user_data: { phone: '13900000000' },
    user_match_profile: { real_name: '李四', is_real_verified: false },
  },
];

const getRegistersMock = vi.hoisted(() => vi.fn());
const auditRegisterMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getRegisters: getRegistersMock,
    auditRegister: auditRegisterMock,
    getPresigns: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    getRegisterUser: vi.fn(),
    getRegisterUserPrivacy: vi.fn(),
  },
}));

vi.mock('@/api/services/user', () => ({
  userApi: {
    getUserDetail: vi.fn(),
    getUserPrivacyBatch: vi.fn().mockResolvedValue({}),
    getUserPrivacy: vi.fn(),
    setMatchProfileRecommend: vi.fn(),
    updateBasicProfile: vi.fn(),
    getReliabilityLogs: vi.fn(),
    auditMatchProfile: vi.fn(),
    adjustDivineChance: vi.fn(),
  },
}));

beforeAll(() => {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
});

beforeEach(() => {
  getRegistersMock.mockReset();
  getRegistersMock.mockResolvedValue({ list: REGISTERS, total: REGISTERS.length });
  auditRegisterMock.mockClear();
});

const renderModal = () =>
  render(
    <App>
      <ActivityRegisterModal
        visible
        activityId="a1"
        activityTitle="测试活动"
        activityType={ActivityType.FREE_REVIEW}
        formConfig={[]}
        onClose={vi.fn()}
      />
    </App>,
  );

/** 打开第一个下拉（全部状态）并选择指定选项（下拉选择后 SearchPanel 立即触发搜索） */
const selectStatusFilter = async (label: string) => {
  fireEvent.mouseDown(document.querySelector('.ant-select-selector')!);
  await waitFor(() => expect(document.querySelector('.ant-select-dropdown')).not.toBeNull());
  const dropdown = document.querySelector('.ant-select-dropdown') as HTMLElement;
  const option = Array.from(dropdown.querySelectorAll('.ant-select-item-option')).find((el) => el.textContent === label);
  expect(option).toBeTruthy();
  fireEvent.click(option!);
};

describe('报名名单批量入选', () => {
  it('待审核筛选下显示勾选列与批量入选按钮，勾选后批量审核通过', async () => {
    renderModal();
    await waitFor(() => expect(screen.getAllByText('张三').length).toBeGreaterThan(0));

    // 未筛选待审核：无勾选列、无批量入选按钮
    expect(document.querySelector('.ant-table-selection-column')).toBeNull();
    expect(screen.queryByRole('button', { name: /批量入选/ })).not.toBeInTheDocument();

    // 切换到待审核筛选
    await selectStatusFilter('待审核');
    await waitFor(() => expect(getRegistersMock).toHaveBeenCalledWith('a1', expect.objectContaining({ audit_status: 0 })));

    // 勾选列与批量入选按钮出现（未勾选时按钮禁用）
    await waitFor(() => expect(document.querySelector('.ant-table-selection-column')).not.toBeNull());
    const batchBtn = screen.getByRole('button', { name: /批量入选/ });
    expect(batchBtn).toBeDisabled();

    // 勾选第一行 → 按钮可点并显示数量（注意：tbody 内还有 antd 测量行复选框，需按行 data-row-key 定位真实行）
    await waitFor(() => {
      const input = document.querySelector('tr.ant-table-row[data-row-key="r1"] .ant-checkbox-input') as HTMLInputElement | null;
      expect(input).not.toBeNull();
      if (!input!.checked) fireEvent.click(input!);
      expect(input!.checked).toBe(true);
    }, { timeout: 5000 });
    // 仅第一行被勾选（未误触全选）
    const r2Input = document.querySelector('tr.ant-table-row[data-row-key="r2"] .ant-checkbox-input') as HTMLInputElement;
    expect(r2Input.checked).toBe(false);
    await waitFor(() => expect(screen.getByRole('button', { name: /批量入选（1）/ })).toBeEnabled());

    // 点击批量入选 → 确认弹窗 → 确认执行
    fireEvent.click(screen.getByRole('button', { name: /批量入选（1）/ }));
    await screen.findAllByText('批量入选确认');
    fireEvent.click(screen.getByRole('button', { name: /确认入选/ }));
    await waitFor(() => expect(auditRegisterMock).toHaveBeenCalledWith('a1', 'r1', { approved: true }));
    await screen.findByText('已批量入选 1 名用户');
  }, 30000);

  it('全选当前页后批量入选所有勾选用户', async () => {
    renderModal();
    await waitFor(() => expect(screen.getAllByText('张三').length).toBeGreaterThan(0));
    await selectStatusFilter('待审核');
    await waitFor(() => expect(document.querySelector('.ant-table-selection-column')).not.toBeNull());

    // 表头全选框 → 当前页两行全部勾选
    fireEvent.click(document.querySelector('.ant-table-thead .ant-checkbox-input')!);
    await waitFor(() => expect(screen.getByRole('button', { name: /批量入选（2）/ })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: /批量入选（2）/ }));
    await screen.findAllByText('批量入选确认');
    fireEvent.click(screen.getByRole('button', { name: /确认入选/ }));
    await waitFor(() => expect(auditRegisterMock).toHaveBeenCalledTimes(2));
    expect(auditRegisterMock).toHaveBeenCalledWith('a1', 'r1', { approved: true });
    expect(auditRegisterMock).toHaveBeenCalledWith('a1', 'r2', { approved: true });
    await screen.findByText('已批量入选 2 名用户');
  }, 30000);

  it('切换回全部状态后勾选列与批量入选按钮消失', async () => {
    renderModal();
    await waitFor(() => expect(screen.getAllByText('张三').length).toBeGreaterThan(0));
    await selectStatusFilter('待审核');
    await waitFor(() => expect(document.querySelector('.ant-table-selection-column')).not.toBeNull());

    // 清空状态下拉（allowClear 的清除按钮）→ 回到全部状态
    const select = document.querySelector('.ant-select-selector')!.parentElement!;
    fireEvent.mouseEnter(select);
    await waitFor(() => expect(document.querySelector('.ant-select-clear')).not.toBeNull());
    fireEvent.mouseDown(document.querySelector('.ant-select-clear')!);

    await waitFor(() => expect(document.querySelector('.ant-table-selection-column')).toBeNull());
    expect(screen.queryByRole('button', { name: /批量入选/ })).not.toBeInTheDocument();
  }, 30000);

  it('部分审核失败时提示成功/失败条数', async () => {
    auditRegisterMock.mockRejectedValueOnce(new Error('业务拒绝'));
    renderModal();
    await waitFor(() => expect(screen.getAllByText('张三').length).toBeGreaterThan(0));
    await selectStatusFilter('待审核');
    await waitFor(() => expect(document.querySelector('.ant-table-selection-column')).not.toBeNull());

    fireEvent.click(document.querySelector('.ant-table-thead .ant-checkbox-input')!);
    await waitFor(() => expect(screen.getByRole('button', { name: /批量入选（2）/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /批量入选（2）/ }));
    await screen.findAllByText('批量入选确认');
    fireEvent.click(screen.getByRole('button', { name: /确认入选/ }));

    await waitFor(() => expect(auditRegisterMock).toHaveBeenCalledTimes(2));
    await screen.findByText('批量入选完成：成功 1 条，失败 1 条，失败记录请查看后重试');
  }, 30000);

  it('确认弹窗点击取消不调用审核接口', async () => {
    renderModal();
    await waitFor(() => expect(screen.getAllByText('张三').length).toBeGreaterThan(0));
    await selectStatusFilter('待审核');
    await waitFor(() => expect(document.querySelector('.ant-table-selection-column')).not.toBeNull());

    fireEvent.click(document.querySelector('tr.ant-table-row[data-row-key="r1"] .ant-checkbox-input')!);
    await waitFor(() => expect(screen.getByRole('button', { name: /批量入选（1）/ })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /批量入选（1）/ }));
    await screen.findAllByText('批量入选确认');
    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));

    // 取消后不应有任何审核请求（等待可能的误触发窗口过去；jsdom 中弹窗 DOM 不卸载属 rc-motion 已知现象）
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(auditRegisterMock).not.toHaveBeenCalled();
  }, 30000);

  it('翻页后清空勾选（勾选语义为当前页）', async () => {
    // 12 条待审核记录 → 默认 10 条/页，共 2 页
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...REGISTERS[0],
      id: `m${i + 1}`,
      user_id: `u${i + 1}`,
      user_profile: { nickname: `用户${i + 1}`, avatar: '' },
    }));
    getRegistersMock.mockResolvedValue({ list: many, total: 12 });
    renderModal();
    await waitFor(() => expect(screen.getAllByText('用户1').length).toBeGreaterThan(0));
    await selectStatusFilter('待审核');
    await waitFor(() => expect(document.querySelector('.ant-table-selection-column')).not.toBeNull());

    // 勾选第 1 页一行
    fireEvent.click(document.querySelector('tr.ant-table-row[data-row-key="m1"] .ant-checkbox-input')!);
    await waitFor(() => expect(screen.getByRole('button', { name: /批量入选（1）/ })).toBeEnabled());

    // 翻到第 2 页 → 勾选清空，按钮回到禁用
    fireEvent.click(document.querySelector('.ant-pagination-item[title="2"]')!);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /批量入选/ });
      expect(btn.textContent).toBe('批量入选');
      expect(btn).toBeDisabled();
    });
  }, 30000);
});
