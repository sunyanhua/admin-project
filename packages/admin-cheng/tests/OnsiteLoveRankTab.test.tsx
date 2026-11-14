import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { App } from 'antd';
import OnsiteLoveRankTab from '@/components/operation/OnsiteLoveRankTab';

/** 两对配对：覆盖互心（女2男1）、单方+超限（女5男0） */
const COUPLES = vi.hoisted(() => [
  {
    couple_id: 'c1', onsite_loves_count: 3, female_loves_count: 2, male_loves_count: 1,
    female: { onsite_number: 6, profile: { nickname: '小红', avatar: 'https://img.vbegin.com.cn/a.jpg' }, user: { user_id: 'uf1' } },
    male: { onsite_number: 3, profile: { nickname: '小刚', avatar: '' }, user: { user_id: 'um1' } },
  },
  {
    couple_id: 'c2', onsite_loves_count: 2, female_loves_count: 5, male_loves_count: 0,
    female: { onsite_number: 7, profile: { nickname: '小美' }, user: { user_id: 'uf2' } },
    male: { onsite_number: 4, profile: { nickname: '小强' }, user: { user_id: 'um2' } },
  },
]);

const getOnsiteLovesCouplesMock = vi.hoisted(() => vi.fn());
const getUserDetailMock = vi.hoisted(() => vi.fn());

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getOnsiteLovesCouples: getOnsiteLovesCouplesMock,
  },
}));

// 阻断真实 API 模块链（src/api/index.ts 顶层依赖 localStorage，jsdom 下不可用）
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
  getOnsiteLovesCouplesMock.mockReset();
  getOnsiteLovesCouplesMock.mockResolvedValue(COUPLES);
  getUserDetailMock.mockReset();
});

const renderTab = () => render(
  <App>
    <OnsiteLoveRankTab activityId="a1" />
  </App>,
);

describe('OnsiteLoveRankTab 心动排名', () => {
  it('渲染排名列表：女卡在左、中间列居中、男卡在右，且显示排名与总心动次数', async () => {
    renderTab();
    await screen.findByText('6 - 小红');
    const row = screen.getAllByTestId('love-row')[0];
    expect((row.children[0] as HTMLElement).dataset.testid).toBe('love-card-female');
    expect((row.children[1] as HTMLElement).dataset.testid).toBe('love-center');
    expect((row.children[2] as HTMLElement).dataset.testid).toBe('love-card-male');
    expect(screen.getByText('第 1 名')).toBeInTheDocument();
    expect(screen.getByText('共 3 次心动')).toBeInTheDocument();
  });

  it('心形按次数渲染且上限 3：红行=女方发起、蓝行=男方发起', async () => {
    renderTab();
    await screen.findByText('6 - 小红');
    const rows = screen.getAllByTestId('love-row');
    // 第 1 对：女 2 红心、男 1 蓝心
    const r1f = within(rows[0]).getByTestId('love-hearts-female');
    const r1m = within(rows[0]).getByTestId('love-hearts-male');
    expect(r1f.querySelectorAll('.anticon-heart').length).toBe(2);
    expect(r1m.querySelectorAll('.anticon-heart').length).toBe(1);
    expect(r1f.style.color).toBe('rgb(255, 91, 143)');
    expect(r1m.style.color).toBe('rgb(77, 163, 255)');
    // 第 2 对：女 5 → 上限 3
    const r2f = within(rows[1]).getByTestId('love-hearts-female');
    expect(r2f.querySelectorAll('.anticon-heart').length).toBe(3);
    // 标签
    expect(screen.getAllByText('女方发起').length).toBe(2);
    expect(screen.getAllByText('男方发起').length).toBe(2);
  });

  it('单方心动：计数为 0 的一行不渲染心形', async () => {
    renderTab();
    await screen.findByText('7 - 小美');
    const r2m = within(screen.getAllByTestId('love-row')[1]).getByTestId('love-hearts-male');
    expect(r2m.querySelectorAll('.anticon-heart').length).toBe(0);
  });

  it('配对超过 100 条时分页循环拉全量', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      couple_id: `c${i}`, onsite_loves_count: 1, female_loves_count: 1, male_loves_count: 0,
      female: { profile: { nickname: `女${i}` }, user: { user_id: `f${i}` } },
      male: { profile: { nickname: `男${i}` }, user: { user_id: `m${i}` } },
    }));
    getOnsiteLovesCouplesMock
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce([]);
    renderTab();
    await screen.findByText('- - 女0');
    expect(getOnsiteLovesCouplesMock).toHaveBeenCalledWith('a1', { page: 1, size: 100 });
    expect(getOnsiteLovesCouplesMock).toHaveBeenCalledWith('a1', { page: 2, size: 100 });
    expect(screen.getAllByTestId('love-row').length).toBe(100);
  });

  it('刷新按钮重新拉取数据', async () => {
    renderTab();
    await screen.findByText('6 - 小红');
    const before = getOnsiteLovesCouplesMock.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
    await waitFor(() => expect(getOnsiteLovesCouplesMock.mock.calls.length).toBe(before + 1));
  });

  it('空数据显示空状态', async () => {
    getOnsiteLovesCouplesMock.mockResolvedValue([]);
    renderTab();
    expect(await screen.findByText('暂无现场心动配对')).toBeInTheDocument();
  });

  it('接口失败弹错误提示', async () => {
    getOnsiteLovesCouplesMock.mockRejectedValue({ response: { data: { message: '接口错误' } } });
    renderTab();
    expect(await screen.findByText('接口错误')).toBeInTheDocument();
  });

  it('缺字段防御：female 缺失与昵称/序号为空显示 -', async () => {
    getOnsiteLovesCouplesMock.mockResolvedValue([{
      couple_id: 'c9', onsite_loves_count: 1, female_loves_count: 1, male_loves_count: 0,
      male: { onsite_number: null, profile: { nickname: '' }, user: { user_id: 'm9' } },
    }]);
    renderTab();
    const card = await screen.findByTestId('love-card-female');
    expect(card.textContent).toContain('-');
  });

  it('点击嘉宾卡片打开用户资料卡片弹窗', async () => {
    getUserDetailMock.mockResolvedValue({
      user: { user_id: 'um1', phone: '', is_migrated: false },
      profile: {}, match_profile: null, wallet: null,
    });
    renderTab();
    fireEvent.click(await screen.findByText('3 - 小刚'));
    expect(await screen.findByText('用户详情')).toBeInTheDocument();
  });
});
