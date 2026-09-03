import { useState } from 'react';
import { Button, Form, InputNumber, Space, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { userApi } from '@/api/services/user';
import ScrollableModal from '@/components/templates/ScrollableModal';

const { Text } = Typography;

interface DivineChanceAdjustButtonProps {
  /** 用户 ID */
  userId?: string;
}

/**
 * 神助攻次数调整入口：弹窗输入调整量（正数=发放，负数=回收，回收后不得低于 0）。
 * 管理端详情接口暂未返回当前次数，调整成功后由后端保证下限。
 */
const DivineChanceAdjustButton: React.FC<DivineChanceAdjustButtonProps> = ({ userId }) => {
  const { success, error: showError } = useAppNotification();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    if (!userId) return;
    try {
      const values = await form.validateFields();
      setLoading(true);
      await userApi.adjustDivineChance(userId, values.delta);
      success('神助攻次数调整成功');
      form.resetFields();
      setVisible(false);
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '调整失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="link"
        size="small"
        icon={<ThunderboltOutlined />}
        style={{ padding: 0, height: 'auto' }}
        onClick={() => setVisible(true)}
      >
        调整
      </Button>

      <ScrollableModal
        title="调整神助攻次数"
        open={visible}
        onCancel={() => { form.resetFields(); setVisible(false); }}
        width={480}
        destroyOnHidden
        footer={
          <Space>
            <Button onClick={() => { form.resetFields(); setVisible(false); }}>取消</Button>
            <Button type="primary" loading={loading} onClick={handleSubmit}>确认调整</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" initialValues={{ delta: 1 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            正数为发放次数，负数为回收次数；回收后剩余次数不得低于 0。
          </Text>
          <Form.Item
            name="delta"
            label="调整量"
            rules={[{ required: true, message: '请输入调整量' }]}
          >
            <InputNumber
              precision={0}
              style={{ width: '100%' }}
              placeholder="正数发放 / 负数回收"
            />
          </Form.Item>
        </Form>
      </ScrollableModal>
    </>
  );
};

export default DivineChanceAdjustButton;
