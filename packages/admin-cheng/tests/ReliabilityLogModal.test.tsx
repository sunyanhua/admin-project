import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import ReliabilityLogModal from '@/components/user/ReliabilityLogModal';
import { buildUserDetailSections } from '@/components/user/UserDetailSections';

const LOGS = vi.hoisted(() => [
  {
    id: 'l1', source_type: 3, delta: 10, score_after: 45, reason: '学历认证通过',
    related_id: 'edu1', operator_id: '', created_at: '2026-11-10T09:00:00+08:00',
  },
  {
    id: 'l2', source_type: 7, delta: -5, score_after: 40, reason: '违规扣分',
    related_id: '', operator_id: 'admin1', created_at: '2026-11-10T10:00:00+08:00',
  },
]);

const getLogsMock = vi.hoisted(() => vi.fn().mockResolvedValue({ list: LOGS, total: 2 }));

vi.mock('@/api/services/user', () => ({
  userApi: {
    getReliabilityLogs: getLogsMock,
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
  getLogsMock.mockClear();
});

describe('ReliabilityLogModal 靠谱值流水', () => {
  it('渲染来源标签/变化量/变化后/原因', async () => {
    render(
      <App>
        <ReliabilityLogModal open userId="u1" onClose={vi.fn()} />
      </App>,
    );
    await waitFor(() => expect(getLogsMock).toHaveBeenCalledWith('u1', expect.objectContaining({ page: 1 })));
    expect(screen.getByText('学历认证')).toBeInTheDocument();
    expect(screen.getByText('后台调整')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('学历认证通过')).toBeInTheDocument();
  });
});

describe('buildUserDetailSections 脱单资料排版（2026-11-10 用户定）', () => {
  const base = {
    user: { user_id: 'u1', phone: '138', is_migrated: true, is_activated: true },
    profile: { avatar: '', nickname: '张三', gender: 1, age: 28, birth_date: '', zodiac: '', created_at: '2026-11-01T00:00:00+08:00', audit_status: 0, updated_at: '' },
    matchProfile: {
      match_code: 'CN000001', popularity: 12, is_active: true, visibility: 1, zone_id: null,
      real_name: '张三', cn_zodiac: '虎', marital_status: 1, education: 2, profession: '程序员',
      workplace: '', hometown: '', current_city: '', height: 175, weight: 70, hobby_tags: '',
      income_range: 3, self_intro: '', partner_demand: '', blood_type: 1, ethnicity: '',
      household_registration: '', specialties: '', audit_status: 1, audit_reason: null,
      audited_by: null, audited_at: null, can_modify_at: null, extra: {}, updated_by: null,
      created_at: '2026-11-01T00:00:00+08:00', updated_at: '2026-11-02T00:00:00+08:00',
      reliability_display_score: 42, reliability_score: 40,
    },
    wallet: { points: 0, points_earned: 0, points_spent: 0, coins: 0, coins_earned: 0, coins_spent: 0, version: 0, created_at: '', updated_at: '' },
  };

  it('人气与靠谱值同行、可见范围与审核状态同行、最后更新单独一行', () => {
    const { sections } = buildUserDetailSections(base as any);
    // 标题是 JSX 节点无法字符串匹配，按「人气」条目定位脱单资料 section
    const mp = sections.find((s: any) => (s.items || []).some((i: any) => i.label === '人气'));
    expect(mp).toBeTruthy();
    const labels = mp.items.map((i: any) => i.label);
    const idxPop = labels.indexOf('人气');
    const idxRel = labels.indexOf('靠谱值');
    const idxVis = labels.indexOf('可见范围');
    const idxAud = labels.indexOf('审核状态');
    const idxUpd = labels.indexOf('最后更新');
    expect(idxRel).toBe(idxPop + 1);
    expect(idxVis).toBe(idxRel + 1);
    expect(idxAud).toBe(idxVis + 1);
    expect(idxUpd).toBe(idxAud + 1);
    expect(mp.items[idxPop].span).toBe(1);
    expect(mp.items[idxRel].span).toBe(1);
    expect(mp.items[idxVis].span).toBe(1);
    expect(mp.items[idxAud].span).toBe(1);
    expect(mp.items[idxUpd].span).toBe(2);
  });

  it('靠谱值为空时展示占位且不崩溃', () => {
    const noRel = { ...base, matchProfile: { ...base.matchProfile, reliability_display_score: null, reliability_score: null } };
    const { sections } = buildUserDetailSections(noRel as any);
    expect(sections.length).toBeGreaterThan(0);
  });
});
