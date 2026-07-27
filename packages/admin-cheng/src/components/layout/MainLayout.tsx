import { useState, useEffect, useMemo } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, theme, Drawer, Grid } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import logo from '@/styles/logo.png';
import { topMenuItems, sidebarMenuConfig } from './menuConfig';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarDrawerVisible, setSidebarDrawerVisible] = useState(false);
  const [currentTopMenu, setCurrentTopMenu] = useState('system');
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const screens = Grid.useBreakpoint();
  const {
    token: { colorBgContainer, colorBgElevated, borderRadiusLG },
  } = theme.useToken();

  const isMobileFromScreens = !screens.md;

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCollapsed(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const finalIsMobile = screens.md !== undefined ? isMobileFromScreens : isMobile;

  const currentPath = location.pathname;

  // 根据当前路径确定选中一级菜单和展开子菜单
  useEffect(() => {
    let topMenu = 'system';
    if (currentPath === '/' || currentPath.startsWith('/system')) {
      topMenu = 'system';
    } else if (currentPath.startsWith('/operation')) {
      topMenu = 'operation';
    } else if (currentPath.startsWith('/finance')) {
      topMenu = 'finance';
    }
    setCurrentTopMenu(topMenu);

    const menuItems = sidebarMenuConfig[topMenu] || [];
    const keys = getOpenKeys(menuItems, currentPath);
    setOpenKeys(keys);
  }, [currentPath]);

  const rawSidebarMenuItems = sidebarMenuConfig[currentTopMenu] || [];

  const sidebarMenuItems = useMemo(() => {
    return rawSidebarMenuItems;
  }, [rawSidebarMenuItems, currentTopMenu]);

  // 不按角色过滤菜单 — 始终显示全部
  const visibleMenuItems = useMemo(() => {
    const processItem = (item: any): any | null => {
      const { hide, ...rest } = item;
      if (rest.children) {
        const filtered = rest.children.map(processItem).filter(Boolean);
        if (filtered.length === 0) return null;
        return { ...rest, children: filtered };
      }
      return rest;
    };
    return sidebarMenuItems.map(processItem).filter(Boolean);
  }, [sidebarMenuItems]);

  const getOpenKeys = (menuItems: any[], path: string) => {
    const keys: string[] = [];
    menuItems.forEach((item: any) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child: any) =>
          path.startsWith(child.key)
        );
        if (hasActiveChild) {
          keys.push(item.key);
        }
      }
    });
    return keys;
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  const handleTopMenuClick = ({ key }: { key: string }) => {
    setCurrentTopMenu(key);
    if (finalIsMobile) {
      setSidebarDrawerVisible(false);
    }
  };

  const handleSidebarMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key);
      if (finalIsMobile) {
        setSidebarDrawerVisible(false);
      }
    }
  };

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    }
  };

  const sidebarContent = (
    <>
      <div className="logo">
        <img
          src={logo}
          alt="他俩能成"
          className={`logo-image ${collapsed ? 'logo-collapsed' : ''}`}
        />
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[currentPath]}
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        items={visibleMenuItems}
        onClick={handleSidebarMenuClick}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!finalIsMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            height: '100vh',
            zIndex: 99,
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {finalIsMobile && (
        <Drawer
          title={
            <div className="logo" style={{ height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={logo} alt="他俩能成" className="logo-image" style={{ height: 36 }} />
            </div>
          }
          placement="left"
          onClose={() => setSidebarDrawerVisible(false)}
          open={sidebarDrawerVisible}
          width={250}
          styles={{ body: { padding: 0 } }}
        >
          <Menu
            mode="inline"
            selectedKeys={[currentPath]}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
            items={visibleMenuItems}
            onClick={handleSidebarMenuClick}
          />
        </Drawer>
      )}

      <Layout style={{ marginLeft: finalIsMobile ? 0 : (collapsed ? 80 : 200), transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: 0,
            background: colorBgElevated,
            position: 'fixed',
            top: 0,
            left: finalIsMobile ? 0 : (collapsed ? 80 : 200),
            right: 0,
            zIndex: 100,
            borderBottom: '1px solid #e8e8e8',
            display: 'flex',
            alignItems: 'center',
            transition: 'left 0.2s',
          }}
        >
          <Button
            type="text"
            icon={finalIsMobile ? <MenuOutlined /> : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => {
              if (finalIsMobile) {
                setSidebarDrawerVisible(true);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Menu
              mode="horizontal"
              selectedKeys={[currentTopMenu]}
              items={topMenuItems.map(item => ({
                key: item.key,
                icon: item.icon,
                label: item.label,
              }))}
              onClick={handleTopMenuClick}
              style={{ borderBottom: 'none', lineHeight: '64px', overflow: 'hidden' }}
            />
          </div>

          <div className="header-right" style={{ paddingRight: 24 }}>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
            >
              <div className="user-info" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} size="small" />
                <span className="username" style={{ display: finalIsMobile ? 'none' : 'inline' }}>
                  {user?.name || '管理员'}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            marginTop: 64,
            marginLeft: finalIsMobile ? 0 : 0,
            marginRight: 0,
            padding: finalIsMobile ? '12px 8px' : '16px 24px',
            minHeight: 'calc(100vh - 64px)',
            background: colorBgContainer,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
