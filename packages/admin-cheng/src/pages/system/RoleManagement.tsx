import { useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button } from 'antd';
import { EditOutlined, DeleteOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { adminApi } from '@/api/services/admin';
import { AdminRoleStatus } from '@/api/types/status';
import type { RoleListItem } from '@/api/types/admin';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { StatusSwitch } from '@/components/templates/StatusSwitch';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, type FilterConfig } from '@/components/templates/SearchPanel';
import RoleEditModal from '@/components/admin/RoleEditModal';
import PermissionModal from '@/components/admin/PermissionModal';

const filters: FilterConfig[] = [
  { name: 'keyword', placeholder: '搜索角色名称', type: 'input' },
  {
    name: 'status',
    placeholder: '全部状态',
    type: 'select',
    options: [
      { label: '启用', value: AdminRoleStatus.ACTIVE },
      { label: '停用', value: AdminRoleStatus.DISABLED },
    ],
  },
];

const RoleManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  const fetchRoles = useCallback(async (params: any) => {
    return adminApi.getRoles(params);
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: res?.list || (Array.isArray(res) ? res : []),
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<RoleListItem>({
    fetchFn: fetchRoles,
    formatResponse,
  });

  const handleStatusChange = useCallback(async (record: RoleListItem, checked: boolean) => {
    await adminApi.updateRoleStatus(record.id, checked ? AdminRoleStatus.ACTIVE : AdminRoleStatus.DISABLED);
    refresh();
  }, [refresh]);

  const columns: ColumnsType<RoleListItem> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '标识',
      dataIndex: 'tag',
      key: 'tag',
      width: 90,
      align: 'center',
      render: (tag?: number) => (tag != null ? tag : '-'),
    },
    {
      title: '权限数量',
      dataIndex: 'permission_count',
      key: 'permission_count',
      width: 100,
      align: 'center',
    },
    {
      title: '关联管理员',
      dataIndex: 'admin_count',
      key: 'admin_count',
      width: 110,
      align: 'center',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_: any, record: RoleListItem) => (
        <StatusSwitch
          checked={record.status === AdminRoleStatus.ACTIVE}
          onChange={(checked) => handleStatusChange(record, checked)}
        />
      ),
    },
    ActionColumn({
      onEdit: (record) => {
        setSelectedRoleId(record.id);
        setEditMode('edit');
        setEditModalVisible(true);
      },
      onDelete: (record) => confirmDelete({
        name: record.name,
        deleteFn: () => adminApi.deleteRole(record.id),
        onSuccess: refresh,
      }),
      showView: false,
      render: (record) => (
        <>
          <Button type="link" size="small" icon={<SafetyCertificateOutlined />} onClick={() => {
            setSelectedRoleId(record.id);
            setPermissionModalVisible(true);
          }}>
            权限
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            setSelectedRoleId(record.id);
            setEditMode('edit');
            setEditModalVisible(true);
          }}>
            编辑
          </Button>
          <Button
            type="link" size="small" danger icon={<DeleteOutlined />}
            onClick={() => confirmDelete({
              name: record.name,
              deleteFn: () => adminApi.deleteRole(record.id),
              onSuccess: refresh,
            })}
          >
            删除
          </Button>
        </>
      ),
      width: 240,
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

  const handleAdd = () => {
    setSelectedRoleId(null);
    setEditMode('create');
    setEditModalVisible(true);
  };

  return (
    <>
      <StandardPage
        title="角色管理"
        description="管理系统角色，支持创建、编辑、删除角色。角色关联 URN 权限控制。"
        showRefreshButton
        onRefresh={refresh}
        searchArea={
          <SearchPanel
            filters={filters}
            values={values}
            onChange={handleChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        }
        showAddButton
        onAdd={handleAdd}
        addButtonText="添加角色"
        table={
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={pagination}
            onPageChange={onPageChange}
          />
        }
      />

      <RoleEditModal
        visible={editModalVisible}
        mode={editMode}
        roleId={selectedRoleId}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedRoleId(null);
        }}
        onSuccess={refresh}
      />

      <PermissionModal
        visible={permissionModalVisible}
        roleId={selectedRoleId}
        onClose={() => {
          setPermissionModalVisible(false);
          setSelectedRoleId(null);
        }}
        onSuccess={refresh}
      />
    </>
  );
};

export default RoleManagement;
