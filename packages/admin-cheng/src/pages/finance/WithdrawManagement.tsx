import { useState, useCallback } from 'react';
import { Tag, Button, Space, Form, Input, App } from 'antd';
import { CheckOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useListPage } from '@/hooks/useListPage';
import { useAppNotification } from '@/hooks/useAppNotification';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import ScrollableModal from '@/components/templates/ScrollableModal';
import UserAvatar from '@/components/user/UserAvatar';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import { congratulationApi, WithdrawItem, WithdrawStatus } from '@/api/services/congratulation';
import { formatDateTime, formatCents } from '@/utils/format';

const WITHDRAW_STATUS_META: Record<number, { label: string; color: string }> = {
  [WithdrawStatus.PENDING_REVIEW]: { label: '待审核', color: 'orange' },
  [WithdrawStatus.PROCESSING]: { label: '处理中', color: 'blue' },
  [WithdrawStatus.SUCCESS]: { label: '提现成功', color: 'green' },
  [WithdrawStatus.FAILED]: { label: '提现失败', color: 'red' },
};

const WITHDRAW_STATUS_OPTIONS = [
  { label: '待审核', value: WithdrawStatus.PENDING_REVIEW },
  { label: '处理中', value: WithdrawStatus.PROCESSING },
  { label: '提现成功', value: WithdrawStatus.SUCCESS },
  { label: '提现失败', value: WithdrawStatus.FAILED },
];

/** 响应结构统一解析（拦截器可能返回 { list, total } 或原始数组） */
const formatResponse = (res: any) => {
  const list = Array.isArray(res) ? res : (res?.list || []);
  const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
  return { list, count: total };
};

/** 双行日期/时间列（值缺失不显示） */
const dateTimeCol = (title: string, dataIndex: string, key: string) => ({
  title,
  dataIndex,
  key,
  width: 120,
  render: (v: string) => {
    if (!v) return null;
    const t = formatDateTime(v);
    return <div style={{ fontSize: 12, lineHeight: 1.6 }}><div>{t.slice(0, 10)}</div><div>{t.slice(11)}</div></div>;
  },
});

/** 拒绝原因弹窗（必填，≤500 字） */
const RejectModal: React.FC<{
  open: boolean;
  record: WithdrawItem | null;
  submitting: boolean;
  onSubmit: (record: WithdrawItem, reason: string) => void;
  onClose: () => void;
}> = ({ open, record, submitting, onSubmit, onClose }) => {
  const [form] = Form.useForm<{ reason: string }>();
  return (
    <ScrollableModal
      title="拒绝提现申请"
      open={open}
      onCancel={onClose}
      width={480}
      destroyOnHidden
      footer={
        <Button type="primary" danger loading={submitting} onClick={() => form.submit()}>
          确认拒绝
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => { if (record) onSubmit(record, values.reason.trim()); }}
      >
        <Form.Item
          label="拒绝原因"
          name="reason"
          rules={[{ required: true, message: '请输入拒绝原因' }]}
        >
          <Input.TextArea rows={4} placeholder="拒绝后提现金额将原路退回来源子账" maxLength={500} showCount />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

const WithdrawManagement = () => {
  const { success, error: showError } = useAppNotification();
  const { modal } = App.useApp();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectRecord, setRejectRecord] = useState<WithdrawItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState('');

  const fetchWithdraws = useCallback(async (params: any) => {
    return congratulationApi.getWithdraws({
      page: params.page,
      size: params.page_size,
      status: params.status,
      user_id: params.user_id || undefined,
      keyword: params.keyword || undefined,
    });
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<WithdrawItem>({
    fetchFn: fetchWithdraws,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  /** 审核通过：待审核 → 处理中，随后自动发起商家转账 */
  const handleApprove = (record: WithdrawItem) => {
    modal.confirm({
      title: '确认通过该提现申请？',
      content: `通过后系统将自动发起商家转账（金额 ${formatCents(record.amount_cents)} 元）。`,
      okText: '确认通过',
      cancelText: '取消',
      onOk: async () => {
        try {
          await congratulationApi.approveWithdraw(record.id);
          success('已通过，转账处理中');
          refresh();
        } catch (err: any) {
          showError(err?.response?.data?.message || '审核通过失败');
          throw err; // 保持弹窗打开语义由 antd 处理
        }
      },
    });
  };

  /** 审核拒绝：待审核 → 失败并冲正来源子账 */
  const handleRejectSubmit = async (record: WithdrawItem, reason: string) => {
    setSubmitting(true);
    try {
      await congratulationApi.rejectWithdraw(record.id, reason);
      success('已拒绝，金额已原路退回');
      setRejectVisible(false);
      setRejectRecord(null);
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '审核拒绝失败');
    } finally {
      setSubmitting(false);
    }
  };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: WITHDRAW_STATUS_OPTIONS },
    { name: 'keyword', placeholder: '搜索提现单号', type: 'input' },
    { name: 'user_id', placeholder: '用户ID', type: 'input' },
  ];

  const columns: ColumnsType<WithdrawItem> = [
    {
      title: '提现单号',
      dataIndex: 'withdraw_no',
      key: 'withdraw_no',
      width: 180,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v || '-'}</span>,
    },
    {
      title: '微信转账单号',
      dataIndex: 'wx_transfer_no',
      key: 'wx_transfer_no',
      width: 180,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v || '-'}</span>,
    },
    {
      title: '金额（元）',
      dataIndex: 'amount_cents',
      key: 'amount_cents',
      width: 100,
      render: (v: number) => formatCents(v),
    },
    {
      title: '用户',
      key: 'user',
      width: 150,
      render: (_: any, r: WithdrawItem) => {
        const userId = r.user?.user_id || '';
        const nickname = r.user?.nickname || userId || '-';
        const avatar = r.user?.avatar || '';
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }}
            disabled={!userId}
            onClick={() => { if (!userId) return; setUserDetailUserId(userId); setUserDetailVisible(true); }}>
            <Space size={4}>
              <UserAvatar src={avatar} nick={nickname} />
              <span style={{ fontSize: 14 }}>{nickname}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: number) => {
        const meta = WITHDRAW_STATUS_META[v];
        return <Tag color={meta?.color || 'default'} title={meta?.label ?? v}>{meta?.label ?? v}</Tag>;
      },
    },
    {
      title: '失败原因',
      dataIndex: 'fail_reason',
      key: 'fail_reason',
      width: 160,
      ellipsis: true,
      render: (v: string) => <span title={v || ''}>{v || '-'}</span>,
    },
    dateTimeCol('申请时间', 'created_at', 'created_at'),
    dateTimeCol('完成时间', 'completed_at', 'completed_at'),
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: WithdrawItem) => (
        <Space size={4} className="action-buttons">
          {record.status === WithdrawStatus.PENDING_REVIEW && (
            <>
              <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(record)}>通过</Button>
              <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => { setRejectRecord(record); setRejectVisible(true); }}>拒绝</Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <StandardPage
        title="提现申请"
        description="审核用户的报喜提现申请，通过后自动发起转账，拒绝则原路退回；点击用户头像或昵称可查看该用户的完整资料。"
        table={
          <div>
            <div style={{ marginBottom: 12 }}>
              <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
            </div>
            <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
          </div>
        }
      />
      <RejectModal
        open={rejectVisible}
        record={rejectRecord}
        submitting={submitting}
        onSubmit={handleRejectSubmit}
        onClose={() => { setRejectVisible(false); setRejectRecord(null); }}
      />
      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />
    </>
  );
};

export default WithdrawManagement;
