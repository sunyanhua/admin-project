import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Image } from 'antd';
import { EditOutlined, DeleteOutlined, SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons';
import SourceQrcodeModal from '@/components/common/SourceQrcodeModal';
import type { ColumnsType } from 'antd/es/table';
import { ZoneStatus } from '@shared/constants';
import { getSmallUrl } from '@/utils/imageUtils';
import { zoneApi, Zone } from '@/api/services/zone';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { statusSwitchColumn, dateTimeColumn } from '@/components/templates/ColumnHelpers';
import ZoneEditModal from '@/components/operation/ZoneEditModal';
import ZoneVerifyModal from '@/components/operation/ZoneVerifyModal';
import ZoneUsersModal from '@/components/operation/ZoneUsersModal';

const STATUS_OPTIONS = [
  { label: '启用', value: ZoneStatus.ENABLED },
  { label: '禁用', value: ZoneStatus.DISABLED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '搜索专区名称', type: 'input' },
];

const ZoneManagement = () => {
  const { success, error: showError } = useAppNotification();
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyZoneId, setVerifyZoneId] = useState('');
  const [verifyZoneName, setVerifyZoneName] = useState('');
  const [usersModalVisible, setUsersModalVisible] = useState(false);
  const [usersZoneId, setUsersZoneId] = useState('');
  const [usersZoneName, setUsersZoneName] = useState('');
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchZones = useCallback(async (params: any) => {
    return zoneApi.getList({
      page: params.page,
      size: params.page_size,
      status: params.status,
      keyword: params.keyword,
    });
  }, []);

  const formatZoneResponse = useCallback((res: any) => {
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
  } = useListPage<Zone>({
    fetchFn: fetchZones,
    formatResponse: formatZoneResponse,
  });

  const handleSearchChange = (name: string, value: any) => {
    setSearchValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  const handleReset = () => {
    setSearchValues({});
    search({});
  };

  const handleStatusToggle = async (record: Zone, checked: boolean) => {
    try {
      await zoneApi.toggleStatus(record.id, checked ? ZoneStatus.ENABLED : ZoneStatus.DISABLED);
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  const handleAdd = () => {
    setEditMode('create');
    setEditingZone(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Zone) => {
    setEditMode('edit');
    setEditingZone(record);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingZone(null);
  };

  const handleVerify = (record: Zone) => {
    setVerifyZoneId(record.id);
    setVerifyZoneName(record.name);
    setVerifyModalVisible(true);
  };

  const handleShowUsers = (record: Zone) => {
    setUsersZoneId(record.id);
    setUsersZoneName(record.name);
    setUsersModalVisible(true);
  };

  const columns: ColumnsType<Zone> = [
    {
      title: 'Logo',
      dataIndex: 'logo',
      key: 'logo',
      width: 80,
      render: (url: string) => (
        url
          ? <Image src={getSmallUrl(url)} alt="logo" preview={{ src: url }} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
          : <span style={{ color: '#999' }}>-</span>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, r: Zone) => (
        <Space size={4}>
          <span style={{ wordBreak: 'break-word' }}>{text}</span>
          <SourceQrcodeModal basePage={`/pages/zone/index?id=${r.id}`} />
        </Space>
      ),
    },
    {
      title: '成员数',
      dataIndex: 'member_count',
      key: 'member_count',
      width: 90,
      render: (count: number | undefined, record: Zone) => (
        <Button type="link" size="small" icon={<TeamOutlined />} style={{ padding: 0, height: 'auto' }}
          onClick={() => handleShowUsers(record)}>
          {count ?? 0}
        </Button>
      ),
    },
    statusSwitchColumn<Zone>('status', ZoneStatus.ENABLED, ZoneStatus.DISABLED, handleStatusToggle, '启用', '停用', 100),
    dateTimeColumn<Zone>('created_at', '创建时间'),
    ActionColumn({
      onEdit: (record) => handleEdit(record),
      render: (record: Zone) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<SafetyCertificateOutlined />} onClick={() => handleVerify(record)}>
            认证
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {(record.member_count ?? 0) === 0 && (
            <Button type="link" size="small" danger icon={<DeleteOutlined />}
              onClick={() => confirmDelete({
                name: record.name,
                deleteFn: () => zoneApi.delete(record.id),
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
        title="合作专区管理"
        description="管理合作专区，配置专区信息和申请表单。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="创建专区"
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

      <ZoneEditModal
        visible={modalVisible}
        mode={editMode}
        zone={editingZone}
        onClose={handleCloseModal}
        onSuccess={refresh}
      />

      <ZoneVerifyModal
        visible={verifyModalVisible}
        zoneId={verifyZoneId}
        zoneName={verifyZoneName}
        onClose={() => setVerifyModalVisible(false)}
      />

      <ZoneUsersModal
        visible={usersModalVisible}
        zoneId={usersZoneId}
        zoneName={usersZoneName}
        onClose={() => setUsersModalVisible(false)}
      />
    </>
  );
};

export default ZoneManagement;
