import OrderListPage from '@/components/events/OrderListPage';

const EVENT_ORDER_CONFIG = {
  title: '活动报名管理',
  description: '管理活动报名订单，查看订单详情、支付状态及用户信息。',
  defaultOrderType: 'verify' as const,
  defaultRootCategoryId: 1, // 活动
  hideOrderNo: true,
  productColumnTitle: '活动项目',
  productLabel: '报名项目',
  statusMap: {
    0: { text: '待支付', color: 'orange' },
    1: { text: '已支付', color: 'blue' },
    5: { text: '已完成', color: 'green' },
    6: { text: '已取消', color: 'default' },
  } as const,
};

const EventOrders = () => {
  return <OrderListPage config={EVENT_ORDER_CONFIG} />;
};

export default EventOrders;
