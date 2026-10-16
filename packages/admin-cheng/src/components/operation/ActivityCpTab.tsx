import { useState, useCallback, useEffect } from 'react';
import { Button, Empty, Spin } from 'antd';
import { ReloadOutlined, HeartFilled } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import { RegisterAuditStatus, RegisterGender } from '@shared/constants';
import { EducationLabels } from '@/api/types/status';
import UserAvatar from '@/components/user/UserAvatar';
import { getMediumUrl } from '@/utils/imageUtils';
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
}

/** 单人资料卡：图片 + 昵称、姓名、年龄、（身高）、学历 */
const CpPersonCard: React.FC<{ person: CpPerson; showHeight?: boolean }> = ({ person, showHeight }) => (
  <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
    {person.photo ? (
      <img src={getMediumUrl(person.photo)} alt={person.nickname} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
    ) : (
      <UserAvatar src={person.avatar} nick={person.nickname} size={64} />
    )}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ color: person.gender === 'male' ? '#0088cc' : '#eb5482', marginRight: 4 }}>{person.gender === 'male' ? '男' : '女'}</span>
        {person.nickname}
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
 * 组CP TAB：按本场活动所有已入选用户的资料做一男一女组合。
 * 条件：男生比女生大不超过 10 岁、女生比男生大不超过 5 岁、女生身高不高于男生、学历差 ≤2。
 * 匹配为二分图最大匹配（尽可能多组合）；缺年龄无法判断不参与，缺身高/学历视为满足。
 */
const ActivityCpTab: React.FC<ActivityCpTabProps> = ({ activityId }) => {
  const { error: showError } = useAppNotification();
  const [pairs, setPairs] = useState<{ male: CpPerson; female: CpPerson }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAndMatch = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    try {
      // 循环分页拉取本场活动全部已入选报名记录（size 上限 100）
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
      // 组装候选：同一用户多份记录只保留首个；免报名入选（无 user_id）与性别未知跳过
      const seen = new Set<string>();
      const males: CpPerson[] = [];
      const females: CpPerson[] = [];
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
        (g === RegisterGender.MALE ? males : females).push(person);
      });
      // 现场序号稳定排序，保证每次组合结果一致
      const byNumber = (a: CpPerson, b: CpPerson) =>
        (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER) || a.userId.localeCompare(b.userId);
      males.sort(byNumber);
      females.sort(byNumber);
      setPairs(matchCpPairs(males, females));
    } catch (err: any) {
      showError(err?.response?.data?.message || '组CP数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [activityId, showError]);

  useEffect(() => {
    fetchAndMatch();
  }, [fetchAndMatch]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>共 {pairs.length} 组</span>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchAndMatch}>刷新</Button>
      </div>
      <Spin spinning={loading}>
        {pairs.length === 0 ? (
          <Empty description="暂无满足条件的CP组合" style={{ padding: '40px 0' }} />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {pairs.map((p, i) => (
              <div
                key={`${p.male.userId}-${p.female.userId}`}
                style={{
                  width: 'calc(50% - 6px)', minWidth: 400, boxSizing: 'border-box',
                  border: 'solid 1px #f0f0f0', borderRadius: 8, background: '#fafafa',
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', top: 4, left: 10, fontSize: 12, color: '#999' }}>{i + 1}</span>
                <CpPersonCard person={p.male} showHeight />
                <HeartFilled style={{ color: '#eb5482', fontSize: 18, flexShrink: 0 }} />
                <CpPersonCard person={p.female} />
              </div>
            ))}
          </div>
        )}
      </Spin>
    </div>
  );
};

export default ActivityCpTab;
