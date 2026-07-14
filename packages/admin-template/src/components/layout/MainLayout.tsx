import { useState, useEffect, useMemo } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, theme, Drawer, Grid, Badge } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  // 一级菜单图标
  DashboardOutlined,
  SettingOutlined,
  TeamOutlined,
  CalendarOutlined,
  // 二级菜单图标
  UserOutlined,
  AuditOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  ToolOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  UnorderedListOutlined,
  DollarOutlined,
  MessageOutlined,
  FileTextOutlined,
  CommentOutlined,
  TagOutlined,
  SecurityScanOutlined,
  BarChartOutlined,
  LineChartOutlined,
  RiseOutlined,
  LockOutlined,
  HistoryOutlined,
  EnvironmentOutlined,
  AppstoreOutlined,
  FormOutlined,
  CheckCircleOutlined,
  UserSwitchOutlined,
  WalletOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import logo from '@/styles/logo.png';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

// 一级菜单配置（顶部导航）
const topMenuItems = [
  { key: 'system', icon: <SettingOutlined />, label: '系统管理' },
  { key: 'community', icon: <TeamOutlined />, label: '社区管理' },
  { key: 'events', icon: <CalendarOutlined />, label: '活动管理' },
];

// 二级菜单配置（按一级菜单分组）
const sidebarMenuConfig: Record<string, any[]> = {
  system: [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    {
      key: 'admin-group',
      icon: <UserOutlined />,
      label: '管理员管理',
      children: [
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
    {
      key: 'config-group',
      icon: <AppstoreOutlined />,
      label: '配置管理',
      children: [
        { key: '/system/banners', icon: <PictureOutlined />, label: '轮播图管理' },
        { key: '/system/cities', icon: <EnvironmentOutlined />, label: '城市管理' },
        { key: '/system/agreements', icon: <FileTextOutlined />, label: '协议文档' },
        { key: '/system/hot-keywords', icon: <TagOutlined />, label: '热门搜索词' },
        { key: '/system/faq', icon: <QuestionCircleOutlined />, label: 'FAQ管理' },
      ],
    },
  ],
  community: [
    {
      key: 'community-config-group',
      icon: <SettingOutlined />,
      label: '基本配置',
      children: [
        { key: '/community/settings', icon: <ToolOutlined />, label: '审核模式' },
        { key: '/community/points', icon: <DollarOutlined />, label: '积分设置' },
      ],
    },
    {
      key: 'user-group',
      icon: <TeamOutlined />,
      label: '用户管理',
      children: [
        { key: '/community/user-tags', icon: <TagOutlined />, label: '用户标签' },
        { key: '/community/users', icon: <UserOutlined />, label: '注册用户' },
      ],
    },
    {
      key: 'feed-group',
      icon: <MessageOutlined />,
      label: '动态管理',
      children: [
        { key: '/community/topics', icon: <UnorderedListOutlined />, label: '话题管理' },
        { key: '/community/feeds', icon: <FileTextOutlined />, label: '动态发布' },
        { key: '/community/comments', icon: <CommentOutlined />, label: '评论管理' },
      ],
    },
    {
      key: 'community-stats-group',
      icon: <BarChartOutlined />,
      label: '社区统计',
      children: [
        { key: '/community/stats/users', icon: <UserOutlined />, label: '用户统计' },
        { key: '/community/stats/feeds', icon: <MessageOutlined />, label: '动态统计' },
      ],
    },
  ],
  events: [
    {
      key: 'event-config-group',
      icon: <SettingOutlined />,
      label: '基本配置',
      children: [
        { key: '/events/categories', icon: <UnorderedListOutlined />, label: '活动类型' },
        { key: '/events/fee-config', icon: <DollarOutlined />, label: '费率配置' },
      ],
    },
    {
      key: 'event-info-group',
      icon: <CalendarOutlined />,
      label: '活动信息管理',
      children: [
        { key: '/events/list', icon: <UnorderedListOutlined />, label: '活动发布管理' },
        { key: '/events/finance/orders', icon: <FormOutlined />, label: '活动报名' },
        { key: '/events/finance/settlement', icon: <CheckCircleOutlined />, label: '活动结算审核' },
      ],
    },
    {
      key: 'event-finance-group',
      icon: <DollarOutlined />,
      label: '活动财务管理',
      children: [
        { key: '/events/finance/payments', icon: <SafetyCertificateOutlined />, label: '支付记录' },
        { key: '/events/finance/refunds', icon: <DollarOutlined />, label: '退款记录' },
        { key: '/events/finance/withdrawals', icon: <WalletOutlined />, label: '提现管理' },
        { key: '/events/finance/coupons', icon: <TagOutlined />, label: '优惠券管理' },
      ],
    },
    {
      key: 'event-stats-group',
      icon: <BarChartOutlined />,
      label: '活动统计',
      children: [
        { key: '/events/stats', icon: <LineChartOutlined />, label: '活动数据统计' },
      ],
    },
  ],
};

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarDrawerVisible, setSidebarDrawerVisible] = useState(false);
  // 新增：当前选中的一级菜单，默认系统管理
  const [currentTopMenu, setCurrentTopMenu] = useState('system');
  // 菜单展开项（受控模式）
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const screens = Grid.useBreakpoint();
  const {
    token: { colorBgContainer, colorBgElevated, borderRadiusLG },
  } = theme.useToken();

  // 响应式布局
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

  // 根据当前路径确定选中的一级菜单（用于初始化和页面刷新）
  const currentPath = location.pathname;

  // 当路径变化时，更新当前选中的一级菜单和展开的子菜单
  useEffect(() => {
    let topMenu = 'system';
    if (currentPath === '/' || currentPath.startsWith('/system')) {
      topMenu = 'system';
    } else if (currentPath.startsWith('/community')) {
      topMenu = 'community';
    } else if (currentPath.startsWith('/events')) {
      topMenu = 'events';
    }
    setCurrentTopMenu(topMenu);

    // 计算需要展开的子菜单
    const menuItems = sidebarMenuConfig[topMenu] || [];
    const keys = getOpenKeys(menuItems, currentPath);
    setOpenKeys(keys);
  }, [currentPath]);

  // 获取当前二级菜单（根据选中的一级菜单，而非当前路径）
  // 根据用户权限过滤菜单：只有root用户才能看到管理员管理
  const rawSidebarMenuItems = sidebarMenuConfig[currentTopMenu] || [];
  const sidebarMenuItems = useMemo(() => {
    if (currentTopMenu !== 'system' || !rawSidebarMenuItems.length) {
      return rawSidebarMenuItems;
    }
    // 过滤掉管理员管理分组（非root用户）
    return rawSidebarMenuItems.filter((item: any) => {
      if (item.key === 'admin-group' && !user?.root) {
        return false;
      }
      return true;
    });
  }, [rawSidebarMenuItems, currentTopMenu, user?.root]);

  // 计算左侧菜单需要展开的项
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

  // 用户菜单
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  // 处理顶部菜单点击 - 切换激活状态并切换左侧菜单
  const handleTopMenuClick = ({ key }: { key: string }) => {
    setCurrentTopMenu(key);
    // 不重置 openKeys，切换顶部标签时保持子菜单展开状态
    if (finalIsMobile) {
      setSidebarDrawerVisible(false);
    }
  };

  // 处理左侧菜单点击
  const handleSidebarMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key);
      if (finalIsMobile) {
        setSidebarDrawerVisible(false);
      }
    }
  };

  // 处理用户菜单点击
  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    }
  };

  // 侧边栏内容 - Logo在菜单最上方
  const sidebarContent = (
    <>
      <div className="logo">
        <img
          src={logo}
          alt="搭子计划"
          className={`logo-image ${collapsed ? 'logo-collapsed' : ''}`}
        />
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[currentPath]}
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        items={sidebarMenuItems}
        onClick={handleSidebarMenuClick}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端：固定侧边栏 - 从顶部开始，上下贯通 */}
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
            zIndex: 99
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* 移动端：侧边栏抽屉 */}
      {finalIsMobile && (
        <Drawer
          title={
            <div className="logo" style={{ height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={logo} alt="搭子计划" className="logo-image" style={{ height: 36 }} />
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
            items={sidebarMenuItems}
            onClick={handleSidebarMenuClick}
          />
        </Drawer>
      )}

      <Layout style={{ marginLeft: finalIsMobile ? 0 : (collapsed ? 80 : 200), transition: 'margin-left 0.2s' }}>
        {/* 顶部Header */}
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
          {/* 左侧菜单展开按钮 */}
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

          {/* 顶部一级菜单 */}
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

          {/* 右侧用户信息 */}
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

        {/* 内容区域 */}
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
