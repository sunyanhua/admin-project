import { useState, useCallback } from 'react';
import { Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { AdminRole, AdminRule, AdminRoleMap, AdminRuleMap } from '@shared/constants/admin.enums';
import { adminApi, AdminUser } from '../../api/services/admin';
import { formatDateTime } from '@/utils/format';
import AddAdminModal from '../../components/admin/AddAdminModal';
import AdminEditModal from '../../components/admin/AdminEditModal';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';

const { Title } = Typography;

const ROLE_OPTIONS = [
  { label: '超级管理员', value: AdminRole.SUPER_ADMIN },
  { label: '普通管理员', value: AdminRole.NORMAL_ADMIN },
];

const filters: FilterConfig[] = [
  { name: 'role', placeholder: '全部角色', type: 'select', options: ROLE_OPTIONS },
  { name: 'word', placeholder: '搜索用户名', type: 'input' },
];

const AdminManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  const fetchAdmins = useCallback(async (params: any) => {
    return adminApi.getAdmins(params);
  }, []);

  const formatAdminResponse = useCallback((res: any) => ({
    list: res?.data || [],
    count: res?.count || 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<AdminUser>({
    fetchFn: fetchAdmins,
    formatResponse: formatAdminResponse,
  });

  const columns = [
    {
      title: '用户名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: AdminRole) => {
        const roleInfo = AdminRoleMap[role] || { text: '未知', color: 'default' };
        return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
      },
    },
    {
      title: '权限',
      dataIndex: 'rule',
      key: 'rule',
      render: (rule: AdminRule, record: AdminUser) => {
        if (record.role === AdminRole.SUPER_ADMIN) {
          return <Tag color="red">超级权限</Tag>;
        }
        const ruleText = AdminRuleMap[rule] || '未知权限';
        return <Tag color="blue">{ruleText}</Tag>;
      },
    },
    {
      title: '最后登录',
      dataIndex: 'login',
      key: 'login',
      responsive: ['lg' as const],
      render: (login?: string) => login ? formatDateTime(login) : '-',
    },
    ActionColumn({
      onEdit: (record) => {
        setSelectedAdmin(record);
        setEditModalVisible(true);
      },
      onDelete: (record) => confirmDelete({
        name: record.name,
        deleteFn: () => adminApi.deleteAdmin(record.id),
        onSuccess: refresh,
      }),
      showView: false,
    }),
  ];

  const handleAddAdmin = () => {
    setAddModalVisible(true);
  };

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
            filters={filters}
            values={values}
            onChange={handleChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        }
        showAddButton
        onAdd={handleAddAdmin}
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
        onClose={() => setAddModalVisible(false)}
        onSuccess={refresh}
      />
    </>
  );
};

export default AdminManagement;
