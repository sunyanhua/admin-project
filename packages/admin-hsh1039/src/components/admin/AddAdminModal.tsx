import { useState, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Form, Input, Select, Button, Space, Divider } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { adminApi, AdminRole } from '../../api/services/admin';

export interface AddAdminModalProps {
  visible: boolean;
  roles?: AdminRole[];
  onClose: () => void;
  onSuccess?: () => void;
}

// 强密码验证：至少8位，包含大写字母、小写字母、数字、特殊符号
const validateStrongPassword = (_: any, value: string): Promise<void> => {
  if (!value) return Promise.resolve(); // required 规则已处理空值

  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    const missingTypes = [];
    if (!hasUpperCase) missingTypes.push('大写字母');
    if (!hasLowerCase) missingTypes.push('小写字母');
    if (!hasNumber) missingTypes.push('数字');
    if (!hasSpecialChar) missingTypes.push('特殊符号');
    return Promise.reject(
      new Error(`密码必须包含大写字母、小写字母、数字、特殊符号。当前缺少: ${missingTypes.join('、')}`)
    );
  }

  return Promise.resolve();
};

const AddAdminModal: React.FC<AddAdminModalProps> = ({ visible, roles = [], onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();

  useEffect(() => {
    if (visible) {
      form.resetFields();
    }
  }, [visible, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      await adminApi.createAdmin({
        username: values.username,
        password: values.password,
        real_name: values.real_name || undefined,
        phone: values.phone || undefined,
        role_ids: values.role_id != null ? [values.role_id] : undefined,
        status: values.status,
      } as any);

      success('管理员创建成功');
      form.resetFields();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || '创建失败';
      showError(errorMessage);
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
      title="添加管理员"
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
          label="用户名"
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 2, message: '用户名至少2个字符' },
            { max: 32, message: '用户名最多32个字符' },
          ]}
        >
          <Input placeholder="请输入用户名" />
        </Form.Item>

        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6个字符' },
            { max: 64, message: '密码最多64个字符' },
            { validator: validateStrongPassword },
          ]}
        >
          <Input.Password
            placeholder="至少8位，包含大写字母、小写字母、数字、特殊符号"
            autoComplete="new-password"
          />
        </Form.Item>

        <Form.Item
          label="姓名"
          name="real_name"
          rules={[{ max: 32, message: '姓名最多32个字符' }]}
        >
          <Input placeholder="请输入真实姓名（选填）" />
        </Form.Item>

        <Form.Item
          label="手机号"
          name="phone"
          rules={[{ max: 20, message: '手机号最多20个字符' }]}
        >
          <Input placeholder="请输入手机号（选填）" />
        </Form.Item>

        <Divider />

        <Form.Item
          label="角色"
          name="role_id"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select
            placeholder="请选择角色"
            options={roles.map((r) => ({ label: r.name, value: r.id }))}
          />
        </Form.Item>

        <Form.Item
          label="状态"
          name="status"
          initialValue={1}
        >
          <Select>
            <Select.Option value={1}>正常</Select.Option>
            <Select.Option value={0}>屏蔽</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default AddAdminModal;
