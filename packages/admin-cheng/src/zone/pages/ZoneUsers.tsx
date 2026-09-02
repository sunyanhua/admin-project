import { useState } from 'react';
import { Button, Card } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import ZoneUsersModal from '@/components/operation/ZoneUsersModal';

/**
 * 专区用户：查看本专区用户资料（复用主后台 ZoneUsersModal，仅绑定本专区）。
 */
const ZoneUsers = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <Card title="专区用户">
        <p style={{ color: '#666', marginBottom: 16 }}>
          查看本专区用户列表和用户资料。
        </p>
        <Button type="primary" icon={<TeamOutlined />} onClick={() => setVisible(true)}>
          打开用户列表
        </Button>
      </Card>

      <ZoneUsersModal
        visible={visible}
        zoneId={user?.zoneId || ''}
        zoneName={user?.zoneName || ''}
        onClose={() => setVisible(false)}
      />
    </div>
  );
};

export default ZoneUsers;
