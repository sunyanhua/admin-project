import { useState } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Form, Input, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
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
    <ScrollableModal
      title="添加敏感词"
      open={visible}
      onCancel={handleCancel}
      width={600}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} onClick={() => form.submit()}>创建</Button>
        </Space>
      }
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
      </Form>
    </ScrollableModal>
  );
};

export default AddSensitiveWordModal;