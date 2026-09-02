import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { DetailModal } from '@/components/templates/DetailModal';
import { buildUserDetailSections } from '@/components/user/UserDetailSections';
import { userApi } from '@/api/services/user';
import type { CommunityUserItem } from '@/api/types/user';

interface UserDetailCardModalProps {
  visible: boolean;
  /** 用户 ID —— 打开弹窗时通过 /admin/v1/bizops/user/{id} 重新拉取最新数据 */
  userId?: string;
  /** 卡片标题，默认"用户详情" */
  title?: string;
  /** 编辑资料回调（与用户注册页一致，可省） */
  onEditProfile?: () => void;
  /** 审核脱单资料回调（与用户注册页一致，可省） */
  onAuditProfile?: () => void;
  /** 外部刷新信号：变化时重新拉取最新数据（如脱单资料审核完成后 +1） */
  reloadKey?: number;
  /** 是否显示推荐操作按钮（默认显示；专区管理场景传 false 仅看资料） */
  showRecommend?: boolean;
  onClose: () => void;
}

/**
 * 标准用户资料卡片弹窗（系统标准组件）
 *
 * 所有列表中点击用户头像/昵称都必须打开此组件查看完整用户资料。
 * 与"用户注册"（UserList）和"脱单资料管理"页面的详情弹窗使用完全相同的
 * buildUserDetailSections 渲染逻辑，保证展示 100% 一致。
 *
 * 系统标准：弹窗打开时一律通过 GET /admin/v1/bizops/user/{id} 重新读取
 * 最新的用户单条数据，禁止使用列表数据直接渲染。
 *
 * 用法：<UserDetailCardModal visible={...} userId={record.user_id} onClose={...} />
 */
const UserDetailCardModal: React.FC<UserDetailCardModalProps> = ({
  visible, userId, title = '用户详情', onEditProfile, onAuditProfile, reloadKey = 0, showRecommend, onClose,
}) => {
  const { error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<CommunityUserItem | null>(null);
  const [internalReloadKey, setInternalReloadKey] = useState(0);

  // 打开时按 userId 拉取最新数据（internalReloadKey 或外部 reloadKey 变化时重新拉取，如推荐设置成功/审核完成）
  useEffect(() => {
    if (!visible || !userId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setDetail(null);
    userApi.getUserDetail(userId)
      .then((res: any) => {
        // 拦截器已解包 → { user, profile, match_profile, wallet }
        setDetail({
          user: res?.user,
          profile: res?.profile,
          match_profile: res?.match_profile || null,
          wallet: res?.wallet || null,
        });
      })
      .catch((err: any) => {
        showError(err?.response?.data?.message || '获取用户资料失败');
      })
      .finally(() => setLoading(false));
  }, [visible, userId, internalReloadKey, reloadKey]);

  return (
    <DetailModal
      title={title}
      open={visible}
      entity={detail}
      width={720}
      className="user-detail-modal"
      onClose={onClose}
      render={(item: CommunityUserItem) => {
        if (loading) {
          return { sections: [{ title: <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>, items: [] }] };
        }
        return buildUserDetailSections({
          user: item.user,
          profile: item.profile,
          matchProfile: item.match_profile || null,
          wallet: item.wallet,
          onEditProfile,
          onAuditProfile,
          showRecommend,
          onRecommendSuccess: () => setInternalReloadKey(k => k + 1),
        });
      }}
    />
  );
};

export default UserDetailCardModal;
