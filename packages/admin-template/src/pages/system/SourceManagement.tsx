import { useState, useCallback } from 'react';
import { Typography, Switch } from 'antd';
import { Source } from '@/api/services/source';
import { sourceApi } from '@/api/services/source';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import SourceAddModal from '@/components/system/SourceAddModal';
import SourceEditModal from '@/components/system/SourceEditModal';

const { Title } = Typography;

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
];

// 默认来源标识
const DEFAULT_KEY = 'default';

// 来源状态：0-启用，1-禁用
const SOURCE_STATUS = {
  ENABLED: 0,
  DISABLED: 1,
};

const SourceManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const { success, error: showError } = useAppNotification();

  const fetchSources = useCallback(async (params: any) => {
    return sourceApi.getSources({ ...params, key: DEFAULT_KEY });
  }, []);

  const formatSourceResponse = useCallback((res: any) => ({
    list: res?.data || [],
    count: res?.count ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Source>({
    fetchFn: fetchSources,
    formatResponse: formatSourceResponse,
  });

  // 处理状态切换
  const handleStatusToggle = async (record: Source, checked: boolean) => {
    try {
      await sourceApi.updateSourceStatus(record.id, checked ? SOURCE_STATUS.ENABLED : SOURCE_STATUS.DISABLED);
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.msg || '状态更新失败');
    }
  };

  const columns = [
    {
      title: '来源名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '注册人数',
      dataIndex: 'user_total',
      key: 'user_total',
      width: 80,
    },
    {
      title: '访问次数',
      dataIndex: 'reported_total',
      key: 'reported_total',
      width: 80,
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
        name: record.title,
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

  return (
    <>
      <StandardPage
        title="来源管理"
        description="管理平台的访问与注册来源。"
        showRefreshButton={true}
        onRefresh={refresh}
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
            scroll={{ x: 1000 }}
          />
        }
      />

      <SourceAddModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={refresh}
      />

      <SourceEditModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedSource(null);
        }}
        source={selectedSource}
        onSuccess={refresh}
      />
    </>
  );
};

export default SourceManagement;
