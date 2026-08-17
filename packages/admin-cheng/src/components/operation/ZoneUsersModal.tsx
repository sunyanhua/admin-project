import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Space, Tag, Avatar } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { userApi } from '@/api/services/user';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import ScrollableModal from '@/components/templates/ScrollableModal';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import { getMediumUrl } from '@/utils/imageUtils';
import { MatchProfileAuditStatus } from '@/api/types/status';
import type { CommunityUserItem } from '@/api/types/user';

const GENDER_MAP: Record<number, string> = { 1: '男', 2: '女' };
const MARITAL_MAP: Record<number, string> = { 1: '未婚', 2: '已婚', 3: '离异', 4: '丧偶' };

const AUDIT_MAP: Record<number, { color: string; text: string }> = {
  [MatchProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
  [MatchProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
  [MatchProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
  [MatchProfileAuditStatus.REVOKED]: { color: 'default', text: '已撤销' },
};

/** 显示状态（与脱单资料管理一致） */
function getDisplayStatus(mp: CommunityUserItem['match_profile']): { text: string; color: string } {
  if (!mp) return { text: '-', color: 'default' };
  if (!mp.is_active) return { text: '已退出', color: 'default' };
  if (mp.visibility === 1) return { text: '公开', color: 'success' };
  if (mp.visibility === 2) return { text: '仅专区可见', color: 'warning' };
  if (mp.visibility === 3) return { text: '已隐藏', color: 'warning' };
  return { text: '-', color: 'default' };
}

interface ZoneUsersModalProps {
  visible: boolean;
  zoneId: string;
  zoneName: string;
  onClose: () => void;
}

const ZoneUsersModal: React.FC<ZoneUsersModalProps> = ({ visible, zoneId, zoneName, onClose }) => {
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState('');

  const fetchUsers = useCallback(async (params: any) => {
    if (!zoneId) return { list: [], total: 0 };
    return userApi.getUsers({
      page: params.page,
      size: params.page_size,
      keyword: params.keyword || undefined,
      has_match_profile: true,
      zone_id: zoneId,
    });
  }, [zoneId]);

  const formatUserResponse = useCallback((res: any) => ({
    list: res?.list || (Array.isArray(res) ? res : []),
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<CommunityUserItem>({
    fetchFn: fetchUsers,
    formatResponse: formatUserResponse,
    dependencies: [zoneId],
  });

  const prevKeyRef = useRef('');
  useEffect(() => {
    const key = `${visible}-${zoneId}`;
    if (visible && zoneId && key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setSearchValues({});
      search({ _t: Date.now() });
    }
  }, [visible, zoneId, search]);

  const handleSearchChange = (name: string, value: any) => setSearchValues(p => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const filters: FilterConfig[] = [
    { name: 'keyword', placeholder: '搜索昵称、姓名或手机号', type: 'input' },
  ];

  const columns: ColumnsType<CommunityUserItem> = [
    {
      title: '用户',
      key: 'nickname',
      width: 160,
      render: (_: any, record: CommunityUserItem) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }}
          onClick={() => { setUserDetailUserId(record.user.user_id); setUserDetailVisible(true); }}>
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
      render: (_: any, record: CommunityUserItem) => GENDER_MAP[record.profile.gender] || '-',
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
        record.match_profile ? (MARITAL_MAP[record.match_profile.marital_status] || '-') : '-',
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
  ];

  return (
    <>
      <ScrollableModal
        title={`专区用户 - ${zoneName}`}
        open={visible}
        onCancel={onClose}
        width={1050}
        footer={false}
      >
        <div style={{ marginBottom: 12 }}>
          <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        </div>
        <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange}
          scroll={{ x: 900 }} rowKey={(r: CommunityUserItem) => r.user.user_id} />
      </ScrollableModal>

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />
    </>
  );
};

export default ZoneUsersModal;
