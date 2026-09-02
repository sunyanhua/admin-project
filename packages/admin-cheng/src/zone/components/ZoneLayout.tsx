import { Layout, Menu, Button, Space } from 'antd';
import {
  HomeOutlined, AuditOutlined, TeamOutlined, CalendarOutlined,
  KeyOutlined, LogoutOutlined,
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/styles/logo.png';

const { Sider, Header, Content } = Layout;

const MENU_ITEMS = [
  { key: '/', icon: <HomeOutlined />, label: '专区信息' },
  { key: '/applications', icon: <AuditOutlined />, label: '申请审核' },
  { key: '/users', icon: <TeamOutlined />, label: '专区用户' },
  { key: '/activities', icon: <CalendarOutlined />, label: '活动发布' },
  { key: '/change-password', icon: <KeyOutlined />, label: '修改密码' },
];

const ZoneLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = location.pathname === '/' ? '/' : location.pathname;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={200} collapsible>
        <div style={{ padding: '16px 8px', textAlign: 'center' }}>
          <img src={logo} alt="logo" style={{ height: 40, borderRadius: 8 }} />
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={MENU_ITEMS}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            专区管理后台
            {user?.zoneName ? <span style={{ color: '#999', fontWeight: 400, marginLeft: 12, fontSize: 14 }}>{user.zoneName}</span> : null}
          </div>
          <Space>
            <span style={{ color: '#666', fontSize: 14 }}>{user?.name || user?.username}</span>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出登录</Button>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default ZoneLayout;
