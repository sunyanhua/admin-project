import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import CongratulationManagement from '@/pages/operation/CongratulationManagement';

const CASH_TIERS = vi.hoisted(() => [
  {
    id: 'ct1', name: '红包 2.00 元', amount_cents: 200, coin_amount: 200,
    recharge_product_id: 'cp1', sort_order: 1, status: 0,
    created_at: '2026-11-12T10:00:00+08:00', updated_at: '2026-11-12T10:00:00+08:00',
  },
  {
    id: 'ct2', name: '红包 5.20 元', amount_cents: 520, coin_amount: 520,
    recharge_product_id: 'cp2', sort_order: 2, status: 1,
    created_at: '2026-11-12T10:00:00+08:00', updated_at: '2026-11-12T10:00:00+08:00',
  },
]);

const getCashTiersMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: CASH_TIERS, total: 2 }));
const createCashTierMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const updateCashTierMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const createCoinProductMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'cp9' }));

vi.mock('@/api/services/congratulation', () => ({
  CongratulationTributeKind: { GIFT: 1, CASH: 2 },
  CongratulationTributeStatus: { PENDING: 0, COMPLETED: 1, REFUNDED: 2, CLOSED: 3 },
  congratulationApi: {
    getList: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    getGifts: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    getCashTiers: getCashTiersMock,
    createCashTier: createCashTierMock,
    updateCashTier: updateCashTierMock,
  },
}));

vi.mock('@/api/services/xpay', () => ({
  CoinProductStatus: { ENABLED: 0, DISABLED: 1 },
  buildMpProductId: (prefix: string) => `${prefix}-20261112-a1b2`,
  xpayApi: {
    createCoinProduct: createCoinProductMock,
  },
}));

vi.mock('@/api/services/user', () => ({
  userApi: {
    getUserDetail: vi.fn(),
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
  getCashTiersMock.mockClear();
  createCashTierMock.mockClear();
  updateCashTierMock.mockClear();
  createCoinProductMock.mockClear();
});

const renderPage = () => render(<App><CongratulationManagement /></App>);

const openCashTab = async () => {
  await userEvent.click(screen.getByRole('tab', { name: /红包管理/ }));
  await waitFor(() => expect(getCashTiersMock).toHaveBeenCalled());
};

/** 打开新增弹窗并填写名称/金额 */
const openCreateModal = async (name: string, amount: string) => {
  await userEvent.click(screen.getByRole('button', { name: /添加红包档位/ }));
  await screen.findByText('新增红包档位');
  fireEvent.change(screen.getByPlaceholderText('请输入档位名称'), { target: { value: name } });
  fireEvent.change(screen.getByPlaceholderText('1.00~5.20'), { target: { value: amount } });
};

describe('报喜管理·红包管理', () => {
  it('红包管理 TAB：渲染档位名称/金额/代币数/状态', async () => {
    renderPage();
    await openCashTab();
    expect(screen.getByText('红包 2.00 元')).toBeInTheDocument();
    expect(screen.getByText('红包 5.20 元')).toBeInTheDocument();
    expect(screen.getByText('2.00')).toBeInTheDocument();
    expect(screen.getByText('5.20')).toBeInTheDocument();
    // 两个状态开关（启用/停用）
    expect(screen.getAllByRole('switch').length).toBe(2);
  }, 20000);

  it('新增红包档位：先创建等额充值档位，携带档位 ID 创建', async () => {
    renderPage();
    await openCashTab();
    await openCreateModal('新婚红包', '2.00');

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    // 先创建等额充值档位：金额 2.00 元 = 200 分 = 200 代币，启用
    await waitFor(() => expect(createCoinProductMock).toHaveBeenCalled());
    expect(createCoinProductMock).toHaveBeenCalledWith(expect.objectContaining({
      name: '新婚红包',
      coin_amount: 200,
      price_cents: 200,
      mp_product_id: 'cash-20261112-a1b2',
      status: 0,
    }));
    // 再携带档位 ID 创建红包档位
    await waitFor(() => expect(createCashTierMock).toHaveBeenCalled());
    expect(createCashTierMock).toHaveBeenCalledWith(expect.objectContaining({
      name: '新婚红包',
      amount_cents: 200,
      coin_amount: 200,
      recharge_product_id: 'cp9',
    }));
    await screen.findByText('红包档位已创建');
  }, 20000);

  it('编辑金额未变化：复用旧充值档位 ID，不新建档位', async () => {
    renderPage();
    await openCashTab();

    fireEvent.click(screen.getAllByRole('button', { name: /编\s*辑/ })[0]);
    await screen.findByText('编辑红包档位');
    // 等待回填完成
    const nameInput = screen.getByPlaceholderText('请输入档位名称');
    await waitFor(() => expect(nameInput).toHaveValue('红包 2.00 元'));

    fireEvent.change(nameInput, { target: { value: '改个名字' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateCashTierMock).toHaveBeenCalled(), { timeout: 8000 });
    expect(updateCashTierMock).toHaveBeenCalledWith('ct1', expect.objectContaining({
      name: '改个名字',
      amount_cents: 200,
      recharge_product_id: 'cp1',
    }));
    expect(createCoinProductMock).not.toHaveBeenCalled();
  }, 30000);

  it('编辑金额变化：新建等额充值档位并更新关联 ID', async () => {
    renderPage();
    await openCashTab();

    fireEvent.click(screen.getAllByRole('button', { name: /编\s*辑/ })[0]);
    await screen.findByText('编辑红包档位');
    const nameInput = screen.getByPlaceholderText('请输入档位名称');
    await waitFor(() => expect(nameInput).toHaveValue('红包 2.00 元'));

    fireEvent.change(screen.getByPlaceholderText('1.00~5.20'), { target: { value: '3.00' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(createCoinProductMock).toHaveBeenCalled());
    expect(createCoinProductMock).toHaveBeenCalledWith(expect.objectContaining({
      coin_amount: 300,
      price_cents: 300,
    }));
    await waitFor(() => expect(updateCashTierMock).toHaveBeenCalled());
    expect(updateCashTierMock).toHaveBeenCalledWith('ct1', expect.objectContaining({
      amount_cents: 300,
      coin_amount: 300,
      recharge_product_id: 'cp9',
    }));
  }, 20000);

  it('状态切换：调用更新接口传反向状态', async () => {
    renderPage();
    await openCashTab();

    // 第一行（当前启用）的开关 → 点击后应停用
    fireEvent.click(screen.getAllByRole('switch')[0]);

    await waitFor(() => {
      expect(updateCashTierMock).toHaveBeenCalledWith('ct1', { status: 1 });
    });
  }, 20000);

  it('充值档位创建失败：不创建红包档位并提示失败原因', async () => {
    createCoinProductMock.mockRejectedValueOnce(new Error('充值档位创建失败'));
    renderPage();
    await openCashTab();
    await openCreateModal('失败档位', '2.00');

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await screen.findByText('充值档位创建失败');
    expect(createCashTierMock).not.toHaveBeenCalled();
  }, 30000);

  it('充值档位创建无返回 ID：不创建红包档位并提示', async () => {
    createCoinProductMock.mockResolvedValueOnce(null);
    renderPage();
    await openCashTab();
    await openCreateModal('无ID档位', '2.00');

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await screen.findByText('创建充值档位失败');
    expect(createCashTierMock).not.toHaveBeenCalled();
  }, 30000);

  it('第二步保存失败：提示充值档位已创建（部分成功）', async () => {
    createCashTierMock.mockRejectedValueOnce({ response: { data: { message: '金额不合法' } } });
    renderPage();
    await openCashTab();
    await openCreateModal('部分失败', '2.00');

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await screen.findByText('充值档位已创建，但保存失败：金额不合法');
  }, 30000);
});
