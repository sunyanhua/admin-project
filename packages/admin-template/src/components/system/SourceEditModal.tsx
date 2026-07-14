import { useState } from 'react';
import { Modal, Form, Input, Switch, Button, Space } from 'antd';
import { Source, sourceApi } from '@/api/services/source';
import { useAppNotification } from '@/hooks/useAppNotification';

export interface SourceEditModalProps {
  visible: boolean;
  onClose: () => void;
  source: Source | null;
  onSuccess?: () => void;
}

// 来源状态：0-禁用，1-启用
const SOURCE_STATUS = {
  DISABLED: 0,
  ENABLED: 1,
};

const SourceEditModal: React.FC<SourceEditModalProps> = ({ visible, onClose, source, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();

  const handleSubmit = async (values: any) => {
    if (!source) return;
    try {
      setLoading(true);
      await sourceApi.updateSource(source.id, {
        ...values,
        status: values.status,
        visible: values.visible ?? true,
      });
      success('更新成功');
      form.resetFields();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      showError(err.response?.data?.msg || err.response?.data?.error || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // 计算初始值
  const initialValues = source ? {
    key: source.key,
    title: source.title,
    brief: source.brief || '',
    status: source.status,
  } : undefined;

  return (
    <Modal
      title="编辑来源"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        initialValues={initialValues}
        key={source?.id}
      >
        <Form.Item name="key" hidden>
          <Input />
        </Form.Item>
        <Form.Item
          label="来源名称"
          name="title"
          rules={[{ required: true, message: '请输入来源名称' }]}
        >
          <Input placeholder="请输入来源名称" />
        </Form.Item>
        <Form.Item
          label="简介"
          name="brief"
        >
          <Input.TextArea placeholder="请输入简介" rows={3} />
        </Form.Item>
        <Form.Item
          label="状态"
          name="status"
          valuePropName="checked"
          getValueFromEvent={(checked: boolean) => checked ? SOURCE_STATUS.ENABLED : SOURCE_STATUS.DISABLED}
          getValueProps={(value: number) => ({ checked: value === SOURCE_STATUS.ENABLED })}
        >
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SourceEditModal;