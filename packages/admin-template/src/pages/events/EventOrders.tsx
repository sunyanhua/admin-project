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
import { formatDateTime, formatDate } from '@/utils/format';

const { Title } = Typography;

// 订单状态枚举
enum OrderStatus {
  PENDING = 0,
  CANCELLED = 1,
  COMPLETED = 2,
  REFUNDED = 3,
  ABSENT = 4,
  REFUND_CANCELLED = 12,
}

const OrderStatusMap: Record<number, { text: string; color: string }> = {
  [OrderStatus.PENDING]: { text: '待确认', color: 'orange' },
  [OrderStatus.CANCELLED]: { text: '已取消', color: 'default' },
  [OrderStatus.COMPLETED]: { text: '已完成', color: 'green' },
  [OrderStatus.REFUNDED]: { text: '已退费', color: 'red' },
  [OrderStatus.ABSENT]: { text: '缺席活动', color: 'purple' },
  [OrderStatus.REFUND_CANCELLED]: { text: '已退费取消', color: 'cyan' },
};

const STATUS_OPTIONS = [
  { label: '全部状态', value: '' },
  { label: '待确认', value: OrderStatus.PENDING },
  { label: '已取消', value: OrderStatus.CANCELLED },
  { label: '已完成', value: OrderStatus.COMPLETED },
  { label: '已退费', value: OrderStatus.REFUNDED },
  { label: '缺席活动', value: OrderStatus.ABSENT },
  { label: '已退费取消', value: OrderStatus.REFUND_CANCELLED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
];

interface EventOrder {
  id: string;
  userid: string;
  eventid: number;
  user_data?: {
    userid?: string;
    avatar?: string;
    nick?: string;
    name?: string;
    phone?: string;
  };
  event_data?: {
    id?: number;
    title?: string;
  };
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  participants?: string;
  remarks?: string;
  paycost: number;
  payfree: number;
  payable: number;
  status: number;
  payment: number;
  paymentTime?: string;
  refundsTotal: number;
  refundsAmount: number;
  checkinStatus: boolean;
  checkinTime?: string;
  insertat?: string;
}

const formatAmount = (amount?: number) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${(amount / 100).toFixed(2)}`;
};

const EventOrders = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailModalData, setDetailModalData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [eventDetailVisible, setEventDetailVisible] = useState(false);
  const [currentEventId, setCurrentEventId] = useState<number>(0);

  const fetchOrders = useCallback(async (params: any) => {
    return request.get('/admin/v6/event/order', { params });
  }, []);

  const formatOrderResponse = useCallback((res: any) => ({
    list: res?.data?.list || res?.data || [],
    count: res?.count ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<EventOrder>({
    fetchFn: fetchOrders,
    formatResponse: formatOrderResponse,
  });

  const handleViewDetail = async (record: EventOrder) => {
    setDetailModalData(null);
    setDetailLoading(true);
    try {
      const res = await request.get(`/admin/v6/event/order/${record.id}`);
      setDetailModalData(res?.data || res || {});
    } catch (error: any) {
      setDetailModalData(record);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewUserDetail = async (record: EventOrder) => {
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

  const handleViewEventDetail = (record: EventOrder) => {
    const eventId = record.event_data?.id || record.eventid;
    if (!eventId) {
      console.warn('No eventid found for event detail:', record);
      return;
    }
    setCurrentEventId(eventId);
    setEventDetailVisible(true);
  };

  const columns: ColumnsType<EventOrder> = [
    {
      title: '报名用户',
      key: 'user',
      width: 140,
      render: (_: any, record: EventOrder) => (
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
      render: (_: any, record: EventOrder) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewEventDetail(record)}>
          {record.event_data?.title || record.eventid || '-'}
        </Button>
      ),
    },
    {
      title: '报名时间',
      key: 'insertat',
      width: 120,
      render: (_: any, record: EventOrder) => (
        record.insertat ? (
          <div style={{ lineHeight: 1.6 }}>
            <div>{formatDate(record.insertat)}</div>
            <div style={{ color: '#666', fontSize: 12 }}>{formatDateTime(record.insertat).split(' ')[1]}</div>
          </div>
        ) : '-'
      ),
    },
    {
      title: '报名状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => (
        <Tag color={OrderStatusMap[status]?.color}>
          {OrderStatusMap[status]?.text || '其他'}
        </Tag>
      ),
    },
    ActionColumn({
      onView: handleViewDetail,
      showView: true,
      viewText: '查看',
      showEdit: false,
      showDelete: false,
      width: 50,
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

  const d = detailModalData;

  return (
    <>
      <StandardPage
        title="活动报名管理"
        description="管理活动报名订单信息。"
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
        title="报名详情"
        open={!!detailModalData}
        onCancel={() => setDetailModalData(null)}
        footer={null}
        width={700}
        confirmLoading={detailLoading}
        bodyStyle={{ paddingBottom: 20 }}
      >
        {d && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="报名人" span={2}>
              <Space>
                <Avatar src={d.user_data?.avatar} size="small" />
                <span>{d.user_data?.nick || d.user_data?.userid || '-'}</span>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="姓名">{d.user_data?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="电话">{d.user_data?.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="报名活动" span={2}>
              {d.event_data?.title || d.eventid || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="应付费用">{formatAmount(d.paycost)}</Descriptions.Item>
            <Descriptions.Item label="支付费用">{formatAmount(d.payable)}</Descriptions.Item>
            <Descriptions.Item label="报名时间" span={2}>
              {d.insertat ? formatDateTime(d.insertat) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="报名状态" span={2}>
              <Tag color={OrderStatusMap[d.status]?.color}>
                {OrderStatusMap[d.status]?.text || '其他'}
              </Tag>
            </Descriptions.Item>
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

export default EventOrders;
