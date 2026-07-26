import { ReactNode } from 'react';
import { Card, Typography, Space } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button } from 'antd';

const { Title } = Typography;

export interface StandardPageProps {
  title: string;
  description?: string;
  searchArea?: ReactNode;
  extraActions?: ReactNode;
  table: ReactNode;
  showAddButton?: boolean;
  onAdd?: () => void;
  addButtonText?: string;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  refreshButtonText?: string;
}

export const StandardPage: React.FC<StandardPageProps> = ({
  title,
  description,
  searchArea,
  extraActions,
  table,
  showAddButton = false,
  onAdd,
  addButtonText = '添加',
  showRefreshButton = false,
  onRefresh,
  refreshButtonText = '刷新',
}) => (
  <>
    <Title level={2}>{title}</Title>
    {description && <p style={{ color: '#666', marginBottom: 24 }}>{description}</p>}

    {searchArea && (
      <Card style={{ marginBottom: 16 }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>{searchArea}</Space>
          <Space>
            {showRefreshButton && onRefresh && (
              <Button icon={<ReloadOutlined />} onClick={onRefresh}>
                {refreshButtonText}
              </Button>
            )}
            {extraActions}
          </Space>
        </Space>
      </Card>
    )}

    <Card>
      {showAddButton && onAdd && (
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
            {addButtonText}
          </Button>
        </div>
      )}
      {table}
    </Card>
  </>
);
