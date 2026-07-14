import { createHashRouter, RouterProvider } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// 系统管理页面
import AdminManagement from '@/pages/system/AdminManagement';
import AdminLogs from '@/pages/system/AdminLogs';
import ChangePassword from '@/pages/system/ChangePassword';
import MyLogs from '@/pages/system/MyLogs';
import SourceManagement from '@/pages/system/SourceManagement';
import VisitStatistics from '@/pages/system/VisitStatistics';
import VisitUserStats from '@/pages/system/VisitUserStats';
import BannerManagement from '@/pages/system/BannerManagement';
import CityManagement from '@/pages/system/CityManagement';
import FaqManagement from '@/pages/system/FaqManagement';

// 社区管理页面
import CommunitySettings from '@/pages/community/CommunitySettings';
import UserTags from '@/pages/community/UserTags';
import UserList from '@/pages/community/UserList';
import TopicManagement from '@/pages/community/TopicManagement';
import FeedManagement from '@/pages/community/FeedManagement';
import CommentManagement from '@/pages/community/CommentManagement';
import UserStats from '@/pages/community/UserStats';
import FeedStats from '@/pages/community/FeedStats';

// 活动管理页面
import EventCategories from '@/pages/events/EventCategories';
import EventList from '@/pages/events/EventList';
import EventOrders from '@/pages/events/EventOrders';
import SettlementAudit from '@/pages/events/SettlementAudit';
import PaymentRecords from '@/pages/events/PaymentRecords';
import RefundRecords from '@/pages/events/RefundRecords';
import EventStats from '@/pages/events/EventStats';
import WithdrawalManagement from '@/pages/finance/WithdrawalManagement';
import CouponManagement from '@/pages/finance/CouponManagement';

// 从其他模块迁移的页面
import AgreementManagement from '@/pages/community/AgreementManagement';
import HotKeywords from '@/pages/events/HotKeywords';
import PointsSettings from '@/pages/community/PointsSettings';
import FeeConfig from '@/pages/events/FeeConfig';

// 受保护的路由布局
const ProtectedLayout = () => (
  <ProtectedRoute>
    <MainLayout />
  </ProtectedRoute>
);

// 路由配置
const router = createHashRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      // 工作台首页
      {
        index: true,
        element: <Dashboard />,
      },

      // 系统管理
      {
        path: 'system',
        children: [
          { index: true, element: <Dashboard /> },
          // 管理员管理
          { path: 'admins', element: <AdminManagement /> },
          { path: 'admin-logs', element: <AdminLogs /> },
          // 我的账户
          { path: 'change-password', element: <ChangePassword /> },
          { path: 'my-logs', element: <MyLogs /> },
          // 访问数据统计
          { path: 'sources', element: <SourceManagement /> },
          { path: 'visits', element: <VisitStatistics /> },
          { path: 'visits/users', element: <VisitUserStats /> },
          // 配置管理
          { path: 'banners', element: <BannerManagement /> },
          { path: 'cities', element: <CityManagement /> },
          { path: 'agreements', element: <AgreementManagement /> },
          { path: 'hot-keywords', element: <HotKeywords /> },
          { path: 'faq', element: <FaqManagement /> },
        ],
      },

      // 社区管理
      {
        path: 'community',
        children: [
          { index: true, element: <UserList /> },
          // 基本配置
          { path: 'settings', element: <CommunitySettings /> },
          { path: 'points', element: <PointsSettings /> },
          // 用户管理
          { path: 'user-tags', element: <UserTags /> },
          { path: 'users', element: <UserList /> },
          // 动态管理
          { path: 'topics', element: <TopicManagement /> },
          { path: 'feeds', element: <FeedManagement /> },
          { path: 'comments', element: <CommentManagement /> },
          // 社区统计
          { path: 'stats/users', element: <UserStats /> },
          { path: 'stats/feeds', element: <FeedStats /> },
        ],
      },

      // 活动管理
      {
        path: 'events',
        children: [
          { index: true, element: <EventList /> },
          // 基本配置
          { path: 'categories', element: <EventCategories /> },
          { path: 'fee-config', element: <FeeConfig /> },
          // 活动信息管理
          { path: 'list', element: <EventList /> },
          // 活动财务管理（包含提现管理）
          { path: 'finance/orders', element: <EventOrders /> },
          { path: 'finance/settlement', element: <SettlementAudit /> },
          { path: 'finance/payments', element: <PaymentRecords /> },
          { path: 'finance/refunds', element: <RefundRecords /> },
          { path: 'finance/withdrawals', element: <WithdrawalManagement /> },
          { path: 'finance/coupons', element: <CouponManagement /> },
          // 活动统计
          { path: 'stats', element: <EventStats /> },
        ],
      },

      // 404页面
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

// 路由组件
const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
