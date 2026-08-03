import { useState, useCallback } from 'react';
import { Tag, Avatar, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined } from '@ant-design/icons';
import { userApi } from '../../api/services/user';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { StatusSwitch } from '@/components/templates/StatusSwitch';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { DetailModal } from '@/components/templates/DetailModal';
import { buildUserDetailSections } from '@/components/user/UserDetailSections';
import ProfileEditModal from '@/components/user/ProfileEditModal';
import AuditMatchProfileModal from '@/components/user/AuditMatchProfileModal';
import { AdminUserStatus, MatchProfileAuditStatus } from '@/api/types/status';
import { getAvatarUrl } from '@/utils/imageUtils';
import { formatDateTime, formatDate } from '@/utils/format';
import type { CommunityUserItem } from '@/api/types/user';
import '@/styles/user-detail-modal.css';

// 用户类型选项 → API 参数映射
const USER_TYPE_OPTIONS = [
  { label: '新注册用户', value: 'new' },
  { label: '全部老用户', value: 'old_all' },
  { label: '老用户已激活', value: 'old_activated' },
  { label: '老用户未激活', value: 'old_inactive' },
];

const STATUS_OPTIONS = [
  { label: '正常', value: AdminUserStatus.ACTIVE },
  { label: '屏蔽', value: AdminUserStatus.DISABLED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'user_type', placeholder: '全部用户类型', type: 'select', options: USER_TYPE_OPTIONS },
  { name: 'keyword', placeholder: '搜索昵称或手机号', type: 'input' },
];

const GENDER_LABEL: Record<number, string> = { 1: '男', 2: '女' };

/** 从 birth_date 计算年龄 */
function calcAge(birthDate: string): string {
  if (!birthDate) return '-';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return String(age);
}

const UserList = () => {
  const [values, setValues] = useState<Record<string, any>>({});

  // Detail modal state — 直接用列表数据，无需额外接口
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<CommunityUserItem | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [auditProfileOpen, setAuditProfileOpen] = useState(false);

  const fetchUsers = useCallback(async (params: any) => {
    const apiParams: any = {
      page: params.page,
      size: params.page_size || params.size,
      keyword: params.keyword || undefined,
      status: params.status != null ? params.status : undefined,
    };
    if (params.user_type === 'new') {
      apiParams.is_migrated = false;
    } else if (params.user_type === 'old_all') {
      apiParams.is_migrated = true;
    } else if (params.user_type === 'old_activated') {
      apiParams.is_migrated = true;
      apiParams.is_activated = true;
    } else if (params.user_type === 'old_inactive') {
      apiParams.is_migrated = true;
      apiParams.is_activated = false;
    }
    return userApi.getUsers(apiParams);
  }, []);

  const formatUserResponse = useCallback((res: any) => {
    if (Array.isArray(res)) return { list: res, count: res.length };
    return { list: res?.list || [], count: res?.total ?? 0 };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<CommunityUserItem>({
    fetchFn: fetchUsers,
    formatResponse: formatUserResponse,
  });

  const handleViewDetail = (record: CommunityUserItem) => {
    setDetailItem(record);
    setDetailModalOpen(true);
  };

  const handleStatusChange = useCallback(async (record: CommunityUserItem, checked: boolean) => {
    const newStatus = checked ? AdminUserStatus.ACTIVE : AdminUserStatus.DISABLED;
    await userApi.updateUserStatus(record.user.user_id, newStatus);
    refresh();
  }, [refresh]);

  const columns: ColumnsType<CommunityUserItem> = [
    {
      title: '用户',
      dataIndex: ['profile', 'nickname'],
      key: 'nickname',
      width: 160,
      render: (_: any, record: CommunityUserItem) => (
        <Button
          type="link"
          style={{ padding: 0, height: 'auto' }}
          onClick={() => handleViewDetail(record)}
        >
          <Space size={4}>
            <Avatar
              src={getAvatarUrl(record.profile.avatar)}
              size={40}
              style={{ borderRadius: '50%', flexShrink: 0 }}
            />
            <span style={{ fontSize: 14 }}>
              {record.profile.nickname || '-'}
            </span>
          </Space>
        </Button>
      ),
    },
    {
      title: '手机号',
      dataIndex: ['user', 'phone'],
      key: 'phone',
      width: 140,
      render: (_: any, record: CommunityUserItem) => record.user.phone || '-',
    },
    {
      title: '性别',
      dataIndex: ['profile', 'gender'],
      key: 'gender',
      width: 60,
      render: (_: any, record: CommunityUserItem) => GENDER_LABEL[record.profile.gender] || '-',
    },
    {
      title: '年龄',
      dataIndex: ['profile', 'birth_date'],
      key: 'age',
      width: 60,
      render: (_: any, record: CommunityUserItem) => calcAge(record.profile.birth_date),
    },
    {
      title: '注册时间',
      dataIndex: ['profile', 'created_at'],
      key: 'created_at',
      width: 120,
      render: (_: any, record: CommunityUserItem) => {
        const t = record.profile.created_at;
        return (
          <div style={{ lineHeight: 1.6 }}>
            <div>{t ? formatDate(t) : '-'}</div>
            <div style={{ color: '#666', fontSize: 12 }}>{t ? formatDateTime(t).split(' ')[1] : ''}</div>
          </div>
        );
      },
    },
    {
      title: '脱单资料',
      dataIndex: ['match_profile'],
      key: 'match_profile',
      width: 90,
      align: 'center',
      render: (_: any, record: CommunityUserItem) => (
        <Tag color={record.match_profile ? 'success' : 'default'}>
          {record.match_profile ? '已登记' : '未登记'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: ['user', 'is_migrated'],
      key: 'status',
      width: 100,
      render: (_: any, record: CommunityUserItem) => (
        <StatusSwitch
          checked={record.user.status !== AdminUserStatus.DISABLED}
          checkedChildren="正常"
          unCheckedChildren="屏蔽"
          onChange={(checked) => handleStatusChange(record, checked)}
        />
      ),
    },
    {
      title: '嗑学分',
      dataIndex: ['user', 'credits'],
      key: 'credits',
      width: 90,
      align: 'center',
      render: (_: any, record: CommunityUserItem) => record.user.credits ?? '-',
    },
    {
      title: '金币',
      dataIndex: ['wallet', 'points'],
      key: 'points',
      width: 90,
      align: 'center',
      render: (_: any, record: CommunityUserItem) => record.wallet.coins ?? '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_: any, record: CommunityUserItem) => (
        <Space className="action-buttons">
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>查看</Button>
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
        title="基础资料管理"
        description="查看和管理平台注册用户的基础资料、脱单档案及账户信息，支持按用户类型和状态筛选。"
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
            scroll={{ x: 1100 }}
            rowKey={(r) => r.user.user_id}
          />
        }
      />

      <DetailModal
        title="用户详情"
        open={detailModalOpen}
        entity={detailItem}
        width={720}
        className="user-detail-modal"
        onClose={() => { setDetailModalOpen(false); setDetailItem(null); }}
        render={(item: CommunityUserItem) =>
          buildUserDetailSections({
            user: item.user,
            profile: item.profile,
            matchProfile: item.match_profile || null,
            wallet: item.wallet,
            onEditProfile: () => setEditProfileOpen(true),
            onAuditProfile: () => setAuditProfileOpen(true),
          })
        }
      />

      <ProfileEditModal
        open={editProfileOpen}
        userId={detailItem?.user.user_id || ''}
        nickname={detailItem?.profile.nickname}
        gender={detailItem?.profile.gender}
        birthDate={detailItem?.profile.birth_date}
        zodiac={detailItem?.profile.zodiac}
        auditStatus={detailItem?.profile.audit_status}
        onClose={() => setEditProfileOpen(false)}
        onSuccess={(updated) => {
          setDetailItem((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              profile: {
                ...prev.profile,
                nickname: updated.nickname ?? prev.profile.nickname,
                gender: updated.gender ?? prev.profile.gender,
                birth_date: updated.birthDate ?? prev.profile.birth_date,
                zodiac: updated.zodiac ?? prev.profile.zodiac,
                audit_status: updated.auditStatus ?? prev.profile.audit_status,
              },
            } as CommunityUserItem;
          });
          refresh();
        }}
      />

      <AuditMatchProfileModal
        open={auditProfileOpen}
        userId={detailItem?.user.user_id || ''}
        onClose={() => setAuditProfileOpen(false)}
        onSuccess={(action) => {
          setDetailItem((prev) => {
            if (!prev || !prev.match_profile) return prev;
            return {
              ...prev,
              match_profile: {
                ...prev.match_profile,
                audit_status: action === 1 ? MatchProfileAuditStatus.APPROVED : MatchProfileAuditStatus.REJECTED,
              },
            } as CommunityUserItem;
          });
          refresh();
        }}
      />
    </>
  );
};

export default UserList;
