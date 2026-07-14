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

// 运营管理 — 配置管理
import CategoryManagement from '@/pages/operation/CategoryManagement';
import BannerManagement from '@/pages/system/BannerManagement';
import AgreementManagement from '@/pages/community/AgreementManagement';
import FaqManagement from '@/pages/system/FaqManagement';

// 运营管理 — 用户管理
import UserList from '@/pages/community/UserList';
import UserStats from '@/pages/community/UserStats';

// 运营管理 — 活动管理
import EventCategories from '@/pages/operation/EventCategoryManagement';
import EventList from '@/pages/operation/EventManagement';
import EventOrders from '@/pages/events/EventOrders';

// 财务管理
import PaymentRecords from '@/pages/events/PaymentRecords';
import RefundRecords from '@/pages/events/RefundRecords';
import CouponManagement from '@/pages/finance/CouponManagement';

// 占位页面（功能待开发）
import PlaceholderPage from '@/pages/PlaceholderPage';

const ProtectedLayout = () => (
  <ProtectedRoute>
    <MainLayout />
  </ProtectedRoute>
);

const router = createHashRouter([
  {
    path: '/login',
    element: <Login />,
  },
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
          { index: true, element: <Dashboard /> },
          // 管理员管理
          { path: 'roles', element: <RoleManagement /> },
          { path: 'admins', element: <AdminManagement /> },
          { path: 'admin-logs', element: <AdminLogs /> },
          // 我的账户
          { path: 'change-password', element: <ChangePassword /> },
          { path: 'my-logs', element: <MyLogs /> },
          // 访问数据统计
          { path: 'sources', element: <SourceManagement /> },
          { path: 'visits', element: <VisitStatistics /> },
          { path: 'visits/users', element: <VisitUserStats /> },
        ],
      },

      // ========== 运营管理 ==========
      {
        path: 'operation',
        children: [
          { index: true, element: <BannerManagement /> },
          // 配置管理
          { path: 'categories', element: <CategoryManagement /> },
          { path: 'banners', element: <BannerManagement /> },
          { path: 'agreements', element: <AgreementManagement /> },
          { path: 'faq', element: <FaqManagement /> },
          // 用户管理
          { path: 'users', element: <UserList /> },
          { path: 'user-stats', element: <UserStats /> },
          // 活动管理
          { path: 'event-categories', element: <EventCategories /> },
          { path: 'events', element: <EventList /> },
          { path: 'event-orders', element: <EventOrders /> },
          // 票务管理（待开发）
          { path: 'ticket-categories', element: <PlaceholderPage title="票务分类管理" /> },
          { path: 'tickets', element: <PlaceholderPage title="票务发布" /> },
          { path: 'ticket-orders', element: <PlaceholderPage title="购票信息" /> },
          // 商品管理（待开发）
          { path: 'product-categories', element: <PlaceholderPage title="商品分类管理" /> },
          { path: 'products', element: <PlaceholderPage title="商品发布" /> },
          { path: 'product-orders', element: <PlaceholderPage title="购买信息" /> },
        ],
      },

      // ========== 财务管理 ==========
      {
        path: 'finance',
        children: [
          { index: true, element: <PaymentRecords /> },
          // 财务信息
          { path: 'payments', element: <PaymentRecords /> },
          { path: 'refunds', element: <RefundRecords /> },
          { path: 'coupons', element: <CouponManagement /> },
          // 财务统计（待开发）
          { path: 'stats', element: <PlaceholderPage title="财务统计管理" /> },
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
