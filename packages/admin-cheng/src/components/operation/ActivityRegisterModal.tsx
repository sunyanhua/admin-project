import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Tag, Space, Modal, Avatar } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  RegisterAuditStatus, RegisterAuditStatusLabels, RegisterAuditStatusColors,
  RegisterPayStatus, RegisterPayStatusLabels, RegisterPayStatusColors,
  RegisterGender, RegisterGenderLabels,
  RegisterStatus, RegisterStatusLabels, RegisterStatusColors,
  ActivityType,
} from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import ScrollableModal from '@/components/templates/ScrollableModal';
import UserInfoModal from '@/components/operation/UserInfoModal';

interface ActivityRegisterModalProps {
  visible: boolean;
  activityId: string;
  activityTitle: string;
  activityType: number;
  hasFormConfig: boolean;
  onClose: () => void;
}

const ActivityRegisterModal: React.FC<ActivityRegisterModalProps> = ({
  visible, activityId, activityTitle, activityType, hasFormConfig, onClose,
}) => {
  const { success, error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [auditRecord, setAuditRecord] = useState<RegisterRecord | null>(null);
  const [auditApproved, setAuditApproved] = useState(false);
  const [auditReason, setAuditReason] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [userInfoVisible, setUserInfoVisible] = useState(false);
  const [userInfoRecord, setUserInfoRecord] = useState<RegisterRecord | null>(null);

  const isFreeFCFS = activityType === ActivityType.FREE_FCFS;
  const isPaidFCFS = activityType === ActivityType.PAID_FCFS;
  const isFreeReview = activityType === ActivityType.FREE_REVIEW;

  const fetchRegisters = useCallback(async (params: any) => {
    if (!activityId) return { list: [], total: 0 };
    return activityApi.getRegisters(activityId, {
      page: params.page, size: params.page_size,
      audit_status: params.audit_status,
      pay_status: params.pay_status,
      register_status: params.register_status,
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

  const handleAudit = (record: RegisterRecord, approved: boolean) => {
    setAuditRecord(record);
    setAuditApproved(approved);
    setAuditReason('');
    setAuditModalVisible(true);
  };

  const confirmAudit = async () => {
    if (!auditRecord) return;
    try {
      setAuditLoading(true);
      await activityApi.auditRegister(auditRecord.activity_id, auditRecord.id, {
        approved: auditApproved,
        reason: auditReason || undefined,
      });
      success(auditApproved ? '已通过' : '已拒绝');
      setAuditModalVisible(false);
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '审核操作失败');
    } finally {
      setAuditLoading(false);
    }
  };

  // 左上角筛选条件取决于活动类型
  const filters: FilterConfig[] = [];
  if (isFreeFCFS) {
    filters.push({ name: 'register_status', placeholder: '全部报名状态', type: 'select',
      options: [
        { label: '已完成', value: RegisterStatus.COMPLETED },
        { label: '已取消', value: RegisterStatus.CANCELLED },
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
  filters.push({ name: 'keyword', placeholder: '搜索用户ID', type: 'input' });

  // 列定义
  const columns: ColumnsType<RegisterRecord> = [
    // 第1列：用户头像+昵称
    {
      title: '用户',
      key: 'user',
      width: 160,
      render: (_: any, r: RegisterRecord) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }}
          onClick={() => { setUserInfoRecord(r); setUserInfoVisible(true); }}>
          <Space size={4}>
            <Avatar size={40} style={{ borderRadius: '50%', flexShrink: 0 }}
              src={getAvatarUrl((r as any).avatar)} />
            <span style={{ fontSize: 14 }}>{(r as any).nickname || r.user_id}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '性别', dataIndex: 'gender', key: 'gender', width: 70,
      render: (v: number) => RegisterGenderLabels[v] ?? v,
    },
    {
      title: '年龄', dataIndex: 'age', key: 'age', width: 60,
      render: (v: number) => v ?? '-',
    },
    {
      title: '手机号', dataIndex: 'phone', key: 'phone', width: 130,
      render: (v: string) => v || '-',
    },
  ];

  // 根据活动类型追加列
  if (isFreeFCFS) {
    columns.push(
      dateTimeColumn<RegisterRecord>('created_at', '报名时间'),
      {
        title: '报名状态', dataIndex: 'register_status', key: 'register_status', width: 90,
        render: (v: number) => (
          <Tag color={RegisterStatusColors[v] || 'default'}>{RegisterStatusLabels[v] ?? v}</Tag>
        ),
      },
    );
  } else if (isPaidFCFS) {
    columns.push(
      {
        title: '支付状态', dataIndex: 'pay_status', key: 'pay_status', width: 90,
        render: (v: number) => (
          <Tag color={RegisterPayStatusColors[v] || 'default'}>{RegisterPayStatusLabels[v] ?? v}</Tag>
        ),
      },
      dateTimeColumn<RegisterRecord>('completed_at', '完成时间'),
    );
  } else if (isFreeReview) {
    columns.push(
      {
        title: '审核状态', dataIndex: 'audit_status', key: 'audit_status', width: 80,
        render: (v: number) => (
          <Tag color={RegisterAuditStatusColors[v] || 'default'}>{RegisterAuditStatusLabels[v] ?? v}</Tag>
        ),
      },
      dateTimeColumn<RegisterRecord>('created_at', '报名时间'),
    );
  }

  // 报名信息列
  if (hasFormConfig) {
    columns.push({
      title: '报名信息', key: 'form_info', width: 80,
      render: (_: any, r: RegisterRecord) => {
        if (!r.form_data) return <span style={{ color: '#999' }}>-</span>;
        try {
          const parsed = typeof r.form_data === 'string' ? JSON.parse(r.form_data) : r.form_data;
          const text = typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed);
          return (
            <Button type="link" size="small" icon={<EyeOutlined />}
              onClick={() => Modal.info({
                title: '报名信息',
                content: <pre style={{ maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</pre>,
                width: 500,
                maskClosable: false,
              })}>[详情]</Button>
          );
        } catch {
          return (
            <Button type="link" size="small" icon={<EyeOutlined />}
              onClick={() => Modal.info({
                title: '报名信息',
                content: <pre style={{ maxHeight: 400, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.form_data}</pre>,
                width: 500,
                maskClosable: false,
              })}>[详情]</Button>
          );
        }
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
            {isPending && (
              <>
                <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleAudit(r, true)}>通过</Button>
                <Button type="link" size="small" danger icon={<CloseOutlined />} onClick={() => handleAudit(r, false)}>拒绝</Button>
              </>
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
            <Button icon={<ReloadOutlined />} onClick={refresh} style={{ marginLeft: 12, flexShrink: 0 }}>刷新</Button>
          </div>
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={pagination}
            onPageChange={onPageChange}
          />
        </div>
      </ScrollableModal>

      <Modal
        title={auditApproved ? '审核通过' : '审核拒绝'}
        open={auditModalVisible}
        onCancel={() => setAuditModalVisible(false)}
        onOk={confirmAudit}
        confirmLoading={auditLoading}
        okText="确认"
        cancelText="取消"
        maskClosable={false}
      >
        <p style={{ marginBottom: 12 }}>
          {auditApproved
            ? `确认通过用户 ${auditRecord?.user_id} 的报名申请？`
            : `确认拒绝用户 ${auditRecord?.user_id} 的报名申请？拒绝后将释放名额。`}
        </p>
        {!auditApproved && (
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>拒绝原因（选填）</div>
            <textarea
              value={auditReason}
              onChange={e => setAuditReason(e.target.value)}
              maxLength={500}
              rows={3}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, resize: 'vertical' }}
              placeholder="请输入拒绝原因"
            />
          </div>
        )}
      </Modal>

      <UserInfoModal
        visible={userInfoVisible}
        record={userInfoRecord}
        onClose={() => { setUserInfoVisible(false); setUserInfoRecord(null); }}
      />
    </>
  );
};

export default ActivityRegisterModal;
