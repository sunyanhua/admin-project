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
  // 生产响应形态（拦截器解包为 {list,total,pagination}），走 res?.list 分支
  getOnsiteLovesCouplesMock.mockResolvedValue({ list: COUPLES, total: 2 });
  getUserDetailMock.mockReset();
});

const renderTab = () => render(
  <App>
    <OnsiteLoveRankTab activityId="a1" />
  </App>,
);

describe('OnsiteLoveRankTab 心动排名', () => {
  it('渲染排名列表：男卡在左、中间列居中、女卡在右，显示排名且不含心动统计', async () => {
    renderTab();
    await screen.findByText('6 - 小红');
    const row = screen.getAllByTestId('love-row')[0];
    expect((row.children[0] as HTMLElement).dataset.testid).toBe('love-card-male');
    expect((row.children[1] as HTMLElement).dataset.testid).toBe('love-center');
    expect((row.children[2] as HTMLElement).dataset.testid).toBe('love-card-female');
    expect(screen.getByText('第 1 名')).toBeInTheDocument();
    expect(screen.queryByText('共 3 次心动')).toBeNull();
    // 卡片键盘可访问（role=button）
    expect(screen.getAllByTestId('love-card-male')[0]).toHaveAttribute('role', 'button');
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
    // 不显示发起方文字，仅保留心形图标；语义通过 title/aria 保留（不可见）
    expect(screen.queryByText('女方发起')).toBeNull();
    expect(screen.queryByText('男方发起')).toBeNull();
    expect(r1f).toHaveAttribute('title', '女方心动');
    expect(r1m).toHaveAttribute('title', '男方心动');
  });

  it('单方心动：计数为 0 的一行不渲染心形', async () => {
    renderTab();
    await screen.findByText('7 - 小美');
    const r2m = within(screen.getAllByTestId('love-row')[1]).getByTestId('love-hearts-male');
    expect(r2m.querySelectorAll('.anticon-heart').length).toBe(0);
  });

  it('卡片缩略图顶部对齐：有人像图的卡片 objectPosition 为 top，保证人头完整显示', async () => {
    renderTab();
    await screen.findByText('6 - 小红');
    const femaleCard = screen.getAllByTestId('love-card-female')[0];
    const img = femaleCard.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveStyle({ objectPosition: 'top' });
    // 无头像（avatar 为空）的卡片兜底昵称首字，不渲染 img
    expect(screen.getAllByTestId('love-card-male')[0].querySelector('img')).toBeNull();
  });

  it('配对超过 100 条时分页循环拉全量', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      couple_id: `c${i}`, onsite_loves_count: 1, female_loves_count: 1, male_loves_count: 0,
      female: { profile: { nickname: `女${i}` }, user: { user_id: `f${i}` } },
      male: { profile: { nickname: `男${i}` }, user: { user_id: `m${i}` } },
    }));
    getOnsiteLovesCouplesMock
      .mockResolvedValueOnce({ list: page1, total: 100 })
      .mockResolvedValueOnce({ list: [], total: 0 });
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
    getOnsiteLovesCouplesMock.mockResolvedValue({ list: [], total: 0 });
    renderTab();
    expect(await screen.findByText('暂无现场心动配对')).toBeInTheDocument();
  });

  it('接口失败弹错误提示并展示失败态（loading 已结束）', async () => {
    getOnsiteLovesCouplesMock.mockRejectedValue({ response: { data: { message: '接口错误' } } });
    renderTab();
    expect(await screen.findByText('接口错误')).toBeInTheDocument();
    // 失败态替代空态文案，且不再停留加载中（若 loading 未结束只会渲染 Spin，找不到该文案）
    expect(await screen.findByText('加载失败，点击刷新重试')).toBeInTheDocument();
  });

  it('缺字段防御：female 缺失与昵称/序号为空显示 -', async () => {
    getOnsiteLovesCouplesMock.mockResolvedValue({
      list: [{
        couple_id: 'c9', onsite_loves_count: 1, female_loves_count: 1, male_loves_count: 0,
        male: { onsite_number: null, profile: { nickname: '' }, user: { user_id: 'm9' } },
      }], total: 1,
    });
    renderTab();
    const card = await screen.findByTestId('love-card-female');
    expect(card.textContent).toContain('-');
    // 男卡昵称空/序号 null 同样兜底 '-'
    expect(screen.getByTestId('love-card-male').textContent).toContain('-');
  });

  it('点击嘉宾卡片打开用户资料卡片弹窗（按点击人 user_id 拉取）', async () => {
    getUserDetailMock.mockResolvedValue({
      user: { user_id: 'um1', phone: '', is_migrated: false },
      profile: {}, match_profile: null, wallet: null,
    });
    renderTab();
    fireEvent.click(await screen.findByText('3 - 小刚'));
    expect(await screen.findByText('用户详情')).toBeInTheDocument();
    expect(getUserDetailMock).toHaveBeenCalledWith('um1');
  });
});
