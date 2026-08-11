import { Modal, Descriptions, Avatar } from 'antd';
import { RegisterGenderLabels } from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import type { RegisterRecord } from '@/api/services/activity-v1';

interface UserInfoModalProps {
  visible: boolean;
  record: RegisterRecord | null;
  onClose: () => void;
}

const UserInfoModal: React.FC<UserInfoModalProps> = ({ visible, record, onClose }) => {
  if (!record) return null;
  return (
    <Modal
      title="用户资料"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
      maskClosable={false}
    >
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <Avatar size={80} src={getAvatarUrl((record as any).avatar)} style={{ borderRadius: '50%' }} />
        <div style={{ fontSize: 16, fontWeight: 500, marginTop: 8 }}>{(record as any).nickname || record.user_id}</div>
      </div>
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="用户ID">{record.user_id}</Descriptions.Item>
        <Descriptions.Item label="性别">{RegisterGenderLabels[record.gender] ?? record.gender}</Descriptions.Item>
        <Descriptions.Item label="年龄">{(record as any).age ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="手机号">{(record as any).phone ?? '-'}</Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default UserInfoModal;
