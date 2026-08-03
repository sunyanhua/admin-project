import React, { useState, useCallback, useRef } from 'react';
import { Button, Space, Modal, Avatar } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { statusTagColumn } from '@/components/templates/ColumnHelpers';
import type { ColumnsType } from 'antd/es/table';
import { orderApi } from '@/api/services/order';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import UserDetailModal from '@/components/user/UserDetailModal';
import OrderDetailModal from '@/components/events/OrderDetailModal';
import ShipModal from '@/components/events/ShipModal';
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

const formatAmount = (amount?: number) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${(amount / 100).toFixed(2)}`;
};

interface OrderConfig {
  title: string;
  description: string;
  defaultOrderType?: string; // 'verify' | 'physical'
  defaultRootCategoryId?: number; // 1=活动 2=门票 3=商品
  hideOrderNo?: boolean;
  productColumnTitle?: string; // 自定义产品列标题，如"活动项目"
  productLabel?: string; // 详情弹窗项目区域标题，如"报名项目"
  showAllItems?: boolean; // 自定义产品列是否遍历展示所有 items（默认只取第一项）
  showOrderActions?: boolean; // 详情弹窗是否显示发货/退款按钮（仅实物订单）
  onExport?: (filters: Record<string, any>) => void; // 导出回调
  statusMap?: Record<number, { text: string; color: string }>; // 自定义状态映射
}

interface OrderItem {
  product_title?: string;
  product_cover?: string;
  sku_name?: string;
  sku_spec_text?: string; // 规格文本（如"成人票 / 上午场"）
  quantity?: number;
  unit_price?: number;
}

interface OrderRecord {
  id: number;
  order_no: string;
  status: number;
  order_type: string;
  user_id?: string;
  total_amount: number;
  discount_amount: number;
  pay_amount: number;
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
  const [selectedUserId, setSelectedUserId] = useState<string | number>('');
  const [shipModalVisible, setShipModalVisible] = useState(false);
  const [shipOrderId, setShipOrderId] = useState<number>(0);
  const activeFiltersRef = useRef<Record<string, any>>({});
  const { success, error: showError } = useAppNotification();

  const activeStatusMap = config.statusMap || ORDER_STATUS_MAP;

  const statusOptions = Object.entries(activeStatusMap).map(([value, { text }]) => ({
    label: text,
    value: Number(value),
  }));

  const fetchOrders = useCallback(async (params: any) => {
    const apiParams: Record<string, any> = { ...params };
    if (config.defaultOrderType) {
      apiParams.order_type = config.defaultOrderType;
    }
    if (config.defaultRootCategoryId) {
      apiParams.root_category_id = config.defaultRootCategoryId;
    }
    return orderApi.getOrders(apiParams);
  }, [config.defaultOrderType, config.defaultRootCategoryId]);

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

  const handleViewUserDetail = (record: OrderRecord) => {
    const uid = record.user?.id || record.user_id;
    if (!uid) return;
    setSelectedUserId(uid);
    setUserDetailVisible(true);
  };

  const handleShip = (orderId: number) => {
    setShipOrderId(orderId);
    setShipModalVisible(true);
  };

  const handleRefund = (orderId: number) => {
    showError('退款功能待上线');
  };

  const handleShipSuccess = () => {
    refresh();
    setDetailData(null);
  };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: statusOptions },
    { name: 'keyword', placeholder: '订单号搜索', type: 'input' },
  ];

  const productColumnTitle = config.productColumnTitle || '商品/活动';

  const columns: ColumnsType<OrderRecord> = [
    {
      title: '用户',
      key: 'user',
      width: 160,
      render: (_: any, record: OrderRecord) => {
        const u = record.user;
        const ud = record.user_data;
        const avatar = u?.avatar_url || ud?.avatar_url;
        const nick = u?.nickname || ud?.nickname || '-';
        const uid = u?.id || record.user_id;
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
    ...(config.hideOrderNo ? [] : [{
      title: '订单号' as const,
      dataIndex: 'order_no' as const,
      key: 'order_no',
      width: 200,
      ellipsis: true,
      render: (v: string) => v || '-',
    }]),
    {
      title: productColumnTitle,
      key: 'product',
      ...(config.productColumnTitle ? { width: 180 } : {}),
      render: (_: any, record: OrderRecord) => {
        if (config.productColumnTitle && record.items && record.items.length > 0) {
          // 自定义列标题模式：两行展示每个子项
          const displayItems = config.showAllItems ? record.items : [record.items[0]];
          return (
            <div style={{ lineHeight: 1.6 }}>
              {displayItems.map((item, i) => (
                <div key={i} style={{ marginBottom: i < displayItems.length - 1 ? 6 : 0 }}>
                  <div style={{ wordBreak: 'break-word' }}>{item.product_title || '-'}</div>
                  <div style={{ color: '#999', fontSize: 12, wordBreak: 'break-word' }}>
                    {item.sku_spec_text || item.sku_name || ''}
                    {item.quantity != null ? ` × ${item.quantity}` : ''}
                  </div>
                </div>
              ))}
            </div>
          );
        }
        const firstItem = record.items?.[0];
        if (firstItem) {
          // 默认模式（商品/活动）：展示所有子项
          return (
            <span style={{ wordBreak: 'break-word' }}>
              {record.items!.map((item, i) => (
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
      dataIndex: 'pay_amount',
      key: 'pay_amount',
      width: 100,
      render: (_: any, record: OrderRecord) => formatAmount(record.pay_amount ?? record.payable_amount),
    },
    statusTagColumn<OrderRecord>('status', activeStatusMap, '状态', 90),
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
    activeFiltersRef.current = params;
    search(params);
  };

  const handleReset = () => {
    setValues({});
    search({});
  };

  return (
    <>
      <StandardPage
        title={config.title}
        description={config.description}
        showRefreshButton
        onRefresh={refresh}
        extraActions={config.onExport ? <Button icon={<DownloadOutlined />} onClick={() => config.onExport?.(activeFiltersRef.current)}>导出</Button> : undefined}
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
            scroll={{ x: config.hideOrderNo ? 750 : 1000 }}
          />
        }
      />

      <Modal
        maskClosable={false}
        title="订单详情"
        open={!!detailData}
        onCancel={() => setDetailData(null)}
        footer={null}
        width={720}
        confirmLoading={detailLoading}
      >
        <OrderDetailModal
          data={detailData}
          statusMap={activeStatusMap}
          productLabel={config.productLabel}
          showActions={config.showOrderActions}
          onShip={handleShip}
          onRefund={handleRefund}
        />
      </Modal>

      <UserDetailModal
        userId={selectedUserId}
        open={userDetailVisible}
        onClose={() => setUserDetailVisible(false)}
      />

      <ShipModal
        orderId={shipOrderId}
        open={shipModalVisible}
        onClose={() => setShipModalVisible(false)}
        onSuccess={handleShipSuccess}
      />
    </>
  );
};

export default OrderListPage;
