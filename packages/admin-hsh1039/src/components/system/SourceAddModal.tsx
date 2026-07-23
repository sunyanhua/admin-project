import { useState } from 'react';
import { Form, Input, DatePicker, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { sourceApi } from '@/api/services/source';
import { useAppNotification } from '@/hooks/useAppNotification';

export interface SourceAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SourceAddModal: React.FC<SourceAddModalProps> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const data: any = { name: values.name };
      if (values.start_time) data.start_time = values.start_time.toISOString();
      if (values.end_time) data.end_time = values.end_time.toISOString();
      await sourceApi.createSource(data);
      success('添加成功');
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      showError(err.response?.data?.message || '添加失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollableModal
      title="添加来源"
      open={visible}
      onCancel={() => { form.resetFields(); onClose(); }}
      width={480}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={() => { form.resetFields(); onClose(); }}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} onClick={() => form.submit()}>添加</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item label="来源名称" name="name" rules={[{ required: true, message: '请输入来源名称' }]}>
          <Input placeholder="请输入来源名称" maxLength={64} />
        </Form.Item>
        <Form.Item label="生效时间" name="start_time" extra="不填则立即生效">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="截止时间" name="end_time" extra="不填则永久有效">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default SourceAddModal;
