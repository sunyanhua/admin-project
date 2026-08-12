import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Tag, Space, Avatar } from 'antd';
import { CheckOutlined, ReloadOutlined, EyeOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import {
  RegisterAuditStatus, RegisterAuditStatusLabels, RegisterAuditStatusColors,
  RegisterPayStatus, RegisterPayStatusLabels, RegisterPayStatusColors,
  RegisterGender, RegisterGenderLabels,
  FreeFCFSStatusLabels, FreeFCFSStatusColors,
  ActivityType,
} from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import { DetailModal } from '@/components/templates/DetailModal';
import { buildUserDetailSections } from '@/components/user/UserDetailSections';
import type {
  CommunityUserSummary,
  CommunityProfileSummary,
  CommunityMatchProfileSummary,
  CommunityWalletSummary,
} from '@/api/types/user';
import { ProfileAuditStatus, MatchProfileAuditStatus } from '@/api/types/status';
import type { FormField } from '@/components/operation/FormConfigEditor';
import ScrollableModal from '@/components/templates/ScrollableModal';
import ActivityRegisterDetailModal from '@/components/operation/ActivityRegisterDetailModal';

interface ActivityRegisterModalProps {
  visible: boolean;
  activityId: string;
  activityTitle: string;
  activityType: number;
  formConfig: FormField[];
  onClose: () => void;
}

const EMPTY_WALLET: CommunityWalletSummary = {
  points: 0, points_earned: 0, points_spent: 0,
  coins: 0, coins_earned: 0, coins_spent: 0,
  version: 0, created_at: '', updated_at: '',
};

function buildUserDetailFromRecord(r: RegisterRecord) {
  const up = r.user_profile as any;
  const ud = r.user_data as any;
  const mp = r.user_match_profile as any;
  const nickname = up?.nickname || r.nickname || r.user_id;
  const avatar = up?.avatar || r.avatar || '';
  const gender = up?.gender ?? r.gender;
  const age = up?.age ?? r.age ?? 0;
  return {
    user: {
      user_id: r.user_id, phone: ud?.phone || r.phone || '', wallet_balance: 0,
      credits: ud?.credits ?? 0, credits_weekly: 0, credits_weekly_rank: null,
      is_migrated: true, is_activated: ud?.is_activated ?? true,
      activated_at: ud?.activated_at || null,
      last_active_at: ud?.last_active_at || null,
      created_at: ud?.created_at || r.created_at || '',
      has_profile: true, has_match_profile: !!mp,
      status: 0,
    } as CommunityUserSummary,
    profile: {
      nickname, avatar,
      gender: gender ?? 0,
      birth_date: up?.birth_date || '',
      age: age ?? 0, zodiac: up?.zodiac || '',
      audit_status: up?.audit_status ?? ProfileAuditStatus.APPROVED,
      created_at: up?.created_at || '', updated_at: up?.updated_at || '',
    } as CommunityProfileSummary,
    matchProfile: mp ? {
      match_code: mp.match_code || '', popularity: mp.popularity ?? 0,
      is_active: mp.is_active ?? true, visibility: mp.visibility ?? 1,
      zone_id: mp.zone_id || null, real_name: mp.real_name || '',
      cn_zodiac: mp.cn_zodiac || '', marital_status: mp.marital_status ?? 0,
      education: mp.education ?? 0, profession: mp.profession || '',
      workplace: mp.workplace || '', hometown: mp.hometown || '',
      current_city: mp.current_city || '', height: mp.height ?? 0,
      weight: mp.weight ?? 0, hobby_tags: mp.hobby_tags || '',
      income_range: mp.income_range ?? null, self_intro: mp.self_intro || '',
      partner_demand: mp.partner_demand || '', photos: mp.photos || [],
      id_card_tail: mp.id_card_tail || null, blood_type: mp.blood_type ?? 0,
      ethnicity: mp.ethnicity || '', household_registration: mp.household_registration || '',
      specialties: mp.specialties || '',
      audit_status: mp.audit_status ?? MatchProfileAuditStatus.APPROVED,
      audit_reason: mp.audit_reason || null, audited_by: mp.audited_by || null,
      audited_at: mp.audited_at || null, can_modify_at: mp.can_modify_at || null,
      is_org_certified: mp.is_org_certified || false,
      is_real_verified: mp.is_real_verified || false,
      gifts_received: mp.gifts_received ?? 0,
    } as unknown as CommunityMatchProfileSummary : null,
    wallet: EMPTY_WALLET,
  };
}

const ActivityRegisterModal: React.FC<ActivityRegisterModalProps> = ({
  visible, activityId, activityTitle, activityType, formConfig, onClose,
}) => {
  const { success, error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<RegisterRecord | null>(null);
  const [detailReadonly, setDetailReadonly] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailRecord, setUserDetailRecord] = useState<RegisterRecord | null>(null);
  const [exporting, setExporting] = useState(false);

  const isFreeFCFS = activityType === ActivityType.FREE_FCFS;
  const isPaidFCFS = activityType === ActivityType.PAID_FCFS;
  const isFreeReview = activityType === ActivityType.FREE_REVIEW;

  const fetchRegisters = useCallback(async (params: any) => {
    if (!activityId) return { list: [], total: 0 };
    return activityApi.getRegisters(activityId, {
      page: params.page, size: params.page_size,
      audit_status: params.audit_status,
      pay_status: params.pay_status,
      gender: params.gender,
      keyword: params.keyword,
    });
  }, [activityId]);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<RegisterRecord>({
    fetchFn: fetchRegisters,
    formatResponse,
  });

  const prevKeyRef = useRef('');
  useEffect(() => {
    const key = `${visible}-${activityId}`;
    if (visible && activityId && key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setSearchValues({});
      search({ _t: Date.now() });
    }
  }, [visible, activityId, search]);

  const handleSearchChange = (name: string, value: any) => setSearchValues(p => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleExport = async () => {
    setExporting(true);
    try {
      // 循环分页拉取全部数据
      const allData: RegisterRecord[] = [];
      let page = 1;
      while (true) {
        const res: any = await activityApi.getRegisters(activityId, { page, size: 100 });
        const list: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        allData.push(...list);
        if (list.length < 100) break;
        page++;
      }
      const headers = ['用户名', '姓名', '性别', '年龄', '手机号', '婚姻状况', '学历', '户籍', '单位'];
      if (isFreeFCFS) headers.push('报名状态');
      else if (isPaidFCFS) { headers.push('支付状态', '完成时间'); }
      else if (isFreeReview) { headers.push('审核状态', '拒绝原因', '报名时间'); }
      if (!isFreeReview) headers.push('报名时间');
      formConfig.forEach(f => headers.push(f.label));
      const rows: string[][] = [];
      const MARITAL_MAP: Record<number, string> = { 1: '未婚', 2: '已婚', 3: '离异', 4: '丧偶' };
      const EDUCATION_MAP: Record<number, string> = { 1: '高中及以下', 2: '大专', 3: '本科', 4: '硕士', 5: '博士', 6: '其他' };
      for (const item of allData) {
        const up = item.user_profile;
        const mp = item.user_match_profile as any;
        const nickname = up?.nickname || item.nickname || item.user_id;
        const name = mp?.real_name || '';
        const gender = up?.gender ?? item.gender;
        const genderLabel = gender != null ? (RegisterGenderLabels[gender] ?? String(gender)) : '';
        const age = up?.age ?? item.age ?? '';
        const phone = (item.user_data as any)?.phone || item.phone || '';
        const marital = mp?.marital_status != null ? (MARITAL_MAP[mp.marital_status] || String(mp.marital_status)) : '';
        const edu = mp?.education != null ? (EDUCATION_MAP[mp.education] || String(mp.education)) : '';
        const household = mp?.household_registration || '';
        const workplace = mp?.workplace || '';
        const createdAt = item.created_at ? item.created_at.replace('T', ' ').substring(0, 19) : '';
        const completedAt = item.completed_at ? item.completed_at.replace('T', ' ').substring(0, 19) : '';
        let formDataMap: Record<string, any> = {};
        try { formDataMap = JSON.parse(item.form_data || '{}'); } catch { /* ignore */ }
        const attsByField: Record<string, string[]> = {};
        for (const att of (item.attachments || [])) {
          const tag = (att as any).tags || '';
          if (!attsByField[tag]) attsByField[tag] = [];
          attsByField[tag].push(att.url);
        }
        const row = [nickname, name, genderLabel, String(age), phone, marital, edu, household, workplace];
        if (isFreeFCFS) { row.push(FreeFCFSStatusLabels[item.pay_status] || String(item.pay_status)); }
        else if (isPaidFCFS) { row.push(RegisterPayStatusLabels[item.pay_status] || String(item.pay_status), completedAt); }
        else if (isFreeReview) { row.push(RegisterAuditStatusLabels[item.audit_status] || String(item.audit_status), item.audit_reason || '', createdAt); }
        if (!isFreeReview) row.push(createdAt);
        formConfig.forEach(f => {
          const val = formDataMap[f.id];
          const urls = attsByField[f.id] || [];
          const parts: string[] = [];
          if (val != null) parts.push(String(val));
          parts.push(...urls);
          row.push(parts.join(', '));
        });
        rows.push(row);
      }
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = headers.map(() => ({ wch: 20 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '报名名单');
      XLSX.writeFile(wb, `${activityTitle}_报名名单.xlsx`);
      success('导出成功');
    } catch (err: any) {
      showError(err?.response?.data?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const openDetail = (record: RegisterRecord, readonly: boolean) => {
    setDetailRecord(record);
    setDetailReadonly(readonly);
    setDetailVisible(true);
  };

  // 筛选
  const filters: FilterConfig[] = [];
  if (isFreeFCFS) {
    filters.push({ name: 'pay_status', placeholder: '全部报名状态', type: 'select',
      options: [
        { label: '已完成', value: RegisterPayStatus.PAID },
        { label: '已取消', value: RegisterPayStatus.REFUNDED },
      ],
    });
  } else if (isPaidFCFS) {
    filters.push({ name: 'pay_status', placeholder: '全部支付状态', type: 'select',
      options: [
        { label: '待支付', value: RegisterPayStatus.UNPAID },
        { label: '已支付', value: RegisterPayStatus.PAID },
        { label: '已取消', value: RegisterPayStatus.REFUNDED },
      ],
    });
  } else if (isFreeReview) {
    filters.push({ name: 'audit_status', placeholder: '全部审核状态', type: 'select',
      options: [
        { label: '待审核', value: RegisterAuditStatus.PENDING },
        { label: '已通过', value: RegisterAuditStatus.APPROVED },
      ],
    });
  }
  filters.push({ name: 'gender', placeholder: '全部性别', type: 'select',
    options: [
      { label: '男', value: RegisterGender.MALE },
      { label: '女', value: RegisterGender.FEMALE },
    ],
  });
  filters.push({ name: 'keyword', placeholder: '搜索用户名/昵称', type: 'input' });

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
            onClick={() => { setUserDetailRecord(r); setUserDetailVisible(true); }}>
            <Space size={4}>
              <Avatar size={40} style={{ borderRadius: '50%', flexShrink: 0 }} src={getAvatarUrl(avatar)} />
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
      render: (_: any, r: RegisterRecord) => {
        const name = r.user_match_profile?.real_name;
        return name || <span style={{ color: '#999' }}>-</span>;
      },
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
  ];

  if (isFreeFCFS) {
    columns.push(
      dateTimeColumn<RegisterRecord>('created_at', '报名时间'),
      { title: '报名状态', dataIndex: 'pay_status', key: 'pay_status', width: 90,
        render: (v: number) => <Tag color={FreeFCFSStatusColors[v] || 'default'}>{FreeFCFSStatusLabels[v] ?? v}</Tag> },
    );
  } else if (isPaidFCFS) {
    columns.push(
      { title: '支付状态', dataIndex: 'pay_status', key: 'pay_status', width: 90,
        render: (v: number) => <Tag color={RegisterPayStatusColors[v] || 'default'}>{RegisterPayStatusLabels[v] ?? v}</Tag> },
      dateTimeColumn<RegisterRecord>('completed_at', '完成时间'),
    );
  } else if (isFreeReview) {
    columns.push(
      { title: '审核状态', dataIndex: 'audit_status', key: 'audit_status', width: 80,
        render: (v: number) => <Tag color={RegisterAuditStatusColors[v] || 'default'}>{RegisterAuditStatusLabels[v] ?? v}</Tag> },
      dateTimeColumn<RegisterRecord>('created_at', '报名时间'),
    );
  }

  // 报名信息列
  if (formConfig.length > 0) {
    columns.push({
      title: '报名信息', key: 'form_info', width: 80,
      render: (_: any, r: RegisterRecord) => {
        if (!r.form_data) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r, true)}>[详情]</Button>
        );
      },
    });
  }

  // 操作列
  if (isFreeReview) {
    columns.push({
      title: '操作', key: 'action', width: 140, fixed: 'right' as const,
      render: (_: any, r: RegisterRecord) => {
        const isPending = r.audit_status === RegisterAuditStatus.PENDING;
        return (
          <Space size="small" className="action-buttons">
            {isPending ? (
              <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => openDetail(r, false)}>审核</Button>
            ) : (
              <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r, true)}>查看</Button>
            )}
          </Space>
        );
      },
    });
  }

  return (
    <>
      <ScrollableModal
        title={`报名名单 - ${activityTitle}`}
        open={visible}
        onCancel={onClose}
        width={1100}
        footer={false}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
          <Space style={{ marginLeft: 12, flexShrink: 0 }}>
            <Button icon={<ExportOutlined />} loading={exporting} onClick={handleExport}>导出</Button>
            <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
          </Space>
          </div>
          <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
        </div>
      </ScrollableModal>

      <ActivityRegisterDetailModal
        visible={detailVisible}
        record={detailRecord}
        formConfig={formConfig}
        activityType={activityType}
        readonly={detailReadonly}
        onClose={() => { setDetailVisible(false); setDetailRecord(null); }}
        onSuccess={refresh}
      />

      {userDetailRecord && (
        <DetailModal
          title="用户资料"
          open={userDetailVisible}
          entity={buildUserDetailFromRecord(userDetailRecord)}
          width={720}
          className="user-detail-modal"
          onClose={() => { setUserDetailVisible(false); setUserDetailRecord(null); }}
          render={(props: ReturnType<typeof buildUserDetailFromRecord>) =>
            buildUserDetailSections(props)
          }
        />
      )}
    </>
  );
};

export default ActivityRegisterModal;
