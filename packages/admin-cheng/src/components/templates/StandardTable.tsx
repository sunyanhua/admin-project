import { Table, Empty, Grid, Flex, Select, Pagination } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import type { ColumnsType } from 'antd/es/table';

const { useBreakpoint } = Grid;

export interface StandardTableProps<T = any> {
  columns: ColumnsType<T>;
  dataSource: T[];
  loading?: boolean;
  pagination?: TablePaginationConfig | false;
  onPageChange?: (page: number, pageSize: number) => void;
  rowKey?: string | ((record: T) => string);
  scroll?: { x?: number | string; y?: number | string };
}

export const StandardTable: React.FC<StandardTableProps> = ({
  columns,
  dataSource,
  loading = false,
  pagination,
  onPageChange,
  rowKey = 'id',
  scroll,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const handleSizeChange = (value: number) => {
    if (onPageChange && pagination) {
      onPageChange(1, value);
    }
  };

  return (
    <div>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        loading={loading}
        pagination={false}
        scroll={scroll ?? (isMobile ? { x: 800 } : undefined)}
        size={isMobile ? 'small' : 'middle'}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" /> }}
      />
      {pagination && (
        <Flex justify="space-between" align="center" style={{ padding: '8px 0' }}>
          <Select
            value={pagination.pageSize || 10}
            onChange={handleSizeChange}
            options={[
              { label: '10条/页', value: 10 },
              { label: '20条/页', value: 20 },
              { label: '50条/页', value: 50 },
              { label: '100条/页', value: 100 },
            ]}
            style={{ width: 120 }}
          />
          <Flex gap={12} align="center">
            <span style={{ color: '#666', fontSize: 14 }}>
              共 {pagination.total || 0} 条
            </span>
            <Pagination
              current={pagination.current || 1}
              pageSize={pagination.pageSize || 10}
              total={pagination.total || 0}
              onChange={(page, pageSize) => {
                if (onPageChange) {
                  onPageChange(page, pageSize);
                }
              }}
              hideOnSinglePage
              showSizeChanger={false}
            />
          </Flex>
        </Flex>
      )}
    </div>
  );
};
