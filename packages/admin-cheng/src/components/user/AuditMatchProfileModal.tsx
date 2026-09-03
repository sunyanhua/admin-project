import { useState, useEffect } from 'react';
import { Form, Radio, Input, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { useAppNotification } from '@/hooks/useAppNotification';
import { userApi } from '@/api/services/user';

const { TextArea } = Input;

interface Props {
  open: boolean;
  userId: string;
  onClose: () => void;
  onSuccess: (action: 1 | 2) => void;
}

const AuditMatchProfileModal: React.FC<Props> = ({ open, userId, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  // 审核操作从表单值派生（单一数据源）：重置表单后自动回到"通过"，避免拒绝状态串到下一个用户
  const watchedAction = Form.useWatch('action', form);
  const action: 1 | 2 = watchedAction === 2 ? 2 : 1;
  const { success, error } = useAppNotification();

  // 每次打开都显式重置表单（销毁重开后 initialValues/useWatch 可能滞后，显式重置保证状态干净）
  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await userApi.auditMatchProfile(userId, {
        action: values.action,
        reason: values.reason || '',
      });
      success('审核完成');
      form.resetFields();
      onSuccess(values.action);
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      error(err?.response?.data?.message || '审核失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollableModal
      title="审核脱单档案"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      width={520}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={() => { form.resetFields(); onClose(); }}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>确认审核</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ action: 1, reason: '' }}>
        <Form.Item name="action" label="审核操作" rules={[{ required: true, message: '请选择审核操作' }]}>
          <Radio.Group>
            <Radio value={1}>通过</Radio>
            <Radio value={2}>拒绝</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          name="reason"
          label="审核意见"
          rules={[
            {
              // 校验时实时读取表单值（不依赖渲染期派生值，避免销毁重开后派生值滞后）
              validator: (_, value) => {
                const currentAction = form.getFieldValue('action');
                if (currentAction === 2 && !value) {
                  return Promise.reject(new Error('拒绝时必须填写审核意见'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <TextArea rows={3} placeholder={action === 2 ? '拒绝原因（必填）' : '可选'} />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default AuditMatchProfileModal;
