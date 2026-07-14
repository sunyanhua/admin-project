import { useState } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Form, Input, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/styles/logo.png';
import './Login.css';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { success, error, warning, info } = useAppNotification();
const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values: { username: string; password: string; remember?: boolean }) => {
    setLoading(true);
    try {
      // 调用登录API
      await login(values.username, values.password);

      success('登录成功');
      navigate('/');
    } catch (error: any) {
      console.error('登录失败:', error);
      const errorMsg = error.response?.data?.msg || error.response?.data?.error || error.message || '登录失败，请检查用户名和密码';
      error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src={logo} alt="搭子计划" className="logo-image" />
          </div>
          <Title level={2}>搭子计划</Title>
          <Title level={4} type="secondary">管理后台</Title>
        </div>
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入管理员用户名"
              size="large"
            />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入登录密码"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Space direction="horizontal" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住密码</Checkbox>
              </Form.Item>
              <Button type="link" size="small" style={{ padding: 0 }}>
                忘记密码？
              </Button>
            </Space>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ height: 48, fontSize: 16, fontWeight: 500 }}
            >
              登录系统
            </Button>
          </Form.Item>
        </Form>
        <div className="login-footer">
          <p>© 2026 搭子计划 管理后台</p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
