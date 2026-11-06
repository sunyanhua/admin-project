import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import UserVerify from '@/pages/community/UserVerify';

const PRICE_RULES = vi.hoisted(() => [
  {
    id: 'p1', name: '标准认证', price_coins: 0, original_price_coins: 10,
    start_at: '2026-11-01T00:00:00+08:00', end_at: '2026-12-01T00:00:00+08:00',
    remark: '默认规则', status: 0, created_at: '2026-11-01T00:00:00+08:00', updated_at: '2026-11-01T00:00:00+08:00',
  },
  {
    id: 'p2', name: '优惠认证', price_coins: 100, original_price_coins: 200,
    start_at: '2026-12-01T00:00:00+08:00', end_at: '2027-01-01T00:00:00+08:00',
    remark: '', status: 1, created_at: '2026-11-02T00:00:00+08:00', updated_at: '2026-11-02T00:00:00+08:00',
  },
]);

const RECORDS = vi.hoisted(() => [
  {
    id: 'r1', user_id: 'u1', status: 1, price_coins: 0, original_price_coins: 0,
    attempt_count: 0, failed_count: 0,
    created_at: '2026-11-06T09:00:00+08:00', expires_at: '2026-11-06T10:00:00+08:00', verified_at: null,
  },
  {
    id: 'r2', user_id: 'u2', status: 2, price_coins: 100, original_price_coins: 200,
    attempt_count: 1, failed_count: 0,
    created_at: '2026-11-06T08:00:00+08:00', expires_at: null, verified_at: '2026-11-06T09:30:00+08:00',
  },
]);

const getPriceRulesMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: PRICE_RULES, total: 2 }));
const getRecordsMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: RECORDS, total: 2 }));
const createMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const updateMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/api/services/idverify', () => ({
  PriceRuleStatus: { ENABLED: 0, DISABLED: 1 },
  IdVerifyRecordStatus: { PENDING_PAYMENT: 0, PENDING_VERIFY: 1, PASSED: 2, EXHAUSTED: 3, CLOSED: 4, REFUNDED: 5 },
  idverifyApi: {
    getPriceRules: getPriceRulesMock,
    getRecords: getRecordsMock,
    createPriceRule: createMock,
    updatePriceRule: updateMock,
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
  getPriceRulesMock.mockClear();
  getRecordsMock.mockClear();
  createMock.mockClear();
  updateMock.mockClear();
});

const renderPage = () =>
  render(
    <App>
      <UserVerify />
    </App>,
  );

/** 通过日历面板选择本月日期：点击输入框打开面板 → 点日期格 → 点 OK 提交（showTime 模式需 OK 才触发 onChange） */
const pickDate = async (input: Element, day: number) => {
  fireEvent.click(input);
  await waitFor(() => {
    expect(document.querySelectorAll('.ant-picker-dropdown').length).toBeGreaterThan(0);
  });
  // jsdom 中关闭的面板不会卸载（rc-motion 无 transition 事件），取文档中最后一个面板 = 当前输入框刚打开的
  const dropdowns = document.querySelectorAll('.ant-picker-dropdown');
  const dropdown = dropdowns[dropdowns.length - 1] as HTMLElement;
  const cell = dropdown.querySelector(`.ant-picker-cell[title="2026-11-${String(day).padStart(2, '0')}"] .ant-picker-cell-inner`);
  expect(cell).not.toBeNull();
  fireEvent.click(cell!);
  // showTime 面板底部 OK 按钮提交值（antd 测试环境默认英文 locale，按钮文本为 OK）
  const okBtn = dropdown.querySelector('.ant-picker-ok button') as HTMLButtonElement | null;
  expect(okBtn).not.toBeNull();
  fireEvent.click(okBtn!);
};

/** 切到「价格规则」TAB 并等待规则列表加载 */
const openRulesTab = async () => {
  await userEvent.click(screen.getByRole('tab', { name: /价格规则/ }));
  await waitFor(() => expect(screen.getByText('标准认证')).toBeInTheDocument());
};

describe('UserVerify 用户认证（实名认证配置）', () => {
  it('默认显示认证记录 TAB：挂载即拉取记录并渲染状态标签', async () => {
    renderPage();
    // 默认 TAB 即认证记录，无需点击
    await waitFor(() => expect(getRecordsMock).toHaveBeenCalled());
    expect(screen.getByText('u1')).toBeInTheDocument();
    expect(screen.getByText('u2')).toBeInTheDocument();
    // 状态标签：待认证 / 已通过
    expect(screen.getByTitle('待认证')).toBeInTheDocument();
    expect(screen.getByTitle('已通过')).toBeInTheDocument();
    // 价格规则 TAB 未激活不拉取
    expect(getPriceRulesMock).not.toHaveBeenCalled();
  });

  it('价格规则列表渲染：名称/免费标签/状态开关', async () => {
    renderPage();
    await openRulesTab();
    expect(screen.getByText('优惠认证')).toBeInTheDocument();
    // 价格 0 → 「免费」标签（规则与记录 TAB 各有一条 0 元记录，至少出现一个）
    expect(screen.getAllByTitle('免费').length).toBeGreaterThan(0);
    // 两行各一个状态开关
    expect(screen.getAllByRole('switch').length).toBe(2);
  });

  it('新增规则：表单提交调用创建接口（状态默认启用 0）', async () => {
    renderPage();
    await openRulesTab();

    await userEvent.click(screen.getByRole('button', { name: /新增规则/ }));
    await screen.findByText('新增价格规则');

    await userEvent.type(screen.getByPlaceholderText('请输入规则名称'), '测试规则');

    // 两个日期选择器：生效开始 / 生效结束（结束晚于开始）
    const pickers = document.querySelectorAll('.ant-picker input');
    expect(pickers.length).toBe(2);
    await pickDate(pickers[0], 6);
    await pickDate(pickers[1], 7);

    // antd 两字按钮会插入空格（保 存），用正则匹配；fireEvent 同步触发（userEvent 在 jsdom 校验重渲染下极慢）
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      name: '测试规则',
      price_coins: 0,
      original_price_coins: 0,
      status: 0,
    }));
    const payload = createMock.mock.calls[0][0];
    expect(payload.start_at).toBeTruthy();
    expect(payload.end_at).toBeTruthy();
  }, 20000);

  it('结束时间校验规则：不晚于开始时间时拒绝、晚于时通过', async () => {
    // 校验规则已抽为纯函数（endAfterStartRule），直接验证规则逻辑（UI 级表单校验在 jsdom 下受 rc-picker 拖累不可靠）
    const { endAfterStartRule } = await import('@/components/system/IdVerifyPriceRuleModal');
    const getFieldValue = () => dayjs('2026-11-07T00:00:00+08:00');
    const rule = endAfterStartRule(getFieldValue);

    // 结束时间 = 开始时间 → 拒绝
    await expect(rule.validator(null, dayjs('2026-11-07T00:00:00+08:00')))
      .rejects.toThrow('结束时间必须晚于开始时间');
    // 结束时间 < 开始时间 → 拒绝
    await expect(rule.validator(null, dayjs('2026-11-06T00:00:00+08:00')))
      .rejects.toThrow('结束时间必须晚于开始时间');
    // 结束时间 > 开始时间 → 通过
    await expect(rule.validator(null, dayjs('2026-11-08T00:00:00+08:00')))
      .resolves.toBeUndefined();
    // 开始时间缺省 → 放行（由必填规则负责提示）
    const noStartRule = endAfterStartRule(() => undefined);
    await expect(noStartRule.validator(null, dayjs('2026-11-08T00:00:00+08:00'))).resolves.toBeUndefined();
  });

  it('状态开关切换：调用更新接口传反向状态', async () => {
    renderPage();
    await openRulesTab();

    // 第一行（标准认证，当前启用）的开关 → 点击后应停用
    fireEvent.click(screen.getAllByRole('switch')[0]);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith('p1', { status: 1 });
    });
  });
});
