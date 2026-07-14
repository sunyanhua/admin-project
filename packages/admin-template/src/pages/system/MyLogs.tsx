import { useState, useCallback } from 'react';
import { Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { authApi } from '@/api/services/auth';
import { formatDateTime } from '@/utils/format';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';

const { Title } = Typography;

interface LogItem {
  id: number;
  name: string;
  data: string;
  ip: string;
  tick: string;
}

const filters: FilterConfig[] = [
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
];

const MyLogs = () => {
  const [values, setValues] = useState<Record<string, any>>({});

  const fetchLogs = useCallback(async (params: any) => {
    return authApi.getMyLogs(params);
  }, []);

  const formatLogsResponse = useCallback((res: any) => ({
    list: res?.data || [],
    count: res?.count || 0,
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
      title: '操作内容',
      dataIndex: 'data',
      key: 'data',
      render: (data: string) => <span style={{ color: '#666' }}>{data}</span>,
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
    },
    {
      title: '时间',
      dataIndex: 'tick',
      key: 'tick',
      width: 180,
      render: (tick: string) => formatDateTime(tick),
    },
  ];

  return (
    <StandardPage
      title="我的日志"
      description="查看您的登录记录。"
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

export default MyLogs;
