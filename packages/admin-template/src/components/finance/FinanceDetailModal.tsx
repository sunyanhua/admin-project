import { Modal, Descriptions, Tag, Typography, Button } from 'antd';

const { Text } = Typography;

export interface FinanceDetailModalProps {
  visible: boolean;
  onClose: () => void;
  record: any; // 财务记录
}

const FinanceDetailModal: React.FC<FinanceDetailModalProps> = ({ visible, onClose, record }) => {
  if (!record) {
    return null;
  }

  // 类型映射
  const typeMap = {
    income: { text: '收入', color: 'green' },
    expense: { text: '支出', color: 'red' },
  };

  // 状态映射
  const statusMap = {
    completed: { text: '已完成', color: 'success' },
    pending: { text: '待处理', color: 'orange' },
    refunded: { text: '已退款', color: 'default' },
    failed: { text: '失败', color: 'error' },
  };

  const typeInfo = typeMap[record.type as keyof typeof typeMap] || { text: '未知', color: 'default' };
  const statusInfo = statusMap[record.status as keyof typeof statusMap] || { text: '未知', color: 'default' };

  return (
    <Modal
      title="财务记录详情"
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
        <Descriptions.Item label="记录ID">{record.id}</Descriptions.Item>
        <Descriptions.Item label="活动ID">{record.activityId}</Descriptions.Item>
        <Descriptions.Item label="活动标题" span={2}>
          <Text strong>{record.activityTitle}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="金额">
          <span style={{ color: record.type === 'income' ? 'green' : 'red' }}>
            {record.type === 'income' ? '+' : '-'}¥{record.amount.toFixed(2)}
          </span>
        </Descriptions.Item>
        <Descriptions.Item label="类型">
          <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="付款方">{record.payer}</Descriptions.Item>
        <Descriptions.Item label="收款方">{record.payee}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{record.createTime}</Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>
          {record.remark || '无备注'}
        </Descriptions.Item>
      </Descriptions>
    </Modal>
  );
};

export default FinanceDetailModal;