import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, InputNumber, Tag, Image } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { GiftStatus } from '@shared/constants';
import { getSmallUrl } from '@/utils/imageUtils';
import { giftApi, Gift } from '@/api/services/gift';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { statusSwitchColumn } from '@/components/templates/ColumnHelpers';
import GiftEditModal from '@/components/community/GiftEditModal';

const STATUS_OPTIONS = [
  { label: '启用', value: GiftStatus.ENABLED },
  { label: '禁用', value: GiftStatus.DISABLED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '搜索礼物名称', type: 'input' },
];

const GiftManagement = () => {
  const { success, error: showError } = useAppNotification();
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchGifts = useCallback(async (params: any) => {
    return giftApi.getList({
      page: params.page,
      size: params.page_size,
      status: params.status,
      keyword: params.keyword,
    });
  }, []);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const {
    data,
    loading: listLoading,
    pagination,
    onPageChange,
    refresh,
    search,
  } = useListPage<Gift>({
    fetchFn: fetchGifts,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => {
    setSearchValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => { search(vals); };
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleStatusToggle = async (record: Gift, checked: boolean) => {
    try {
      await giftApi.toggleStatus(record.id, checked ? GiftStatus.ENABLED : GiftStatus.DISABLED);
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  const handleSortChange = async (record: Gift, value: number | null) => {
    if (value == null) return;
    try {
      await giftApi.update(record.id, { sort_order: value });
      success('权重更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '权重更新失败');
    }
  };

  const handleAdd = () => {
    setEditMode('create');
    setEditingGift(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Gift) => {
    setEditMode('edit');
    setEditingGift(record);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingGift(null);
  };

  const columns: ColumnsType<Gift> = [
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 80,
      render: (url: string) => (
        url
          ? <Image src={getSmallUrl(url)} alt="icon" preview={{ src: url }} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
          : <span style={{ color: '#999' }}>-</span>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ wordBreak: 'break-word' }}>{text}</span>,
    },
    {
      title: '人气值',
      dataIndex: 'popularity',
      key: 'popularity',
      width: 90,
    },
    {
      title: '金币',
      dataIndex: 'price_coins',
      key: 'price_coins',
      width: 90,
      render: (v: number) => v ?? 0,
    },
    {
      title: '兑换量',
      dataIndex: 'redeemed_count',
      key: 'redeemed_count',
      width: 90,
      render: (v: number) => v ?? 0,
    },
    statusSwitchColumn<Gift>('status', GiftStatus.ENABLED, GiftStatus.DISABLED, handleStatusToggle, '启用', '禁用', 100),
    {
      title: '权重',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 120,
      render: (v: number | undefined, r: Gift) => (
        <InputNumber
          min={0}
          value={v ?? 0}
          style={{ width: 70 }}
          onBlur={(e) => {
            const val = e.target.value;
            const num = val === '' ? undefined : parseInt(val);
            if (num !== (r.sort_order ?? undefined)) {
              handleSortChange(r, num ?? 0);
            }
          }}
        />
      ),
    },
    ActionColumn({
      onEdit: (record) => handleEdit(record),
      render: (record: Gift) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {(record.redeemed_count ?? 0) === 0 && (
            <Button type="link" size="small" danger icon={<DeleteOutlined />}
              onClick={() => confirmDelete({
                name: record.name,
                deleteFn: () => giftApi.delete(record.id),
                onSuccess: refresh,
              })}>
              删除
            </Button>
          )}
        </Space>
      ),
      showView: false,
      showEdit: false,
      showDelete: false,
    }),
  ];

  return (
    <>
      <StandardPage
        title="礼物管理"
        description="管理平台礼物目录，配置礼物的类型、价格、人气值和图标。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="创建礼物"
        searchArea={
          <SearchPanel
            filters={filters}
            values={searchValues}
            onChange={handleSearchChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        }
        table={
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={listLoading}
            pagination={pagination}
            onPageChange={onPageChange}
          />
        }
      />

      <GiftEditModal
        visible={modalVisible}
        mode={editMode}
        gift={editingGift}
        onClose={handleCloseModal}
        onSuccess={refresh}
      />
    </>
  );
};

export default GiftManagement;
