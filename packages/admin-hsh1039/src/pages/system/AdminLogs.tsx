import { useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '@/api/services/admin';
import { formatDateTime } from '@/utils/format';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';

interface LogItem {
  id: number;
  name: string;
  data: string;
  ip: string;
  tick: string;
}

const filters: FilterConfig[] = [
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

const AdminLogs = () => {
  const [values, setValues] = useState<Record<string, any>>({});

  const fetchLogs = useCallback(async (params: any) => {
    return adminApi.getLogs(params);
  }, []);

  const formatLogsResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total || 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<LogItem>({
    fetchFn: fetchLogs,
    formatResponse: formatLogsResponse,
  });

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  const handleReset = () => {
    setValues({});
    search({});
  };

  const columns: ColumnsType<LogItem> = [
    {
      title: '管理员',
      dataIndex: 'admin_name',
      key: 'admin_name',
    },
    {
      title: '操作内容',
      dataIndex: 'summary',
      key: 'summary',
      render: (summary: string) => <span style={{ color: '#666' }}>{summary}</span>,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (created_at: string) => formatDateTime(created_at),
    },
  ];

  return (
    <StandardPage
      title="管理日志"
      description="查看系统管理员的操作记录。"
      showRefreshButton={true}
      onRefresh={refresh}
      searchArea={
        <SearchPanel
          filters={filters}
          values={values}
          onChange={handleChange}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      }
      table={
        <StandardTable
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={pagination}
          onPageChange={onPageChange}
        />
      }
    />
  );
};

export default AdminLogs;
