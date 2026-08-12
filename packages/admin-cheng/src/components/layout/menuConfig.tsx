import {
  DashboardOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
  AuditOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
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
  DollarOutlined,
  SoundOutlined,
  SendOutlined,
  ApartmentOutlined,
  IdcardOutlined,
  GiftOutlined,
  TrophyOutlined,
  ScheduleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';

/** 顶部一级菜单配置 */
export const topMenuItems = [
  { key: 'system', icon: <SettingOutlined />, label: '系统管理' },
  { key: 'operation', icon: <ShopOutlined />, label: '运营管理' },
];

/**
 * 侧边栏菜单配置
 *
 * 可见性规则（MainLayout 中控制）：
 *  - key === 'admin-group' → 仅 is_root 可见（基础配置）
 *  - key === 'account-group' → 仅 is_root 可见（我的账户）
 */
export const sidebarMenuConfig: Record<string, any[]> = {
  // ========== 一、系统管理 ==========
  system: [
    // 1. 工作台
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },

    // 2. 基础配置（仅 root 可见）
    {
      key: 'admin-group',
      icon: <SettingOutlined />,
      label: '基础配置',
      children: [
        { key: '/system/roles', icon: <SafetyCertificateOutlined />, label: '管理角色管理' },
        { key: '/system/admins', icon: <UserSwitchOutlined />, label: '管理账号' },
        { key: '/system/admin-logs', icon: <AuditOutlined />, label: '管理日志' },
        { key: '/system/wxa-apps', icon: <TagOutlined />, label: '小程序配置' },
        { key: '/system/page-config', icon: <FileTextOutlined />, label: '页面配置管理' },
      ],
    },

    // 3. 我的账户（仅 root 可见）
    {
      key: 'account-group',
      icon: <LockOutlined />,
      label: '我的账户',
      children: [
        { key: '/system/change-password', icon: <FormOutlined />, label: '修改密码' },
        { key: '/system/my-logs', icon: <HistoryOutlined />, label: '我的日志' },
      ],
    },

    // 4. 访问数据统计
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

    // 5. 配置管理
    {
      key: 'config-group',
      icon: <SettingOutlined />,
      label: '配置管理',
      children: [
        { key: '/system/banners', icon: <PictureOutlined />, label: '轮播图管理' },
        { key: '/system/popups', icon: <ScheduleOutlined />, label: '首页弹窗管理' },
        { key: '/system/agreements', icon: <FileTextOutlined />, label: '协议文档' },
        { key: '/system/faq', icon: <QuestionCircleOutlined />, label: 'FAQ管理' },
      ],
    },
  ],

  // ========== 二、运营管理 ==========
  operation: [
    // === 社区管理原菜单（放在运营管理顶部） ===
    // 1. 用户资料
    {
      key: 'user-profile-group',
      icon: <IdcardOutlined />,
      label: '用户资料',
      children: [
        { key: '/operation/users', icon: <UserOutlined />, label: '基础资料管理' },
        { key: '/operation/match-profiles', icon: <IdcardOutlined />, label: '脱单资料管理' },
        { key: '/operation/user-verify', icon: <SafetyCertificateOutlined />, label: '用户认证' },
      ],
    },

    // 2. 互动管理
    {
      key: 'interaction-group',
      icon: <GiftOutlined />,
      label: '互动管理',
      children: [
        { key: '/operation/gifts', icon: <GiftOutlined />, label: '礼物管理' },
        { key: '/operation/lottery', icon: <TrophyOutlined />, label: '抽奖管理' },
      ],
    },

    // === 运营管理原菜单 ===
    // 3. 节目管理
    {
      key: 'program-group',
      icon: <SoundOutlined />,
      label: '节目管理',
      children: [
        { key: '/operation/programs', icon: <SoundOutlined />, label: '广播节目管理' },
        { key: '/operation/program-submissions', icon: <SendOutlined />, label: '广播投稿管理' },
      ],
    },

    // 4. 活动与合作
    {
      key: 'event-group',
      icon: <ShopOutlined />,
      label: '活动与合作',
      children: [
        { key: '/operation/activity', icon: <CalendarOutlined />, label: '活动管理' },
        { key: '/operation/cooperation', icon: <ApartmentOutlined />, label: '合作专区管理' },
      ],
    },

    // 5. 财务管理
    {
      key: 'finance-group',
      icon: <DollarOutlined />,
      label: '财务管理',
      children: [
        { key: '/operation/orders', icon: <ShoppingCartOutlined />, label: '订单管理' },
      ],
    },

    // === 放在最下面 ===
    // 6. 社区统计
    {
      key: 'community-stats-group',
      icon: <BarChartOutlined />,
      label: '社区统计',
      children: [
        { key: '/operation/stats', icon: <LineChartOutlined />, label: '平台数据统计' },
        { key: '/operation/trends', icon: <RiseOutlined />, label: '趋势统计' },
        { key: '/operation/finance-stats', icon: <BarChartOutlined />, label: '财务统计' },
      ],
    },
  ],
};
