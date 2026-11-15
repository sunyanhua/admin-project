import { useState, useEffect, useCallback } from 'react';
import { Button, Empty, Spin } from 'antd';
import { ReloadOutlined, HeartFilled } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { activityApi, OnsiteCouple, OnsiteCoupleUser } from '@/api/services/activity-v1';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import UserAvatar from '@/components/user/UserAvatar';
import { getAvatarUrl } from '@/utils/imageUtils';

interface OnsiteLoveRankTabProps {
  activityId: string;
}

/** 每行心形数上限（与历史大屏心动排名一致） */
const MAX_HEARTS = 3;

/** 心形行：按次数渲染（0 次为空），颜色由调用方指定（2026-11-15 用户定：不显示发起方文字，语义仅保留在 title/aria） */
const HeartRow: React.FC<{ count: number; color: string; label: string; testId: string }> = ({ count, color, label, testId }) => (
  <div data-testid={testId} title={label} aria-label={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color }}>
    {Array.from({ length: Math.min(count, MAX_HEARTS) }).map((_, i) => (
      <HeartFilled key={i} />
    ))}
  </div>
);

/** 嘉宾卡片：头像 + 现场序号 - 昵称，点击/回车打开用户资料卡片（键盘可访问） */
const CoupleCard: React.FC<{
  member?: OnsiteCoupleUser;
  testId: string;
  onOpen: (userId: string) => void;
}> = ({ member, testId, onOpen }) => {
  const userId = member?.user?.user_id || '';
  const nickname = member?.profile?.nickname || '-';
  const number = member?.onsite_number ?? '-';
  return (
    <div
      data-testid={testId}
      role={userId ? 'button' : undefined}
      tabIndex={userId ? 0 : undefined}
      onClick={userId ? () => onOpen(userId) : undefined}
      onKeyDown={userId ? (e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(userId); } : undefined}
      style={{
        flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '16px 12px', border: '1px solid #f0f0f0', borderRadius: 8, background: '#fafafa',
        cursor: userId ? 'pointer' : 'default', transition: 'border-color .2s',
      }}
      title={userId ? '查看用户资料' : undefined}
    >
      {member?.profile?.avatar ? (
        /* 有人像图：顶部对齐裁切，保证人头完整显示（2026-11-15 用户定） */
        <img src={getAvatarUrl(member.profile.avatar)} alt={nickname}
          style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
      ) : (
        <UserAvatar nick={member?.profile?.nickname} size={48} />
      )}
      <span style={{ fontSize: 14 }}>{number} - {nickname}</span>
    </div>
  );
};

/**
 * 心动排名 TAB：现场心动配对排名列表（左男右女卡片，中间红/蓝心形，不显示发起方文字与心动统计）。
 * 数据源 getOnsiteLovesCouples（按心动次数倒序，size 最大 100，循环分页拉全量）。
 */
const OnsiteLoveRankTab: React.FC<OnsiteLoveRankTabProps> = ({ activityId }) => {
  const { error: showError } = useAppNotification();
  const [couples, setCouples] = useState<OnsiteCouple[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [detailUserId, setDetailUserId] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);

  const fetchList = useCallback(async () => {
    if (!activityId) { setLoading(false); return; }
    setLoading(true);
    try {
      const all: OnsiteCouple[] = [];
      let page = 1;
      while (true) {
        const res: any = await activityApi.getOnsiteLovesCouples(activityId, { page, size: 100 });
        const list: OnsiteCouple[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        all.push(...list);
        if (list.length < 100) break;
        page++;
      }
      setCouples(all);
      setFailed(false);
    } catch (err: any) {
      setFailed(true);
      showError(err?.response?.data?.message || '获取心动排名失败');
    } finally {
      setLoading(false);
    }
  }, [activityId, showError]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: 'rgba(0,0,0,.45)', fontSize: 13 }}>按现场心动次数倒序</span>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchList}>刷新</Button>
      </div>
      {loading && couples.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}><Spin /></div>
      ) : failed ? (
        <Empty description="加载失败，点击刷新重试" />
      ) : couples.length === 0 ? (
        <Empty description="暂无现场心动配对" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 720 }}>
          {couples.map((c, i) => (
            <div key={c.couple_id} data-testid="love-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <CoupleCard member={c.male} testId="love-card-male" onOpen={(uid) => { setDetailUserId(uid); setDetailVisible(true); }} />
              <div data-testid="love-center" style={{ width: 180, flexShrink: 0, textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>第 {i + 1} 名</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <HeartRow count={c.female_loves_count ?? 0} color="#ff5b8f" label="女方心动" testId="love-hearts-female" />
                  <HeartRow count={c.male_loves_count ?? 0} color="#4da3ff" label="男方心动" testId="love-hearts-male" />
                </div>
              </div>
              <CoupleCard member={c.female} testId="love-card-female" onOpen={(uid) => { setDetailUserId(uid); setDetailVisible(true); }} />
            </div>
          ))}
        </div>
      )}

      <UserDetailCardModal
        visible={detailVisible}
        userId={detailUserId}
        onClose={() => { setDetailVisible(false); setDetailUserId(''); }}
      />
    </div>
  );
};

export default OnsiteLoveRankTab;
