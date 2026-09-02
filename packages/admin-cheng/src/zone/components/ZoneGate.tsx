import { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import { useAuth } from '@/contexts/AuthContext';

interface ZoneGateProps {
  children: ReactNode;
}

/**
 * 专区管理后台门槛：登录校验 + 专区绑定校验。
 * 账号 profile 无 zone_id（未绑定专区的普通/超级管理员）→ 403 提示 + 退出登录。
 */
const ZoneGate = ({ children }: ZoneGateProps) => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!user?.zoneId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Result
          status="403"
          title="当前账号未绑定专区"
          subTitle={`账号「${user?.username || ''}」不是专区管理员，无法使用专区管理后台`}
          extra={
            <Button type="primary" onClick={async () => { await logout(); navigate('/login'); }}>
              退出登录
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
};

export default ZoneGate;
