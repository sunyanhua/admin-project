import OrderListPage from '@/components/events/OrderListPage';

const EVENT_ORDER_CONFIG = {
  title: '活动报名管理',
  description: '管理活动报名订单，查看订单详情、支付状态及用户信息。',
  defaultOrderType: 'verification' as const,
};

const EventOrders = () => {
  return <OrderListPage config={EVENT_ORDER_CONFIG} />;
};

export default EventOrders;
