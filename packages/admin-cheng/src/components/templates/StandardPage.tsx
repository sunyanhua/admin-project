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
  /** 渲染在「创建」按钮右侧的额外操作（如「承诺书模版管理」等次级入口）。
   *  仅在 `showAddButton && onAdd` 为 true 时才会渲染——若没有添加按钮，此槽位不显示。 */
  extraAddActions?: ReactNode;
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
  extraAddActions,
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
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              {addButtonText}
            </Button>
            {extraAddActions}
          </Space>
        </div>
      )}
      {table}
    </Card>
  </>
);
