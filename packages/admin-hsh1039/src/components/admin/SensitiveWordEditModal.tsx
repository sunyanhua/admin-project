import { useState, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Form, Input, Switch, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { SensitiveWordStatus } from '@shared/constants/sensitive.enums';
import { sensitiveApi } from '../../api/services/sensitive';

export interface SensitiveWordEditModalProps {
  visible: boolean;
  onClose: () => void;
  sensitiveWord: any;
  onSuccess?: () => void;
}

const SensitiveWordEditModal: React.FC<SensitiveWordEditModalProps> = ({ visible, onClose, sensitiveWord, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error } = useAppNotification();

  useEffect(() => {
    if (sensitiveWord && visible) {
      form.setFieldsValue({
        word: sensitiveWord.word,
        status: sensitiveWord.status,
        remark: sensitiveWord.remark || '',
      });
    }
  }, [sensitiveWord, visible, form]);

  const handleSubmit = async (values: any) => {
    if (!sensitiveWord) return;
    try {
      setLoading(true);
      const submitData = {
        word: values.word,
        status: values.status,
        remark: values.remark,
      };
      await sensitiveApi.updateSensitiveWord(sensitiveWord.id, submitData);
      success('敏感词更新成功');
      form.resetFields();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      error(err.response?.data?.msg || '更新失败');
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
      title="编辑敏感词"
      open={visible}
      onCancel={handleCancel}
      width={600}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} onClick={() => form.submit()}>保存</Button>
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

export default SensitiveWordEditModal;