import { useState, useCallback, useMemo, useEffect } from 'react';
import { Tag } from 'antd';
import { adminApi, AdminUser, AdminRole } from '../../api/services/admin';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/utils/format';
import AddAdminModal from '../../components/admin/AddAdminModal';
import AdminEditModal from '../../components/admin/AdminEditModal';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';

const STATUS_OPTIONS = [
  { label: '正常', value: 1 },
  { label: '屏蔽', value: 0 },
];

function buildFilters(allRoles: AdminRole[], isSuperAdmin: boolean): FilterConfig[] {
  const visibleRoles = isSuperAdmin
    ? allRoles
    : allRoles.filter((r) => r.code !== 'super_admin');
  return [
    {
      name: 'role_id',
      placeholder: '全部角色',
      type: 'select',
      options: visibleRoles.map((r) => ({ label: r.name, value: r.id })),
    },
    {
      name: 'status',
      placeholder: '全部状态',
      type: 'select',
      options: STATUS_OPTIONS,
    },
    { name: 'keyword', placeholder: '搜索用户名', type: 'input' },
  ];
}

// admin.roles 实际可能是字符串数组或对象数组 {id, name, code}
function extractRoleName(role: any): string {
  if (typeof role === 'string') return role;
  return role?.name || role?.code || '';
}

function userHasRole(user: AdminUser, code: string): boolean {
  if (!user.roles) return false;
  return user.roles.some((r: any) =>
    typeof r === 'string' ? r === code : r?.code === code
  );
}

const AdminManagement = () => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.roles?.includes?.('super_admin') ?? false;
  const [values, setValues] = useState<Record<string, any>>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [allRoles, setAllRoles] = useState<AdminRole[]>([]);

  // 非超管可分配的角色列表
  const assignableRoles = useMemo(
    () => isSuperAdmin ? allRoles : allRoles.filter((r) => r.code !== 'super_admin'),
    [allRoles, isSuperAdmin],
  );

  useEffect(() => {
    adminApi.getRoles().then(setAllRoles).catch(() => setAllRoles([]));
  }, []);

  const fetchAdmins = useCallback(async (params: any) => {
    return adminApi.getAdmins(params);
  }, []);

  // 在 formatResponse 中完成过滤，确保总数也同步减掉被隐藏的用户
  const formatAdminResponse = useCallback((res: any) => {
    let list = res?.list || [];
    // 隐藏当前登录管理员 + 非超管时隐藏超管用户
    list = list.filter((item: AdminUser) => item.id !== currentUser?.id);
    if (!isSuperAdmin) {
      list = list.filter((item: AdminUser) => !userHasRole(item, 'super_admin'));
    }
    const originalTotal = res?.total || 0;
    const hiddenCount = (res?.list?.length || 0) - list.length;
    return { list, count: originalTotal - hiddenCount };
  }, [currentUser?.id, isSuperAdmin]);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<AdminUser>({
    fetchFn: fetchAdmins,
    formatResponse: formatAdminResponse,
  });

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '姓名',
      dataIndex: 'real_name',
      key: 'real_name',
      render: (real_name?: string) => real_name || '-',
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone?: string) => phone || '-',
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles?: any[]) => {
        if (!roles || roles.length === 0) return <Tag>未分配</Tag>;
        return roles.map((role: any, idx: number) => {
          const name = extractRoleName(role);
          const code = typeof role === 'string' ? role : role?.code || '';
          return (
            <Tag key={code || idx} color={code === 'super_admin' ? 'red' : 'blue'}>
              {name || code}
            </Tag>
          );
        });
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status?: number) => (
        <Tag color={status === 1 ? 'green' : 'default'}>
          {status === 1 ? '正常' : '屏蔽'}
        </Tag>
      ),
    },
    {
      title: '最后登录时间',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (last_login_at?: string) => last_login_at ? formatDateTime(last_login_at) : '-',
    },
    ActionColumn({
      onEdit: (record) => {
        setSelectedAdmin(record);
        setEditModalVisible(true);
      },
      onDelete: (record) => confirmDelete({
        name: record.username,
        deleteFn: () => adminApi.deleteAdmin(record.id),
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
        title="管理员管理"
        description="管理系统管理员账号，支持创建、编辑、删除管理员。"
        showRefreshButton={true}
        onRefresh={refresh}
        searchArea={
          <SearchPanel
            filters={buildFilters(allRoles, isSuperAdmin)}
            values={values}
            onChange={handleChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        }
        showAddButton
        onAdd={() => setAddModalVisible(true)}
        addButtonText="添加管理员"
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

      <AdminEditModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedAdmin(null);
        }}
        admin={selectedAdmin}
        onSuccess={refresh}
      />

      <AddAdminModal
        visible={addModalVisible}
        roles={assignableRoles}
        onClose={() => setAddModalVisible(false)}
        onSuccess={refresh}
      />
    </>
  );
};

export default AdminManagement;
