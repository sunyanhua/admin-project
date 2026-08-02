import { useState, useEffect } from 'react';
import { userApi } from '@/api/services/user';
import { DetailModal } from '@/components/templates/DetailModal';
import UserDetailSections from '@/components/user/UserDetailSections';

export interface UserDetailModalProps {
  /** 用户 ID */
  userId: string | number;
  /** 弹窗打开/关闭 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 弹窗标题 */
  title?: string;
}

/**
 * 用户详情弹窗 — 公共组件。
 * 传入 userId + open 即自动加载用户详情并渲染。
 */
const UserDetailModal: React.FC<UserDetailModalProps> = ({ userId, open, onClose, title = '用户详情' }) => {
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    if (!open || !userId) { setDetailData(null); return; }
    setDetailData(null);
    userApi.getUserDetail(String(userId))
      .then((res: any) => setDetailData(res?.data || res || {}))
      .catch(() => setDetailData({}));
  }, [open, userId]);

  return (
    <DetailModal
      title={title}
      open={open}
      onClose={() => { setDetailData(null); onClose(); }}
      entity={detailData}
      className="user-detail-modal"
      footer={null}
    >
      {(d: any) => UserDetailSections({ user: d })}
    </DetailModal>
  );
};

export default UserDetailModal;
