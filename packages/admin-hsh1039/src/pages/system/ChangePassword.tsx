import { useState } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Card, Form, Input, Button, Typography, Alert } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { authApi } from '@/api/services/auth';

const { Title } = Typography;

// 强密码验证
// 要求：至少8位，包含大写字母、小写字母、数字、特殊符号
const validateStrongPassword = (_: any, value: string): Promise<void> => {
  if (!value) return Promise.resolve();

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
    return Promise.reject(new Error(`密码必须包含大写字母、小写字母、数字、特殊符号。当前缺少: ${missingTypes.join('、')}`));
  }
  return Promise.resolve();
};

const ChangePassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await authApi.changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      });
      success('密码修改成功');
      form.resetFields();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.msg || err.response?.data?.error || err.message || '密码修改失败';
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>修改密码</Title>
      <p style={{ color: '#666', marginBottom: 24 }}>修改您的登录密码。</p>

      <Card style={{ maxWidth: 500 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="当前密码"
            name="old_password"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入当前密码"
            />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="new_password"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 8, message: '密码至少8个字符' },
              { validator: validateStrongPassword },
            ]}
          >
            <Input.Password
              prefix={<SafetyOutlined />}
              placeholder="至少8位，包含大写字母、小写字母、数字、特殊符号"
            />
          </Form.Item>

          <Form.Item
            label="确认新密码"
            name="confirm_password"
            dependencies={['new_password']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<SafetyOutlined />}
              placeholder="请再次输入新密码"
            />
          </Form.Item>

          <Alert
            message="密码要求：至少8位，包含大写字母、小写字母、数字、特殊符号"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ChangePassword;
