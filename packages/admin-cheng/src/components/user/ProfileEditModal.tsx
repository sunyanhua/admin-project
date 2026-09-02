import { useState } from 'react';
import { Form, Input, Select, DatePicker, Radio, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { useAppNotification } from '@/hooks/useAppNotification';
import { userApi } from '@/api/services/user';
import type { AdminUpdateBasicProfileRequest } from '@/api/types/user';
import dayjs from 'dayjs';

const { TextArea } = Input;

const ZODIAC_OPTIONS = [
  '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座',
];

interface UpdatedProfile {
  nickname?: string;
  gender?: number;
  birthDate?: string;
  zodiac?: string;
  auditStatus?: 1 | 2;
}

interface Props {
  open: boolean;
  userId: string;
  nickname?: string;
  gender?: number;
  birthDate?: string;
  zodiac?: string;
  auditStatus?: number;
  onClose: () => void;
  onSuccess: (updated: UpdatedProfile) => void;
}

const ProfileEditModal: React.FC<Props> = ({ open, userId, nickname, gender, birthDate, zodiac, auditStatus, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useAppNotification();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const data: AdminUpdateBasicProfileRequest = {
        nickname: values.nickname || undefined,
        gender: values.gender,
        birth_date: values.birth_date ? dayjs(values.birth_date).format('YYYY-MM-DD') : undefined,
        zodiac: values.zodiac || undefined,
        audit_status: values.audit_status,
        reason: values.reason,
      };
      await userApi.updateBasicProfile(userId, data);
      success('基础资料修改成功');
      form.resetFields();
      onSuccess({
        nickname: values.nickname || undefined,
        gender: values.gender,
        birthDate: values.birth_date ? dayjs(values.birth_date).format('YYYY-MM-DD') : undefined,
        zodiac: values.zodiac || undefined,
        auditStatus: values.audit_status,
      });
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      error(err?.response?.data?.message || '修改失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <ScrollableModal
      title="编辑基础资料"
      open={open}
      onCancel={handleCancel}
      width={520}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>确认修改</Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        clearOnDestroy
        initialValues={{
          nickname: nickname || '',
          gender,
          birth_date: birthDate ? dayjs(birthDate) : undefined,
          zodiac: zodiac || undefined,
          audit_status: auditStatus,
        }}
      >
        <Form.Item name="nickname" label="昵称">
          <Input placeholder="请输入昵称" />
        </Form.Item>
        <Form.Item name="gender" label="性别">
          <Radio.Group>
            <Radio value={1}>男</Radio>
            <Radio value={2}>女</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="birth_date" label="出生日期">
          <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
        </Form.Item>
        <Form.Item name="zodiac" label="星座">
          <Select placeholder="请选择星座，留空则自动计算" allowClear>
            {ZODIAC_OPTIONS.map((z) => (
              <Select.Option key={z} value={z}>{z}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="audit_status" label="审核状态">
          <Radio.Group>
            <Radio value={1}>通过</Radio>
            <Radio value={2}>不通过</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          name="reason"
          label="变更原因"
          rules={[{ required: true, message: '请填写变更原因' }]}
        >
          <TextArea rows={3} placeholder="请填写修改用户资料的业务原因，此记录会写入操作日志" />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default ProfileEditModal;
