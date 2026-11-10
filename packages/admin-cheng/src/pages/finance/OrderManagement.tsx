import { useState, useCallback } from 'react';
import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { xpayApi, XpayOrder, PayBizType, OrderStatus } from '@/api/services/xpay';
import { formatDateTime, formatCents } from '@/utils/format';

const BIZ_TYPE_META: Record<number, { label: string; color: string }> = {
  [PayBizType.CONGRATULATION_CASH]: { label: '报喜现金红包', color: 'magenta' },
  [PayBizType.COIN_RECHARGE]: { label: '代币充值', color: 'blue' },
  [PayBizType.ID_VERIFY]: { label: '实人认证', color: 'purple' },
};

const ORDER_STATUS_META: Record<number, { label: string; color: string }> = {
  [OrderStatus.PENDING]: { label: '待支付', color: 'orange' },
  [OrderStatus.PAID]: { label: '已支付', color: 'green' },
  [OrderStatus.REFUNDED]: { label: '已退款', color: 'blue' },
  [OrderStatus.CLOSED]: { label: '已关闭', color: 'default' },
};

const BIZ_TYPE_OPTIONS = [
  { label: '报喜现金红包', value: PayBizType.CONGRATULATION_CASH },
  { label: '代币充值', value: PayBizType.COIN_RECHARGE },
  { label: '实人认证', value: PayBizType.ID_VERIFY },
];

const ORDER_STATUS_OPTIONS = [
  { label: '待支付', value: OrderStatus.PENDING },
  { label: '已支付', value: OrderStatus.PAID },
  { label: '已退款', value: OrderStatus.REFUNDED },
  { label: '已关闭', value: OrderStatus.CLOSED },
];

/** 响应结构统一解析（拦截器可能返回 { list, total } 或原始数组） */
const formatResponse = (res: any) => {
  const list = Array.isArray(res) ? res : (res?.list || []);
  const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
  return { list, count: total };
};

/** 双行日期/时间列（值缺失不显示） */
const dateTimeCol = (title: string, dataIndex: string, key: string) => ({
  title,
  dataIndex,
  key,
  width: 120,
  render: (v: string) => {
    if (!v) return null;
    const t = formatDateTime(v);
    return <div style={{ fontSize: 12, lineHeight: 1.6 }}><div>{t.slice(0, 10)}</div><div>{t.slice(11)}</div></div>;
  },
});

const OrderManagement = () => {
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchOrders = useCallback(async (params: any) => {
    return xpayApi.getOrders({
      page: params.page,
      size: params.page_size,
      biz_type: params.biz_type,
      status: params.status,
      user_id: params.user_id || undefined,
    });
  }, []);

  const { data, loading, pagination, onPageChange, search } = useListPage<XpayOrder>({
    fetchFn: fetchOrders,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const filters: FilterConfig[] = [
    { name: 'biz_type', placeholder: '全部业务', type: 'select', options: BIZ_TYPE_OPTIONS },
    { name: 'status', placeholder: '全部状态', type: 'select', options: ORDER_STATUS_OPTIONS },
    { name: 'user_id', placeholder: '用户ID', type: 'input' },
  ];

  const columns: ColumnsType<XpayOrder> = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v || '-'}</span>,
    },
    {
      title: '业务类型',
      dataIndex: 'biz_type',
      key: 'biz_type',
      width: 100,
      render: (v: number) => {
        const meta = BIZ_TYPE_META[v];
        return <Tag color={meta?.color || 'default'} title={meta?.label ?? v}>{meta?.label ?? v}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: number) => {
        const meta = ORDER_STATUS_META[v];
        return <Tag color={meta?.color || 'default'} title={meta?.label ?? v}>{meta?.label ?? v}</Tag>;
      },
    },
    {
      title: '金额（元）',
      dataIndex: 'amount_cents',
      key: 'amount_cents',
      width: 100,
      render: (v: number) => formatCents(v),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (v: string) => <span style={{ wordBreak: 'break-word' }}>{v || '-'}</span>,
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 180,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v || '-'}</span>,
    },
    dateTimeCol('创建时间', 'created_at', 'created_at'),
    dateTimeCol('支付时间', 'paid_at', 'paid_at'),
  ];

  return (
    <StandardPage
      title="订单管理"
      description="查看报喜红包、代币充值与实人认证等业务的支付订单及支付状态。"
      table={
        <div>
          <div style={{ marginBottom: 12 }}>
            <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
          </div>
          <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
        </div>
      }
    />
  );
};

export default OrderManagement;
