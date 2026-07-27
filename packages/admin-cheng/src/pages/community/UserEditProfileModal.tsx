import React from 'react';
import { Form, Input, Select, DatePicker } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { useAppNotification } from '@/hooks/useAppNotification';
import { userApi } from '@/api/services/user';
import type { AdminUpdateBasicProfileRequest } from '@/api/types/user';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface Props {
  open: boolean;
  user: { id: string; real_name?: string; gender?: number; birth_date?: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const UserEditProfileModal: React.FC<Props> = ({ open, user, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const { success, error } = useAppNotification();

  const handleSubmit = async () => {
    if (!user) return;
    try {
      const values = await form.validateFields();
      const data: AdminUpdateBasicProfileRequest = {
        real_name: values.real_name,
        gender: values.gender,
        birth_date: values.birth_date.format('YYYY-MM-DD'),
        reason: values.reason,
      };
      await userApi.updateBasicProfile(user.id, data);
      success('用户资料修改成功，变更已记录到操作日志');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      error(err?.response?.data?.message || '修改失败');
    }
  };

  return (
    <ScrollableModal
      title="修改用户基础资料"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleSubmit}
      okText="确认修改"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          real_name: user?.real_name || '',
          gender: user?.gender,
          birth_date: user?.birth_date ? dayjs(user.birth_date) : undefined,
        }}
      >
        <Form.Item name="real_name" label="真实姓名" rules={[{ required: true, message: '请输入真实姓名' }]}>
          <Input placeholder="请输入真实姓名" />
        </Form.Item>
        <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
          <Select placeholder="请选择性别">
            <Select.Option value={1}>男</Select.Option>
            <Select.Option value={2}>女</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="birth_date" label="出生日期" rules={[{ required: true, message: '请选择出生日期' }]}>
          <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
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

export default UserEditProfileModal;
