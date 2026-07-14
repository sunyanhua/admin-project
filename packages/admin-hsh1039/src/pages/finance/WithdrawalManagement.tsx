import { useState, useCallback } from 'react';
import { Button, Space, Tag, Typography, Modal, Descriptions, Avatar, App } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import request from '@/api';
import { userApi } from '@/api/services/user';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { DetailModal } from '@/components/templates/DetailModal';
import UserDetailSections from '../../components/user/UserDetailSections';
import { formatDateTime } from '@/utils/format';

const { Title } = Typography;

// 提现状态枚举
const WithdrawStatus = {
  COMPLETED: 16,   // 已完成
  PROCESSING: 3,    // 进行中
  FAILED: 32,      // 已失败
  REVOKED: 128,    // 已撤销
};

const WithdrawStatusMap: Record<number, { text: string; color: string }> = {
  [WithdrawStatus.COMPLETED]: { text: '已完成', color: 'green' },
  [WithdrawStatus.PROCESSING]: { text: '进行中', color: 'cyan' },
  [WithdrawStatus.FAILED]: { text: '已失败', color: 'red' },
  [WithdrawStatus.REVOKED]: { text: '已撤销', color: 'default' },
};

const STATUS_OPTIONS = [
  { label: '已完成', value: WithdrawStatus.COMPLETED },
  { label: '进行中', value: WithdrawStatus.PROCESSING },
  { label: '已失败', value: WithdrawStatus.FAILED },
  { label: '已撤销', value: WithdrawStatus.REVOKED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '选择状态', type: 'select', options: STATUS_OPTIONS },
];

interface Withdrawal {
  id: number;
  userid: string;
  amount: number;
  explain?: string;
  details?: string;
  status: number;
  statusReason?: string;
  statusUpdate?: string;
  transferBillNo?: string;
  insertat?: string;
  clientIp?: string;
  user_data?: {
    userid?: string;
    avatar?: string;
    nick?: string;
  };
  transfer_bill_no?: string;
}

const formatAmount = (amount?: number) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${(amount / 100).toFixed(2)}`;
};

const WithdrawalManagement = () => {
  const { message } = App.useApp();
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailModal, setDetailModal] = useState(false);
  const [auditModal, setAuditModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<Withdrawal | null>(null);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const handleRevoke = async (id: number) => {
    try {
      setRevokeLoading(true);
      await request.post('/admin/v6/user/wallet/withdraw/revoke', { id });
      message.success('撤销成功');
      setDetailModal(false);
      refresh();
    } catch (err: any) {
      message.error(err.response?.data?.msg || '撤销失败');
    } finally {
      setRevokeLoading(false);
    }
  };

  const fetchWithdrawals = useCallback(async (params: any) => {
    return request.get('/admin/v6/user/wallet/withdraw', { params });
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: res?.data?.list || res?.data || [],
    count: res?.data?.count || res?.count || 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Withdrawal>({
    fetchFn: fetchWithdrawals,
    formatResponse,
  });

  const handleViewDetail = async (record: Withdrawal) => {
    try {
      const res = await request.get(`/admin/v6/user/wallet/withdraw/${record.id}`);
      setCurrentRecord(res?.data || res || {});
      setDetailModal(true);
    } catch (error) {
      setCurrentRecord(record);
      setDetailModal(true);
    }
  };

  const handleViewUserDetail = async (record: Withdrawal) => {
    const userid = record.user_data?.userid || record.userid;
    if (!userid) return;
    setUserDetailLoading(true);
    try {
      const res = await userApi.getUserDetail(userid) as any;
      setUserDetailData(res?.data || res);
      setUserDetailVisible(true);
    } catch (err: any) {
      console.error('Failed to fetch user detail:', err);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    search({ ...values, [name]: value });
  };

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  const handleReset = () => {
    setValues({});
    search({});
  };

  const columns: ColumnsType<Withdrawal> = [
    {
      title: '提现用户',
      key: 'user',
      width: 140,
      render: (_: any, record: Withdrawal) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewUserDetail(record)}>
          <Space size={4}>
            <Avatar src={record.user_data?.avatar} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{record.user_data?.nick || record.user_data?.userid || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '提现金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amount: number) => (
        <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: 14 }}>
          {formatAmount(amount)}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => (
        <Tag color={WithdrawStatusMap[status]?.color}>
          {WithdrawStatusMap[status]?.text}
        </Tag>
      ),
    },
    {
      title: '订单号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => id || '-',
    },
    {
      title: '微信支付流水单号',
      dataIndex: 'transfer_bill_no',
      key: 'transfer_bill_no',
      width: 180,
      ellipsis: true,
      render: (v?: string) => v || '-',
    },
    ActionColumn({
      onView: handleViewDetail,
      showView: true,
      viewText: '查看',
      showEdit: false,
      showDelete: false,
      width: 80,
    }),
  ];

  return (
    <>
      <StandardPage
        title="提现管理"
        description="审核和管理用户钱包提现申请。"
        showRefreshButton={true}
        onRefresh={refresh}
        searchArea={
          <SearchPanel
            filters={filters}
            values={values}
            onChange={handleChange}
            onSearch={handleSearch}
            onReset={handleReset}
            showSearchButton={false}
            showResetButton={false}
          />
        }
        table={
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={pagination}
            onPageChange={onPageChange}
            scroll={{ x: 800 }}
          />
        }
      />

      <Modal
        title="提现详情"
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={
          currentRecord?.status === WithdrawStatus.FAILED ? (
            <div style={{ textAlign: 'left' }}>
              <Button danger loading={revokeLoading} onClick={() => {
                Modal.confirm({
                  title: '确认撤销',
                  content: '确定要撤销该提现订单吗？',
                  okText: '确认',
                  cancelText: '取消',
                  onOk: () => handleRevoke(currentRecord.id),
                });
              }}>撤销</Button>
            </div>
          ) : null
        }
        width={700}
      >
        {currentRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="提现用户" span={2}>
              <Space>
                <Avatar src={currentRecord.user_data?.avatar} size="small" />
                <span>{currentRecord.user_data?.nick || currentRecord.user_data?.userid || currentRecord.userid}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="提现金额">
              <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{formatAmount(currentRecord.amount)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="提现状态">
              <Tag color={WithdrawStatusMap[currentRecord.status]?.color}>
                {WithdrawStatusMap[currentRecord.status]?.text}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="微信支付流水单号" span={2}>{currentRecord.transfer_bill_no || '-'}</Descriptions.Item>
            {currentRecord.insertat && <Descriptions.Item label="申请时间">{formatDateTime(currentRecord.insertat)}</Descriptions.Item>}
            {currentRecord.statusUpdate && <Descriptions.Item label="完成时间">{formatDateTime(currentRecord.statusUpdate)}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>

      {/* 用户详情弹窗 */}
      <DetailModal
        title="用户详情"
        open={userDetailVisible}
        onClose={() => setUserDetailVisible(false)}
        entity={userDetailData}
        className="user-detail-modal"
        footer={null}
      >
        {(d: any) => UserDetailSections({ user: d })}
      </DetailModal>
    </>
  );
};

export default WithdrawalManagement;
