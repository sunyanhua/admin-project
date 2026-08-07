import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, InputNumber, Tag, Image } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ActivityV1Status, ActivityTypeLabels } from '@shared/constants';
import { getMediumUrl } from '@/utils/imageUtils';
import { activityApi, Activity } from '@/api/services/activity-v1';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { statusSwitchColumn, dateTimeColumn } from '@/components/templates/ColumnHelpers';
import ActivityEditModal from '@/components/operation/ActivityEditModal';

const STATUS_OPTIONS = [
  { label: '启用', value: ActivityV1Status.ENABLED },
  { label: '禁用', value: ActivityV1Status.DISABLED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '搜索活动标题', type: 'input' },
];

const ActivityManagement = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useAppNotification();
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchActivities = useCallback(async (params: any) => {
    return activityApi.getList({
      page: params.page,
      size: params.page_size,
      status: params.status,
    });
  }, []);

  const formatResponse = useCallback((res: any) => {
    const list = res?.list || [];
    const total = res?.total ?? 0;
    return { list, count: total };
  }, []);

  const {
    data,
    loading: listLoading,
    pagination,
    onPageChange,
    refresh,
    search,
  } = useListPage<Activity>({
    fetchFn: fetchActivities,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => {
    setSearchValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => { search(vals); };
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleStatusToggle = async (record: Activity, checked: boolean) => {
    try {
      await activityApi.update(record.id, {
        status: checked ? ActivityV1Status.ENABLED : ActivityV1Status.DISABLED,
      });
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  const handleSortChange = async (record: Activity, value: number | null) => {
    if (value == null) return;
    try {
      await activityApi.updateSortOrder(record.id, value);
      success('排序更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '排序更新失败');
    }
  };

  const handleAdd = () => {
    setEditMode('create');
    setEditingActivity(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Activity) => {
    setEditMode('edit');
    setEditingActivity(record);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingActivity(null);
  };

  const columns: ColumnsType<Activity> = [
    {
      title: '封面',
      dataIndex: 'cover',
      key: 'cover',
      width: 80,
      render: (url: string) => (
        url
          ? <Image src={getMediumUrl(url)} alt="cover" preview={{ src: url }} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
          : <span style={{ color: '#999' }}>-</span>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => {}}>
          <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'left' }}>{text}</span>
        </Button>
      ),
    },
    {
      title: '类型',
      dataIndex: 'activity_type',
      key: 'activity_type',
      width: 100,
      render: (v: number) => <Tag title={ActivityTypeLabels[v] ?? v}>{ActivityTypeLabels[v] ?? v}</Tag>,
    },
    {
      title: '报名',
      key: 'register',
      width: 90,
      render: (_: any, r: Activity) => `${r.registered_count ?? 0}/${r.slots ?? 0}`,
    },
    statusSwitchColumn<Activity>('status', ActivityV1Status.ENABLED, ActivityV1Status.DISABLED, handleStatusToggle, '启用', '停用', 100),
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 120,
      render: (v: number | undefined, r: Activity) => (
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
    dateTimeColumn<Activity>('start_time', '活动时间'),
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, r: Activity) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => navigate(`/operation/activity/${r.id}/registers`, { state: { title: r.title } })}>
            报名
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>
            编辑
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}
            onClick={() => confirmDelete({
              name: r.title,
              deleteFn: () => activityApi.delete(r.id),
              onSuccess: refresh,
            })}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <StandardPage
        title="活动管理"
        description="管理平台线下活动，支持创建、编辑、排序和查看报名记录。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="创建活动"
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

      <ActivityEditModal
        visible={modalVisible}
        mode={editMode}
        activity={editingActivity}
        onClose={handleCloseModal}
        onSuccess={refresh}
      />
    </>
  );
};

export default ActivityManagement;
