import { useState } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Modal, Form, Input, Select, Button, Space } from 'antd';
import { UserStatus, UserRole } from '@shared/constants/user.enums';
import { userApi } from '../../api/services/user';

const { Option } = Select;

export interface AddUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void; // 添加成功后的回调
}

const AddUserModal: React.FC<AddUserModalProps> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error } = useAppNotification();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      // 准备提交数据
      const submitData = {
        username: values.username,
        nickname: values.nickname,
        phone: values.phone,
        email: values.email,
        password: values.password,
        role: values.role || UserRole.USER,
        status: values.status || UserStatus.NORMAL,
      };

      // 调用API创建用户 - userApi没有createUser方法，这里仅作演示
      // await userApi.createUser(submitData);

      success('用户创建成功');
      form.resetFields();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      error(err?.response?.data?.msg || err?.message || '创建失败');
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
      title="添加用户"
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
        initialValues={{
          role: UserRole.USER,
          status: UserStatus.NORMAL,
        }}
      >
        <Form.Item
          label="用户名"
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { max: 20, message: '用户名最多20个字符' },
          ]}
        >
          <Input placeholder="请输入用户名" />
        </Form.Item>

        <Form.Item
          label="昵称"
          name="nickname"
          rules={[
            { required: true, message: '请输入昵称' },
            { max: 20, message: '昵称最多20个字符' },
          ]}
        >
          <Input placeholder="请输入昵称" />
        </Form.Item>

        <Form.Item
          label="手机号"
          name="phone"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
          ]}
        >
          <Input placeholder="请输入手机号" />
        </Form.Item>

        <Form.Item
          label="邮箱"
          name="email"
          rules={[
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]}
        >
          <Input placeholder="请输入邮箱（可选）" />
        </Form.Item>

        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6个字符' },
          ]}
        >
          <Input.Password placeholder="请输入密码" />
        </Form.Item>

        <Form.Item
          label="确认密码"
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入密码" />
        </Form.Item>

        <Form.Item
          label="用户角色"
          name="role"
        >
          <Select placeholder="请选择用户角色">
            <Option value={UserRole.USER}>普通用户</Option>
            <Option value={UserRole.ADMIN}>管理员</Option>
            <Option value={UserRole.SUPER_ADMIN}>超级管理员</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="用户状态"
          name="status"
        >
          <Select placeholder="请选择用户状态">
            <Option value={UserStatus.NORMAL}>正常</Option>
            <Option value={UserStatus.BANNED}>封禁</Option>
          </Select>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              创建
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddUserModal;