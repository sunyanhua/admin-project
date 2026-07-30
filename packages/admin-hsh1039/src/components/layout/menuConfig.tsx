import {
  DashboardOutlined,
  SettingOutlined,
  ShopOutlined,
  DollarOutlined,
  UserOutlined,
  AuditOutlined,
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
  IdcardOutlined,
} from '@ant-design/icons';

/** 顶部一级菜单配置 */
export const topMenuItems = [
  { key: 'system', icon: <SettingOutlined />, label: '系统管理' },
  { key: 'operation', icon: <ShopOutlined />, label: '运营管理' },
  { key: 'finance', icon: <DollarOutlined />, label: '财务管理' },
];

/** 侧边栏菜单配置 */
export const sidebarMenuConfig: Record<string, any[]> = {
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
        { key: '/operation/page-config', icon: <FileTextOutlined />, label: '页面配置管理', hide: true },
        { key: '/operation/categories', icon: <UnorderedListOutlined />, label: '运营分类管理', hide: true },
        { key: '/operation/refund-rules', icon: <SafetyCertificateOutlined />, label: '退款规则管理' },
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
        { key: '/operation/event-tickets', icon: <IdcardOutlined />, label: '入场券管理' },
      ],
    },
    {
      key: 'ticket-group',
      icon: <TagOutlined />,
      label: '门票管理',
      children: [
        { key: '/operation/ticket-categories', icon: <UnorderedListOutlined />, label: '门票分类管理' },
        { key: '/operation/tickets', icon: <FileTextOutlined />, label: '门票销售' },
        { key: '/operation/ticket-orders', icon: <ShoppingCartOutlined />, label: '购票信息' },
        { key: '/operation/ticket-wallet', icon: <WalletOutlined />, label: '票夹管理' },
      ],
    },
    {
      key: 'product-group',
      icon: <ShoppingCartOutlined />,
      label: '商品管理',
      children: [
        { key: '/operation/product-categories', icon: <UnorderedListOutlined />, label: '商品分类管理' },
        { key: '/operation/products', icon: <FileTextOutlined />, label: '商品销售' },
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
        { key: '/finance/invoices', icon: <FileTextOutlined />, label: '发票管理' },
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
