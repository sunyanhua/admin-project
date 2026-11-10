import { useState, useCallback } from 'react';
import { Tag, Button, Space, Descriptions, Spin } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useListPage } from '@/hooks/useListPage';
import { useAppNotification } from '@/hooks/useAppNotification';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { xpayApi, IosRefundInquiry, IOSRefundDecision, IOSRefundDecisionSource, IOSProvideStatus } from '@/api/services/xpay';
import { formatDateTime } from '@/utils/format';

const DECISION_META: Record<number, { label: string; color: string }> = {
  [IOSRefundDecision.REFUND]: { label: '建议退款', color: 'green' },
  [IOSRefundDecision.BLOCK]: { label: '拦截', color: 'red' },
};

const DECISION_SOURCE_LABELS: Record<number, string> = {
  [IOSRefundDecisionSource.RULE]: '命中规则',
  [IOSRefundDecisionSource.DEFAULT]: '命中兜底规则',
  [IOSRefundDecisionSource.FALLBACK]: '降级（规则缺失/查询异常）',
  [IOSRefundDecisionSource.POLICY]: '业务硬规则',
};

const PROVIDE_STATUS_META: Record<number, { label: string; color: string }> = {
  [IOSProvideStatus.NOT_DELIVERED]: { label: '未发货', color: 'default' },
  [IOSProvideStatus.DELIVERED]: { label: '已发货', color: 'green' },
  [IOSProvideStatus.DELIVERING]: { label: '发货中', color: 'blue' },
};

const DECISION_OPTIONS = [
  { label: '建议退款', value: IOSRefundDecision.REFUND },
  { label: '拦截', value: IOSRefundDecision.BLOCK },
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

/** 问询详情弹窗：决策快照 + 证据 + 结果信息 */
const InquiryDetailModal: React.FC<{ open: boolean; record: IosRefundInquiry | null; onClose: () => void }> = ({ open, record, onClose }) => {
  if (!record) return null;
  const decision = DECISION_META[record.decision];
  return (
    <ScrollableModal title="iOS 退款问询详情" open={open} onCancel={onClose} width={720} footer={null}>
      <Descriptions column={2} size="small" bordered labelStyle={{ width: 120 }}>
        <Descriptions.Item label="商户单号">{record.order_no || '-'}</Descriptions.Item>
        <Descriptions.Item label="支付订单ID">{record.pay_order_id || '-'}</Descriptions.Item>
        <Descriptions.Item label="决策">
          <Tag color={decision?.color || 'default'}>{decision?.label ?? record.decision}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="决策来源">{DECISION_SOURCE_LABELS[record.decision_source] ?? record.decision_source}</Descriptions.Item>
        <Descriptions.Item label="命中规则">{record.rule_name || record.rule_id || '-'}</Descriptions.Item>
        <Descriptions.Item label="发货状态">
          {(() => {
            const m = PROVIDE_STATUS_META[record.provide_status];
            return <Tag color={m?.color || 'default'}>{m?.label ?? record.provide_status}</Tag>;
          })()}
        </Descriptions.Item>
        <Descriptions.Item label="问询次数">{record.inquiry_count ?? 0}</Descriptions.Item>
        <Descriptions.Item label="响应耗时">{record.response_ms != null ? `${record.response_ms} ms` : '-'}</Descriptions.Item>
        <Descriptions.Item label="商品ID">{record.product_id || '-'}</Descriptions.Item>
        <Descriptions.Item label="渠道账单号">{record.channel_bill || '-'}</Descriptions.Item>
        <Descriptions.Item label="首次问询" span={2}>{record.first_inquired_at ? formatDateTime(record.first_inquired_at) : '-'}</Descriptions.Item>
        <Descriptions.Item label="最近问询" span={2}>{record.last_inquired_at ? formatDateTime(record.last_inquired_at) : '-'}</Descriptions.Item>
        <Descriptions.Item label="退款原因" span={2}>{record.refund_reason || '-'}</Descriptions.Item>
        <Descriptions.Item label="证据" span={2}><span style={{ wordBreak: 'break-word' }}>{record.evidence || '-'}</span></Descriptions.Item>
        <Descriptions.Item label="结果信息" span={2}><span style={{ wordBreak: 'break-word' }}>{record.result_info || '-'}</span></Descriptions.Item>
      </Descriptions>
    </ScrollableModal>
  );
};

const IosRefundManagement = () => {
  const { error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRecord, setDetailRecord] = useState<IosRefundInquiry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchInquiries = useCallback(async (params: any) => {
    return xpayApi.getIosRefundInquiries({
      page: params.page,
      size: params.page_size,
      order_no: params.order_no || undefined,
      decision: params.decision,
      rule_id: params.rule_id || undefined,
    });
  }, []);

  const { data, loading, pagination, onPageChange, search } = useListPage<IosRefundInquiry>({
    fetchFn: fetchInquiries,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  /** 打开详情：拉取完整问询记录（决策/证据快照/原始报文） */
  const handleViewDetail = async (record: IosRefundInquiry) => {
    setDetailRecord(record);
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res: any = await xpayApi.getIosRefundInquiry(record.id);
      const detail: any = Array.isArray(res) ? (res[0] || null) : res;
      if (detail && typeof detail === 'object') setDetailRecord({ ...record, ...detail });
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取问询详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const filters: FilterConfig[] = [
    { name: 'decision', placeholder: '全部决策', type: 'select', options: DECISION_OPTIONS },
    { name: 'order_no', placeholder: '商户单号', type: 'input' },
    { name: 'rule_id', placeholder: '规则ID', type: 'input' },
  ];

  const columns: ColumnsType<IosRefundInquiry> = [
    {
      title: '商户单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 180,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v || '-'}</span>,
    },
    {
      title: '决策',
      dataIndex: 'decision',
      key: 'decision',
      width: 100,
      render: (v: number) => {
        const meta = DECISION_META[v];
        return <Tag color={meta?.color || 'default'} title={meta?.label ?? v}>{meta?.label ?? v}</Tag>;
      },
    },
    {
      title: '决策来源',
      dataIndex: 'decision_source',
      key: 'decision_source',
      width: 110,
      render: (v: number) => <Tag title={DECISION_SOURCE_LABELS[v] ?? v}>{DECISION_SOURCE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '发货状态',
      dataIndex: 'provide_status',
      key: 'provide_status',
      width: 90,
      render: (v: number) => {
        const meta = PROVIDE_STATUS_META[v];
        return <Tag color={meta?.color || 'default'} title={meta?.label ?? v}>{meta?.label ?? v}</Tag>;
      },
    },
    {
      title: '问询次数',
      dataIndex: 'inquiry_count',
      key: 'inquiry_count',
      width: 90,
      render: (v: number) => v ?? 0,
    },
    {
      title: '退款原因',
      dataIndex: 'refund_reason',
      key: 'refund_reason',
      width: 160,
      ellipsis: true,
      render: (v: string) => <span title={v || ''}>{v || '-'}</span>,
    },
    dateTimeCol('首次问询', 'first_inquired_at', 'first_inquired_at'),
    dateTimeCol('最近问询', 'last_inquired_at', 'last_inquired_at'),
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: any, record: IosRefundInquiry) => (
        <Space size={4} className="action-buttons">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <StandardPage
        title="iOS退款处理"
        description="查看 iOS 退款问询记录与处理决策。"
        table={
          <div>
            <div style={{ marginBottom: 12 }}>
              <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
            </div>
            <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
          </div>
        }
      />
      <Spin spinning={detailLoading}>
        <InquiryDetailModal
          open={detailVisible}
          record={detailRecord}
          onClose={() => { setDetailVisible(false); setDetailRecord(null); }}
        />
      </Spin>
    </>
  );
};

export default IosRefundManagement;
