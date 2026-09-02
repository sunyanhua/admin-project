import { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Switch, Button, Space } from 'antd';
import { dayjsToApi, parseApiTime } from '@/utils/format';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { Source, sourceApi } from '@/api/services/source';
import { useAppNotification } from '@/hooks/useAppNotification';

export interface SourceEditModalProps {
  visible: boolean;
  onClose: () => void;
  source: Source | null;
  onSuccess?: () => void;
}

const SourceEditModal: React.FC<SourceEditModalProps> = ({ visible, onClose, source, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const { success, error: showError } = useAppNotification();

  const initialValues = source ? {
    name: source.name,
    start_time: source.start_time ? parseApiTime(source.start_time) : undefined,
    end_time: source.end_time ? parseApiTime(source.end_time) : undefined,
  } : undefined;

  // 打开不同来源时同步状态开关（原实现中 prevSourceId 与 source?.id 同帧取值恒相等，导致开关永不刷新）
  useEffect(() => {
    if (visible && source) {
      setStatusEnabled(source.status === 0);
    }
  }, [visible, source?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (values: any) => {
    if (!source) return;
    try {
      setLoading(true);
      const data: any = { name: values.name };
      data.status = statusEnabled ? 0 : 1;
      if (values.start_time) data.start_time = dayjsToApi(values.start_time);
      else data.start_time = '';
      if (values.end_time) data.end_time = dayjsToApi(values.end_time);
      else data.end_time = '';
      await sourceApi.updateSource(source.id, data);
      success('更新成功');
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      showError(err.response?.data?.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollableModal
      title="编辑来源"
      open={visible}
      onCancel={() => { form.resetFields(); onClose(); }}
      width={480}
      destroyOnHidden
      key={source?.id}
      footer={
        <Space>
          <Button onClick={() => { form.resetFields(); onClose(); }}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} onClick={() => form.submit()}>保存</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off" clearOnDestroy scrollToFirstError={{ behavior: 'smooth', block: 'center' }} initialValues={initialValues} key={source?.id}>
        <Form.Item label="来源名称" name="name" rules={[{ required: true, message: '请输入来源名称' }]}>
          <Input placeholder="请输入来源名称" maxLength={64} />
        </Form.Item>
        <Form.Item label="生效时间" name="start_time" extra="留空则清除">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="截止时间" name="end_time" extra="留空则清除">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="状态">
          <Switch checked={statusEnabled} onChange={setStatusEnabled} checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default SourceEditModal;
