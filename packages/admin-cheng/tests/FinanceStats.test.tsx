import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { App } from 'antd';
import FinanceStats from '@/pages/operation/FinanceStats';

const FUND_SUMMARY = vi.hoisted(() => ({
  start_date: '20261101',
  end_date: '20261111',
  pay: {
    cents: 123450,
    count: 12,
    refunded_count: 2,
    by_biz_type: [
      { biz_type: 2, cents: 100000, count: 8, refunded_count: 1 },
      { biz_type: 3, cents: 23450, count: 4, refunded_count: 1 },
    ],
  },
  refund: { success_cents: 5000, success_count: 2, failed_count: 0, processing_count: 1 },
  settle: { count: 10, gross_cents: 110000, fee_cents: 660, net_cents: 109340, matched_count: 9, diff_count: 1 },
  withdraw: { success_cents: 80000, success_count: 3, failed_count: 0, pending_review_count: 2, processing_count: 1 },
}));

const RECONCILE = vi.hoisted(() => [
  {
    bill_date: '20261110', channel: 1, trade_count: 5,
    gross_amount_cents: 10000, fee_cents: 60, net_amount_cents: 9940,
    matched_count: 5, diff_count: 0,
  },
  {
    bill_date: '20261110', channel: 2, trade_count: 3,
    gross_amount_cents: 2000, fee_cents: 300, net_amount_cents: 1700,
    matched_count: 1, diff_count: 2,
  },
]);

const TRIBUTE = vi.hoisted(() => ({
  total_count: 10,
  completed_count: 8,
  total_users: 6,
  total_coins: 500,
  total_cents: 8800,
  status_counts: [
    { status: 1, count: 8 },
    { status: 0, count: 2 },
  ],
  groups: [
    { kind: 1, gift_id: 'g1', gift_name: '玫瑰花', gift_image: '', count: 5, coins: 300, cents: 0 },
    { kind: 2, gift_id: '', gift_name: '', gift_image: '', count: 3, coins: 0, cents: 8800 },
  ],
}));

const getFundSummaryMock = vi.hoisted(() => vi.fn().mockResolvedValue(FUND_SUMMARY));
const getReconcileSummaryMock = vi.hoisted(() => vi.fn().mockResolvedValue(RECONCILE));
const getTributeSummaryMock = vi.hoisted(() => vi.fn().mockResolvedValue(TRIBUTE));

vi.mock('@/api/services/xpay', () => ({
  PayBizType: { CONGRATULATION_CASH: 2, COIN_RECHARGE: 3, ID_VERIFY: 4 },
  PayBillChannel: { WECHAT: 1, APPLE: 2 },
  xpayApi: {
    getFundSummary: getFundSummaryMock,
    getReconcileSummary: getReconcileSummaryMock,
  },
}));

vi.mock('@/api/services/congratulation', () => ({
  CongratulationTributeKind: { GIFT: 1, CASH: 2 },
  CongratulationTributeStatus: { PENDING: 0, COMPLETED: 1, REFUNDED: 2, CLOSED: 3 },
  congratulationApi: {
    getTributeSummary: getTributeSummaryMock,
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
  getFundSummaryMock.mockClear();
  getReconcileSummaryMock.mockClear();
  getTributeSummaryMock.mockClear();
});

const renderPage = () => render(<App><FinanceStats /></App>);

const switchTab = async (name: RegExp) => {
  fireEvent.click(screen.getByRole('tab', { name }));
};

describe('财务统计', () => {
  it('资金汇总：挂载即拉取，展示支付/入账/退费/提现卡片与业务类型拆分', async () => {
    renderPage();
    await waitFor(() => expect(getFundSummaryMock).toHaveBeenCalled());
    // 缺省近 30 天窗口（YYYYMMDD 格式）
    expect(getFundSummaryMock).toHaveBeenCalledWith(expect.objectContaining({
      from_date: expect.stringMatching(/^\d{8}$/),
      to_date: expect.stringMatching(/^\d{8}$/),
    }));
    // 统计区间（接口返回的纠偏后窗口）
    expect(screen.getByText('统计区间：2026/11/01 ~ 2026/11/11（北京时间自然日）')).toBeInTheDocument();
    // 支付卡
    expect(screen.getByText('¥1234.50')).toBeInTheDocument();
    expect(screen.getByText('报喜现金红包')).toBeInTheDocument();
    expect(screen.getByText('1000.00')).toBeInTheDocument();
    // 入账卡
    expect(screen.getByText('¥1100.00')).toBeInTheDocument();
    expect(screen.getByText('¥6.60')).toBeInTheDocument();
    expect(screen.getByText('¥1093.40')).toBeInTheDocument();
    // 退费/提现卡
    expect(screen.getByText('¥50.00')).toBeInTheDocument();
    expect(screen.getByText('¥800.00')).toBeInTheDocument();
  }, 20000);

  it('对账汇总：按账期日+渠道展示交易额/手续费/净额/差异', async () => {
    renderPage();
    await switchTab(/对账汇总/);
    await waitFor(() => expect(getReconcileSummaryMock).toHaveBeenCalled());
    expect(getReconcileSummaryMock).toHaveBeenCalledWith(expect.objectContaining({
      start_date: expect.stringMatching(/^\d{8}$/),
      end_date: expect.stringMatching(/^\d{8}$/),
    }));
    // 缺省渠道（全部）时参数不带 channel
    expect(getReconcileSummaryMock.mock.calls[0][0]).not.toHaveProperty('channel');
    // 账期日格式化 YYYY/MM/DD
    expect(screen.getAllByText('2026/11/10').length).toBeGreaterThan(0);
    // 渠道标签（hover 全称）
    expect(screen.getByTitle('微信普通虚拟支付')).toBeInTheDocument();
    expect(screen.getByTitle('Apple IAP')).toBeInTheDocument();
    // 金额与差异
    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByText('99.40')).toBeInTheDocument();
    expect(screen.getByText('17.00')).toBeInTheDocument();
  }, 20000);

  it('资金汇总：点击刷新重新拉取', async () => {
    renderPage();
    await waitFor(() => expect(getFundSummaryMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /刷\s*新/ }));
    await waitFor(() => expect(getFundSummaryMock).toHaveBeenCalledTimes(2));
  }, 20000);

  it('对账汇总：选择微信渠道后按渠道过滤', async () => {
    renderPage();
    await switchTab(/对账汇总/);
    await waitFor(() => expect(getReconcileSummaryMock).toHaveBeenCalled());
    // 打开渠道下拉并选择「微信」
    fireEvent.mouseDown(document.querySelector('.ant-select-selector')!);
    await waitFor(() => expect(document.querySelector('.ant-select-dropdown')).not.toBeNull());
    const dropdown = document.querySelector('.ant-select-dropdown') as HTMLElement;
    const option = Array.from(dropdown.querySelectorAll('.ant-select-item-option')).find((el) => el.textContent === '微信');
    expect(option).toBeTruthy();
    fireEvent.click(option!);
    await waitFor(() => expect(getReconcileSummaryMock).toHaveBeenCalledWith(expect.objectContaining({ channel: 1 })));
  }, 20000);

  it('赠送账单：状态分布为空时不崩溃，查询按关键词传参', async () => {
    getTributeSummaryMock.mockResolvedValueOnce({ ...TRIBUTE, status_counts: null });
    renderPage();
    await switchTab(/赠送账单/);
    await waitFor(() => expect(getTributeSummaryMock).toHaveBeenCalled());
    // status_counts 为 null → 状态分布显示占位，其余内容正常
    expect(screen.queryByText('已完成 8')).not.toBeInTheDocument();
    expect(screen.getByText('玫瑰花')).toBeInTheDocument();
    // 输入关键词并点击查询 → 请求携带 keyword
    fireEvent.change(screen.getByPlaceholderText('搜索赠送人昵称'), { target: { value: '张三' } });
    fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }));
    await waitFor(() => expect(getTributeSummaryMock).toHaveBeenCalledWith(expect.objectContaining({ keyword: '张三' })));
  }, 20000);

  it('赠送账单：统计卡/状态分布/类型与礼物分组', async () => {
    renderPage();
    await switchTab(/赠送账单/);
    await waitFor(() => expect(getTributeSummaryMock).toHaveBeenCalled());
    // 状态分布 Tag
    expect(screen.getByText('已完成 8')).toBeInTheDocument();
    expect(screen.getByText('待支付 2')).toBeInTheDocument();
    // 现金合计（已完成）
    expect(screen.getByText('¥88.00')).toBeInTheDocument();
    // 分组表
    expect(screen.getByText('玫瑰花')).toBeInTheDocument();
    expect(screen.getByText('站内礼物')).toBeInTheDocument();
    expect(screen.getByText('现金红包')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  }, 20000);
});
