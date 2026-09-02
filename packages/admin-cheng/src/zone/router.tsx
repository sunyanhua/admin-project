import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom';
import ZoneGate from './components/ZoneGate';
import ZoneLayout from './components/ZoneLayout';
import ZoneLogin from './pages/Login';
import ZoneInfo from './pages/ZoneInfo';
import ZoneApplications from './pages/ZoneApplications';
import ZoneUsers from './pages/ZoneUsers';
import ZoneActivities from './pages/ZoneActivities';
import ChangePassword from './pages/ChangePassword';

/**
 * 专区管理后台路由（hash）：
 * #/login 登录 → ZoneGate（登录 + 已绑定专区校验）→ 5 个页面
 */
const router = createHashRouter([
  { path: '/login', element: <ZoneLogin /> },
  {
    path: '/',
    element: (
      <ZoneGate>
        <ZoneLayout />
      </ZoneGate>
    ),
    children: [
      { index: true, element: <ZoneInfo /> },
      { path: 'applications', element: <ZoneApplications /> },
      { path: 'users', element: <ZoneUsers /> },
      { path: 'activities', element: <ZoneActivities /> },
      { path: 'change-password', element: <ChangePassword /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

const ZoneRouter = () => {
  return <RouterProvider router={router} />;
};

export default ZoneRouter;
