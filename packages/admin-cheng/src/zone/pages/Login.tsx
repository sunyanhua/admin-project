import { useState } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/styles/logo.png';
import '@/pages/Login.css';

const { Title } = Typography;

const ZoneLogin = () => {
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();
  const navigate = useNavigate();
  const { login } = useAuth();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      success('登录成功');
      navigate('/');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.msg || err.response?.data?.error || err.message || '登录失败，请检查用户名和密码';
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src={logo} alt="他俩能成" className="logo-image" />
          </div>
          <Title level={2}>他俩能成</Title>
          <Title level={4} type="secondary">专区管理后台</Title>
        </div>
        <Form
          name="zone-login"
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
              placeholder="请输入专区管理员用户名"
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
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ height: 48, fontSize: 16, fontWeight: 500 }}
            >
              登录专区管理后台
            </Button>
          </Form.Item>
        </Form>
        <div className="login-footer">
          <p>© 2026 他俩能成 专区管理后台</p>
        </div>
      </Card>
    </div>
  );
};

export default ZoneLogin;
