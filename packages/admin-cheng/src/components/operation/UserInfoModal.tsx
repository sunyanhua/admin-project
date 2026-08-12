import { Modal, Descriptions, Avatar } from 'antd';
import { RegisterGenderLabels } from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';

export interface UserInfoData {
  user_id: string;
  avatar?: string;
  nickname?: string;
  gender?: number;
  age?: number;
  phone?: string;
  real_name?: string;
}

interface UserInfoModalProps {
  visible: boolean;
  record: UserInfoData | null;
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
        <Avatar size={80} src={getAvatarUrl(record.avatar)} style={{ borderRadius: '50%' }} />
        <div style={{ fontSize: 16, fontWeight: 500, marginTop: 8 }}>{record.nickname || record.user_id}</div>
      </div>
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="用户ID">{record.user_id}</Descriptions.Item>
        <Descriptions.Item label="性别">{record.gender != null ? (RegisterGenderLabels[record.gender] ?? record.gender) : '-'}</Descriptions.Item>
        <Descriptions.Item label="年龄">{record.age ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="手机号">{record.phone || '-'}</Descriptions.Item>
        {record.real_name && <Descriptions.Item label="姓名">{record.real_name}</Descriptions.Item>}
      </Descriptions>
    </Modal>
  );
};

export default UserInfoModal;
