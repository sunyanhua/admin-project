import { Modal, Descriptions, Tag, Typography, Button } from 'antd';
import { AdminRole, AdminStatus } from '@shared/constants/admin.enums';

const { Text } = Typography;

export interface AdminDetailModalProps {
  visible: boolean;
  onClose: () => void;
  admin: any; // 可以定义更具体的类型
}

const AdminDetailModal: React.FC<AdminDetailModalProps> = ({ visible, onClose, admin }) => {
  if (!admin) {
    return null;
  }

  // 角色映射函数
  const getRoleLabel = (role: AdminRole) => {
    switch (role) {
      case AdminRole.SUPER_ADMIN:
        return { text: '超级管理员', color: 'red' };
      case AdminRole.NORMAL_ADMIN:
        return { text: '普通管理员', color: 'blue' };
      default:
        return { text: '未知', color: 'default' };
    }
  };

  // 状态映射函数
  const getStatusLabel = (status: AdminStatus) => {
    switch (status) {
      case AdminStatus.ACTIVE:
        return { text: '活跃', color: 'success' };
      case AdminStatus.INACTIVE:
        return { text: '停用', color: 'error' };
      case AdminStatus.DELETED:
        return { text: '已删除', color: 'default' };
      default:
        return { text: '未知', color: 'default' };
    }
  };

  const roleInfo = getRoleLabel(admin.role);
  const statusInfo = getStatusLabel(admin.status);

  return (
    <Modal
      title="管理员详情"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={700}
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="管理员ID">{admin.id}</Descriptions.Item>
        <Descriptions.Item label="用户名">
          <Text strong>{admin.username}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="昵称">{admin.nickname || '未设置'}</Descriptions.Item>
        <Descriptions.Item label="手机号">{admin.phone || '未绑定'}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{admin.email || '未绑定'}</Descriptions.Item>
        <Descriptions.Item label="管理员角色">
          <Tag color={roleInfo.color}>{roleInfo.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="管理员状态">
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">{admin.createdAt || '未知'}</Descriptions.Item>
        <Descriptions.Item label="最后登录时间">{admin.lastLoginAt || '从未登录'}</Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {admin.remark || '无'}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default AdminDetailModal;