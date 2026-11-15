import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import ReportManagement from '@/pages/community/ReportManagement';

/** 三态各一条：待处理/已处理/已驳回 */
const REPORTS = vi.hoisted(() => [
  {
    id: 'r1', status: 0, content: '该用户言语骚扰', created_at: '2026-11-15T09:00:00+08:00', target_match_code: '12345678',
    reporter: { user_id: 'u1', nickname: '张三', avatar: '', gender: 1, match_code: '87654321' },
    target: { user_id: 'u2', nickname: '李四', avatar: '', gender: 2, match_code: '12345678' },
  },
  {
    id: 'r2', status: 1, content: '虚假资料', created_at: '2026-11-15T10:00:00+08:00', target_match_code: '11111111',
    reporter: { user_id: 'u3', nickname: '王五', avatar: '', gender: 1, match_code: '22222222' },
    target: { user_id: 'u4', nickname: '赵六', avatar: '', gender: 2, match_code: '11111111' },
  },
  {
    id: 'r3', status: 2, content: '刷单广告', created_at: '2026-11-15T11:00:00+08:00', target_match_code: '33333333',
    reporter: { user_id: 'u5', nickname: '钱七', avatar: '', gender: 1, match_code: '44444444' },
    target: { user_id: 'u6', nickname: '孙八', avatar: '', gender: 2, match_code: '33333333' },
  },
]);

const getListMock = vi.hoisted(() => vi.fn());
const getDetailMock = vi.hoisted(() => vi.fn());
const handleMock = vi.hoisted(() => vi.fn());
const getUserDetailMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/services/report', () => ({
  ReportStatus: { PENDING: 0, HANDLED: 1, REJECTED: 2 },
  REPORT_STATUS_LABELS: { 0: '待处理', 1: '已处理', 2: '已驳回' },
  REPORT_STATUS_COLORS: { 0: 'orange', 1: 'green', 2: 'red' },
  reportApi: {
    getList: getListMock,
    getDetail: getDetailMock,
    handle: handleMock,
  },
}));

vi.mock('@/api/services/user', () => ({
  userApi: {
    getUsers: vi.fn(),
    getUserDetail: getUserDetailMock,
    getUserPrivacy: vi.fn(),
    getUserPrivacyBatch: vi.fn().mockResolvedValue({}),
    getTopicScoreLogs: vi.fn(),
    getTopicDataList: vi.fn(),
    getReliabilityLogs: vi.fn(),
    setMatchProfileRecommend: vi.fn(),
    adjustDivineChance: vi.fn(),
    adjustReliabilityScore: vi.fn(),
    auditMatchProfile: vi.fn(),
    getMatchProfile: vi.fn(),
  },
}));

beforeEach(() => {
  getListMock.mockReset();
  getDetailMock.mockReset();
  handleMock.mockReset();
  getUserDetailMock.mockReset();
  getListMock.mockResolvedValue({ list: REPORTS, total: 3 });
});

const renderPage = () => render(<App><ReportManagement /></App>);

describe('ReportManagement 举报管理', () => {
  it('列表渲染三种状态 Tag 与举报人/被举报人', async () => {
    renderPage();
    expect(await screen.findByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
    expect(screen.getByText('待处理')).toBeInTheDocument();
    expect(screen.getByText('已处理')).toBeInTheDocument();
    expect(screen.getByText('已驳回')).toBeInTheDocument();
  });

  it('状态筛选按 status 传参', async () => {
    renderPage();
    await screen.findByText('张三');
    getListMock.mockClear();
    // 打开状态下拉选择「已处理」（rc-select 选项带 title 属性）
    fireEvent.mouseDown(document.querySelector('.ant-select-selector')!);
    // 列表状态 Tag 也带同文案 title，需在下拉容器内定位选项
    const dropdown = await waitFor(() => {
      const el = document.querySelector('.ant-select-dropdown');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    await userEvent.click(await within(dropdown).findByTitle('已处理'));
    await waitFor(() => expect(getListMock).toHaveBeenCalledWith(expect.objectContaining({ status: 1 })));
  });

  it('能成号搜索按 target_match_code 传参', async () => {
    renderPage();
    await screen.findByText('张三');
    getListMock.mockClear();
    fireEvent.change(screen.getByPlaceholderText('搜索被举报能成号'), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /搜\s*索/ }));
    await waitFor(() => expect(getListMock).toHaveBeenCalledWith(expect.objectContaining({ target_match_code: '12345678' })));
  });

  it('详情：待处理显示处理表单，意见必填拦截', async () => {
    getListMock.mockResolvedValue({ list: [REPORTS[0]], total: 1 });
    getDetailMock.mockResolvedValue({ ...REPORTS[0], attachments: [] });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /详\s*情/ }));
    const handle = await screen.findByTestId('report-handle-section');
    expect(within(handle).getByText('已处理')).toBeInTheDocument();
    expect(within(handle).getByText('已驳回')).toBeInTheDocument();
    fireEvent.click(within(handle).getByRole('button', { name: /提交处理/ }));
    expect(await screen.findByText('请填写处理意见')).toBeInTheDocument();
    expect(handleMock).not.toHaveBeenCalled();
  }, 20000);

  it('切换举报后处理表单状态重置（不残留上一条的选择与意见）', async () => {
    const twoPending = [REPORTS[0], { ...REPORTS[0], id: 'r2', target_match_code: '99999999' }];
    getListMock.mockResolvedValue({ list: twoPending, total: 2 });
    getDetailMock.mockResolvedValue({ ...REPORTS[0], attachments: [] });
    renderPage();
    // 打开第一条：选已驳回 + 填意见
    fireEvent.click((await screen.findAllByRole('button', { name: /详\s*情/ }))[0]);
    let handle = await screen.findByTestId('report-handle-section');
    fireEvent.click(within(handle).getByText('已驳回'));
    fireEvent.change(within(handle).getByPlaceholderText(/处理意见/), { target: { value: '上一单的意见' } });
    // 关闭弹窗（右上角 X）
    fireEvent.click(document.querySelector('.ant-modal-close')!);
    // 打开第二条（仍待处理）：应回到默认已处理 + 意见为空
    fireEvent.click(screen.getAllByRole('button', { name: /详\s*情/ })[1]);
    handle = await screen.findByTestId('report-handle-section');
    const textarea = within(handle).getByPlaceholderText(/处理意见/) as HTMLTextAreaElement;
    expect(textarea.value).toBe('');
    expect(within(handle).getByRole('radio', { checked: true })).toHaveAccessibleName('已处理');
  }, 20000);

  it('处理提交：按 status+remark 传参，成功后刷新列表', async () => {
    getListMock.mockResolvedValue({ list: [REPORTS[0]], total: 1 });
    getDetailMock.mockResolvedValue({ ...REPORTS[0], attachments: [] });
    handleMock.mockResolvedValue({});
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /详\s*情/ }));
    const handle = await screen.findByTestId('report-handle-section');
    fireEvent.click(within(handle).getByText('已处理'));
    fireEvent.change(within(handle).getByPlaceholderText(/处理意见/), { target: { value: '已警告该用户' } });
    const callsBefore = getListMock.mock.calls.length;
    fireEvent.click(within(handle).getByRole('button', { name: /提交处理/ }));
    await waitFor(() => expect(handleMock).toHaveBeenCalledWith('r1', { status: 1, remark: '已警告该用户' }));
    await waitFor(() => expect(getListMock.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('已处理举报：只读展示处理记录，无处理表单', async () => {
    getListMock.mockResolvedValue({ list: [REPORTS[1]], total: 1 });
    getDetailMock.mockResolvedValue({
      ...REPORTS[1], attachments: [], handle_remark: '已处理完毕',
      handled_at: '2026-11-15T12:00:00+08:00', handled_by: '管理员',
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /详\s*情/ }));
    await screen.findByTestId('report-detail-section');
    expect(screen.queryByTestId('report-handle-section')).toBeNull();
    expect(screen.getByText(/已处理完毕/)).toBeInTheDocument();
  });

  it('点击举报人昵称打开用户资料卡片', async () => {
    getListMock.mockResolvedValue({ list: [REPORTS[0]], total: 1 });
    getUserDetailMock.mockResolvedValue({
      user: { user_id: 'u1', phone: '', is_migrated: false },
      profile: {}, match_profile: null, wallet: null,
    });
    renderPage();
    fireEvent.click(await screen.findByText('张三'));
    expect(await screen.findByText('用户详情')).toBeInTheDocument();
    expect(getUserDetailMock).toHaveBeenCalledWith('u1');
  });
});
