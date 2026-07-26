import OrderListPage from '@/components/events/OrderListPage';

const TICKET_ORDER_CONFIG = {
  title: '购票信息',
  description: '管理门票购买订单，查看购票详情、支付状态及用户信息。',
  defaultOrderType: 'verification' as const,
};

const TicketOrders = () => {
  return <OrderListPage config={TICKET_ORDER_CONFIG} />;
};

export default TicketOrders;
