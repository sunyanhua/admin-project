import { useState, useCallback } from 'react';
import { userColumn, statusSwitchColumn } from '@/components/templates/ColumnHelpers';
import type { ColumnsType } from 'antd/es/table';
import { userApi } from '../../api/services/user';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import UserDetailModal from '@/components/user/UserDetailModal';
import '../../styles/user-detail-modal.css';
import { formatDateTime, formatDate } from '@/utils/format';

const STATUS_OPTIONS = [
  { label: '正常', value: 0 },
  { label: '屏蔽', value: 1 },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

const UserList = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | number>('');

  const fetchUsers = useCallback(async (params: any) => {
    return userApi.getUsers(params);
  }, []);

  const formatUserResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<any>({
    fetchFn: fetchUsers,
    formatResponse: formatUserResponse,
  });

  const { success, error: showError } = useAppNotification();

  const handleStatusToggle = async (record: any, checked: boolean) => {
    try {
      await userApi.updateUserStatus(record.id, checked ? 0 : 1);
      success(checked ? '用户已设为正常' : '用户已屏蔽');
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.message || err.response?.data?.msg || '操作失败');
    }
  };

  const handleViewDetail = (record: any) => {
    setSelectedUserId(record.id);
    setUserDetailVisible(true);
  };

  const columns: ColumnsType<any> = [
    userColumn<any>('用户', 'avatar_url', 'nickname', 160, handleViewDetail),
    {
      title: '手机号',
      dataIndex: 'phone_masked',
      key: 'phone_masked',
      width: 130,
      render: (v: string) => v || '-',
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (t: string) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>{formatDate(t)}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{t ? formatDateTime(t).split(' ')[1] : '-'}</div>
        </div>
      ),
    },
    statusSwitchColumn<any>('status', 0, 1, handleStatusToggle, '正常', '屏蔽', 100),
    ActionColumn({
      onView: handleViewDetail,
      showView: true,
      showEdit: false,
      showDelete: false,
      width: 100,
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
        title="注册用户管理"
        description="管理平台的注册用户，查看头像、昵称、手机号、注册时间及状态。"
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
        table={
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={pagination}
            onPageChange={onPageChange}
            scroll={{ x: 650 }}
          />
        }
      />

      <UserDetailModal
        userId={selectedUserId}
        open={userDetailVisible}
        onClose={() => setUserDetailVisible(false)}
      />
    </>
  );
};

export default UserList;
