import { useState, useEffect, useMemo } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, theme, Drawer, Grid } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DashboardOutlined,
  SettingOutlined,
  ShopOutlined,
  DollarOutlined,
  UserOutlined,
  AuditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  BarChartOutlined,
  LineChartOutlined,
  RiseOutlined,
  LockOutlined,
  HistoryOutlined,
  FormOutlined,
  UserSwitchOutlined,
  TagOutlined,
  QuestionCircleOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import logo from '@/styles/logo.png';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

// 一级菜单配置（顶部导航）
const topMenuItems = [
  { key: 'system', icon: <SettingOutlined />, label: '系统管理' },
  { key: 'operation', icon: <ShopOutlined />, label: '运营管理' },
  { key: 'finance', icon: <DollarOutlined />, label: '财务管理' },
];

// 新菜单中没有对应页面的分组，暂时用占位路由
const sidebarMenuConfig: Record<string, any[]> = {
  // ========== 系统管理 ==========
  system: [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    {
      key: 'admin-group',
      icon: <UserOutlined />,
      label: '管理员管理',
      children: [
        { key: '/system/roles', icon: <SafetyCertificateOutlined />, label: '角色管理' },
        { key: '/system/admins', icon: <UserSwitchOutlined />, label: '管理账号' },
        { key: '/system/admin-logs', icon: <AuditOutlined />, label: '管理日志' },
      ],
    },
    {
      key: 'account-group',
      icon: <LockOutlined />,
      label: '我的账户',
      children: [
        { key: '/system/change-password', icon: <FormOutlined />, label: '修改密码' },
        { key: '/system/my-logs', icon: <HistoryOutlined />, label: '我的日志' },
      ],
    },
    {
      key: 'stats-group',
      icon: <BarChartOutlined />,
      label: '访问数据统计',
      children: [
        { key: '/system/sources', icon: <RiseOutlined />, label: '来源管理' },
        { key: '/system/visits', icon: <LineChartOutlined />, label: '访问统计' },
        { key: '/system/visits/users', icon: <LineChartOutlined />, label: '访问用户统计' },
      ],
    },
  ],

  // ========== 运营管理 ==========
  operation: [
    {
      key: 'config-group',
      icon: <SettingOutlined />,
      label: '配置管理',
      children: [
        { key: '/operation/categories', icon: <UnorderedListOutlined />, label: '运营分类管理', hide: true },
        { key: '/operation/banners', icon: <PictureOutlined />, label: '轮播图管理' },
        { key: '/operation/agreements', icon: <FileTextOutlined />, label: '协议文档' },
        { key: '/operation/faq', icon: <QuestionCircleOutlined />, label: 'FAQ管理' },
      ],
    },
    {
      key: 'user-group',
      icon: <UserOutlined />,
      label: '用户管理',
      children: [
        { key: '/operation/users', icon: <UserOutlined />, label: '注册用户' },
        { key: '/operation/user-stats', icon: <BarChartOutlined />, label: '用户统计' },
      ],
    },
    {
      key: 'event-group',
      icon: <ShopOutlined />,
      label: '活动管理',
      children: [
        { key: '/operation/event-categories', icon: <UnorderedListOutlined />, label: '活动分类管理' },
        { key: '/operation/events', icon: <FileTextOutlined />, label: '活动发布' },
        { key: '/operation/event-orders', icon: <FormOutlined />, label: '活动报名' },
      ],
    },
    {
      key: 'ticket-group',
      icon: <TagOutlined />,
      label: '票务管理',
      children: [
        { key: '/operation/ticket-categories', icon: <UnorderedListOutlined />, label: '票务分类管理' },
        { key: '/operation/tickets', icon: <FileTextOutlined />, label: '票务发布' },
        { key: '/operation/ticket-orders', icon: <ShoppingCartOutlined />, label: '购票信息' },
      ],
    },
    {
      key: 'product-group',
      icon: <ShoppingCartOutlined />,
      label: '商品管理',
      children: [
        { key: '/operation/product-categories', icon: <UnorderedListOutlined />, label: '商品分类管理' },
        { key: '/operation/products', icon: <FileTextOutlined />, label: '商品发布' },
        { key: '/operation/product-orders', icon: <ShoppingCartOutlined />, label: '购买信息' },
      ],
    },
  ],

  // ========== 财务管理 ==========
  finance: [
    {
      key: 'finance-info-group',
      icon: <DollarOutlined />,
      label: '财务信息',
      children: [
        { key: '/finance/payments', icon: <DollarOutlined />, label: '支付管理' },
        { key: '/finance/refunds', icon: <WalletOutlined />, label: '退款管理' },
        { key: '/finance/coupons', icon: <TagOutlined />, label: '优惠券管理' },
      ],
    },
    {
      key: 'finance-stats-group',
      icon: <BarChartOutlined />,
      label: '财务统计',
      children: [
        { key: '/finance/stats', icon: <LineChartOutlined />, label: '财务统计管理' },
      ],
    },
  ],
};

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
  const roles = user?.roles as string[] | undefined;
  const hasSuper = roles?.includes('super_admin');

  const sidebarMenuItems = useMemo(() => {
    if (currentTopMenu !== 'system' || !rawSidebarMenuItems.length) {
      return rawSidebarMenuItems;
    }
    const hasAllAdmin = roles?.includes('all_admin');

    // super_admin → 全部显示
    if (hasSuper) return rawSidebarMenuItems;

    // 既非 super_admin 也非 all_admin → 隐藏整个管理员管理组
    if (!hasAllAdmin) {
      return rawSidebarMenuItems.filter((item: any) => item.key !== 'admin-group');
    }

    // all_admin → 显示管理员管理组但隐藏角色管理
    return rawSidebarMenuItems.map((item: any) => {
      if (item.key === 'admin-group' && item.children) {
        return {
          ...item,
          children: item.children.filter(
            (child: any) => child.key !== '/system/roles'
          ),
        };
      }
      return item;
    });
  }, [rawSidebarMenuItems, currentTopMenu, roles]);

  // 始终剔除 hide 属性（避免传递到 DOM），非 super_admin 时过滤掉隐藏菜单项
  const visibleMenuItems = useMemo(() => {
    const processItem = (item: any): any | null => {
      // 非 super_admin 且标记隐藏 → 整项不显示
      if (!hasSuper && item.hide) return null;
      const { hide, ...rest } = item;
      if (rest.children) {
        const filtered = rest.children.map(processItem).filter(Boolean);
        if (filtered.length === 0) return null;
        return { ...rest, children: filtered };
      }
      return rest;
    };
    return sidebarMenuItems.map(processItem).filter(Boolean);
  }, [sidebarMenuItems, hasSuper]);

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
          alt="1039俱乐部+"
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
              <img src={logo} alt="1039俱乐部+" className="logo-image" style={{ height: 36 }} />
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
