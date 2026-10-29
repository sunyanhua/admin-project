import { useState, useCallback } from 'react';
import { Button, Space, Tag, Tabs } from 'antd';
import { DesktopOutlined, CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import { RegisterAuditStatus, RegisterGenderLabels } from '@shared/constants';
import UserAvatar from '@/components/user/UserAvatar';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import RealNameWithTag from '@/components/user/RealNameWithTag';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import ActivityCpTab from '@/components/operation/ActivityCpTab';

interface OnsiteManageModalProps {
  visible: boolean;
  activityId: string;
  activityTitle: string;
  onClose: () => void;
}

/** 签到筛选哨兵值（映射 checked_in=true） */
const CHECKED = 'checked';

const LIST_FILTERS: FilterConfig[] = [
  { name: 'check_status', placeholder: '全部状态', type: 'select',
    options: [{ label: '已签到', value: CHECKED }],
  },
  { name: 'keyword', placeholder: '搜索用户名/昵称', type: 'input' },
];

/** 入选名单 TAB：当前已入选用户列表（与报名名单样式一致），状态仅显示 已签到/未签到 */
const ApprovedListTab: React.FC<{ activityId: string }> = ({ activityId }) => {
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState('');
  const [userDetailRegisterId, setUserDetailRegisterId] = useState('');

  const fetchList = useCallback(async (params: any) => {
    if (!activityId) return { list: [], total: 0 };
    const res: any = await activityApi.getRegisters(activityId, {
      page: params.page, size: params.page_size,
      audit_status: RegisterAuditStatus.APPROVED,
      checked_in: params.check_status === CHECKED ? true : undefined,
      keyword: params.keyword || undefined,
    });
    const list: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, total };
  }, [activityId]);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<RegisterRecord>({
    fetchFn: fetchList,
  });

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const columns: ColumnsType<RegisterRecord> = [
    {
      title: '用户名',
      key: 'user',
      width: 160,
      render: (_: any, r: RegisterRecord) => {
        const up = r.user_profile;
        const nickname = up?.nickname || r.nickname || r.user_id;
        const avatar = up?.avatar || r.avatar || '';
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }}
            onClick={() => { setUserDetailUserId(r.user_id); setUserDetailRegisterId(r.id); setUserDetailVisible(true); }}>
            <Space size={4}>
              <UserAvatar src={avatar} nick={nickname} />
              <span style={{ fontSize: 14 }}>{nickname}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '姓名',
      key: 'real_name',
      width: 100,
      render: (_: any, r: RegisterRecord) => (
        <RealNameWithTag name={r.user_match_profile?.real_name} verified={r.user_match_profile?.is_real_verified} />
      ),
    },
    {
      title: '性别',
      key: 'gender',
      width: 70,
      render: (_: any, r: RegisterRecord) => {
        const g = r.user_profile?.gender ?? r.gender;
        return g != null ? (RegisterGenderLabels[g] ?? g) : '-';
      },
    },
    {
      title: '手机号',
      key: 'phone',
      width: 130,
      render: (_: any, r: RegisterRecord) => {
        const phone = r.user_data?.phone || r.phone;
        return phone || <span style={{ color: '#999' }}>-</span>;
      },
    },
    {
      title: '状态',
      key: 'checkin',
      width: 100,
      render: (_: any, r: RegisterRecord) => (
        r.checkin_at
          ? <Tag color="blue" icon={<CheckCircleOutlined />} style={{ borderRadius: 10 }}>已签到</Tag>
          : <Tag color="default">未签到</Tag>
      ),
    },
    dateTimeColumn<RegisterRecord>('created_at', '报名时间'),
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SearchPanel filters={LIST_FILTERS} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        <Button icon={<ReloadOutlined />} style={{ marginLeft: 12, flexShrink: 0 }} onClick={refresh}>刷新</Button>
      </div>
      <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        fetchDetail={() => activityApi.getRegisterUser(activityId, userDetailRegisterId)}
        fetchPrivacy={() => activityApi.getRegisterUserPrivacy(activityId, userDetailRegisterId)}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); setUserDetailRegisterId(''); }}
      />
    </div>
  );
};

/**
 * 现场管理弹窗（开启现场签到的活动）：
 * - 入选名单：已入选用户列表（状态仅 已签到/未签到，状态筛选仅「已签到」）
 * - 组CP：原报名名单中的组CP TAB 完整功能
 * - 右侧「大屏」按钮：新窗口打开现场大屏页面
 */
const OnsiteManageModal: React.FC<OnsiteManageModalProps> = ({ visible, activityId, activityTitle, onClose }) => {
  const [tabKey, setTabKey] = useState('list');

  const openBigScreen = () => {
    const base = window.location.href.split('#')[0];
    window.open(`${base}#/activity-onsite/${activityId}`, '_blank');
  };

  return (
    <ScrollableModal
      title={`现场管理 - ${activityTitle}`}
      open={visible}
      onCancel={onClose}
      width={1100}
      footer={false}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Tabs
          style={{ flex: 1 }}
          activeKey={tabKey}
          onChange={setTabKey}
          items={[
            { key: 'list', label: '入选名单', children: <ApprovedListTab activityId={activityId} /> },
            { key: 'cp', label: '组CP', children: tabKey === 'cp' ? <ActivityCpTab activityId={activityId} /> : null },
          ]}
        />
        <Button type="primary" icon={<DesktopOutlined />} style={{ marginLeft: 16, flexShrink: 0, marginBottom: 16 }} onClick={openBigScreen}>
          大屏
        </Button>
      </div>
    </ScrollableModal>
  );
};

export default OnsiteManageModal;
