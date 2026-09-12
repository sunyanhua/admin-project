import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Tag, Space, Avatar } from 'antd';
import { UserAddOutlined, ReloadOutlined, EyeOutlined, ExportOutlined, OrderedListOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import {
  RegisterAuditStatus, RegisterAuditStatusLabels,
  RegisterPayStatus, RegisterPayStatusLabels, RegisterPayStatusColors,
  RegisterGender, RegisterGenderLabels,
  FreeFCFSStatusLabels, FreeFCFSStatusColors,
  ActivityType,
} from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import { userApi } from '@/api/services/user';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import RealNameWithTag from '@/components/user/RealNameWithTag';
import type { FormField } from '@/components/operation/FormConfigEditor';
import ScrollableModal from '@/components/templates/ScrollableModal';
import ActivityRegisterDetailModal from '@/components/operation/ActivityRegisterDetailModal';
import { buildRegisterExportSheet } from './activityRegisterExport.utils';
import { applyLinkColumns } from './excelExport.utils';

interface ActivityRegisterModalProps {
  visible: boolean;
  activityId: string;
  activityTitle: string;
  activityType: number;
  formConfig: FormField[];
  onClose: () => void;
  /** 活动是否开启现场签到（开启时显示自动排序按钮与序号列） */
  checkinEnabled?: boolean;
  /** 自定义批量隐私拉取（专区管理员无批量隐私接口数据权限，逐条走报名专用隐私接口）；缺省用通用批量接口 */
  privacyBatchFetcher?: (records: RegisterRecord[], activityId: string) => Promise<Record<string, string>>;
}


const ActivityRegisterModal: React.FC<ActivityRegisterModalProps> = ({
  visible, activityId, activityTitle, activityType, formConfig, onClose, checkinEnabled = false, privacyBatchFetcher,
}) => {
  const { success, error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<RegisterRecord | null>(null);
  /** 正在执行「入选」操作的记录 id（按钮 loading） */
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState<string>('');
  /** 当前查看用户对应的报名记录 ID（专区专用资料接口按报名记录读取） */
  const [userDetailRegisterId, setUserDetailRegisterId] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [assigning, setAssigning] = useState(false);

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
      // 批量拉取脱敏身份证号（隐私接口，读取留痕）；专区场景走自定义逐条专用接口
      const userIds = allData.map(i => i.user_id).filter(Boolean);
      const idCardMap = privacyBatchFetcher
        ? await privacyBatchFetcher(allData, activityId)
        : (userIds.length ? await userApi.getUserPrivacyBatch(userIds) : {});

      // 组装导出数据：表头 + 数据行 + 照片列/个人主页列位置
      const { headers, rows, photoColStart, photoColCount, profileCol } =
        buildRegisterExportSheet(allData, { activityType, idCardMap, formConfig });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      // 照片列/个人主页列：列宽 + 单元格链接（照片=超链接，个人主页=HYPERLINK 公式）
      applyLinkColumns(ws, { headers, rowsCount: rows.length, photoColStart, photoColCount, profileCol });
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

  const openDetail = (record: RegisterRecord) => {
    setDetailRecord(record);
    setDetailVisible(true);
  };

  /** 现场编号一键分配（按性别 1..N 自动排序） */
  const handleAssignNumbers = async () => {
    setAssigning(true);
    try {
      const res: any = await activityApi.assignOnsiteNumbers(activityId);
      const male = res?.male_count ?? 0;
      const female = res?.female_count ?? 0;
      success(`编号分配完成：男 ${male} 人，女 ${female} 人`);
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '编号分配失败');
    } finally {
      setAssigning(false);
    }
  };

  /** 入选：直接执行审核通过操作 */
  const handleApprove = async (record: RegisterRecord) => {
    setApprovingIds((prev) => new Set(prev).add(record.id));
    try {
      await activityApi.auditRegister(activityId, record.id, { approved: true });
      success('已入选');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '操作失败');
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(record.id);
        return next;
      });
    }
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
            onClick={() => { setUserDetailUserId(r.user_id); setUserDetailRegisterId(r.id); setUserDetailVisible(true); }}>
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
  ];


  // 详情列（活动配置了报名信息才显示，点击查看报名信息；置于报名时间之前）
  if (formConfig.length > 0) {
    columns.push({
      title: '详情', key: 'form_info', width: 80,
      render: (_: any, r: RegisterRecord) => {
        if (!r.form_data) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>查看</Button>
        );
      },
    });
  }

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
      dateTimeColumn<RegisterRecord>('created_at', '报名时间'),
    );
  }

  // 操作列（仅审核模式）：待审核可「入选」直接审核通过，通过后显示「已入选」
  if (isFreeReview) {
    columns.push({
      title: '操作', key: 'action', width: 100, fixed: 'right' as const,
      render: (_: any, r: RegisterRecord) => {
        if (r.audit_status === RegisterAuditStatus.PENDING) {
          return (
            <Button type="link" size="small" icon={<UserAddOutlined />} loading={approvingIds.has(r.id)}
              onClick={() => handleApprove(r)}>入选</Button>
          );
        }
        if (r.audit_status === RegisterAuditStatus.APPROVED) {
          return <Tag color="success" title="已入选">已入选</Tag>;
        }
        return <Tag color="default" title="已拒绝">已拒绝</Tag>;
      },
    });
  }

  // 序号列（现场编号，一键分配后按性别 1..N；置于操作列之后，仅开启签到的活动显示；单条修改接口待后端补充后改为可输入）
  if (checkinEnabled) {
    columns.push({
      title: '序号',
      dataIndex: 'onsite_number',
      key: 'onsite_number',
      width: 70,
      fixed: 'right' as const,
      render: (v: number | null | undefined) => v != null ? v : <span style={{ color: '#999' }}>-</span>,
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
            {checkinEnabled && (
              <Button icon={<OrderedListOutlined />} loading={assigning} onClick={handleAssignNumbers}>排序</Button>
            )}
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
        readonly
        onClose={() => { setDetailVisible(false); setDetailRecord(null); }}
        onSuccess={refresh}
      />

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        // 专区专用资料接口（按报名记录读取，权限对专区管理员友好）
        fetchDetail={() => activityApi.getRegisterUser(activityId, userDetailRegisterId)}
        fetchPrivacy={() => activityApi.getRegisterUserPrivacy(activityId, userDetailRegisterId)}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); setUserDetailRegisterId(''); }}
      />
    </>
  );
};

export default ActivityRegisterModal;
