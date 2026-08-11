import { createHashRouter, RouterProvider } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// 系统管理页面
import AdminManagement from '@/pages/system/AdminManagement';
import AdminLogs from '@/pages/system/AdminLogs';
import RoleManagement from '@/pages/system/RoleManagement';
import ChangePassword from '@/pages/system/ChangePassword';
import MyLogs from '@/pages/system/MyLogs';
import SourceManagement from '@/pages/system/SourceManagement';
import VisitStatistics from '@/pages/system/VisitStatistics';
import VisitUserStats from '@/pages/system/VisitUserStats';
import WxaAppManagement from '@/pages/system/WxaAppManagement';
import BannerManagement from '@/pages/system/BannerManagement';
import FaqManagement from '@/pages/system/FaqManagement';

// 运营管理页面
import PageConfigManagement from '@/pages/operation/PageConfigManagement';

// 社区管理页面
import UserList from '@/pages/community/UserList';
import MatchProfileManagement from '@/pages/community/MatchProfileManagement';
import AgreementManagement from '@/pages/community/AgreementManagement';

// 合作管理页面
import ZoneManagement from '@/pages/operation/ZoneManagement';

// 活动管理页面（v1）
import ActivityManagement from '@/pages/operation/ActivityManagement';
import EventRegisterList from '@/pages/events/EventRegisterList';

// 首页弹窗管理
import HomePopupManagement from '@/pages/system/HomePopupManagement';
// 礼物管理
import GiftManagement from '@/pages/community/GiftManagement';

// 抽奖管理
import LotteryManagement from '@/pages/community/LotteryManagement';

// 广播投稿管理
import ProgramSubmission from '@/pages/operation/ProgramSubmission';
// 广播节目管理
import ProgramManagement from '@/pages/operation/ProgramManagement';

// 占位页面（功能待开发）
import PlaceholderPage from '@/pages/PlaceholderPage';

const ProtectedLayout = () => (
  <ProtectedRoute>
    <MainLayout />
  </ProtectedRoute>
);

const router = createHashRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      // 工作台
      { index: true, element: <Dashboard /> },

      // ========== 系统管理 ==========
      {
        path: 'system',
        children: [
          // 基础配置
          { path: 'roles', element: <RoleManagement /> },
          { path: 'admins', element: <AdminManagement /> },
          { path: 'admin-logs', element: <AdminLogs /> },
          { path: 'wxa-apps', element: <WxaAppManagement /> },
          { path: 'page-config', element: <PageConfigManagement /> },
          // 我的账户
          { path: 'change-password', element: <ChangePassword /> },
          { path: 'my-logs', element: <MyLogs /> },
          // 访问数据统计
          { path: 'sources', element: <SourceManagement /> },
          { path: 'visits', element: <VisitStatistics /> },
          { path: 'visits/users', element: <VisitUserStats /> },
          // 配置管理
          { path: 'banners', element: <BannerManagement /> },
          { path: 'popups', element: <HomePopupManagement /> },
          { path: 'agreements', element: <AgreementManagement /> },
          { path: 'faq', element: <FaqManagement /> },
          { path: 'points', element: <PlaceholderPage title="积分配置" /> },
        ],
      },

      // ========== 社区管理 ==========
      {
        path: 'community',
        children: [
          // 用户资料
          { path: 'users', element: <UserList /> },
          { path: 'match-profiles', element: <MatchProfileManagement /> },
          { path: 'user-verify', element: <PlaceholderPage title="用户认证" /> },
          // 互动管理
          { path: 'gifts', element: <GiftManagement /> },
          { path: 'lottery', element: <LotteryManagement /> },
          // 社区统计
          { path: 'stats', element: <PlaceholderPage title="平台数据统计" /> },
          { path: 'trends', element: <PlaceholderPage title="趋势统计" /> },
        ],
      },

      // ========== 运营管理 ==========
      {
        path: 'operation',
        children: [
          // 节目管理
          { path: 'programs', element: <ProgramManagement /> },
          { path: 'program-submissions', element: <ProgramSubmission /> },
          // 活动管理
          { path: 'activity', element: <ActivityManagement /> },
          { path: 'event-orders', element: <EventRegisterList /> },
          // 合作管理
          { path: 'cooperation', element: <ZoneManagement /> },
          // 财务管理
          { path: 'orders', element: <PlaceholderPage title="订单管理" /> },
          { path: 'finance-stats', element: <PlaceholderPage title="财务统计" /> },
        ],
      },

      // 404
      { path: '*', element: <NotFound /> },
    ],
  },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
