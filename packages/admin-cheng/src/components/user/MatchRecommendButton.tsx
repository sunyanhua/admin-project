import { useState } from 'react';
import { Button, Tag, Form, Input, DatePicker, Space } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppNotification } from '@/hooks/useAppNotification';
import { userApi } from '@/api/services/user';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { dayjsToApi, parseApiTime } from '@/utils/format';
import { MatchProfileAuditStatus, UserVisibility } from '@/api/types/status';

interface MatchRecommendButtonProps {
  userId: string;
  /** 当前推荐截止时间（recommend_expire_at） */
  recommendExpireAt?: string | null;
  /** 审核状态（MatchProfileAuditStatus） */
  auditStatus?: number;
  /** 是否在架（false=已退出） */
  isActive?: boolean;
  /** 可见范围（UserVisibility） */
  visibility?: number;
  /** 设置成功后回调（用于刷新详情数据） */
  onSuccess?: () => void;
}

/**
 * 脱单资料推荐按钮：点击弹出推荐表单（推荐原因 + 推荐时间），
 * 提交 PATCH /admin/v1/bizops/user/{id}/match-profile/recommend 设置推荐截止时间。
 */
const MatchRecommendButton: React.FC<MatchRecommendButtonProps> = ({
  userId, recommendExpireAt, auditStatus, isActive, visibility, onSuccess,
}) => {
  const { success, error: showError } = useAppNotification();
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const activeExpire = parseApiTime(recommendExpireAt);
  const isRecommended = activeExpire ? activeExpire.isAfter(dayjs()) : false;

  /** 不可推荐原因：待审核 / 仅专区可见或已隐藏 / 已退出 */
  const getBlockReason = (): string | null => {
    if (auditStatus === MatchProfileAuditStatus.PENDING) return '脱单资料待审核，无法推荐';
    if (!isActive) return '用户已退出脱单资料，无法推荐';
    if (visibility === UserVisibility.ZONE || visibility === UserVisibility.HIDE) {
      return '脱单资料仅专区可见或已隐藏，无法推荐';
    }
    return null;
  };

  // 不能选择早于当前时间的截止时间
  const disabledDate = (current: dayjs.Dayjs) => current && current < dayjs().startOf('day');
  const disabledTime = (current: dayjs.Dayjs | null) => {
    const now = dayjs();
    if (!current || !current.isSame(now, 'day')) return {};
    return {
      disabledHours: () => Array.from({ length: now.hour() }, (_, i) => i),
      disabledMinutes: (selectedHour: number) =>
        selectedHour === now.hour() ? Array.from({ length: now.minute() }, (_, i) => i) : [],
      disabledSeconds: (selectedHour: number, selectedMinute: number) =>
        selectedHour === now.hour() && selectedMinute === now.minute()
          ? Array.from({ length: now.second() }, (_, i) => i)
          : [],
    };
  };

  const openModal = () => {
    const blockReason = getBlockReason();
    if (blockReason) {
      showError(blockReason);
      return;
    }
    form.setFieldsValue({
      reason: '节目推荐',
      expire_at: isRecommended ? activeExpire : undefined,
    });
    setVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await userApi.setMatchProfileRecommend(userId, {
        reason: values.reason,
        recommend_expire_at: values.expire_at ? dayjsToApi(values.expire_at) : null,
      });
      success('推荐设置成功');
      setVisible(false);
      onSuccess?.();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '设置失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Space size={8} style={{ marginRight: 8 }}>
        {isRecommended && <Tag color="gold">推荐中</Tag>}
        <Button type="link" size="small" icon={<StarOutlined />} style={{ fontSize: 13, padding: 0 }} onClick={openModal}>
          推荐
        </Button>
      </Space>

      <ScrollableModal
        title="设置推荐"
        open={visible}
        onCancel={() => setVisible(false)}
        width={480}
        footer={
          <Space>
            <Button onClick={() => setVisible(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>确认</Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="reason"
            label="推荐原因"
            rules={[{ required: true, message: '请填写推荐原因' }]}
          >
            <Input placeholder="如：节目推荐" />
          </Form.Item>
          <Form.Item
            name="expire_at"
            label="截止时间"
            extra="推荐在该时间前有效，到期后自动失效"
            rules={[{ required: true, message: '请选择截止时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY/MM/DD HH:mm:ss"
              style={{ width: '100%' }}
              placeholder="选择截止时间"
              disabledDate={disabledDate}
              disabledTime={disabledTime}
            />
          </Form.Item>
        </Form>
      </ScrollableModal>
    </>
  );
};

export default MatchRecommendButton;
