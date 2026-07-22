import { useState, useCallback } from 'react';
import { Button, Space, Tag, Modal, Descriptions, Avatar } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { orderApi } from '@/api/services/order';
import { userApi } from '@/api/services/user';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { DetailModal } from '@/components/templates/DetailModal';
import UserDetailSections from '@/components/user/UserDetailSections';
import { formatDateTime, formatDate } from '@/utils/format';
import { getAvatarUrl } from '@/utils/imageUtils';

// 订单状态（v1 mall）
const ORDER_STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '待支付', color: 'orange' },
  1: { text: '已支付', color: 'blue' },
  2: { text: '待发货', color: 'cyan' },
  3: { text: '已发货', color: 'geekblue' },
  4: { text: '已收货', color: 'lime' },
  5: { text: '已完成', color: 'green' },
  6: { text: '已取消', color: 'default' },
  7: { text: '售后中', color: 'purple' },
};

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_MAP).map(([value, { text }]) => ({
  label: text,
  value: Number(value),
}));

const formatAmount = (amount?: number) => {
  if (amount === undefined || amount === null) return '-';
  return `¥${(amount / 100).toFixed(2)}`;
};

interface OrderConfig {
  title: string;
  description: string;
  defaultOrderType?: string; // 'verification' | 'physical'
}

interface OrderItem {
  product_title?: string;
  product_cover?: string;
  sku_name?: string;
  quantity?: number;
  unit_price?: number;
}

interface OrderRecord {
  id: number;
  order_no: string;
  status: number;
  order_type: string;
  total_amount: number;
  discount_amount: number;
  payable_amount: number;
  paid_at?: string;
  created_at?: string;
  user?: {
    id: number;
    nickname?: string;
    avatar_url?: string;
    phone_masked?: string;
  };
  items?: OrderItem[];
  // 兼容老格式
  user_data?: {
    userid?: string;
    avatar?: string;
    nick?: string;
  };
  event_data?: {
    id?: number;
    title?: string;
  };
}

interface OrderListPageProps {
  config: OrderConfig;
}

const OrderListPage: React.FC<OrderListPageProps> = ({ config }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const { success, error: showError } = useAppNotification();

  const fetchOrders = useCallback(async (params: any) => {
    const apiParams: Record<string, any> = { ...params };
    if (config.defaultOrderType) {
      apiParams.order_type = config.defaultOrderType;
    }
    return orderApi.getOrders(apiParams);
  }, [config.defaultOrderType]);

  const formatOrderResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<OrderRecord>({
    fetchFn: fetchOrders,
    formatResponse: formatOrderResponse,
  });

  const handleViewDetail = async (record: OrderRecord) => {
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res: any = await orderApi.getOrderDetail(record.id);
      setDetailData(res?.data || res || {});
    } catch {
      setDetailData(record);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewUserDetail = async (record: OrderRecord) => {
    const uid = record.user?.id;
    if (!uid) return;
    try {
      const res: any = await userApi.getUserDetail(uid);
      setUserDetailData(res?.data || res);
      setUserDetailVisible(true);
    } catch { /* ignore */ }
  };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
    { name: 'keyword', placeholder: '订单号搜索', type: 'input' },
  ];

  const columns: ColumnsType<OrderRecord> = [
    {
      title: '用户',
      key: 'user',
      width: 160,
      render: (_: any, record: OrderRecord) => {
        const u = record.user;
        const ud = record.user_data;
        const avatar = u?.avatar_url || ud?.avatar;
        const nick = u?.nickname || ud?.nick || '-';
        const uid = u?.id || ud?.userid;
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewUserDetail(record)} disabled={!uid}>
            <Space size={4}>
              <Avatar src={getAvatarUrl(avatar)} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>{nick}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 200,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '商品/活动',
      key: 'product',
      render: (_: any, record: OrderRecord) => {
        if (record.items && record.items.length > 0) {
          return (
            <span style={{ wordBreak: 'break-word' }}>
              {record.items.map((item, i) => (
                <span key={i}>
                  {item.product_title || '-'}
                  {item.sku_name ? ` (${item.sku_name})` : ''}
                  {i < record.items!.length - 1 ? '、' : ''}
                </span>
              ))}
            </span>
          );
        }
        return record.event_data?.title || '-';
      },
    },
    {
      title: '金额',
      dataIndex: 'payable_amount',
      key: 'payable_amount',
      width: 100,
      render: (v: number) => formatAmount(v),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => {
        const s = ORDER_STATUS_MAP[status];
        return s ? <Tag color={s.color}>{s.text}</Tag> : <Tag>未知</Tag>;
      },
    },
    {
      title: '下单时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (t: string) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>{formatDate(t)}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{t ? formatDateTime(t).split(' ')[1] : '-'}</div>
        </div>
      ),
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
    const params: Record<string, any> = { ...vals };
    // keyword → order_no
    if (params.keyword) {
      params.order_no = params.keyword;
      delete params.keyword;
    }
    search(params);
  };

  const handleReset = () => {
    setValues({});
    search({});
  };

  const renderDetail = (d: any) => {
    const master = d.master_order || d;
    const subOrders = d.sub_orders || [];
    const items = d.items || [];
    const user = d.user;
    const shipping = d.shipping_address;

    return (
      <div>
        <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="订单号" span={2}>{master.order_no || d.order_no || '-'}</Descriptions.Item>
          <Descriptions.Item label="订单状态">
            <Tag color={ORDER_STATUS_MAP[master.status]?.color}>{ORDER_STATUS_MAP[master.status]?.text || '其他'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="订单类型">{master.order_type === 'physical' ? '实物' : '核销'}</Descriptions.Item>
          <Descriptions.Item label="用户昵称">{user?.nickname || d.user_data?.nick || '-'}</Descriptions.Item>
          <Descriptions.Item label="用户手机">{user?.phone_masked || d.user_data?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="应付金额">{formatAmount(master.total_amount || d.total_amount)}</Descriptions.Item>
          <Descriptions.Item label="实付金额">{formatAmount(master.payable_amount || d.payable_amount)}</Descriptions.Item>
          <Descriptions.Item label="优惠金额">{formatAmount(master.discount_amount || d.discount_amount)}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{master.created_at ? formatDateTime(master.created_at) : '-'}</Descriptions.Item>
          <Descriptions.Item label="支付时间">{master.paid_at ? formatDateTime(master.paid_at) : '-'}</Descriptions.Item>
        </Descriptions>

        {items.length > 0 && (
          <>
            <div style={{ fontWeight: 600, margin: '16px 0 8px', fontSize: 14 }}>商品明细</div>
            <Descriptions column={1} bordered size="small">
              {items.map((item: any, i: number) => (
                <Descriptions.Item key={i} label={item.product_title || `商品#${i + 1}`}>
                  {item.sku_name ? `${item.sku_name} × ${item.quantity || 1}，单价 ¥${((item.unit_price || 0) / 100).toFixed(2)}` : `× ${item.quantity || 1}`}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </>
        )}

        {shipping && (
          <>
            <div style={{ fontWeight: 600, margin: '16px 0 8px', fontSize: 14 }}>收货地址</div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="收货人">{shipping.recipient_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{shipping.recipient_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="地址">{`${shipping.province || ''}${shipping.city || ''}${shipping.district || ''} ${shipping.detail || ''}`}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <StandardPage
        title={config.title}
        description={config.description}
        showRefreshButton
        onRefresh={refresh}
        searchArea={
          <SearchPanel
            filters={filters}
            values={values}
            onChange={handleChange}
            onSearch={handleSearch}
            onReset={handleReset}
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
        title="订单详情"
        open={!!detailData}
        onCancel={() => setDetailData(null)}
        footer={null}
        width={720}
        confirmLoading={detailLoading}
      >
        {detailData && renderDetail(detailData)}
      </Modal>

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

export default OrderListPage;
