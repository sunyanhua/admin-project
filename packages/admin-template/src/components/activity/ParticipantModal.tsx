import { Modal, Table, Typography, Tag } from 'antd';

const { Text } = Typography;

// 报名人员状态（使用数字常量，避免修改共享枚举）
const ParticipantStatus = {
  PENDING: 0,
  CONFIRMED: 1,
  CANCELED: 2,
};

export interface ParticipantModalProps {
  visible: boolean;
  onClose: () => void;
  activityId?: number;
  activityTitle?: string;
}

// 模拟报名人员数据
const mockParticipants = [
  { id: 1, name: '张三', phone: '13800138001', signupTime: '2024-01-10 09:30:00', status: ParticipantStatus.CONFIRMED },
  { id: 2, name: '李四', phone: '13800138002', signupTime: '2024-01-10 10:15:00', status: ParticipantStatus.PENDING },
  { id: 3, name: '王五', phone: '13800138003', signupTime: '2024-01-10 11:20:00', status: ParticipantStatus.CONFIRMED },
  { id: 4, name: '赵六', phone: '13800138004', signupTime: '2024-01-11 14:05:00', status: ParticipantStatus.CANCELED },
  { id: 5, name: '钱七', phone: '13800138005', signupTime: '2024-01-12 16:45:00', status: ParticipantStatus.CONFIRMED },
];

const ParticipantModal: React.FC<ParticipantModalProps> = ({ visible, onClose, activityId, activityTitle }) => {
  // 状态标签映射
  const getStatusLabel = (status: number) => {
    switch (status) {
      case ParticipantStatus.PENDING:
        return { text: '待确认', color: 'orange' };
      case ParticipantStatus.CONFIRMED:
        return { text: '已确认', color: 'green' };
      case ParticipantStatus.CANCELED:
        return { text: '已取消', color: 'red' };
      default:
        return { text: '未知', color: 'default' };
    }
  };

  const columns = [
    {
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '报名时间',
      dataIndex: 'signupTime',
      key: 'signupTime',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: number) => {
        const statusInfo = getStatusLabel(status);
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
    },
  ];

  return (
    <Modal
      title={
        <div>
          <Text strong>报名人员列表</Text>
          {activityTitle && (
            <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
              活动: {activityTitle} {activityId && `(ID: ${activityId})`}
            </div>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Table
        columns={columns}
        dataSource={mockParticipants}
        rowKey="id"
        pagination={{ pageSize: 5 }}
        size="middle"
      />
    </Modal>
  );
};

export default ParticipantModal;