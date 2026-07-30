import OrderListPage from '@/components/events/OrderListPage';

const PRODUCT_ORDER_CONFIG = {
  title: '购买信息',
  description: '管理商品购买订单，查看购买详情、支付状态、发货信息及用户信息。',
  defaultOrderType: 'physical' as const,
  defaultRootCategoryId: 3, // 商品
};

const ProductOrders = () => {
  return <OrderListPage config={PRODUCT_ORDER_CONFIG} />;
};

export default ProductOrders;
