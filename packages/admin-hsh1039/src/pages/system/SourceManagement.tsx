import { useState, useCallback, useEffect } from 'react';
import { Switch, Typography, Card, Row, Col, DatePicker, Space } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import { Source, sourceApi } from '@/api/services/source';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import SourceAddModal from '@/components/system/SourceAddModal';
import SourceEditModal from '@/components/system/SourceEditModal';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const SOURCE_STATUS = { ENABLED: 0, DISABLED: 1 } as const;

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

interface StatsItem {
  ref_date: string;
  [key: string]: any;
}

const STATS_COLORS = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2', '#faad14', '#f5222d'];

const SourceManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const { success, error: showError } = useAppNotification();

  // 统计
  const [statsDateRange, setStatsDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'), dayjs(),
  ]);
  const [registerStats, setRegisterStats] = useState<StatsItem[]>([]);
  const [reportStats, setReportStats] = useState<StatsItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchSources = useCallback(async (params: any) => {
    return sourceApi.getSources(params);
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Source>({
    fetchFn: fetchSources,
    formatResponse,
  });

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [rRes, pRes]: [any, any] = await Promise.all([
        sourceApi.getRegisterStats({
          start_date: statsDateRange[0].format('YYYY-MM-DD'),
          end_date: statsDateRange[1].format('YYYY-MM-DD'),
        }),
        sourceApi.getReportStats({
          start_date: statsDateRange[0].format('YYYY-MM-DD'),
          end_date: statsDateRange[1].format('YYYY-MM-DD'),
        }),
      ]);
      setRegisterStats(Array.isArray(rRes?.data) ? rRes.data : (rRes?.list || []));
      setReportStats(Array.isArray(pRes?.data) ? pRes.data : (pRes?.list || []));
    } catch {
      setRegisterStats([]);
      setReportStats([]);
    } finally {
      setStatsLoading(false);
    }
  }, [statsDateRange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleStatusToggle = async (record: Source, checked: boolean) => {
    try {
      await sourceApi.updateSource(record.id, { status: checked ? SOURCE_STATUS.ENABLED : SOURCE_STATUS.DISABLED });
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.message || '状态更新失败');
    }
  };

  const columns: ColumnsType<Source> = [
    {
      title: '来源名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <div style={{ wordBreak: 'break-word' }}>{text}</div>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: Source) => (
        <Switch
          checked={status === SOURCE_STATUS.ENABLED}
          onChange={(checked) => handleStatusToggle(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    ActionColumn({
      onEdit: (record) => {
        setSelectedSource(record);
        setEditModalVisible(true);
      },
      onDelete: (record) => confirmDelete({
        name: record.name,
        deleteFn: () => sourceApi.deleteSource(record.id),
        onSuccess: refresh,
      }),
      showView: false,
    }),
  ];

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

  // 构建图表数据：按日期合并 register + report
  const buildChartData = () => {
    const dateMap = new Map<string, { date: string; [key: string]: any }>();

    for (const item of registerStats) {
      const d = item.ref_date || item.date || '';
      if (!d) continue;
      const entry = dateMap.get(d) || { date: d };
      for (const [k, v] of Object.entries(item)) {
        if (k !== 'ref_date' && k !== 'date' && typeof v === 'number') {
          entry[`${k}`] = v;
        }
      }
      dateMap.set(d, entry);
    }

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const chartData = buildChartData();

  // 从 registerStats 提取所有 key 作为 line series
  const registerKeys = new Set<string>();
  for (const item of registerStats) {
    for (const k of Object.keys(item)) {
      if (k !== 'ref_date' && k !== 'date' && typeof item[k] === 'number') registerKeys.add(k);
    }
  }

  return (
    <>
      <StandardPage
        title="来源管理"
        description="管理平台的访问与注册来源，查看来源注册与上报数据统计。"
        showRefreshButton
        onRefresh={() => { refresh(); fetchStats(); }}
        showAddButton
        onAdd={() => setAddModalVisible(true)}
        addButtonText="添加来源"
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
            scroll={{ x: 600 }}
          />
        }
      />

      {/* 来源统计 */}
      <Card
        title="来源数据统计"
        loading={statsLoading}
        style={{ marginTop: 24 }}
        extra={
          <RangePicker
            value={statsDateRange}
            onChange={(dates) => {
              if (dates && dates.length === 2) {
                setStatsDateRange([dates[0] as Dayjs, dates[1] as Dayjs]);
              }
            }}
          />
        }
      >
        {chartData.length > 0 ? (
          <>
            {registerKeys.size > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>注册用户（按来源）</div>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    {[...registerKeys].map((key, i) => (
                      <Line key={key} type="monotone" dataKey={key} stroke={STATS_COLORS[i % STATS_COLORS.length]} strokeWidth={2} dot={false} name={key} />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : (
          <div style={{ color: '#999', textAlign: 'center', padding: 24 }}>选择日期范围查看来源注册与上报统计</div>
        )}
      </Card>

      <SourceAddModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} onSuccess={refresh} />
      <SourceEditModal visible={editModalVisible} onClose={() => { setEditModalVisible(false); setSelectedSource(null); }} source={selectedSource} onSuccess={refresh} />
    </>
  );
};

export default SourceManagement;
