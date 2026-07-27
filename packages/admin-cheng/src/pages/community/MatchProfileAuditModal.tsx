import React from 'react';
import { Form, Radio, Input, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { useAppNotification } from '@/hooks/useAppNotification';
import { userApi } from '@/api/services/user';
import { MatchProfileAuditAction } from '@/api/types/status';

const { TextArea } = Input;

interface Props {
  open: boolean;
  user: { id: string; nickname?: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MatchProfileAuditModal: React.FC<Props> = ({ open, user, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const { success, error } = useAppNotification();

  const handleSubmit = async () => {
    if (!user) return;
    try {
      const values = await form.validateFields();
      await userApi.auditMatchProfile(user.id, {
        action: values.action,
        reason: values.reason || '',
      });
      success(values.action === MatchProfileAuditAction.APPROVE ? '档案审核已通过' : '档案已拒绝');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      error(err?.response?.data?.message || '审核操作失败');
    }
  };

  return (
    <ScrollableModal
      title={`审核脱单档案${user?.nickname ? ` — ${user.nickname}` : ''}`}
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleSubmit}
      okText="确认提交"
    >
      <Form form={form} layout="vertical">
        <Form.Item name="action" label="审核结果" rules={[{ required: true, message: '请选择审核结果' }]}>
          <Radio.Group>
            <Space direction="vertical">
              <Radio value={MatchProfileAuditAction.APPROVE}>
                <span style={{ color: '#52c41a', fontWeight: 500 }}>通过</span> — 档案进入推荐池
              </Radio>
              <Radio value={MatchProfileAuditAction.REJECT}>
                <span style={{ color: '#ff4d4f', fontWeight: 500 }}>拒绝</span> — 用户可修改后重新提交
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="reason" label="审核意见">
          <TextArea rows={3} placeholder="审核意见将展示给用户，拒绝时建议填写具体原因" />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default MatchProfileAuditModal;
