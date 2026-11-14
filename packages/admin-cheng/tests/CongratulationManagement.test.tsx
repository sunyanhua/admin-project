import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import CongratulationManagement from '@/pages/operation/CongratulationManagement';

/** 三态各一条：未上传结婚证 / 已传未随 / 已随份子 */
const CONGRATS = vi.hoisted(() => [
  {
    id: 'c1', status: 1, has_marriage_certificate: false, is_official_gift: false,
    male_nickname: '张三', female_nickname: '李四', created_at: '2026-11-15T10:00:00+08:00',
  },
  {
    id: 'c2', status: 1, has_marriage_certificate: true, is_official_gift: false,
    male_nickname: '王五', female_nickname: '赵六', created_at: '2026-11-15T11:00:00+08:00',
  },
  {
    id: 'c3', status: 1, is_official_gift: true, gift_amount: 52000,
    male_nickname: '钱七', female_nickname: '孙八', created_at: '2026-11-15T12:00:00+08:00',
  },
]);

const getListMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: CONGRATS, total: 3 }));

vi.mock('@/api/services/congratulation', () => ({
  CongratulationTributeKind: { GIFT: 1, CASH: 2 },
  CongratulationTributeStatus: { PENDING: 0, COMPLETED: 1, REFUNDED: 2, CLOSED: 3 },
  congratulationApi: {
    getList: getListMock,
    getGifts: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    getCashTiers: vi.fn().mockResolvedValue({ list: [], total: 0 }),
  },
}));

vi.mock('@/api/services/xpay', () => ({
  CoinProductStatus: { ENABLED: 0, DISABLED: 1 },
  buildMpProductId: (prefix: string) => `${prefix}-20261112-a1b2`,
  xpayApi: {
    createCoinProduct: vi.fn(),
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
  getListMock.mockClear();
  getListMock.mockResolvedValue({ list: CONGRATS, total: 3 });
});

describe('报喜管理·报喜信息管理', () => {
  it('官方随份子列显示三种状态', async () => {
    render(<App><CongratulationManagement /></App>);
    await waitFor(() => expect(getListMock).toHaveBeenCalled());
    expect(await screen.findByText('未上传结婚证')).toBeInTheDocument();
    expect(screen.getByText('已传结婚证，未随份子')).toBeInTheDocument();
    expect(screen.getByText('已随￥520.00')).toBeInTheDocument();
  }, 20000);
});
