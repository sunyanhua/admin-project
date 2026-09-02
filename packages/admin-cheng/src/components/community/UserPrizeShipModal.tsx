import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Select } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { ShipStatus, ShipStatusLabels } from '@shared/constants';
import { lotteryApi, UserPrize } from '@/api/services/lottery';
import ScrollableModal from '@/components/templates/ScrollableModal';

interface UserPrizeShipModalProps {
  visible: boolean;
  record: UserPrize | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SHIP_STATUS_OPTIONS = [
  { label: ShipStatusLabels[ShipStatus.UNREGISTERED], value: ShipStatus.UNREGISTERED },
  { label: ShipStatusLabels[ShipStatus.REGISTERED], value: ShipStatus.REGISTERED },
  { label: ShipStatusLabels[ShipStatus.SHIPPED], value: ShipStatus.SHIPPED },
];

const UserPrizeShipModal: React.FC<UserPrizeShipModalProps> = ({ visible, record, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;
    // 打开时先清空，防止上一条中奖记录的单号残留
    form.resetFields();
    if (record) {
      // 延迟回填：等弹窗 Form 挂载后再写入；关闭时清除定时器，防止旧数据写回
      const timer = setTimeout(() => {
        form.setFieldsValue({
          ship_status: record.ship_status ?? ShipStatus.UNREGISTERED,
          carrier: record.carrier || '',
          tracking_number: record.tracking_number || '',
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [visible, record, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await lotteryApi.shipUserPrize(record!.id, {
        ship_status: values.ship_status,
        carrier: values.carrier || undefined,
        tracking_number: values.tracking_number || undefined,
      });
      success('发货登记成功');
      onClose();
      onSuccess();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollableModal
      title="发货登记"
      open={visible}
      onCancel={onClose}
      width={480}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>保存</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off"
        scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
      >
        <Form.Item label="发货状态" name="ship_status" rules={[{ required: true }]}>
          <Select options={SHIP_STATUS_OPTIONS} />
        </Form.Item>
        <Form.Item label="快递公司" name="carrier">
          <Input placeholder="如：顺丰速运" maxLength={64} />
        </Form.Item>
        <Form.Item label="快递单号" name="tracking_number">
          <Input placeholder="请输入快递单号" maxLength={64} />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default UserPrizeShipModal;
