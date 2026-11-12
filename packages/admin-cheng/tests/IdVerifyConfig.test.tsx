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
    user_data: { phone: '13800000000' },
    user_profile: { nickname: '张三', avatar: '', gender: 1, age: 28 },
    user_match_profile: null,
  },
  {
    id: 'r2', user_id: 'u2', status: 2, price_coins: 100, original_price_coins: 200,
    attempt_count: 1, failed_count: 0,
    created_at: '2026-11-06T08:00:00+08:00', expires_at: null, verified_at: '2026-11-06T09:30:00+08:00',
    user_data: null, user_profile: null, user_match_profile: null,
  },
]);

const USER_DETAIL = vi.hoisted(() => ({
  user: {
    user_id: 'u1', phone: '13800000000', is_migrated: false, is_activated: false,
    last_active_at: '', wallet_balance: null, credits: 0, credits_weekly: 0,
  },
  profile: {
    nickname: '张三', avatar: '', gender: 1, age: 28,
    birth_date: '', zodiac: '', created_at: '', audit_status: 0,
  },
  match_profile: null,
  wallet: null,
}));
const getUserDetailMock = vi.hoisted(() => vi.fn().mockResolvedValue(USER_DETAIL));

const getPriceRulesMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: PRICE_RULES, total: 2 }));
const getRecordsMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: RECORDS, total: 2 }));
const createMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const updateMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const createCoinProductMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'cp1' }));

vi.mock('@/api/services/user', () => ({
  userApi: {
    getUserDetail: getUserDetailMock,
    getUserPrivacy: vi.fn(),
    setMatchProfileRecommend: vi.fn(),
    updateBasicProfile: vi.fn(),
    getReliabilityLogs: vi.fn(),
    auditMatchProfile: vi.fn(),
    adjustDivineChance: vi.fn(),
  },
}));

vi.mock('@/api/services/xpay', () => ({
  CoinProductStatus: { ENABLED: 0, DISABLED: 1 },
  buildMpProductId: (prefix: string) => `${prefix}-20261112-a1b2`,
  xpayApi: {
    createCoinProduct: createCoinProductMock,
  },
}));

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
  getUserDetailMock.mockClear();
  getPriceRulesMock.mockClear();
  getRecordsMock.mockClear();
  createMock.mockClear();
  updateMock.mockClear();
  createCoinProductMock.mockClear();
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
    // 用户列：有 user_profile 显示昵称，缺失时回退显示用户 ID
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('u2')).toBeInTheDocument();
    // 状态标签：待认证 / 已通过
    expect(screen.getByTitle('待认证')).toBeInTheDocument();
    expect(screen.getByTitle('已通过')).toBeInTheDocument();
    // 价格规则 TAB 未激活不拉取
    expect(getPriceRulesMock).not.toHaveBeenCalled();
  });

  it('认证记录：点击用户头像昵称打开用户资料卡片', async () => {
    renderPage();
    await waitFor(() => expect(getRecordsMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /张三/ }));
    await waitFor(() => expect(getUserDetailMock).toHaveBeenCalledWith('u1'));
    await screen.findByText('用户详情');
    expect(screen.getAllByText('张三').length).toBeGreaterThanOrEqual(2);
  }, 20000);

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
    // 免费价格不创建充值档位
    expect(createCoinProductMock).not.toHaveBeenCalled();
  }, 20000);

  it('新增付费价格规则：先创建等额充值档位，携带档位 ID 保存', async () => {
    renderPage();
    await openRulesTab();

    await userEvent.click(screen.getByRole('button', { name: /新增规则/ }));
    await screen.findByText('新增价格规则');

    fireEvent.change(screen.getByPlaceholderText('请输入规则名称'), { target: { value: '付费规则' } });
    // 价格默认 0，改为 1 元
    fireEvent.change(screen.getByPlaceholderText('0 表示免费，付费最低 1 元'), { target: { value: '1' } });

    const pickers = document.querySelectorAll('.ant-picker input');
    await pickDate(pickers[0], 6);
    await pickDate(pickers[1], 7);

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    // 先创建等额充值档位：1 元 = 100 金币 = 100 分（1 金币 = 1 分，与红包档位同口径），启用状态
    await waitFor(() => expect(createCoinProductMock).toHaveBeenCalled(), { timeout: 8000 });
    expect(createCoinProductMock).toHaveBeenCalledWith(expect.objectContaining({
      name: '付费规则',
      coin_amount: 100,
      price_cents: 100,
      mp_product_id: 'idv-20261112-a1b2',
      status: 0,
    }));
    // 再携带档位 ID 创建价格规则（价格以金币保存 = 100）
    await waitFor(() => expect(createMock).toHaveBeenCalled(), { timeout: 8000 });
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      name: '付费规则',
      price_coins: 100,
      recharge_product_id: 'cp1',
    }));
  }, 30000);

  it('付费规则档位创建无返回 ID：不创建规则并提示', async () => {
    createCoinProductMock.mockResolvedValueOnce(null);
    renderPage();
    await openRulesTab();

    await userEvent.click(screen.getByRole('button', { name: /新增规则/ }));
    await screen.findByText('新增价格规则');

    fireEvent.change(screen.getByPlaceholderText('请输入规则名称'), { target: { value: '无ID规则' } });
    fireEvent.change(screen.getByPlaceholderText('0 表示免费，付费最低 1 元'), { target: { value: '1' } });

    const pickers = document.querySelectorAll('.ant-picker input');
    await pickDate(pickers[0], 6);
    await pickDate(pickers[1], 7);

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(screen.getByText('创建充值档位失败')).toBeInTheDocument(), { timeout: 8000 });
    expect(createMock).not.toHaveBeenCalled();
  }, 30000);

  it('价格下限校验：0 免费放行，付费价格最低 1 元', async () => {
    const { priceFloorRule } = await import('@/components/system/IdVerifyPriceRuleModal');
    // 0 = 免费，放行
    await expect(priceFloorRule.validator(null, 0)).resolves.toBeUndefined();
    // 付费价格 ≥ 1 元，放行
    await expect(priceFloorRule.validator(null, 1)).resolves.toBeUndefined();
    await expect(priceFloorRule.validator(null, 99)).resolves.toBeUndefined();
    // 低于 1 元的付费价格，拒绝
    await expect(priceFloorRule.validator(null, 0.5)).rejects.toThrow('付费价格最低 1 元');
    // 缺省值交由必填规则处理，放行
    await expect(priceFloorRule.validator(null, null)).resolves.toBeUndefined();
  });

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
