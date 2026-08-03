import { useCallback } from 'react';
import OrderListPage from '@/components/events/OrderListPage';
import { orderApi } from '@/api/services/order';
import { useAppNotification } from '@/hooks/useAppNotification';

const ORDER_TYPE = 'physical' as const;
const ROOT_CATEGORY_ID = 3;

const buildCSV = (data: any[]) => {
  const BOM = '﻿';
  const header = ['订单ID', '购买人', '购买人手机', '购买商品', '支付金额', '订单状态', '收货人', '联系电话', '地址', '物流公司', '物流单号'];

  const STATUS_MAP: Record<number, string> = {
    0: '待支付', 1: '已支付', 2: '待发货', 3: '已发货',
    4: '已收货', 5: '已完成', 6: '已取消', 7: '售后中',
  };

  const rows = data.map((order) => {
    const master = order.master_order || order;
    // 列表接口 items 在顶层，非 sub_orders
    const items: any[] = order.items && order.items.length > 0
      ? order.items
      : (order.sub_orders || []).flatMap((so: any) => so.items || []);
    const productText = items.map((item: any) =>
      `${item.product_title || ''} ${item.sku_spec_text || item.sku_name || ''} × ${item.quantity ?? 1}`
    ).join('; ');

    const ship = order.shipping_address || {};
    const logistics = master.logistics || order.logistics || {};
    const payAmount = master.pay_amount ?? order.pay_amount;

    return [
      master.id ?? '',
      order.user_data?.nickname || order.user?.nickname || '',
      order.user_data?.phone_masked || order.user?.phone_masked || '',
      productText,
      payAmount != null ? `¥${(payAmount / 100).toFixed(2)}` : '',
      STATUS_MAP[master.status ?? order.status] || '',
      ship.name || '',
      ship.phone || '',
      `${ship.province || ''}${ship.city || ''}${ship.district || ''} ${ship.detail || ''}`.trim(),
      logistics.logistics_company || logistics.company || '',
      logistics.tracking_no || logistics.tracking_number || '',
    ];
  });

  const csvContent = BOM + [header, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `订单导出_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const ProductOrders = () => {
  const { success, error: showError } = useAppNotification();

  const handleExport = useCallback(async (filters: Record<string, any>) => {
    try {
      const all: any[] = [];
      let page = 1;
      const pageSize = 100;
      while (true) {
        const res: any = await orderApi.getOrders({
          ...filters,
          order_type: ORDER_TYPE,
          root_category_id: ROOT_CATEGORY_ID,
          page,
          page_size: pageSize,
        });
        const list = res?.list || [];
        all.push(...list);
        if (list.length < pageSize) break;
        page++;
      }
      if (all.length === 0) {
        showError('没有可导出的订单');
        return;
      }
      buildCSV(all);
      success(`已导出 ${all.length} 条订单`);
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || '导出失败');
    }
  }, []);

  return (
    <OrderListPage config={{
      title: '订单管理',
      description: '管理商品购买订单，查看购买详情、支付状态、发货信息及用户信息。',
      defaultOrderType: ORDER_TYPE,
      defaultRootCategoryId: ROOT_CATEGORY_ID,
      hideOrderNo: true,
      productColumnTitle: '购买商品',
      productLabel: '购买商品',
      showAllItems: true,
      showOrderActions: true,
      onExport: handleExport,
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
    }} />
  );
};

export default ProductOrders;
