import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppNotification } from '@/hooks/useAppNotification';
import { authApi } from '@/api/services/auth';
import { validateStrongPassword } from '@/utils/password';
import { cancelTokenRefreshScheduler, clearTokens, ADMIN_USER_KEY } from '@/api';

const { Title } = Typography;

/**
 * 修改自己的管理员密码。
 * 修改后所有旧 JWT 立即失效：本地清空会话（含凭据），引导用新密码重新登录。
 */
const ChangePassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();
  const navigate = useNavigate();

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      await authApi.changePassword({
        old_password: values.old_password,
        new_password: values.new_password,
      });
      // 旧 JWT 已失效：本地彻底清会话（不调 logout API，避免 401 触发自动刷新）
      cancelTokenRefreshScheduler();
      clearTokens();
      localStorage.removeItem(ADMIN_USER_KEY);
      success('密码修改成功，请使用新密码重新登录');
      navigate('/login');
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
      <p style={{ color: '#666', marginBottom: 24 }}>修改您的专区管理员登录密码。</p>

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
