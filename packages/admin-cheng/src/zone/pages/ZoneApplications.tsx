import { Card } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import ZoneVerifyList from '@/components/operation/ZoneVerifyList';

/**
 * 申请审核：审核用户提交的加入本专区申请，列表直接展示在页面中。
 */
const ZoneApplications = () => {
  const { user } = useAuth();

  return (
    <Card title="申请审核">
      <p style={{ color: '#666', marginBottom: 16 }}>
        审核用户提交的加入本专区申请，支持通过、拒绝和撤销审核操作。
      </p>
      <ZoneVerifyList zoneId={user?.zoneId || ''} zoneName={user?.zoneName || ''} active />
    </Card>
  );
};

export default ZoneApplications;
