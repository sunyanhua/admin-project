import { useState } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Modal, Form, Input, Button, Space } from 'antd';
import { sensitiveApi } from '../../api/services/sensitive';

export interface AddSensitiveWordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddSensitiveWordModal: React.FC<AddSensitiveWordModalProps> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error } = useAppNotification();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const submitData = {
        word: values.word,
        status: values.status ?? 1,
        remark: values.remark || '',
      };
      await sensitiveApi.createSensitiveWord(submitData);
      success('敏感词创建成功');
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      error(err.response?.data?.msg || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="添加敏感词"
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
      >
        <Form.Item
          label="敏感词"
          name="word"
          rules={[
            { required: true, message: '请输入敏感词' },
            { max: 50, message: '敏感词最多50个字符' },
          ]}
        >
          <Input placeholder="请输入敏感词" />
        </Form.Item>

        <Form.Item
          label="备注"
          name="remark"
        >
          <Input.TextArea placeholder="请输入备注（可选）" rows={3} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>创建</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddSensitiveWordModal;