import { useState, useCallback } from 'react';
import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { xpayApi, XpayRefund, RefundStatus } from '@/api/services/xpay';
import { formatDateTime, formatCents } from '@/utils/format';

const REFUND_STATUS_META: Record<number, { label: string; color: string }> = {
  [RefundStatus.PROCESSING]: { label: '处理中', color: 'orange' },
  [RefundStatus.SUCCESS]: { label: '退款成功', color: 'green' },
  [RefundStatus.FAILED]: { label: '退款失败', color: 'red' },
};

const REFUND_STATUS_OPTIONS = [
  { label: '处理中', value: RefundStatus.PROCESSING },
  { label: '退款成功', value: RefundStatus.SUCCESS },
  { label: '退款失败', value: RefundStatus.FAILED },
];

/** 响应结构统一解析（拦截器可能返回 { list, total } 或原始数组） */
const formatResponse = (res: any) => {
  const list = Array.isArray(res) ? res : (res?.list || []);
  const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
  return { list, count: total };
};

/** 双行日期/时间列 */
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

const RefundManagement = () => {
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchRefunds = useCallback(async (params: any) => {
    return xpayApi.getRefunds({
      page: params.page,
      size: params.page_size,
      order_id: params.order_id || undefined,
      status: params.status,
    });
  }, []);

  const { data, loading, pagination, onPageChange, search } = useListPage<XpayRefund>({
    fetchFn: fetchRefunds,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: REFUND_STATUS_OPTIONS },
    { name: 'order_id', placeholder: '支付订单ID', type: 'input' },
  ];

  const columns: ColumnsType<XpayRefund> = [
    {
      title: '退款单号',
      dataIndex: 'refund_no',
      key: 'refund_no',
      width: 180,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v || '-'}</span>,
    },
    {
      title: '支付订单ID',
      dataIndex: 'order_id',
      key: 'order_id',
      width: 180,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v || '-'}</span>,
    },
    {
      title: '微信退款单号',
      dataIndex: 'wx_refund_id',
      key: 'wx_refund_id',
      width: 180,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v || '-'}</span>,
    },
    {
      title: '金额（元）',
      dataIndex: 'amount_cents',
      key: 'amount_cents',
      width: 100,
      render: (v: number) => formatCents(v),
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (v: string) => <span style={{ wordBreak: 'break-word' }}>{v || '-'}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: number) => {
        const meta = REFUND_STATUS_META[v];
        return <Tag color={meta?.color || 'default'} title={meta?.label ?? v}>{meta?.label ?? v}</Tag>;
      },
    },
    dateTimeCol('创建时间', 'created_at', 'created_at'),
    dateTimeCol('更新时间', 'updated_at', 'updated_at'),
  ];

  return (
    <StandardPage
      title="退款管理"
      description="查看支付订单的退款流水与退款进度。"
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

export default RefundManagement;
