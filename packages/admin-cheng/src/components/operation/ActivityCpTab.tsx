import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Empty, Spin, Tag } from 'antd';
import { ReloadOutlined, HeartFilled, DeleteOutlined, CloudUploadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { activityApi, RegisterRecord, OnsitePairingAdminItem, OnsitePairingUserAdmin } from '@/api/services/activity-v1';
import { RegisterAuditStatus, RegisterGender } from '@shared/constants';
import { EducationLabels } from '@/api/types/status';
import UserAvatar from '@/components/user/UserAvatar';
import { getMediumUrl } from '@/utils/imageUtils';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { matchCpPairs, CpCandidate } from './cpMatching.utils';

interface ActivityCpTabProps {
  activityId: string;
}

/** 组CP展示人员（匹配结果卡片渲染用） */
interface CpPerson extends CpCandidate {
  /** 现场序号（结果稳定排序用） */
  number?: number | null;
  nickname: string;
  realName: string;
  avatar: string;
  photo: string;
  /** 已完成现场签到（仅已保存配对展示用） */
  checkedIn?: boolean;
}

/** 单人资料卡：图片 + 昵称、姓名、年龄、（身高）、学历（图片与文字居上对齐） */
const CpPersonCard: React.FC<{ person: CpPerson; showHeight?: boolean }> = ({ person, showHeight }) => (
  <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
    {person.photo ? (
      <img src={getMediumUrl(person.photo)} alt={person.nickname} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
    ) : (
      <UserAvatar src={person.avatar} nick={person.nickname} size={64} />
    )}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ color: person.gender === 'male' ? '#0088cc' : '#eb5482', marginRight: 4 }}>{person.gender === 'male' ? '男' : '女'}</span>
        {person.nickname}
        {person.checkedIn && <Tag color="blue" icon={<CheckCircleOutlined />} style={{ fontSize: 10, lineHeight: '16px', marginLeft: 6 }}>已签到</Tag>}
      </div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>姓名：{person.realName || '-'}</div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
        年龄 {person.age && person.age > 0 ? person.age : '-'}
        {showHeight && <> · 身高 {person.height && person.height > 0 ? `${person.height} cm` : '-'}</>}
        {' · 学历 '}{person.education && person.education > 0 ? (EducationLabels[person.education] || String(person.education)) : '-'}
      </div>
    </div>
  </div>
);

/**
 * 组CP TAB：打开先检测活动是否已有保存的组CP数据——
 * 有 → 按序号展示，每对可单独删除；无 → 按已入选用户资料自动组合（一男一女，尽可能多组），
 * 下方「提交」按组顺序从序号 1 依次逐对提交到后端。
 * 自动组合条件：男大女≤10岁、女大男≤5岁、女身高≤男身高、学历差≤2（二分图最大匹配）。
 */
const ActivityCpTab: React.FC<ActivityCpTabProps> = ({ activityId }) => {
  const { success, error: showError } = useAppNotification();
  /** auto=无已保存配对（本地自动组合待提交）；server=展示活动已保存配对（可删除） */
  const [mode, setMode] = useState<'auto' | 'server'>('auto');
  const [autoPairs, setAutoPairs] = useState<{ male: CpPerson; female: CpPerson }[]>([]);
  const [serverPairs, setServerPairs] = useState<OnsitePairingAdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** 提交阶段：clear=清空序号中 pair=逐对提交中 */
  const [submitPhase, setSubmitPhase] = useState<'clear' | 'pair'>('pair');
  const [submitProgress, setSubmitProgress] = useState(0);
  /** 报名记录补充资料（配对接口只回基础公开资料，姓名/身高/学历/照片从报名记录补齐） */
  const regMapRef = useRef<Map<string, CpPerson>>(new Map());

  /** 拉取全部已入选报名记录并组装候选（同一用户去重；免报名入选与性别未知跳过） */
  const fetchApproved = useCallback(async (): Promise<{ males: CpPerson[]; females: CpPerson[]; map: Map<string, CpPerson> }> => {
    const regs: RegisterRecord[] = [];
    let page = 1;
    while (true) {
      const res: any = await activityApi.getRegisters(activityId, { page, size: 100, audit_status: RegisterAuditStatus.APPROVED });
      const list: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
      if (!list.length) break;
      regs.push(...list);
      if (list.length < 100) break;
      page++;
    }
    const seen = new Set<string>();
    const males: CpPerson[] = [];
    const females: CpPerson[] = [];
    const map = new Map<string, CpPerson>();
    regs.forEach((r) => {
      if (!r.user_id || seen.has(r.user_id)) return;
      seen.add(r.user_id);
      const g = r.user_profile?.gender ?? r.gender;
      if (g !== RegisterGender.MALE && g !== RegisterGender.FEMALE) return;
      const person: CpPerson = {
        userId: r.user_id,
        gender: g === RegisterGender.MALE ? 'male' : 'female',
        age: r.user_profile?.age ?? r.age,
        height: r.user_match_profile?.height,
        education: r.user_match_profile?.education,
        number: r.onsite_number,
        nickname: r.user_profile?.nickname || r.nickname || r.user_id,
        realName: r.user_match_profile?.real_name || '',
        avatar: r.user_profile?.avatar || r.avatar || '',
        photo: r.user_match_profile?.photos?.[0] || '',
      };
      map.set(r.user_id, person);
      (g === RegisterGender.MALE ? males : females).push(person);
    });
    // 现场序号稳定排序，保证每次组合结果一致
    const byNumber = (a: CpPerson, b: CpPerson) =>
      (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER) || a.userId.localeCompare(b.userId);
    males.sort(byNumber);
    females.sort(byNumber);
    return { males, females, map };
  }, [activityId]);

  /** 拉取全部已保存配对（序号正序，size 上限 100 循环分页） */
  const fetchPairings = useCallback(async (): Promise<OnsitePairingAdminItem[]> => {
    const all: OnsitePairingAdminItem[] = [];
    let page = 1;
    while (true) {
      const res: any = await activityApi.getOnsitePairings(activityId, { page, size: 100, sort_by: 'seq' });
      const list: OnsitePairingAdminItem[] = Array.isArray(res) ? res : (res?.list || []);
      if (!list.length) break;
      all.push(...list);
      if (list.length < 100) break;
      page++;
    }
    return all;
  }, [activityId]);

  /** 打开/刷新：先检测已保存配对，有则读取展示，无则自动组合待提交 */
  const load = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    try {
      const pairings = await fetchPairings();
      if (pairings.length) {
        // 已保存：读取展示；报名记录补齐资料失败不阻塞展示（回退基础公开资料）
        let map = new Map<string, CpPerson>();
        try { ({ map } = await fetchApproved()); } catch { /* 补充资料失败保持基础资料 */ }
        regMapRef.current = map;
        setServerPairs(pairings);
        setAutoPairs([]);
        setMode('server');
      } else {
        const { males, females } = await fetchApproved();
        setAutoPairs(matchCpPairs(males, females));
        setServerPairs([]);
        setMode('auto');
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || '组CP数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [activityId, fetchPairings, fetchApproved, showError]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * 清空全部报名记录的现场序号（提交组CP前置步骤）。
   * 配对创建会按 seq 覆盖双方序号——先全部清空，保证未被配对的成员序号置空、配对成员由创建接口统一重排。
   * 无批量清空接口：拉全部报名记录后对已有序号的记录逐条 DELETE（分块并发 8）。
   * @returns 已清空条数与失败条数（失败不抛错，由调用方决定是否继续）
   */
  const clearAllOnsiteNumbers = useCallback(async (): Promise<{ cleared: number; failed: number }> => {
    const regs: RegisterRecord[] = [];
    let page = 1;
    while (true) {
      const res: any = await activityApi.getRegisters(activityId, { page, size: 100 });
      const list: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
      if (!list.length) break;
      regs.push(...list);
      if (list.length < 100) break;
      page++;
    }
    const targets = regs.filter((r) => r.onsite_number != null);
    let failed = 0;
    const BATCH = 8;
    for (let i = 0; i < targets.length; i += BATCH) {
      const chunk = targets.slice(i, i + BATCH);
      const results = await Promise.allSettled(chunk.map((r) => activityApi.clearOnsiteNumber(activityId, r.id)));
      failed += results.filter((x) => x.status === 'rejected').length;
    }
    return { cleared: targets.length - failed, failed };
  }, [activityId]);

  /** 提交：先清空所有报名用户序号，再按组顺序从序号 1 起逐对提交；任一步失败即停 */
  const handleSubmit = async () => {
    if (!autoPairs.length) return;
    setSubmitting(true);
    setSubmitPhase('clear');
    setSubmitProgress(0);

    // ① 清空所有报名用户序号（有失败即终止，不进入配对提交，避免编号混乱）
    try {
      const { cleared, failed } = await clearAllOnsiteNumbers();
      if (failed > 0) {
        showError(`序号清空失败 ${failed} 条，已终止提交`);
        return;
      }
      if (cleared > 0) success(`已清空 ${cleared} 个现场序号`);
    } catch (err: any) {
      showError(err?.response?.data?.message || '清空序号失败，已终止提交');
      return;
    }

    // ② 逐对提交（seq 从 1 按组顺序）
    setSubmitPhase('pair');
    let submitted = 0;
    try {
      for (let i = 0; i < autoPairs.length; i++) {
        const p = autoPairs[i];
        await activityApi.createOnsitePairing(activityId, {
          male_id: p.male.userId,
          female_id: p.female.userId,
          seq: i + 1,
        });
        submitted = i + 1;
        setSubmitProgress(submitted);
      }
      success(`已提交 ${autoPairs.length} 组CP`);
    } catch (err: any) {
      showError(`第 ${submitted + 1} 组提交失败：${err?.response?.data?.message || err?.message || '未知错误'}`);
    } finally {
      setSubmitting(false);
      setSubmitPhase('pair');
      setSubmitProgress(0);
      // 部分提交后活动可能已有保存数据，重新检测模式
      await load();
    }
  };

  /** 删除单对（软删释放序号；全部删完后回到自动组合模式）；任一成员已签到则不可删除 */
  const handleDelete = (item: OnsitePairingAdminItem) => {
    if (item.male?.checkin_at || item.female?.checkin_at) {
      showError('该CP已有成员签到，不可删除');
      return;
    }
    const maleNick = item.male?.profile?.nickname || item.male?.user?.user_id || '-';
    const femaleNick = item.female?.profile?.nickname || item.female?.user?.user_id || '-';
    confirmDelete({
      name: `第 ${item.seq} 组（${maleNick} × ${femaleNick}）`,
      content: '删除后释放配对序号，双方报名现场序号保持不变。',
      deleteFn: () => activityApi.deleteOnsitePairing(activityId, item.id),
      onSuccess: () => { load(); },
    });
  };

  /** 服务端配对成员的展示资料：报名记录补充优先，缺省用配对条目基础公开资料 */
  const viewOf = (side: OnsitePairingUserAdmin | undefined, gender: 'male' | 'female'): CpPerson => {
    const userId = side?.user?.user_id || '';
    const enriched = regMapRef.current.get(userId);
    return {
      userId,
      gender,
      age: enriched?.age ?? side?.profile?.age,
      height: enriched?.height,
      education: enriched?.education,
      nickname: enriched?.nickname || side?.profile?.nickname || userId || '-',
      realName: enriched?.realName || '',
      avatar: enriched?.avatar || side?.profile?.avatar || '',
      photo: enriched?.photo || '',
      checkedIn: !!side?.checkin_at,
    };
  };

  const pairCount = mode === 'server' ? serverPairs.length : autoPairs.length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          共 {pairCount} 组{mode === 'auto' ? '（待提交）' : '（已保存）'}
        </span>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>刷新</Button>
      </div>
      <Spin spinning={loading}>
        {pairCount === 0 ? (
          <Empty description={mode === 'server' ? '暂无已保存的CP组合' : '暂无满足条件的CP组合'} style={{ padding: '40px 0' }} />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {mode === 'auto' ? (
              autoPairs.map((p, i) => (
                <div
                  key={`${p.male.userId}-${p.female.userId}`}
                  style={{
                    width: 'calc(50% - 6px)', minWidth: 400, boxSizing: 'border-box',
                    border: 'solid 1px #f0f0f0', borderRadius: 8, background: '#fafafa',
                    padding: '28px 14px 12px', display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative',
                  }}
                >
                  <span style={{ position: 'absolute', top: 6, left: 10, fontSize: 12, color: '#999' }}>{i + 1}</span>
                  <CpPersonCard person={p.male} showHeight />
                  <HeartFilled style={{ color: '#eb5482', fontSize: 18, flexShrink: 0, alignSelf: 'center' }} />
                  <CpPersonCard person={p.female} />
                </div>
              ))
            ) : (
              serverPairs.map((item) => (
                <div
                  key={item.id}
                  style={{
                    width: 'calc(50% - 6px)', minWidth: 400, boxSizing: 'border-box',
                    border: 'solid 1px #f0f0f0', borderRadius: 8, background: '#fafafa',
                    padding: '28px 14px 12px', display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative',
                  }}
                >
                  <span style={{ position: 'absolute', top: 6, left: 10, fontSize: 12, color: '#999' }}>第 {item.seq} 组</span>
                  <CpPersonCard person={viewOf(item.male, 'male')} showHeight />
                  <HeartFilled style={{ color: '#eb5482', fontSize: 18, flexShrink: 0, alignSelf: 'center' }} />
                  <CpPersonCard person={viewOf(item.female, 'female')} />
                  <Button
                    type="text" size="small" icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                    style={{ position: 'absolute', top: 2, right: 8, height: 20, lineHeight: '20px', padding: '0 2px' }}
                    disabled={!!item.male?.checkin_at || !!item.female?.checkin_at}
                    title={(item.male?.checkin_at || item.female?.checkin_at) ? '已有成员签到，不可删除' : '删除该CP'}
                    onClick={() => handleDelete(item)}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </Spin>
      {mode === 'auto' && autoPairs.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button type="primary" icon={<CloudUploadOutlined />} loading={submitting} onClick={handleSubmit}>
            {submitting
              ? (submitPhase === 'clear' ? '清空序号中…' : `提交中 ${submitProgress}/${autoPairs.length}`)
              : `提交（${autoPairs.length} 组）`}
          </Button>
          <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>提交前将先清空所有报名用户的现场序号</div>
        </div>
      )}
    </div>
  );
};

export default ActivityCpTab;
