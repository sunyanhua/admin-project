import { useState, useCallback } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Tag, Button } from 'antd';
import { EditOutlined, DeleteOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { adminApi, AdminRole } from '@/api/services/admin';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import RoleEditModal from '@/components/admin/RoleEditModal';
import PermissionModal from '@/components/admin/PermissionModal';

const filters: FilterConfig[] = [
  { name: 'keyword', placeholder: '搜索角色名称或标识', type: 'input' },
];

const RoleManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  const fetchRoles = useCallback(async (params: any) => {
    return adminApi.getRoles(params);
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: Array.isArray(res) ? res : (res?.list || []),
    count: Array.isArray(res) ? res.length : (res?.total || 0),
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<AdminRole>({
    fetchFn: fetchRoles,
    formatResponse: formatResponse,
  });

  const columns: ColumnsType<AdminRole> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '角色标识',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (desc?: string) => desc || '-',
    },
    ActionColumn({
      onEdit: (record) => {
        setSelectedRole(record);
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
            setSelectedRole(record);
            setPermissionModalVisible(true);
          }}>
            权限
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            setSelectedRole(record);
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
    setSelectedRole(null);
    setEditMode('create');
    setEditModalVisible(true);
  };

  return (
    <>
      <StandardPage
        title="角色管理"
        description="管理系统角色，支持创建、编辑、删除角色。角色关联 URN 权限控制。"
        showRefreshButton={true}
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
        role={selectedRole}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedRole(null);
        }}
        onSuccess={refresh}
      />

      <PermissionModal
        visible={permissionModalVisible}
        role={selectedRole}
        onClose={() => {
          setPermissionModalVisible(false);
          setSelectedRole(null);
        }}
        onSuccess={refresh}
      />
    </>
  );
};

export default RoleManagement;
