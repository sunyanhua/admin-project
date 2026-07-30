import OrderListPage from '@/components/events/OrderListPage';

const PRODUCT_ORDER_CONFIG = {
  title: '购买信息',
  description: '管理商品购买订单，查看购买详情、支付状态、发货信息及用户信息。',
  defaultOrderType: 'physical' as const,
  defaultRootCategoryId: 3, // 商品
  hideOrderNo: true,
  productColumnTitle: '购买商品',
  showAllItems: true,
  statusMap: {
    0: { text: '待支付', color: 'orange' },
    1: { text: '已支付', color: 'blue' },
    2: { text: '待发货', color: 'cyan' },
    3: { text: '已发货', color: 'geekblue' },
    4: { text: '已收货', color: 'lime' },
    5: { text: '已完成', color: 'green' },
    6: { text: '已取消', color: 'default' },
    7: { text: '售后中', color: 'purple' },
  } as const,
};

const ProductOrders = () => {
  return <OrderListPage config={PRODUCT_ORDER_CONFIG} />;
};

export default ProductOrders;
