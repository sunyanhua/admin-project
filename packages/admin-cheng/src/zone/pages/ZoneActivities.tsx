import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Button, Space, Tag, Image } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppNotification } from '@/hooks/useAppNotification';
import { ActivityV1Status, ActivityTypeLabels, ActivityType } from '@shared/constants';
import { getMediumUrl } from '@/utils/imageUtils';
import { activityApi, Activity } from '@/api/services/activity-v1';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { statusSwitchColumn, dateTimeColumn } from '@/components/templates/ColumnHelpers';
import ActivityEditModal from '@/components/operation/ActivityEditModal';
import ActivityRegisterModal from '@/components/operation/ActivityRegisterModal';
import { useAuth } from '@/contexts/AuthContext';
import type { FormField } from '@/components/operation/FormConfigEditor';

const STATUS_OPTIONS = [
  { label: '上线', value: ActivityV1Status.ENABLED },
  { label: '下线', value: ActivityV1Status.DISABLED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '搜索活动标题', type: 'input' },
];

const TYPE_TAGS: Record<number, { label: string; color: string }> = {
  [ActivityType.FREE_FCFS]: { label: '免费', color: 'green' },
  [ActivityType.PAID_FCFS]: { label: '收费', color: 'orange' },
  [ActivityType.FREE_REVIEW]: { label: '审核', color: 'purple' },
};

/**
 * 活动发布：本专区活动列表 + 创建/编辑 + 查看报名。
 * 列表固定按自己的 zone_id 筛选，创建/编辑锁定为本专区（ActivityEditModal lockedZone）。
 */
const ZoneActivities = () => {
  const { user } = useAuth();
  const { success, error: showError } = useAppNotification();
  const [editVisible, setEditVisible] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [registerVisible, setRegisterVisible] = useState(false);
  const [registerActivity, setRegisterActivity] = useState<Activity | null>(null);
  const [registerFormConfig, setRegisterFormConfig] = useState<FormField[]>([]);
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchActivities = useCallback(async (params: any) => {
    return activityApi.getList({
      page: params.page,
      size: params.page_size,
      status: params.status,
      keyword: params.keyword,
      // 只读本专区的活动
      zone_id: user?.zoneId || '',
    });
  }, [user?.zoneId]);

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
  } = useListPage<Activity>({
    fetchFn: fetchActivities,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => {
    setSearchValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusToggle = async (record: Activity, checked: boolean) => {
    try {
      await activityApi.toggleStatus(record.id, checked ? ActivityV1Status.ENABLED : ActivityV1Status.DISABLED);
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  const handleAdd = () => {
    setEditMode('create');
    setEditingActivity(null);
    setEditVisible(true);
  };

  const handleEdit = (record: Activity) => {
    setEditMode('edit');
    setEditingActivity(record);
    setEditVisible(true);
  };

  const handleShowRegisters = (record: Activity) => {
    try {
      const fc = typeof record.form_config === 'string' ? JSON.parse(record.form_config) : record.form_config;
      setRegisterFormConfig(Array.isArray(fc) ? fc.map((f: any) => ({ id: f.id, label: f.label, type: f.type, required: f.required, options: f.options })) : []);
    } catch { setRegisterFormConfig([]); }
    setRegisterActivity(record);
    setRegisterVisible(true);
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
      render: (text: string, r: Activity) => {
        const tag = TYPE_TAGS[r.activity_type];
        return (
          <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'left' }}>
            {tag && <Tag color={tag.color} style={{ marginRight: 4 }}>{tag.label}</Tag>}
            {text}
          </span>
        );
      },
    },
    {
      title: '报名人数',
      key: 'register',
      width: 120,
      render: (_: any, r: Activity) => {
        const count = r.registered_count ?? 0;
        let content: ReactNode;
        if (r.activity_type === ActivityType.FREE_REVIEW) {
          content = count;
        } else if (r.gender_enabled) {
          content = (
            <div>
              <div>男 {r.male_registered_count ?? 0}/{r.male_slots ?? '-'}</div>
              <div>女 {r.female_registered_count ?? 0}/{r.female_slots ?? '-'}</div>
            </div>
          );
        } else {
          content = `${count}/${r.slots ?? '-'}`;
        }
        if (count > 0) {
          return (
            <Button type="link" style={{ padding: 0, height: 'auto', whiteSpace: 'normal' }}
              onClick={() => handleShowRegisters(r)}>
              {content}
            </Button>
          );
        }
        return content;
      },
    },
    statusSwitchColumn<Activity>('status', ActivityV1Status.ENABLED, ActivityV1Status.DISABLED, handleStatusToggle, '上线', '下线', 100),
    dateTimeColumn<Activity>('start_time', '活动时间'),
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, r: Activity) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <StandardPage
        title="活动发布"
        description="发布和管理本专区的活动，支持创建、编辑、上下线和查看报名记录。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="发布活动"
        searchArea={
          <SearchPanel
            filters={filters}
            values={searchValues}
            onChange={handleSearchChange}
            onSearch={(vals) => search(vals)}
            onReset={() => { setSearchValues({}); search({}); }}
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
        visible={editVisible}
        mode={editMode}
        activity={editingActivity}
        lockedZone={{ id: user?.zoneId || '', name: user?.zoneName || '' }}
        onClose={() => { setEditVisible(false); setEditingActivity(null); }}
        onSuccess={refresh}
      />

      {registerActivity && (
        <ActivityRegisterModal
          visible={registerVisible}
          activityId={registerActivity.id}
          activityTitle={registerActivity.title}
          activityType={registerActivity.activity_type}
          formConfig={registerFormConfig}
          onClose={() => setRegisterVisible(false)}
        />
      )}
    </>
  );
};

export default ZoneActivities;
