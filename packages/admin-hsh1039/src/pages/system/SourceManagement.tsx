import { useState, useCallback, useEffect } from 'react';
import { DatePicker, Button, Modal, Spin } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ColumnsType } from 'antd/es/table';
import { Source, sourceApi } from '@/api/services/source';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { statusSwitchColumn } from '@/components/templates/ColumnHelpers';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import SourceAddModal from '@/components/system/SourceAddModal';
import SourceEditModal from '@/components/system/SourceEditModal';

const { RangePicker } = DatePicker;

const SOURCE_STATUS = { ENABLED: 0, DISABLED: 1 } as const;

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

const STATS_COLORS = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2', '#faad14', '#f5222d'];

// ---------- 单个来源统计弹窗 ----------

interface SourceStatsModalProps {
  open: boolean;
  sourceId: number;
  sourceName: string;
  onClose: () => void;
}

const SourceStatsModal: React.FC<SourceStatsModalProps> = ({ open, sourceId, sourceName, onClose }) => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [reportKeys, setReportKeys] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    if (!dateRange || dateRange.length !== 2) return;
    setLoading(true);
    try {
      const [rRes, pRes]: [any, any] = await Promise.all([
        sourceApi.getRegisterStats({
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD'),
        }),
        sourceApi.getReportStats({
          start_date: dateRange[0].format('YYYY-MM-DD'),
          end_date: dateRange[1].format('YYYY-MM-DD'),
        }),
      ]);
      const regData: any[] = Array.isArray(rRes?.data) ? rRes.data : (Array.isArray(rRes) ? rRes : rRes?.list || []);
      const repData: any[] = Array.isArray(pRes?.data) ? pRes.data : (Array.isArray(pRes) ? pRes : pRes?.list || []);

      // 按日期合并，数据中 source_name 或 source_id 匹配当前来源
      const dateMap = new Map<string, any>();
      for (const item of regData) {
        const match = (item.source_name && item.source_name === sourceName)
          || (item.source_id && String(item.source_id) === String(sourceId));
        if (!match) continue;
        const d = item.ref_date || item.date || '';
        if (!d) continue;
        const entry = dateMap.get(d) || {};
        entry.date = d;
        for (const [k, v] of Object.entries(item)) {
          if (!['ref_date', 'date', 'source_name', 'source_id'].includes(k) && typeof v === 'number') {
            entry[`注册_${k}`] = v;
          }
        }
        dateMap.set(d, entry);
      }
      for (const item of repData) {
        const match = (item.source_name && item.source_name === sourceName)
          || (item.source_id && String(item.source_id) === String(sourceId));
        if (!match) continue;
        const d = item.ref_date || item.date || '';
        if (!d) continue;
        const entry = dateMap.get(d) || {};
        entry.date = d;
        for (const [k, v] of Object.entries(item)) {
          if (!['ref_date', 'date', 'source_name', 'source_id'].includes(k) && typeof v === 'number') {
            entry[`上报_${k}`] = v;
          }
        }
        dateMap.set(d, entry);
      }

      const sorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      setChartData(sorted);

      // 提取所有数据 key
      const keys = new Set<string>();
      for (const item of sorted) {
        for (const k of Object.keys(item)) {
          if (k !== 'date' && typeof item[k] === 'number') keys.add(k);
        }
      }
      setReportKeys([...keys]);
    } catch {
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange, sourceId, sourceName]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  return (
    <Modal
      title={`${sourceName} — 数据统计`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <div style={{ marginBottom: 16 }}>
        <RangePicker
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates.length === 2) {
              setDateRange([dates[0] as Dayjs, dates[1] as Dayjs]);
            }
          }}
        />
      </div>
      <Spin spinning={loading}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              {reportKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={STATS_COLORS[i % STATS_COLORS.length]} strokeWidth={2} dot={false} name={key} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ color: '#999', textAlign: 'center', padding: 48 }}>暂无数据</div>
        )}
      </Spin>
    </Modal>
  );
};

// ---------- 主页 ----------

const SourceManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const { success, error: showError } = useAppNotification();

  // 单个来源统计弹窗
  const [statsSourceId, setStatsSourceId] = useState(0);
  const [statsSourceName, setStatsSourceName] = useState('');
  const [statsModalOpen, setStatsModalOpen] = useState(false);

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

  const handleStatusToggle = async (record: Source, checked: boolean) => {
    try {
      await sourceApi.updateSource(record.id, { status: checked ? SOURCE_STATUS.ENABLED : SOURCE_STATUS.DISABLED });
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.message || '状态更新失败');
    }
  };

  const openStats = (record: Source) => {
    setStatsSourceId(record.id);
    setStatsSourceName(record.name);
    setStatsModalOpen(true);
  };

  const columns: ColumnsType<Source> = [
    {
      title: '来源名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <div style={{ wordBreak: 'break-word' }}>{text}</div>,
    },
    {
      title: '点击次数',
      key: 'reportCount',
      width: 90,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => openStats(record)}>
          {record.report_total ?? record.reported_total ?? 0}
        </Button>
      ),
    },
    {
      title: '注册人数',
      key: 'registerCount',
      width: 90,
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => openStats(record)}>
          {record.user_total ?? record.register_total ?? 0}
        </Button>
      ),
    },
    statusSwitchColumn<Source>('status', SOURCE_STATUS.ENABLED, SOURCE_STATUS.DISABLED, handleStatusToggle),
    ActionColumn({
      onEdit: (record) => { setSelectedSource(record); setEditModalVisible(true); },
      onDelete: (record) => confirmDelete({ name: record.name, deleteFn: () => sourceApi.deleteSource(record.id), onSuccess: refresh }),
      showView: false,
    }),
  ];

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };
  const handleSearch = (vals: Record<string, any>) => { search(vals); };
  const handleReset = () => { setValues({}); search({}); };

  return (
    <>
      <StandardPage
        title="来源管理"
        description="管理平台的访问与注册来源，查看来源注册与上报数据统计。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        onAdd={() => setAddModalVisible(true)}
        addButtonText="添加来源"
        searchArea={
          <SearchPanel filters={filters} values={values} onChange={handleChange} onSearch={handleSearch} onReset={handleReset} />
        }
        table={
          <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} scroll={{ x: 700 }} />
        }
      />

      <SourceAddModal visible={addModalVisible} onClose={() => setAddModalVisible(false)} onSuccess={refresh} />
      <SourceEditModal visible={editModalVisible} onClose={() => { setEditModalVisible(false); setSelectedSource(null); }} source={selectedSource} onSuccess={refresh} />

      <SourceStatsModal
        open={statsModalOpen}
        sourceId={statsSourceId}
        sourceName={statsSourceName}
        onClose={() => setStatsModalOpen(false)}
      />
    </>
  );
};

export default SourceManagement;
