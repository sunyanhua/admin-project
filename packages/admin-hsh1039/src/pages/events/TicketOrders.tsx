import OrderListPage from '@/components/events/OrderListPage';

const TICKET_ORDER_CONFIG = {
  title: '购票信息',
  description: '管理门票购买订单，查看购票详情、支付状态及用户信息。',
  defaultOrderType: 'verify' as const,
  defaultRootCategoryId: 2, // 门票
  hideOrderNo: true,
  productColumnTitle: '购票项目',
  statusMap: {
    0: { text: '待支付', color: 'orange' },
    1: { text: '已支付', color: 'blue' },
    5: { text: '已完成', color: 'green' },
    6: { text: '已取消', color: 'default' },
  } as const,
};

const TicketOrders = () => {
  return <OrderListPage config={TICKET_ORDER_CONFIG} />;
};

export default TicketOrders;
