import { useState, useCallback, useEffect } from 'react';
import { Tag, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, ReloadOutlined, TrophyOutlined, ExportOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useAuth } from '@/contexts/AuthContext';
import { userApi } from '../../api/services/user';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import RealNameWithTag from '@/components/user/RealNameWithTag';
import ProfileEditModal from '@/components/user/ProfileEditModal';
import AuditMatchProfileModal from '@/components/user/AuditMatchProfileModal';
import { MatchProfileAuditStatus, UserVisibility, UserGenderLabels, MaritalStatusLabels, EducationLabels } from '@/api/types/status';
import UserAvatar from '@/components/user/UserAvatar';
import { formatDateTime } from '@/utils/format';
import type { CommunityUserItem } from '@/api/types/user';
import '@/styles/user-detail-modal.css';

const AUDIT_STATUS_OPTIONS = [
  { label: '待审核', value: MatchProfileAuditStatus.PENDING },
  { label: '审核通过', value: MatchProfileAuditStatus.APPROVED },
  { label: '审核拒绝', value: MatchProfileAuditStatus.REJECTED },
  { label: '已退出', value: MatchProfileAuditStatus.REVOKED },
];

const DISPLAY_STATUS_OPTIONS = [
  { label: '公开', value: 'public' },
  { label: '仅专区可见', value: 'zone_only' },
  { label: '已隐藏', value: 'hidden' },
];

/** 显示状态下拉 → 服务端筛选参数 */
const DISPLAY_STATUS_FILTERS: Record<string, { is_active: boolean; visibility?: number }> = {
  public: { is_active: true, visibility: UserVisibility.FULL },
  zone_only: { is_active: true, visibility: UserVisibility.ZONE },
  hidden: { is_active: true, visibility: UserVisibility.HIDE },
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
  [MatchProfileAuditStatus.REVOKED]: { color: 'default', text: '已退出' },
};

/** 列表筛选参数组装（列表与导出共用，保证导出与搜索筛选口径一致） */
function buildListParams(params: Record<string, any>) {
  const displayFilter = params.display_status ? DISPLAY_STATUS_FILTERS[params.display_status] : undefined;
  return {
    page: params.page,
    size: params.size,
    keyword: params.keyword || undefined,
    has_match_profile: true,
    match_audit_status: params.audit_status != null ? params.audit_status : undefined,
    ...displayFilter,
  };
}

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
  const { success, error: showError } = useAppNotification();
  const { user } = useAuth();
  const isSuperAdmin = user?.isRoot ?? false;
  const [values, setValues] = useState<Record<string, any>>({});

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<CommunityUserItem | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [auditProfileOpen, setAuditProfileOpen] = useState(false);
  // 审核完成后触发资料卡片重新拉取
  const [auditReloadKey, setAuditReloadKey] = useState(0);
  const [ranking, setRanking] = useState(false);

  const fetchUsers = useCallback(async (params: any) => {
    return userApi.getUsers(buildListParams({
      page: params.page,
      size: params.page_size || params.size,
      keyword: params.keyword,
      audit_status: params.audit_status,
      display_status: params.display_status,
    }));
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

  const [exporting, setExporting] = useState(false);
  /** 导出按钮默认隐藏，按 Shift+1 切换显示 */
  const [exportVisible, setExportVisible] = useState(false);

  /** 导出脱单资料：按当前搜索筛选结果全量分页拉取后生成 Excel */
  const handleExport = async () => {
    setExporting(true);
    try {
      const all: CommunityUserItem[] = [];
      let page = 1;
      while (true) {
        const res: any = await userApi.getUsers(buildListParams({ page, size: 100, ...values }));
        const list: CommunityUserItem[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        all.push(...list);
        if (list.length < 100) break;
        page++;
      }
      // 脱敏身份证号（隐私接口，读取留痕）
      const userIds = all.map((r) => r.user.user_id).filter(Boolean);
      const idCardMap: Record<string, string> = userIds.length ? await userApi.getUserPrivacyBatch(userIds) : {};

      const headers = ['能成ID', '姓名', '手机号', '性别', '年龄', '是否实名', '身份证号', '星座', '职业', '学历', '民族', '户籍', '工作单位', '毕业学校', '注册时间', '最近活跃时间'];
      const rows = all.map((r) => [
        r.match_profile?.match_code || '',
        r.match_profile?.real_name || '',
        r.user.phone || '',
        UserGenderLabels[r.profile.gender] || '',
        r.profile.age ?? '',
        r.match_profile?.is_real_verified ? '是' : '否',
        idCardMap[r.user.user_id] || '',
        r.profile.zodiac || '',
        r.match_profile?.profession || '',
        r.match_profile?.education != null ? (EducationLabels[r.match_profile.education] || r.match_profile.education) : '',
        r.match_profile?.ethnicity || '',
        r.match_profile?.household_registration || '',
        r.match_profile?.workplace || '',
        r.match_profile?.graduate || '',
        r.user.created_at ? formatDateTime(r.user.created_at) : '',
        r.user.last_active_at ? formatDateTime(r.user.last_active_at) : '',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '脱单资料');
      XLSX.writeFile(wb, `脱单资料_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
      success(`导出成功，共 ${all.length} 条`);
    } catch (err: any) {
      showError(err?.response?.data?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  // Shift+1 切换导出按钮显示（输入框聚焦时不拦截按键）
  useEffect(() => {
    const onkey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === '!' || (e.shiftKey && e.key === '1')) {
        setExportVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onkey);
    return () => window.removeEventListener('keydown', onkey);
  }, []);

  // 执行排名结算（嗑学分周榜）
  const handleRank = async () => {
    setRanking(true);
    try {
      const res: any = await userApi.settleWeeklyRank();
      const weekId = res?.week_id ? `（${res.week_id}）` : '';
      success(`排名结算成功${weekId}，上榜 ${res?.user_count ?? 0} 人`);
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '排名执行失败');
    } finally {
      setRanking(false);
    }
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
            <UserAvatar src={record.match_profile?.photos?.[0] || record.profile.avatar} nick={record.profile.nickname} />
            <span style={{ fontSize: 14 }}>{record.profile.nickname || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '姓名',
      key: 'real_name',
      width: 100,
      render: (_: any, record: CommunityUserItem) => (
        <RealNameWithTag name={record.match_profile?.real_name} verified={record.match_profile?.is_real_verified} />
      ),
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
            {/* 审核状态为「已退出」时不显示显示状态 */}
            {audit !== MatchProfileAuditStatus.REVOKED && <Tag color={ds.color}>{ds.text}</Tag>}
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
        extraActions={
          <>
            {exportVisible && (
              <Button icon={<ExportOutlined />} loading={exporting} onClick={handleExport}>导出</Button>
            )}
            {isSuperAdmin && (
              <Button icon={<TrophyOutlined />} loading={ranking} onClick={handleRank}>排名</Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
          </>
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
        reloadKey={auditReloadKey}
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
          setAuditReloadKey((k) => k + 1);
          refresh();
        }}
      />
    </>
  );
};

export default MatchProfileManagement;
