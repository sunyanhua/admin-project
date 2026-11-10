import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { App } from 'antd';
import OrderManagement from '@/pages/finance/OrderManagement';
import RefundManagement from '@/pages/finance/RefundManagement';
import IosRefundManagement from '@/pages/finance/IosRefundManagement';
import WithdrawManagement from '@/pages/finance/WithdrawManagement';

const ORDERS = vi.hoisted(() => [
  {
    id: 'o1', order_no: 'ON202611100001', biz_type: 2, status: 1, amount_cents: 990,
    description: '报喜红包-张三', user_id: 'u1', created_at: '2026-11-10T10:00:00+08:00',
    paid_at: '2026-11-10T10:01:00+08:00', wx_order_id: '', wx_transaction_id: '',
    biz_id: '', refunded_at: null, closed_at: null,
  },
]);

const REFUNDS = vi.hoisted(() => [
  {
    id: 'r1', refund_no: 'RF202611100001', order_id: 'o1', wx_refund_id: 'wxrf1',
    amount_cents: 990, reason: '用户申请退款', status: 1,
    created_at: '2026-11-10T11:00:00+08:00', updated_at: '2026-11-10T11:05:00+08:00',
  },
]);

const INQUIRIES = vi.hoisted(() => [
  {
    id: 'i1', order_no: 'ON202611090001', pay_order_id: 'po1', decision: 1, decision_source: 1,
    rule_id: 'rule1', rule_name: '默认拦截', provide_status: 1, inquiry_count: 2, response_ms: 350,
    refund_reason: '商品未收到', evidence: '发货截图', result_info: '已拦截', p_count: 1,
    product_id: 'prod1', channel_bill: '', dedup_key: '',
    first_inquired_at: '2026-11-10T09:00:00+08:00', last_inquired_at: '2026-11-10T09:30:00+08:00',
  },
]);

const WITHDRAWS = vi.hoisted(() => [
  {
    id: 'w1', withdraw_no: 'WD202611100001', wx_transfer_no: '', amount_cents: 5000, status: 3,
    fail_reason: '', created_at: '2026-11-10T08:00:00+08:00', completed_at: null, package_info: '',
  },
  {
    id: 'w2', withdraw_no: 'WD202611100002', wx_transfer_no: 'wxt2', amount_cents: 3000, status: 1,
    fail_reason: '', created_at: '2026-11-09T08:00:00+08:00', completed_at: '2026-11-09T09:00:00+08:00', package_info: '',
  },
]);

const getOrdersMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: ORDERS, total: 1 }));
const getRefundsMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: REFUNDS, total: 1 }));
const getInquiriesMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: INQUIRIES, total: 1 }));
const getInquiryMock = vi.hoisted(() => vi.fn().mockResolvedValue(INQUIRIES[0]));
const getWithdrawsMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: WITHDRAWS, total: 2 }));
const approveMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const rejectMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/api/services/xpay', () => ({
  PayBizType: { CONGRATULATION_CASH: 2, COIN_RECHARGE: 3, ID_VERIFY: 4 },
  OrderStatus: { PENDING: 0, PAID: 1, REFUNDED: 2, CLOSED: 3 },
  RefundStatus: { PROCESSING: 0, SUCCESS: 1, FAILED: 2 },
  IOSRefundDecision: { REFUND: 0, BLOCK: 1 },
  IOSRefundDecisionSource: { RULE: 1, DEFAULT: 2, FALLBACK: 3, POLICY: 4 },
  IOSProvideStatus: { NOT_DELIVERED: 0, DELIVERED: 1, DELIVERING: 2 },
  xpayApi: {
    getOrders: getOrdersMock,
    getRefunds: getRefundsMock,
    getIosRefundInquiries: getInquiriesMock,
    getIosRefundInquiry: getInquiryMock,
  },
}));

vi.mock('@/api/services/congratulation', () => ({
  WithdrawStatus: { PROCESSING: 0, SUCCESS: 1, FAILED: 2, PENDING_REVIEW: 3 },
  congratulationApi: {
    getWithdraws: getWithdrawsMock,
    approveWithdraw: approveMock,
    rejectWithdraw: rejectMock,
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
  getOrdersMock.mockClear();
  getRefundsMock.mockClear();
  getInquiriesMock.mockClear();
  getInquiryMock.mockClear();
  getWithdrawsMock.mockClear();
  approveMock.mockClear();
  rejectMock.mockClear();
});

const renderPage = (el: React.ReactNode) => render(<App>{el}</App>);

describe('财务管理页面', () => {
  it('订单管理：渲染业务类型/状态标签与金额（分→元）', async () => {
    renderPage(<OrderManagement />);
    await waitFor(() => expect(screen.getByText('ON202611100001')).toBeInTheDocument());
    expect(screen.getByText('报喜现金红包')).toBeInTheDocument();
    expect(screen.getByText('已支付')).toBeInTheDocument();
    expect(screen.getByText('9.90')).toBeInTheDocument();
  });

  it('退款管理：渲染退款单号/微信退款单号/状态/金额', async () => {
    renderPage(<RefundManagement />);
    await waitFor(() => expect(screen.getByText('RF202611100001')).toBeInTheDocument());
    expect(screen.getByText('wxrf1')).toBeInTheDocument();
    expect(screen.getByText('退款成功')).toBeInTheDocument();
    expect(screen.getByText('9.90')).toBeInTheDocument();
  });

  it('iOS退款处理：渲染问询记录与决策标签', async () => {
    renderPage(<IosRefundManagement />);
    await waitFor(() => expect(screen.getByText('ON202611090001')).toBeInTheDocument());
    expect(screen.getByText('拦截')).toBeInTheDocument();
    expect(screen.getByText('命中规则')).toBeInTheDocument();
    expect(screen.getByText('已发货')).toBeInTheDocument();
  });

  it('iOS退款处理：点击详情拉取完整问询记录', async () => {
    renderPage(<IosRefundManagement />);
    await waitFor(() => expect(screen.getByText('ON202611090001')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /详情/ }));
    await waitFor(() => expect(getInquiryMock).toHaveBeenCalledWith('i1'));
    await screen.findByText('iOS 退款问询详情');
    // 表格列与弹窗均有退款原因文案，仅断言存在
    expect(screen.getAllByText('商品未收到').length).toBeGreaterThan(0);
  }, 20000);

  it('提现申请：待审核记录展示通过/拒绝，通过调用审核接口', async () => {
    renderPage(<WithdrawManagement />);
    await waitFor(() => expect(screen.getByText('WD202611100001')).toBeInTheDocument());
    expect(screen.getByText('待审核')).toBeInTheDocument();
    expect(screen.getByText('提现成功')).toBeInTheDocument();
    expect(screen.getByText('50.00')).toBeInTheDocument();

    // 仅待审核行有操作按钮：点「通过」→ 确认弹窗 → 确认通过
    fireEvent.click(screen.getByRole('button', { name: /通过/ }));
    await waitFor(() => {
      expect(screen.getAllByText('确认通过该提现申请？').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByRole('button', { name: /确认通过/ })[0]);
    await waitFor(() => expect(approveMock).toHaveBeenCalledWith('w1'));
  }, 20000);

  it('提现申请：拒绝需填写原因后调用拒绝接口', async () => {
    renderPage(<WithdrawManagement />);
    await waitFor(() => expect(screen.getByText('WD202611100001')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /拒绝/ }));
    await screen.findByText('拒绝提现申请');
    fireEvent.change(screen.getByPlaceholderText('拒绝后提现金额将原路退回来源子账'), { target: { value: '资料不全' } });
    fireEvent.click(screen.getByRole('button', { name: /确认拒绝/ }));
    await waitFor(() => expect(rejectMock).toHaveBeenCalledWith('w1', '资料不全'));
  }, 20000);
});
