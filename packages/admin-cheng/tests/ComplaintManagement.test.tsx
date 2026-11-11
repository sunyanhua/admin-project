import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { App } from 'antd';
import ComplaintManagement from '@/pages/community/ComplaintManagement';

const COMPLAINTS = vi.hoisted(() => [
  {
    id: 'c1', complaint_id: 'CMP202611110001', status: 0,
    complaint_detail: '商品未收到，要求退款', complaint_time: '2026-11-11T09:00:00+08:00',
    mch_order_id: 'MO001', wx_order_id: 'WXO001', transaction_id: '', open_id: 'open1',
    last_reply_at: null, completed_at: null, handler_admin_id: '',
    created_at: '2026-11-11T09:00:00+08:00', updated_at: '2026-11-11T09:00:00+08:00',
  },
]);

const COMPLAINT_DETAIL = vi.hoisted(() => ({
  ...COMPLAINTS[0],
  deadline_at: '2026-11-12T09:00:00+08:00',
  request_id: 'req1',
  raw_payload: '{"complaint_id":"CMP202611110001"}',
  messages: [
    { id: 'm1', content: '用户：东西没收到', direction: 1, media_ids: '', operator_id: '', created_at: '2026-11-11T09:05:00+08:00' },
    { id: 'm2', content: '商家：已安排补发', direction: 2, media_ids: '', operator_id: 'admin1', created_at: '2026-11-11T09:30:00+08:00' },
  ],
}));

const getComplaintsMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: COMPLAINTS, total: 1 }));
const getComplaintMock = vi.hoisted(() => vi.fn().mockResolvedValue(COMPLAINT_DETAIL));
const replyMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const completeMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/api/services/xpay', () => ({
  PayComplaintStatus: { PENDING: 0, PROCESSING: 1, REPLIED: 2, COMPLETED: 3, CLOSED: 4 },
  PayComplaintDirection: { USER: 1, MERCHANT: 2 },
  xpayApi: {
    getComplaints: getComplaintsMock,
    getComplaint: getComplaintMock,
    replyComplaint: replyMock,
    completeComplaint: completeMock,
    getComplaintNegotiationHistory: vi.fn(),
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
  getComplaintsMock.mockClear();
  getComplaintMock.mockClear();
  replyMock.mockClear();
  completeMock.mockClear();
});

const renderPage = () => render(<App><ComplaintManagement /></App>);

/** 打开详情并等待加载 */
const openDetail = async () => {
  await waitFor(() => expect(screen.getByText('CMP202611110001')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /详情/ }));
  await waitFor(() => expect(getComplaintMock).toHaveBeenCalledWith('c1'));
  await screen.findByText('投诉详情');
};

describe('投诉管理', () => {
  it('列表渲染：投诉单号/状态标签/投诉内容', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('CMP202611110001')).toBeInTheDocument());
    expect(screen.getByText('待处理')).toBeInTheDocument();
    expect(screen.getByText('商品未收到，要求退款')).toBeInTheDocument();
  });

  it('详情：拉取完整记录并展示消息留痕（用户/商家方向）', async () => {
    renderPage();
    await openDetail();
    expect(screen.getByText('用户：东西没收到')).toBeInTheDocument();
    expect(screen.getByText('商家：已安排补发')).toBeInTheDocument();
    expect(screen.getByText('用户')).toBeInTheDocument();
    expect(screen.getByText('商家')).toBeInTheDocument();
  }, 20000);

  it('回复：填写内容提交调用回复接口', async () => {
    renderPage();
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: /回复用户/ }));
    await screen.findByText('回复投诉用户');
    fireEvent.change(screen.getByPlaceholderText('回复内容将同步给用户'), { target: { value: '我们已为您处理退款' } });
    fireEvent.click(screen.getByRole('button', { name: /确认回复/ }));
    await waitFor(() => {
      expect(replyMock).toHaveBeenCalledWith('c1', { content: '我们已为您处理退款' });
    });
  }, 20000);

  it('完成处理：确认后调用结案接口', async () => {
    renderPage();
    await openDetail();
    fireEvent.click(screen.getByRole('button', { name: /完成处理/ }));
    await waitFor(() => {
      expect(screen.getAllByText('确认完成投诉处理？').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: /确认结案/ })[0]);
    await waitFor(() => expect(completeMock).toHaveBeenCalledWith('c1'));
  }, 20000);

  it('已结案/已关闭的投诉不提供处理操作', async () => {
    getComplaintMock.mockResolvedValueOnce({ ...COMPLAINT_DETAIL, status: 3 });
    renderPage();
    await openDetail();
    expect(screen.queryByRole('button', { name: /回复用户/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /完成处理/ })).toBeNull();
  }, 20000);
});
