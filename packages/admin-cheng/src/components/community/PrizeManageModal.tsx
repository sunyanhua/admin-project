import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag } from 'antd';
import { SendOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PrizeTypeLabels, PrizeTypeColors } from '@shared/constants';
import { lotteryApi, Prize } from '@/api/services/lottery';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { statusSwitchColumn } from '@/components/templates/ColumnHelpers';
import ScrollableModal from '@/components/templates/ScrollableModal';
import PrizeEditModal from '@/components/community/PrizeEditModal';
import PrizeDeployModal from '@/components/community/PrizeDeployModal';

interface PrizeManageModalProps {
  visible: boolean;
  poolId: string;
  poolName: string;
  poolStartTime?: string;
  poolEndTime?: string;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

const PrizeManageModal: React.FC<PrizeManageModalProps> = ({ visible, poolId, poolName, poolStartTime, poolEndTime, onClose }) => {
  const { success, error: showError } = useAppNotification();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [deployModalVisible, setDeployModalVisible] = useState(false);
  const [deployingPrize, setDeployingPrize] = useState<Prize | null>(null);
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchPrizes = useCallback(async (params: any) => {
    if (!poolId) return { list: [], total: 0 };
    return lotteryApi.getPrizes(poolId, {
      page: params.page, size: params.page_size,
      status: params.status, keyword: params.keyword,
    });
  }, [poolId]);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    return { list, count: Array.isArray(res) ? res.length : (res?.total ?? 0) };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Prize>({
    fetchFn: fetchPrizes, formatResponse, dependencies: [poolId],
  });

  // 弹窗打开或奖池切换时重新拉取
  const prevKeyRef = useRef('');
  useEffect(() => {
    const key = `${visible}-${poolId}`;
    if (visible && poolId && key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      search({ _t: Date.now() });
    }
  }, [visible, poolId, search]);

  const handleSearchChange = (name: string, value: any) => setSearchValues(p => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleStatusToggle = async (r: Prize, checked: boolean) => {
    try { await lotteryApi.togglePrizeStatus(r.id, checked ? 0 : 1); success('状态更新'); refresh(); }
    catch (e: any) { showError(e?.response?.data?.message || '状态更新失败'); }
  };

  const handleAdd = () => { setEditingPrize(null); setEditModalVisible(true); };
  const handleDeploy = (r: Prize) => { setDeployingPrize(r); setDeployModalVisible(true); };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
    { name: 'keyword', placeholder: '搜索奖品名称', type: 'input' },
  ];

  const columns: ColumnsType<Prize> = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (t: string) => <span style={{ wordBreak: 'break-word' }}>{t}</span> },
    { title: '类型', dataIndex: 'prize_type', key: 'prize_type', width: 80,
      render: (v: number) => <Tag color={PrizeTypeColors[v] || 'default'} title={PrizeTypeLabels[v]}>{PrizeTypeLabels[v] ?? v}</Tag> },
    { title: '总量', dataIndex: 'total_count', key: 'total_count', width: 70 },
    { title: '余量', key: 'remaining', width: 70,
      render: (_: any, r: Prize) => (r.total_count ?? 0) - (r.used_count ?? 0) },
    statusSwitchColumn<Prize>('status', 0, 1, handleStatusToggle, '启用', '禁用', 100),
    { title: '操作', key: 'action', width: 90, fixed: 'right' as const,
      render: (_: any, r: Prize) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleDeploy(r)}>投放</Button>
        </Space>
      ),
    },
  ];

  return (
    <ScrollableModal
      title={`奖品管理 - ${poolName}`}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={false}
    >
      <div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
            <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ marginTop: 8 }}>添加奖品</Button>
        </div>
        <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
      </div>

      <PrizeEditModal visible={editModalVisible} mode="create" poolId={poolId} prize={editingPrize}
        onClose={() => setEditModalVisible(false)} onSuccess={refresh} />
      <PrizeDeployModal visible={deployModalVisible} prize={deployingPrize}
        poolStartTime={poolStartTime} poolEndTime={poolEndTime}
        onClose={() => setDeployModalVisible(false)} onSuccess={refresh} />
    </ScrollableModal>
  );
};

export default PrizeManageModal;
