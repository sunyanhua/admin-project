import { useState, useCallback } from 'react';
import { Button, Space, Tag, Typography, Modal, Descriptions, Avatar } from 'antd';
import { FileTextOutlined, WalletOutlined } from '@ant-design/icons';
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
import EventDetailModal from '../../components/events/EventDetailModal';
import { formatDateTime } from '@/utils/format';

const { Title } = Typography;

// 退款状态枚举
enum RefundStatus {
  PROCESSING = 0,
  CANCELLED = 1,
  SUCCESS = 2,
  ABNORMAL = 3,
}

const RefundStatusMap: Record<number, { text: string; color: string }> = {
  [RefundStatus.PROCESSING]: { text: '进行中', color: 'blue' },
  [RefundStatus.CANCELLED]: { text: '已取消', color: 'default' },
  [RefundStatus.SUCCESS]: { text: '已完成', color: 'green' },
  [RefundStatus.ABNORMAL]: { text: '异常', color: 'red' },
};

// 支付状态枚举（用于订单信息表格）
enum PaymentStatus {
  PENDING = 0,
  CANCELLED = 1,
  SUCCESS = 2,
  REFUNDED = 4,
}

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  [PaymentStatus.PENDING]: { text: '待支付', color: 'orange' },
  [PaymentStatus.CANCELLED]: { text: '已取消', color: 'default' },
  [PaymentStatus.SUCCESS]: { text: '已支付', color: 'green' },
  [PaymentStatus.REFUNDED]: { text: '已退款', color: 'red' },
};

const STATUS_OPTIONS = [
  { label: '进行中', value: RefundStatus.PROCESSING },
  { label: '已取消', value: RefundStatus.CANCELLED },
  { label: '已完成', value: RefundStatus.SUCCESS },
  { label: '异常', value: RefundStatus.ABNORMAL },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '选择状态', type: 'select', options: STATUS_OPTIONS },
];

interface RefundRecord {
  id: number;
  orderid: number;
  eventid: number;
  userid?: string;
  payment: number;
  amount: number;
  explain?: string;
  channel: number;
  status: number;
  statusReason?: string;
  insertat?: string;
  successat?: string;
  clientIp?: string;
  user_data?: {
    userid?: string;
    avatar?: string;
    nick?: string;
  };
  event_data?: {
    id?: number;
    title?: string;
  };
  wxpay_refund_id?: string;
  payment_data?: {
    payable?: number;
    status?: number;
    wxpay_transaction_id?: string;
    insertat?: string;
    successat?: string;
  };
}

const formatAmount = (amount?: number) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${(amount / 100).toFixed(2)}`;
};

const RefundRecords = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailData, setDetailData] = useState<RefundRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [eventDetailVisible, setEventDetailVisible] = useState(false);
  const [currentEventId, setCurrentEventId] = useState<number>(0);

  const fetchRefunds = useCallback(async (params: any) => {
    return request.get('/admin/v6/event/order/refund', { params });
  }, []);

  const formatRefundResponse = useCallback((res: any) => ({
    list: res?.data?.list || res?.data || [],
    count: res?.count ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<RefundRecord>({
    fetchFn: fetchRefunds,
    formatResponse: formatRefundResponse,
  });

  const handleViewDetail = async (record: RefundRecord) => {
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await request.get(`/admin/v6/event/order/refund/${record.id}`);
      setDetailData(res?.data || res || {});
    } catch (error: any) {
      setDetailData(record);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewUserDetail = async (record: RefundRecord) => {
    const userid = record.user_data?.userid || record.userid;
    if (!userid) {
      console.warn('No userid found for user detail:', record);
      return;
    }
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

  const handleViewEventDetail = (record: RefundRecord) => {
    const eventId = record.event_data?.id || record.eventid;
    if (!eventId) {
      console.warn('No eventid found for event detail:', record);
      return;
    }
    setCurrentEventId(eventId);
    setEventDetailVisible(true);
  };

  const columns: ColumnsType<RefundRecord> = [
    {
      title: '退款用户',
      key: 'user',
      width: 140,
      render: (_: any, record: RefundRecord) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewUserDetail(record)}>
          <Space size={4}>
            <Avatar src={record.user_data?.avatar} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{record.user_data?.nick || record.user_data?.userid || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '报名活动',
      key: 'event',
      width: 150,
      ellipsis: true,
      render: (_: any, record: RefundRecord) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewEventDetail(record)}>
          {record.event_data?.title || record.eventid || '-'}
        </Button>
      ),
    },
    {
      title: '退款金额',
      key: 'amount',
      width: 100,
      render: (_: any, record: RefundRecord) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
          {formatAmount(record.payment_data?.payable)}
        </span>
      ),
    },
    {
      title: '退款状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => (
        <Tag color={RefundStatusMap[status]?.color}>
          {RefundStatusMap[status]?.text}
        </Tag>
      ),
    },
    {
      title: '微信退款流水单号',
      dataIndex: 'wxpay_refund_id',
      key: 'wxpay_refund_id',
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
      width: 60,
    }),
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

  const d = detailData;

  return (
    <>
      <StandardPage
        title="退款记录管理"
        description="查看和处理退款申请。"
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
            scroll={{ x: 1000 }}
          />
        }
      />

      <Modal
        title="退款详情"
        open={!!detailData}
        onCancel={() => setDetailData(null)}
        footer={null}
        width={700}
        confirmLoading={detailLoading}
      >
        {d && (
          <>
            <Title level={5} style={{ marginBottom: 12, fontSize: '14px' }}>
              <FileTextOutlined /> 订单信息
            </Title>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
              <Descriptions.Item label="报名用户" span={2}>
                <Space>
                  <Avatar src={d.user_data?.avatar} size="small" />
                  <span>{d.user_data?.nick || d.user_data?.userid || '-'}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="报名活动" span={2}>
                {d.event_data?.title || d.eventid || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="支付金额">{formatAmount(d.payment_data?.payable)}</Descriptions.Item>
              <Descriptions.Item label="支付状态">
                <Tag color={STATUS_MAP[d.payment_data?.status ?? 0]?.color}>
                  {STATUS_MAP[d.payment_data?.status ?? 0]?.text || '其他'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="微信支付流水单号" span={2}>{d.payment_data?.wxpay_transaction_id || '-'}</Descriptions.Item>
              {d.payment_data?.insertat && <Descriptions.Item label="下单时间">{formatDateTime(d.payment_data.insertat)}</Descriptions.Item>}
              {d.payment_data?.successat && <Descriptions.Item label="支付时间">{formatDateTime(d.payment_data.successat)}</Descriptions.Item>}
            </Descriptions>

            <Title level={5} style={{ marginBottom: 12, fontSize: '14px' }}>
              <WalletOutlined /> 退款信息
            </Title>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="退款金额">
                <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{formatAmount(d.payment_data?.payable)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="退款状态">
                <Tag color={RefundStatusMap[d.status]?.color}>
                  {RefundStatusMap[d.status]?.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="微信退款流水单号" span={2}>{d.wxpay_refund_id || '-'}</Descriptions.Item>
              <Descriptions.Item label="申请时间">{d.insertat ? formatDateTime(d.insertat) : '-'}</Descriptions.Item>
              <Descriptions.Item label="完成时间">{d.successat ? formatDateTime(d.successat) : '-'}</Descriptions.Item>
            </Descriptions>
          </>
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

      {/* 活动详情弹窗 */}
      <EventDetailModal
        eventId={currentEventId}
        open={eventDetailVisible}
        onClose={() => setEventDetailVisible(false)}
        showEditButton={false}
      />
    </>
  );
};

export default RefundRecords;
