import { Card } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import ZoneUsersList from '@/components/operation/ZoneUsersList';

/**
 * 专区用户：查看本专区用户资料，列表直接展示在页面中。
 */
const ZoneUsers = () => {
  const { user } = useAuth();

  return (
    <Card title="专区用户">
      <p style={{ color: '#666', marginBottom: 16 }}>
        查看本专区用户列表和用户资料。
      </p>
      <ZoneUsersList zoneId={user?.zoneId || ''} zoneName={user?.zoneName || ''} active />
    </Card>
  );
};

export default ZoneUsers;
