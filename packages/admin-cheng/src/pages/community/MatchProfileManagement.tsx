import { useState, useCallback } from 'react';
import { Tag, Avatar, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined } from '@ant-design/icons';
import { userApi } from '../../api/services/user';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import ProfileEditModal from '@/components/user/ProfileEditModal';
import AuditMatchProfileModal from '@/components/user/AuditMatchProfileModal';
import { MatchProfileAuditStatus, UserVisibility, UserGenderLabels, MaritalStatusLabels } from '@/api/types/status';
import { getAvatarUrl, getMediumUrl } from '@/utils/imageUtils';
import type { CommunityUserItem } from '@/api/types/user';
import '@/styles/user-detail-modal.css';

const AUDIT_STATUS_OPTIONS = [
  { label: '待审核', value: MatchProfileAuditStatus.PENDING },
  { label: '审核通过', value: MatchProfileAuditStatus.APPROVED },
  { label: '审核拒绝', value: MatchProfileAuditStatus.REJECTED },
  { label: '已撤销', value: MatchProfileAuditStatus.REVOKED },
];

const DISPLAY_STATUS_OPTIONS = [
  { label: '公开', value: 'public' },
  { label: '仅专区可见', value: 'zone_only' },
  { label: '已隐藏', value: 'hidden' },
  { label: '已退出', value: 'quit' },
];

/** 显示状态下拉 → 服务端筛选参数。已退出只看 is_active，与 visibility 无关 */
const DISPLAY_STATUS_FILTERS: Record<string, { is_active: boolean; visibility?: number }> = {
  public: { is_active: true, visibility: UserVisibility.FULL },
  zone_only: { is_active: true, visibility: UserVisibility.ZONE },
  hidden: { is_active: true, visibility: UserVisibility.HIDE },
  quit: { is_active: false },
};

const filters: FilterConfig[] = [
  { name: 'audit_status', placeholder: '全部审核状态', type: 'select', options: AUDIT_STATUS_OPTIONS },
  { name: 'display_status', placeholder: '全部显示状态', type: 'select', options: DISPLAY_STATUS_OPTIONS },
  { name: 'keyword', placeholder: '搜索昵称、姓名或手机号', type: 'input' },
];

const AUDIT_MAP: Record<number, { color: string; text: string }> = {
  [MatchProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
  [MatchProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
  [MatchProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
  [MatchProfileAuditStatus.REVOKED]: { color: 'default', text: '已撤销' },
};

/** 显示状态 */
function getDisplayStatus(mp: CommunityUserItem['match_profile']): { text: string; color: string } {
  if (!mp) return { text: '-', color: 'default' };
  if (!mp.is_active) return { text: '已退出', color: 'default' };
  if (mp.visibility === UserVisibility.FULL) return { text: '公开', color: 'success' };
  if (mp.visibility === UserVisibility.ZONE) return { text: '仅专区可见', color: 'warning' };
  if (mp.visibility === UserVisibility.HIDE) return { text: '已隐藏', color: 'warning' };
  return { text: '-', color: 'default' };
}

const MatchProfileManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<CommunityUserItem | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [auditProfileOpen, setAuditProfileOpen] = useState(false);

  const fetchUsers = useCallback(async (params: any) => {
    const displayFilter = params.display_status
      ? DISPLAY_STATUS_FILTERS[params.display_status]
      : undefined;
    return userApi.getUsers({
      page: params.page,
      size: params.page_size || params.size,
      keyword: params.keyword || undefined,
      has_match_profile: true,
      match_audit_status: params.audit_status != null ? params.audit_status : undefined,
      ...displayFilter,
    });
  }, []);

  const formatUserResponse = useCallback((res: any) => ({
    list: res?.list || (Array.isArray(res) ? res : []),
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<CommunityUserItem>({
    fetchFn: fetchUsers,
    formatResponse: formatUserResponse,
  });

  const handleViewDetail = (record: CommunityUserItem) => {
    setDetailItem(record);
    setDetailModalOpen(true);
  };

  const columns: ColumnsType<CommunityUserItem> = [
    {
      title: '用户',
      key: 'nickname',
      width: 160,
      render: (_: any, record: CommunityUserItem) => (
        <Button
          type="link"
          style={{ padding: 0, height: 'auto' }}
          onClick={() => handleViewDetail(record)}
        >
          <Space size={4}>
            <Avatar src={getMediumUrl(record.match_profile?.photos?.[0] || record.profile.avatar)} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{record.profile.nickname || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '姓名',
      key: 'real_name',
      width: 100,
      render: (_: any, record: CommunityUserItem) => record.match_profile?.real_name || '-',
    },
    {
      title: '手机号',
      key: 'phone',
      width: 140,
      render: (_: any, record: CommunityUserItem) => record.user.phone || '-',
    },
    {
      title: '性别',
      key: 'gender',
      width: 60,
      render: (_: any, record: CommunityUserItem) => UserGenderLabels[record.profile.gender] || '-',
    },
    {
      title: '年龄',
      key: 'age',
      width: 60,
      render: (_: any, record: CommunityUserItem) => record.profile.age ?? '-',
    },
    {
      title: '婚姻状况',
      key: 'marital',
      width: 90,
      render: (_: any, record: CommunityUserItem) =>
        record.match_profile ? (MaritalStatusLabels[record.match_profile.marital_status] || '-') : '-',
    },
    {
      title: '人气值',
      key: 'popularity',
      width: 90,
      align: 'center',
      render: (_: any, record: CommunityUserItem) => record.match_profile?.popularity ?? '-',
    },
    {
      title: '状态',
      key: 'status',
      width: 170,
      render: (_: any, record: CommunityUserItem) => {
        const ds = getDisplayStatus(record.match_profile);
        const audit = record.match_profile?.audit_status;
        const a = AUDIT_MAP[audit ?? -1] || { color: 'default', text: '-' };
        return (
          <Space size={4}>
            <Tag color={a.color}>{a.text}</Tag>
            <Tag color={ds.color}>{ds.text}</Tag>
          </Space>
        );
      },
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
        title="脱单资料管理"
        description="管理已提交脱单档案的用户，支持按审核状态和显示状态筛选，查看用户完整资料和脱单档案详情。"
        showRefreshButton
        onRefresh={refresh}
        searchArea={
          <SearchPanel
            filters={filters}
            values={values}
            onChange={handleChange}
            onSearch={handleSearch}
            onReset={handleReset}
            inputWidth={240}
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

      <UserDetailCardModal
        visible={detailModalOpen}
        userId={detailItem?.user.user_id}
        onEditProfile={() => setEditProfileOpen(true)}
        onAuditProfile={() => setAuditProfileOpen(true)}
        onClose={() => { setDetailModalOpen(false); setDetailItem(null); }}
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

export default MatchProfileManagement;
