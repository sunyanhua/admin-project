import { useState, useCallback, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag } from 'antd';
import { EditOutlined, GiftOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PoolTypeLabels } from '@shared/constants';
import { lotteryApi, Pool, UserPrize } from '@/api/services/lottery';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { statusSwitchColumn } from '@/components/templates/ColumnHelpers';
import PoolEditModal from '@/components/community/PoolEditModal';
import PrizeManageModal from '@/components/community/PrizeManageModal';
import WinnerListModal from '@/components/community/WinnerListModal';
const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

const LotteryManagement = () => {
  const { success, error: showError } = useAppNotification();

  // 奖池
  const [poolModalVisible, setPoolModalVisible] = useState(false);
  const [poolEditMode, setPoolEditMode] = useState<'create' | 'edit'>('create');
  const [editingPool, setEditingPool] = useState<Pool | null>(null);
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  // 奖品管理弹窗
  const [prizeModalVisible, setPrizeModalVisible] = useState(false);
  const [prizeModalPoolId, setPrizeModalPoolId] = useState('');
  const [prizeModalPoolName, setPrizeModalPoolName] = useState('');

  // 中奖名单弹窗
  const [winnerModalVisible, setWinnerModalVisible] = useState(false);
  const [winnerModalPoolId, setWinnerModalPoolId] = useState('');
  const [winnerModalPoolName, setWinnerModalPoolName] = useState('');

  // 中奖人数缓存
  const [winnerCounts, setWinnerCounts] = useState<Record<string, number>>({});

  const fetchPools = useCallback(async (params: any) => {
    return lotteryApi.getPools({
      page: params.page, size: params.page_size,
      status: params.status, keyword: params.keyword,
    });
  }, []);

  const formatPoolResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    return { list, count: Array.isArray(res) ? res.length : (res?.total ?? 0) };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Pool>({
    fetchFn: fetchPools, formatResponse: formatPoolResponse,
  });

  // 加载各奖池中奖人数
  useEffect(() => {
    lotteryApi.getUserPrizes({ page: 1, size: 100 }).then((res: any) => {
      const list: UserPrize[] = Array.isArray(res) ? res : (res?.list || []);
      const counts: Record<string, number> = {};
      for (const up of list) {
        if (up.pool_id) counts[up.pool_id] = (counts[up.pool_id] || 0) + 1;
      }
      setWinnerCounts(counts);
    }).catch(() => {});
  }, [data]);

  const handleSearchChange = (name: string, value: any) => setSearchValues(p => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleStatusToggle = async (r: Pool, checked: boolean) => {
    try { await lotteryApi.togglePoolStatus(r.id, checked ? 0 : 1); success('状态更新成功'); refresh(); }
    catch (e: any) { showError(e?.response?.data?.message || '状态更新失败'); }
  };

  const handleAdd = () => { setPoolEditMode('create'); setEditingPool(null); setPoolModalVisible(true); };
  const handleEdit = (r: Pool) => { setPoolEditMode('edit'); setEditingPool(r); setPoolModalVisible(true); };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
    { name: 'keyword', placeholder: '搜索奖池名称', type: 'input' },
  ];

  const columns: ColumnsType<Pool> = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (t: string) => <span style={{ wordBreak: 'break-word' }}>{t}</span> },
    {
      title: '类型', dataIndex: 'pool_type', key: 'pool_type', width: 90,
      render: (v: number) => <Tag title={PoolTypeLabels[v]}>{PoolTypeLabels[v] ?? v}</Tag>,
    },
    {
      title: '中奖人数', key: 'winners', width: 140,
      render: (_: any, r: Pool) => {
        const count = winnerCounts[r.id] || 0;
        if (count > 0) {
          return <span>{count} 人 <a onClick={() => { setWinnerModalPoolId(r.id); setWinnerModalPoolName(r.name); setWinnerModalVisible(true); }}>[名单]</a></span>;
        }
        return '0 人';
      },
    },
    {
      title: '有效时间',
      key: 'time',
      width: 120,
      render: (_: any, r: Pool) => {
        const fmt = (s?: string) => s ? s.substring(0, 16).replace('T', ' ') : '-';
        return (
          <div style={{ lineHeight: 1.6, fontSize: 12 }}>
            <div>{fmt(r.start_time)}</div>
            <div>{fmt(r.end_time)}</div>
          </div>
        );
      },
    },
    statusSwitchColumn<Pool>('status', 0, 1, handleStatusToggle, '启用', '禁用', 100),
    { title: '操作', key: 'action', width: 180, fixed: 'right' as const,
      render: (_: any, r: Pool) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<GiftOutlined />}
            onClick={() => { setPrizeModalPoolId(r.id); setPrizeModalPoolName(r.name); setPrizeModalVisible(true); }}>奖品</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}
            onClick={() => confirmDelete({
              name: r.name,
              deleteFn: () => lotteryApi.deletePool(r.id),
              onSuccess: refresh,
            })}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <StandardPage
        title="抽奖管理"
        description="管理抽奖奖池，配置奖品投放并查看用户中奖记录。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="创建奖池"
        searchArea={
          <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        }
        table={
          <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
        }
      />

      <PoolEditModal visible={poolModalVisible} mode={poolEditMode} pool={editingPool}
        onClose={() => setPoolModalVisible(false)} onSuccess={refresh} />

      <PrizeManageModal visible={prizeModalVisible} poolId={prizeModalPoolId} poolName={prizeModalPoolName}
        onClose={() => setPrizeModalVisible(false)} />

      <WinnerListModal visible={winnerModalVisible} poolId={winnerModalPoolId} poolName={winnerModalPoolName}
        onClose={() => setWinnerModalVisible(false)} />
    </>
  );
};

export default LotteryManagement;
