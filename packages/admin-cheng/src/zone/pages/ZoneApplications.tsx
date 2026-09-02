import { useState } from 'react';
import { Button, Card } from 'antd';
import { AuditOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import ZoneVerifyModal from '@/components/operation/ZoneVerifyModal';

/**
 * 申请审核：审核用户提交的加入本专区申请（复用主后台 ZoneVerifyModal，仅绑定本专区）。
 */
const ZoneApplications = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <Card title="申请审核">
        <p style={{ color: '#666', marginBottom: 16 }}>
          审核用户提交的加入本专区申请，支持通过、拒绝和撤销审核操作。
        </p>
        <Button type="primary" icon={<AuditOutlined />} onClick={() => setVisible(true)}>
          打开审核列表
        </Button>
      </Card>

      <ZoneVerifyModal
        visible={visible}
        zoneId={user?.zoneId || ''}
        zoneName={user?.zoneName || ''}
        onClose={() => setVisible(false)}
      />
    </div>
  );
};

export default ZoneApplications;
