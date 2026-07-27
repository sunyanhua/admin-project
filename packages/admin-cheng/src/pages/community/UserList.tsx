import { useState, useCallback } from 'react';
import { Tag, Avatar, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { userApi } from '../../api/services/user';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { ProfileAuditStatus, MatchProfileAuditStatus } from '@/api/types/status';
import { getAvatarUrl } from '@/utils/imageUtils';
import { formatDateTime, formatDate } from '@/utils/format';
import UserDetailModal from './UserDetailModal';
import UserEditProfileModal from './UserEditProfileModal';
import MatchProfileAuditModal from './MatchProfileAuditModal';
import type { AdminUserDetailResponse } from '@/api/types/user';

const GENDER_OPTIONS = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
];

const PROFILE_AUDIT_OPTIONS = [
  { label: '待审核', value: ProfileAuditStatus.PENDING },
  { label: '审核通过', value: ProfileAuditStatus.APPROVED },
  { label: '审核拒绝', value: ProfileAuditStatus.REJECTED },
];

const MATCH_AUDIT_OPTIONS = [
  { label: '待审核', value: MatchProfileAuditStatus.PENDING },
  { label: '审核通过', value: MatchProfileAuditStatus.APPROVED },
  { label: '审核拒绝', value: MatchProfileAuditStatus.REJECTED },
  { label: '已撤销', value: MatchProfileAuditStatus.REVOKED },
];

const filters: FilterConfig[] = [
  { name: 'gender', placeholder: '全部性别', type: 'select', options: GENDER_OPTIONS },
  { name: 'profile_audit_status', placeholder: '全部资料审核状态', type: 'select', options: PROFILE_AUDIT_OPTIONS },
  { name: 'match_audit_status', placeholder: '全部档案审核状态', type: 'select', options: MATCH_AUDIT_OPTIONS },
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

const PROFILE_AUDIT_MAP: Record<number, { color: string; text: string }> = {
  [ProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
  [ProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
  [ProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
};

const MATCH_AUDIT_MAP: Record<number, { color: string; text: string }> = {
  [MatchProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
  [MatchProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
  [MatchProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
  [MatchProfileAuditStatus.REVOKED]: { color: 'default', text: '已撤销' },
};

const GENDER_LABEL: Record<number, string> = { 1: '男', 2: '女' };

const UserList = () => {
  const [values, setValues] = useState<Record<string, any>>({});

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<AdminUserDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit profile modal state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileUser, setEditProfileUser] = useState<any>(null);

  // Audit profile modal state
  const [auditProfileOpen, setAuditProfileOpen] = useState(false);
  const [auditProfileUser, setAuditProfileUser] = useState<any>(null);

  const { success, error } = useAppNotification();

  const fetchUsers = useCallback(async (params: any) => {
    return userApi.getUsers({
      page: params.page,
      size: params.page_size || params.size,
      keyword: params.keyword,
      gender: params.gender,
      profile_audit_status: params.profile_audit_status,
      match_audit_status: params.match_audit_status,
    });
  }, []);

  const formatUserResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<any>({
    fetchFn: fetchUsers,
    formatResponse: formatUserResponse,
  });

  const handleViewDetail = async (record: any) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await userApi.getUserDetail(record.user_id || record.id);
      setDetailUser((res as any)?.data || res || null);
    } catch {
      setDetailUser(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEditProfile = (record: any) => {
    setEditProfileUser({
      id: record.user_id || record.id,
      real_name: record.real_name,
      gender: record.gender,
      birth_date: record.birth_date,
    });
    setEditProfileOpen(true);
  };

  const handleAuditProfile = (record: any) => {
    setAuditProfileUser({ id: record.user_id || record.id, nickname: record.nickname });
    setAuditProfileOpen(true);
  };

  const columns: ColumnsType<any> = [
    {
      title: '用户',
      dataIndex: 'nickname',
      key: 'user',
      width: 160,
      render: (_: string, record: any) => (
        <Space size={4}>
          <Avatar size={40} src={getAvatarUrl(record.avatar)} />
          <Button type="link" onClick={() => handleViewDetail(record)}>
            {record.nickname || '-'}
          </Button>
        </Space>
      ),
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      render: (g: number) => GENDER_LABEL[g] || '未知',
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      width: 60,
      render: (v: number) => (v != null ? v : '-'),
    },
    {
      title: '资料审核',
      dataIndex: 'profile_audit_status',
      key: 'profile_audit_status',
      width: 100,
      render: (s: number) => {
        const info = PROFILE_AUDIT_MAP[s] || { color: 'default', text: '未知' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '档案审核',
      dataIndex: 'match_audit_status',
      key: 'match_audit_status',
      width: 100,
      render: (s: number) => {
        const info = MATCH_AUDIT_MAP[s] || { color: 'default', text: '未知' };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: '最后活跃',
      dataIndex: 'last_active_at',
      key: 'last_active_at',
      width: 120,
      render: (t: string) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>{formatDate(t)}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{t ? formatDateTime(t).split(' ')[1] : '-'}</div>
        </div>
      ),
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
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: any) => (
        <Space className="action-buttons">
          <Button size="small" type="link" onClick={() => handleViewDetail(record)}>详情</Button>
          <Button size="small" type="link" onClick={() => handleEditProfile(record)}>修改资料</Button>
          {record.match_audit_status === MatchProfileAuditStatus.PENDING && (
            <Button size="small" type="link" onClick={() => handleAuditProfile(record)}>审核档案</Button>
          )}
        </Space>
      ),
    },
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
        description="管理平台的注册用户信息，支持按性别、年龄、审核状态筛选，查看用户基础资料和脱单档案详情，审核脱单档案。"
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
            scroll={{ x: 900 }}
          />
        }
      />

      <UserDetailModal
        open={detailModalOpen}
        loading={detailLoading}
        data={detailUser}
        onClose={() => { setDetailModalOpen(false); setDetailUser(null); }}
      />

      <UserEditProfileModal
        open={editProfileOpen}
        user={editProfileUser}
        onClose={() => setEditProfileOpen(false)}
        onSuccess={refresh}
      />

      <MatchProfileAuditModal
        open={auditProfileOpen}
        user={auditProfileUser}
        onClose={() => setAuditProfileOpen(false)}
        onSuccess={refresh}
      />
    </>
  );
};

export default UserList;
