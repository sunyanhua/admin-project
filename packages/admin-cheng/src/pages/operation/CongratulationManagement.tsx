import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag, Tabs, Switch, Image, InputNumber } from 'antd';
import { EyeOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { GiftStatus, CongratulationStatus, CongratulationStatusLabels, CongratulationStatusColors } from '@shared/constants';
import { getAvatarUrl, getSmallUrl } from '@/utils/imageUtils';
import UserAvatar from '@/components/user/UserAvatar';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import { congratulationApi, AdminCongratulationItem, CongratulationGiftItem } from '@/api/services/congratulation';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import CongratulationDetailModal from '@/components/operation/CongratulationDetailModal';
import CongratulationGiftModal from '@/components/operation/CongratulationGiftModal';

// ======================== 报喜信息管理 ========================

const CONGRATS_FILTERS: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select',
    options: [
      { label: '已提交', value: CongratulationStatus.SUBMITTED },
      { label: '已通过', value: CongratulationStatus.APPROVED },
      { label: '未通过', value: CongratulationStatus.REJECTED },
    ],
  },
  { name: 'hidden', placeholder: '全部隐藏状态', type: 'select',
    options: [
      { label: '未隐藏', value: 0 },
      { label: '已隐藏', value: 1 },
    ],
  },
  { name: 'keyword', placeholder: '搜索双方昵称', type: 'input' },
];

const CongratulationListTab: React.FC<{ onRefreshRef: (fn: () => void) => void }> = ({ onRefreshRef }) => {
  const { success, error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailId, setDetailId] = useState('');
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState('');

  const fetchList = useCallback(async (params: any) => {
    return congratulationApi.getList({
      page: params.page, size: params.page_size,
      status: params.status,
      hidden: params.hidden,
      keyword: params.keyword || undefined,
    });
  }, []);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<AdminCongratulationItem>({
    fetchFn: fetchList,
    formatResponse,
  });

  onRefreshRef(refresh);

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleToggleHidden = async (record: AdminCongratulationItem, hidden: boolean) => {
    try {
      await congratulationApi.setHidden(record.id, hidden);
      success(hidden ? '已隐藏' : '已取消隐藏');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '操作失败');
    }
  };

  const handleRevoke = (record: AdminCongratulationItem) => {
    confirmDelete({
      name: `「${record.male_nickname || '-'} × ${record.female_nickname || '-'}」的报喜`,
      content: '撤销后 C 端与管理后台均不可见，并清除双方脱单档案的报喜标记；已收到的随份子记录保留。',
      deleteFn: () => congratulationApi.revoke(record.id),
      onSuccess: refresh,
    });
  };

  const columns: ColumnsType<AdminCongratulationItem> = [
    {
      title: '男方', key: 'male', width: 150,
      render: (_: any, r: AdminCongratulationItem) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }}
          onClick={() => { setUserDetailUserId(r.male_id || ''); setUserDetailVisible(true); }}>
          <Space size={4}>
            <UserAvatar src={r.male_avatar} nick={r.male_nickname || '-'} />
            <span style={{ fontSize: 14 }}>{r.male_nickname || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '女方', key: 'female', width: 150,
      render: (_: any, r: AdminCongratulationItem) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }}
          onClick={() => { setUserDetailUserId(r.female_id || ''); setUserDetailVisible(true); }}>
          <Space size={4}>
            <UserAvatar src={r.female_avatar} nick={r.female_nickname || '-'} />
            <span style={{ fontSize: 14 }}>{r.female_nickname || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v: number) => <Tag color={CongratulationStatusColors[v] || 'default'} title={CongratulationStatusLabels[v]}>{CongratulationStatusLabels[v] ?? v}</Tag>,
    },
    {
      title: '提交人', dataIndex: 'submitter_nickname', key: 'submitter', width: 140,
      render: (v: string) => v || <span style={{ color: '#999' }}>-</span>,
    },
    dateTimeColumn<AdminCongratulationItem>('created_at', '提交时间'),
    {
      title: '官方随份子', key: 'gift', width: 110,
      render: (_: any, r: AdminCongratulationItem) => (r.is_official_gift ? `¥${((r.gift_amount ?? 0) / 100).toFixed(2)}` : <span style={{ color: '#999' }}>-</span>),
    },
    {
      title: '隐藏', key: 'hidden', width: 100,
      render: (_: any, r: AdminCongratulationItem) => (
        <Switch
          checked={!r.is_hidden}
          checkedChildren="显示"
          unCheckedChildren="隐藏"
          onChange={(checked) => handleToggleHidden(r, !checked)}
        />
      ),
    },
    {
      title: '操作', key: 'action', width: 160, fixed: 'right' as const,
      render: (_: any, r: AdminCongratulationItem) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => { setDetailId(r.id); setDetailVisible(true); }}>
            {r.status === CongratulationStatus.SUBMITTED ? '审核' : '详情'}
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleRevoke(r)}>
            撤销
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SearchPanel filters={CONGRATS_FILTERS} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        <Button icon={<ReloadOutlined />} style={{ marginLeft: 12, flexShrink: 0 }} onClick={refresh}>刷新</Button>
      </div>
      <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
      <CongratulationDetailModal
        visible={detailVisible}
        congratulationId={detailId}
        onClose={() => { setDetailVisible(false); setDetailId(''); }}
        onSuccess={refresh}
      />

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />
    </div>
  );
};

// ======================== 礼物管理 ========================

const GIFT_FILTERS: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select',
    options: [
      { label: '启用', value: GiftStatus.ENABLED },
      { label: '停用', value: GiftStatus.DISABLED },
    ],
  },
  { name: 'keyword', placeholder: '搜索礼物名称', type: 'input' },
];

const CongratulationGiftTab: React.FC<{ onRefreshRef: (fn: () => void) => void }> = ({ onRefreshRef }) => {
  const { success, error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingGift, setEditingGift] = useState<CongratulationGiftItem | null>(null);

  const fetchGifts = useCallback(async (params: any) => {
    return congratulationApi.getGifts({
      page: params.page, size: params.page_size,
      status: params.status,
      keyword: params.keyword || undefined,
    });
  }, []);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<CongratulationGiftItem>({
    fetchFn: fetchGifts,
    formatResponse,
  });

  onRefreshRef(refresh);

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleToggleStatus = async (record: CongratulationGiftItem, enabled: boolean) => {
    try {
      await congratulationApi.toggleGiftStatus(record.id, enabled ? GiftStatus.ENABLED : GiftStatus.DISABLED);
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  const handleSortChange = async (record: CongratulationGiftItem, value: number | null) => {
    if (value == null) return;
    try {
      await congratulationApi.updateGift(record.id, { sort_order: value });
      success('排序已更新');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '排序更新失败');
    }
  };

  const handleDelete = (record: CongratulationGiftItem) => {
    confirmDelete({
      name: record.name,
      content: '删除后不可购买，已购随份子使用快照展示不受影响。',
      deleteFn: () => congratulationApi.deleteGift(record.id),
      onSuccess: refresh,
    });
  };

  const columns: ColumnsType<CongratulationGiftItem> = [
    {
      title: '图片', dataIndex: 'image', key: 'image', width: 80,
      render: (url: string) => (
        url
          ? <Image src={getSmallUrl(url)} alt="gift" preview={{ src: url }} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
          : <span style={{ color: '#999' }}>-</span>
      ),
    },
    {
      title: '名称', dataIndex: 'name', key: 'name',
      render: (text: string) => <span style={{ wordBreak: 'break-word' }}>{text}</span>,
    },
    {
      title: '金币价格', dataIndex: 'price_coins', key: 'price_coins', width: 90,
      render: (v: number) => (v != null ? `${v}${v === 0 ? '（免费）' : ''}` : '-'),
    },
    {
      title: '可购买窗口', key: 'valid', width: 120,
      render: (_: any, r: CongratulationGiftItem) => (
        <div style={{ fontSize: 12, lineHeight: 1.6, color: '#666' }}>
          <div>{r.valid_from || '不限'}</div>
          <div>~ {r.valid_to || '不限'}</div>
        </div>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: number, r: CongratulationGiftItem) => (
        <Switch
          checked={v === GiftStatus.ENABLED}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={(checked) => handleToggleStatus(r, checked)}
        />
      ),
    },
    {
      title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 120,
      render: (v: number | null | undefined, r: CongratulationGiftItem) => (
        <InputNumber
          min={0}
          precision={0}
          value={v ?? 0}
          style={{ width: 70 }}
          onBlur={(e) => {
            const val = e.target.value;
            const num = val === '' ? undefined : parseInt(val, 10);
            if (num == null || num < 0 || num === (r.sort_order ?? 0)) return;
            handleSortChange(r, num);
          }}
        />
      ),
    },
    {
      title: '操作', key: 'action', width: 120, fixed: 'right' as const,
      render: (_: any, r: CongratulationGiftItem) => (
        <Space size={0}>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => { setModalMode('edit'); setEditingGift(r); setModalVisible(true); }}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SearchPanel filters={GIFT_FILTERS} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        <Space style={{ marginLeft: 12, flexShrink: 0 }}>
          <Button icon={<PlusOutlined />} onClick={() => { setModalMode('create'); setEditingGift(null); setModalVisible(true); }}>添加礼物</Button>
          <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
        </Space>
      </div>
      <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
      <CongratulationGiftModal
        visible={modalVisible}
        mode={modalMode}
        gift={editingGift}
        onClose={() => { setModalVisible(false); setEditingGift(null); }}
        onSuccess={refresh}
      />
    </div>
  );
};

// ======================== 页面 ========================

const CongratulationManagement = () => {
  const [tabKey, setTabKey] = useState('congrats');
  const refreshRefs: Record<string, () => void> = {};

  const handleRefresh = () => {
    refreshRefs[tabKey]?.();
  };

  return (
    <StandardPage
      title="报喜管理"
      description="管理用户提交的报喜资料并执行审核，维护报喜虚拟礼物配置。"
      showRefreshButton
      onRefresh={handleRefresh}
      showAddButton={false}
      table={
        <Tabs
          activeKey={tabKey}
          onChange={setTabKey}
          items={[
            { key: 'congrats', label: '报喜信息管理', children: <CongratulationListTab onRefreshRef={(fn) => { refreshRefs.congrats = fn; }} /> },
            { key: 'gifts', label: '礼物管理', children: <CongratulationGiftTab onRefreshRef={(fn) => { refreshRefs.gifts = fn; }} /> },
          ]}
        />
      }
    />
  );
};

export default CongratulationManagement;
