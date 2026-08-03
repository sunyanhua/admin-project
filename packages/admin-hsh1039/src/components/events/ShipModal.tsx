import { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { orderApi } from '@/api/services/order';
import { logisticsApi, LogisticsCompany } from '@/api/services/logistics';
import { useAppNotification } from '@/hooks/useAppNotification';

export interface ShipModalProps {
  /** 订单 ID（主单） */
  orderId: number;
  /** 弹窗打开/关闭 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 成功回调 */
  onSuccess?: () => void;
}

const ShipModal: React.FC<ShipModalProps> = ({ orderId, open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<LogisticsCompany[]>([]);
  const { success, error: showError } = useAppNotification();

  useEffect(() => {
    if (open) {
      logisticsApi.getCompanies().then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.list || []);
        setCompanies(list);
      }).catch(() => setCompanies([]));
    }
  }, [open]);

  const handleSubmit = async (values: any) => {
    if (!orderId) return;
    try {
      setLoading(true);
      await orderApi.shipOrder(orderId, {
        logistics_company: values.logistics_company,
        tracking_no: values.tracking_no,
        remark: values.remark || undefined,
      });
      success('发货成功');
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || '发货失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <ScrollableModal
      title="订单发货"
      open={open}
      onCancel={handleCancel}
      width={480}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} onClick={() => form.submit()}>确认发货</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item
          label="物流公司"
          name="logistics_company"
          rules={[{ required: true, message: '请选择物流公司' }]}
        >
          <Select placeholder="请选择物流公司">
            {companies.map((c) => (
              <Select.Option key={c.id} value={c.code}>{c.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="快递单号"
          name="tracking_no"
          rules={[
            { required: true, message: '请输入快递单号' },
            { max: 64, message: '最多64个字符' },
          ]}
        >
          <Input placeholder="请输入快递单号" />
        </Form.Item>

        <Form.Item
          label="备注"
          name="remark"
          rules={[{ max: 256, message: '最多256个字符' }]}
        >
          <Input.TextArea placeholder="选填" rows={2} />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default ShipModal;
