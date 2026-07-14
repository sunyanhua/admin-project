import { useState, useCallback } from 'react';
import { Button, Space, Tag, Typography, Modal, Descriptions, Avatar } from 'antd';
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

// 支付状态枚举
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
  { label: '待支付', value: PaymentStatus.PENDING },
  { label: '已取消', value: PaymentStatus.CANCELLED },
  { label: '已支付', value: PaymentStatus.SUCCESS },
  { label: '已退款', value: PaymentStatus.REFUNDED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
];

interface PaymentRecord {
  id: number;
  orderid: number;
  eventid: number;
  userid: string;
  payable: number;
  paydesc?: string;
  appid?: string;
  mchid?: string;
  status: number;
  statusReason?: string;
  insertat?: string;
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
  wxpay_transaction_id?: string;
}

const formatAmount = (amount?: number) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${(amount / 100).toFixed(2)}`;
};

const PaymentRecords = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [eventDetailVisible, setEventDetailVisible] = useState(false);
  const [currentEventId, setCurrentEventId] = useState<number>(0);

  const fetchPayments = useCallback(async (params: any) => {
    return request.get('/admin/v6/event/order/payment', { params });
  }, []);

  const formatPaymentResponse = useCallback((res: any) => ({
    list: res?.data?.list || res?.data || [],
    count: res?.count ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<PaymentRecord>({
    fetchFn: fetchPayments,
    formatResponse: formatPaymentResponse,
  });

  const handleViewDetail = async (record: PaymentRecord) => {
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await request.get(`/admin/v6/event/order/payment/${record.id}`);
      setDetailData(res?.data || res || {});
    } catch (error: any) {
      setDetailData(record);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewUserDetail = async (record: PaymentRecord) => {
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

  const handleViewEventDetail = (record: PaymentRecord) => {
    const eventId = record.event_data?.id || record.eventid;
    if (!eventId) {
      console.warn('No eventid found for event detail:', record);
      return;
    }
    setCurrentEventId(eventId);
    setEventDetailVisible(true);
  };

  const columns: ColumnsType<PaymentRecord> = [
    {
      title: '报名用户',
      key: 'user',
      width: 140,
      render: (_: any, record: PaymentRecord) => (
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
      render: (_: any, record: PaymentRecord) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewEventDetail(record)}>
          {record.event_data?.title || record.eventid || '-'}
        </Button>
      ),
    },
    {
      title: '支付金额',
      dataIndex: 'payable',
      key: 'payable',
      width: 100,
      render: (amount: number) => formatAmount(amount),
    },
    {
      title: '支付状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => (
        <Tag color={STATUS_MAP[status]?.color}>
          {STATUS_MAP[status]?.text || '其他'}
        </Tag>
      ),
    },
    {
      title: '微信支付流水单号',
      dataIndex: 'wxpay_transaction_id',
      key: 'wxpay_transaction_id',
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
        title="支付记录管理"
        description="查看用户支付记录详情。"
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
        title="支付详情"
        open={!!detailData}
        onCancel={() => setDetailData(null)}
        footer={null}
        width={700}
        confirmLoading={detailLoading}
      >
        {d && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="报名用户" span={2}>
              <Space>
                <Avatar src={d.user_data?.avatar} size="small" />
                <span>{d.user_data?.nick || d.user_data?.userid || '-'}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="报名活动" span={2}>
              {d.event_data?.title || d.eventid || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="支付金额">{formatAmount(d.payable)}</Descriptions.Item>
            <Descriptions.Item label="支付状态">
              <Tag color={STATUS_MAP[d.status]?.color}>
                {STATUS_MAP[d.status]?.text || '其他'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="微信支付流水单号" span={2}>{d.wxpay_transaction_id || '-'}</Descriptions.Item>
            {d.insertat && <Descriptions.Item label="下单时间">{formatDateTime(d.insertat)}</Descriptions.Item>}
            {d.successat && <Descriptions.Item label="支付时间">{formatDateTime(d.successat)}</Descriptions.Item>}
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

export default PaymentRecords;
