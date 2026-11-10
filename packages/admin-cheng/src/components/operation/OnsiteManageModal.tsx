import { useState, useCallback, useEffect } from 'react';
import { Button, Space, Tag, Tabs, Avatar, InputNumber } from 'antd';
import { DesktopOutlined, CheckCircleOutlined, ReloadOutlined, PlusOutlined, OrderedListOutlined, CheckSquareOutlined, UserOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import type { ColumnsType } from 'antd/es/table';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { activityApi, RegisterRecord, PresignRecord, Activity } from '@/api/services/activity-v1';
import { RegisterAuditStatus, RegisterGender, RegisterGenderLabels } from '@shared/constants';
import UserAvatar from '@/components/user/UserAvatar';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import RealNameWithTag from '@/components/user/RealNameWithTag';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import ActivityCpTab from '@/components/operation/ActivityCpTab';
import ActivityRegisterAddModal from '@/components/operation/ActivityRegisterAddModal';
import OnsiteConfigTab from '@/components/operation/OnsiteConfigTab';
import OnsiteGroupTab from '@/components/operation/OnsiteGroupTab';
import OnsiteRoutineTab from '@/components/operation/OnsiteRoutineTab';
import OnsiteDeductScoreModal from '@/components/operation/OnsiteDeductScoreModal';
import { formatDateTime, parseApiTime } from '@/utils/format';

interface OnsiteManageModalProps {
  visible: boolean;
  activityId: string;
  activityTitle: string;
  /** 列表行数据（现场配置回填同源，与编辑弹窗一致） */
  activity?: Activity | null;
  onClose: () => void;
}

/** 签到筛选哨兵值（映射 checked_in=true / false） */
const CHECKED = 'checked';
const UNCHECKED = 'unchecked';

const LIST_FILTERS: FilterConfig[] = [
  { name: 'check_status', placeholder: '全部状态', type: 'select',
    options: [
      { label: '已签到', value: CHECKED },
      { label: '未签到', value: UNCHECKED },
    ],
  },
  { name: 'gender', placeholder: '全部性别', type: 'select',
    options: [
      { label: '男', value: RegisterGender.MALE },
      { label: '女', value: RegisterGender.FEMALE },
    ],
  },
  { name: 'keyword', placeholder: '搜索用户名/昵称', type: 'input' },
];

/** 入选名单 TAB：已入选用户管理（添加/排序/签到/序号），未注册用户展示与报名名单一致 */
const ApprovedListTab: React.FC<{ activityId: string; activityTitle: string; activity?: Activity | null; onDeducted?: () => void }> = ({ activityId, activityTitle, activity, onDeducted }) => {
  const { success, error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState('');
  const [userDetailRegisterId, setUserDetailRegisterId] = useState('');
  const [addVisible, setAddVisible] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [deductVisible, setDeductVisible] = useState(false);

  /** 已完成扣分标记（onsite_config.deduct_done_at） */
  const deductDoneAt = (() => {
    try {
      const obj = JSON.parse(activity?.onsite_config || '{}');
      return obj && typeof obj === 'object' ? (obj.deduct_done_at || '') : '';
    } catch { return ''; }
  })();

  /** 免报名入选记录（user_id 为空）反查预报名信息，补齐姓名/性别/手机号（与报名名单一致） */
  const enrichAdminRecords = useCallback(async (list: RegisterRecord[]) => {
    const adminRecords = list.filter((r) => !r.user_id && r.presign_id);
    if (!adminRecords.length) return list;
    const enriched = await Promise.all(adminRecords.map(async (r) => {
      try {
        const res: any = await activityApi.getPresigns(activityId, { register_id: r.id, page: 1, size: 20 });
        const p: PresignRecord | undefined = Array.isArray(res) ? res[0] : (res?.list || [])[0];
        if (!p) return r;
        return { ...r, presign_real_name: p.real_name, presign_phone: p.phone, presign_gender: p.gender };
      } catch { return r; } // 反查失败不阻塞列表展示
    }));
    const map = new Map(enriched.map((r) => [r.id, r]));
    return list.map((r) => map.get(r.id) || r);
  }, [activityId]);

  const fetchList = useCallback(async (params: any) => {
    if (!activityId) return { list: [], total: 0 };
    const res: any = await activityApi.getRegisters(activityId, {
      page: params.page, size: params.page_size,
      audit_status: RegisterAuditStatus.APPROVED,
      checked_in: params.check_status === CHECKED ? true : params.check_status === UNCHECKED ? false : undefined,
      gender: params.gender,
      keyword: params.keyword || undefined,
    });
    const list: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list: await enrichAdminRecords(list), total };
  }, [activityId, enrichAdminRecords]);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<RegisterRecord>({
    fetchFn: fetchList,
  });

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  /** 单条修改现场编号（≥1） */
  const handleOnsiteNumberChange = async (record: RegisterRecord, num: number) => {
    try {
      await activityApi.updateOnsiteNumber(activityId, record.id, num);
      success('序号已更新');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '序号更新失败');
    }
  };

  /** 单条清空现场编号（置 NULL，该行重新进入「一键分配」补号池） */
  const handleOnsiteNumberClear = async (record: RegisterRecord) => {
    try {
      await activityApi.clearOnsiteNumber(activityId, record.id);
      success('序号已清空');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '序号清空失败');
    }
  };

  /**
   * 现场编号一键分配（按性别 1..N 自动排序）。
   * 批量分配完成后补号：对仍无现场序号的已入选用户按男女性别各自最大序号 +1 递增逐条分配（性别未设置不补号）。
   */
  const handleAssignNumbers = async () => {
    setAssigning(true);
    try {
      const res: any = await activityApi.assignOnsiteNumbers(activityId);
      const male = res?.male_count ?? 0;
      const female = res?.female_count ?? 0;

      const regs: RegisterRecord[] = [];
      let page = 1;
      while (true) {
        const listRes: any = await activityApi.getRegisters(activityId, { page, size: 100, audit_status: RegisterAuditStatus.APPROVED });
        const list: RegisterRecord[] = Array.isArray(listRes) ? listRes : (listRes?.list || []);
        if (!list.length) break;
        regs.push(...list);
        if (list.length < 100) break;
        page++;
      }
      const genderOf = (r: RegisterRecord) => r.user_profile?.gender ?? r.gender;
      let maxM = Math.max(0, ...regs.filter((r) => genderOf(r) === RegisterGender.MALE).map((r) => r.onsite_number ?? 0));
      let maxF = Math.max(0, ...regs.filter((r) => genderOf(r) === RegisterGender.FEMALE).map((r) => r.onsite_number ?? 0));
      const unnumbered = regs.filter((r) => r.onsite_number == null &&
        (genderOf(r) === RegisterGender.MALE || genderOf(r) === RegisterGender.FEMALE));
      let filled = 0;
      for (let i = 0; i < unnumbered.length; i++) {
        const r = unnumbered[i];
        try {
          if (genderOf(r) === RegisterGender.MALE) { maxM++; await activityApi.updateOnsiteNumber(activityId, r.id, maxM); }
          else { maxF++; await activityApi.updateOnsiteNumber(activityId, r.id, maxF); }
          filled++;
        } catch (err: any) {
          showError(`补号第 ${i + 1} 条失败：${err?.response?.data?.message || err?.message || '未知错误'}`);
          break;
        }
      }

      const extra = filled > 0 ? `，补号 ${filled} 人` : '';
      success(`编号分配完成：男 ${male} 人，女 ${female} 人${extra}`);
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '编号分配失败');
    } finally {
      setAssigning(false);
    }
  };

  /** 后台代签到：为已入选注册用户写入现场签到时间（未注册用户不提供） */
  const handleCheckin = async (record: RegisterRecord) => {
    setCheckingIds((prev) => new Set(prev).add(record.id));
    try {
      await activityApi.checkinRegister(activityId, record.id);
      success('签到成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '签到失败');
    } finally {
      setCheckingIds((prev) => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
  };

  const columns: ColumnsType<RegisterRecord> = [
    {
      title: '用户名',
      key: 'user',
      width: 160,
      render: (_: any, r: RegisterRecord) => {
        // 免报名入选产生的报名记录（无注册用户）：灰色人头 + 灰色「未注册」，不可点击（与报名名单一致）
        if (!r.user_id) return (
          <Space size={4}>
            <Avatar size={40} style={{ borderRadius: '50%', flexShrink: 0, background: '#d9d9d9', color: '#fff' }} icon={<UserOutlined />} />
            <span style={{ fontSize: 14, color: '#999' }}>未注册</span>
          </Space>
        );
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
      render: (_: any, r: RegisterRecord) => {
        // 免报名入选记录：姓名取自反查的预报名信息（与报名名单一致）
        if (!r.user_id) return r.presign_real_name || '-';
        return <RealNameWithTag name={r.user_match_profile?.real_name} verified={r.user_match_profile?.is_real_verified} />;
      },
    },
    {
      title: '性别',
      key: 'gender',
      width: 70,
      render: (_: any, r: RegisterRecord) => {
        const g = r.user_profile?.gender ?? r.gender ?? r.presign_gender;
        return g != null ? (RegisterGenderLabels[g] ?? g) : '-';
      },
    },
    {
      title: '手机号',
      key: 'phone',
      width: 130,
      render: (_: any, r: RegisterRecord) => {
        const phone = r.user_data?.phone || r.phone || r.presign_phone;
        return phone || <span style={{ color: '#999' }}>-</span>;
      },
    },
    {
      title: '序号',
      dataIndex: 'onsite_number',
      key: 'onsite_number',
      width: 120,
      render: (v: number | null | undefined, r: RegisterRecord) => (
        <InputNumber
          min={1}
          precision={0}
          value={v ?? undefined}
          style={{ width: 70 }}
          onBlur={(e) => {
            const val = e.target.value.trim();
            // 清空：走 DELETE 置 NULL，仅原有序号时提交
            if (val === '') {
              if (r.onsite_number != null) handleOnsiteNumberClear(r);
              return;
            }
            const num = parseInt(val, 10);
            // 非法值（<1/非数字）或未变化时不提交
            if (Number.isNaN(num) || num < 1 || num === (r.onsite_number ?? undefined)) return;
            handleOnsiteNumberChange(r, num);
          }}
        />
      ),
    },
    {
      title: '状态',
      key: 'checkin',
      width: 160,
      render: (_: any, r: RegisterRecord) => (
        <Space size={4}>
          {r.checkin_at
            ? <Tag color="blue" icon={<CheckCircleOutlined />} style={{ borderRadius: 10 }}>已签到</Tag>
            : <Tag color="default">未签到</Tag>}
          {/* 签到操作内置于状态列：仅注册用户且未签到时显示 */}
          {!r.checkin_at && r.user_id && (
            <Button type="link" size="small" icon={<CheckSquareOutlined />} loading={checkingIds.has(r.id)} onClick={() => handleCheckin(r)}>
              签到
            </Button>
          )}
        </Space>
      ),
    },
    {
      title: '签到时间',
      dataIndex: 'checkin_at',
      key: 'checkin_at',
      width: 120,
      render: (v: string | null | undefined) => {
        // 有签到时间才显示，未签到不显示
        if (!v) return null;
        const t = formatDateTime(v);
        return (
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <div>{t.slice(0, 10)}</div>
            <div>{t.slice(11)}</div>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SearchPanel filters={LIST_FILTERS} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        <Space style={{ marginLeft: 12, flexShrink: 0 }}>
          <Button icon={<PlusOutlined />} onClick={() => setAddVisible(true)}>添加</Button>
          <Button icon={<OrderedListOutlined />} loading={assigning} onClick={handleAssignNumbers}>排序</Button>
          {/* 未签到筛选下：批量扣除未签到用户靠谱值（2026-11-10 用户定）；已完成扣分后显示标记防重复 */}
          {searchValues.check_status === UNCHECKED && (
            deductDoneAt ? (
              <Tag color="green" title={formatDateTime(deductDoneAt)} style={{ marginRight: 0 }}>已完成扣分</Tag>
            ) : (
              <Button danger icon={<MinusCircleOutlined />} onClick={() => setDeductVisible(true)}>扣分</Button>
            )
          )}
          <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
        </Space>
      </div>
      <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        fetchDetail={() => activityApi.getRegisterUser(activityId, userDetailRegisterId)}
        fetchPrivacy={() => activityApi.getRegisterUserPrivacy(activityId, userDetailRegisterId)}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); setUserDetailRegisterId(''); }}
      />

      <ActivityRegisterAddModal
        open={addVisible}
        activityId={activityId}
        onClose={() => setAddVisible(false)}
        onSuccess={refresh}
      />

      <OnsiteDeductScoreModal
        open={deductVisible}
        activityId={activityId}
        activityTitle={activityTitle}
        onClose={() => {
          setDeductVisible(false);
          onDeducted?.(); // 刷新弹窗内活动数据，展示「已完成扣分」标记
        }}
      />
    </div>
  );
};

/**
 * 现场管理弹窗（开启现场签到的活动）：
 * - 入选名单：已入选用户管理（添加/排序/签到/序号内联编辑；状态仅 已签到/未签到）
 * - 组CP：原报名名单中的组CP TAB 完整功能
 * - TAB 行右侧「大屏」按钮：新窗口打开现场大屏页面
 */
const OnsiteManageModal: React.FC<OnsiteManageModalProps> = ({ visible, activityId, activityTitle, activity, onClose }) => {
  /** 默认 TAB：当前时间已进入签到开始时间 → 入选名单；否则现场配置 */
  const defaultTabKey = (() => {
    if (!activity?.checkin_start) return 'config';
    const start = parseApiTime(activity.checkin_start);
    return start && start.valueOf() <= Date.now() ? 'list' : 'config';
  })();
  const [tabKey, setTabKey] = useState(defaultTabKey);

  /** 弹窗内实时活动数据：任一分组/配置 TAB 保存后重新拉取，同步给所有 TAB（2026-11-10 用户定：保存分组后编排等 TAB 免刷新页面） */
  const [liveActivity, setLiveActivity] = useState<Activity | null | undefined>(activity);

  // 每次打开弹窗按当前时间重新决定默认 TAB（签到时间到了自动落在入选名单），并重置弹窗内活动数据
  useEffect(() => {
    if (visible) {
      setTabKey(defaultTabKey);
      setLiveActivity(activity);
    }
  }, [visible, defaultTabKey, activity]);

  /** 分组配置保存后：重拉活动详情并同步给其余 TAB */
  const refreshLiveActivity = useCallback(async () => {
    try {
      const res: any = await activityApi.getDetail(activityId);
      if (res) setLiveActivity(res);
    } catch { /* 刷新失败静默——各 TAB 保留旧数据 */ }
  }, [activityId]);

  const openBigScreen = () => {
    const base = window.location.href.split('#')[0];
    window.open(`${base}#/activity-onsite/${activityId}`, '_blank');
  };

  return (
    <ScrollableModal
      title={`现场管理 - ${activityTitle}`}
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={false}
    >
      <Tabs
        activeKey={tabKey}
        onChange={setTabKey}
        tabBarExtraContent={{
          right: <Button type="primary" icon={<DesktopOutlined />} onClick={openBigScreen}>大屏</Button>,
        }}
        items={[
          { key: 'config', label: '现场配置', children: <OnsiteConfigTab activityId={activityId} activity={liveActivity} /> },
          { key: 'list', label: '入选名单', children: <ApprovedListTab activityId={activityId} activityTitle={activityTitle} activity={liveActivity} onDeducted={refreshLiveActivity} /> },
          { key: 'cp', label: '组CP', children: tabKey === 'cp' ? <ActivityCpTab activityId={activityId} /> : null },
          { key: 'group', label: '分组管理', children: <OnsiteGroupTab activityId={activityId} activity={liveActivity} onSaved={refreshLiveActivity} /> },
          { key: 'routine', label: '流程编排', children: tabKey === 'routine' ? <OnsiteRoutineTab activityId={activityId} activity={liveActivity} /> : null },
        ]}
      />
    </ScrollableModal>
  );
};

export default OnsiteManageModal;
