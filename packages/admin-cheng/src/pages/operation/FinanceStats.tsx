import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, Tabs, DatePicker, Select, Input, Button, Image } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { useAppNotification } from '@/hooks/useAppNotification';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { getSmallUrl } from '@/utils/imageUtils';
import { formatCents, dayjsToApi } from '@/utils/format';
import { xpayApi, PayBizType, PayBillChannel } from '@/api/services/xpay';
import type {
  AdminFundSummaryResponse, AdminFundPayBizTypeItem, AdminReconcileSummaryItem,
} from '@/api/services/xpay';
import { congratulationApi, CongratulationTributeKind, CongratulationTributeStatus } from '@/api/services/congratulation';
import type { AdminTributeSummaryResponse, AdminTributeGroup } from '@/api/services/congratulation';

const { RangePicker } = DatePicker;

/** 资金汇总显式窗口上限（天，含首尾） */
const FUND_MAX_SPAN_DAYS = 366;

const BIZ_TYPE_META: Record<number, { label: string; color: string }> = {
  [PayBizType.CONGRATULATION_CASH]: { label: '报喜现金红包', color: 'magenta' },
  [PayBizType.COIN_RECHARGE]: { label: '代币充值', color: 'blue' },
  [PayBizType.ID_VERIFY]: { label: '实人认证', color: 'purple' },
};

const CHANNEL_META: Record<number, { label: string; title: string; color: string }> = {
  [PayBillChannel.WECHAT]: { label: '微信', title: '微信普通虚拟支付', color: 'green' },
  [PayBillChannel.APPLE]: { label: 'Apple', title: 'Apple IAP', color: 'default' },
};

const TRIBUTE_KIND_META: Record<number, { label: string; color: string }> = {
  [CongratulationTributeKind.GIFT]: { label: '站内礼物', color: 'blue' },
  [CongratulationTributeKind.CASH]: { label: '现金红包', color: 'magenta' },
};

const TRIBUTE_STATUS_META: Record<number, { label: string; color: string }> = {
  [CongratulationTributeStatus.PENDING]: { label: '待支付', color: 'orange' },
  [CongratulationTributeStatus.COMPLETED]: { label: '已完成', color: 'green' },
  [CongratulationTributeStatus.REFUNDED]: { label: '已退款', color: 'blue' },
  [CongratulationTributeStatus.CLOSED]: { label: '已关闭', color: 'default' },
};

/** 金额展示：分 → 元，前缀 ¥；空值返回 '-' */
const yuan = (cents?: number | null) => (cents == null ? '-' : `¥${formatCents(cents)}`);

/** YYYYMMDD → YYYY/MM/DD */
const toSlashDate = (s: string) => (s?.length === 8 ? `${s.slice(0, 4)}/${s.slice(4, 6)}/${s.slice(6, 8)}` : s || '-');

/** 统计小格 */
const StatCell: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <Statistic title={label} value={value} valueStyle={{ color, fontSize: 20 }} />
);

/** 未来日期不可选（统计数据不存在未来值） */
const disabledFutureDate = (d: Dayjs) => d.isAfter(dayjs(), 'day');

// ======================== 资金汇总 ========================

const FundSummaryTab: React.FC = () => {
  const { error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(30, 'day'), dayjs()]);
  const [summary, setSummary] = useState<AdminFundSummaryResponse | null>(null);
  const reqIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const res: any = await xpayApi.getFundSummary({
        from_date: dateRange[0].format('YYYYMMDD'),
        to_date: dateRange[1].format('YYYYMMDD'),
      });
      if (reqId !== reqIdRef.current) return;
      setSummary(res || null);
    } catch (err: any) {
      if (reqId !== reqIdRef.current) return;
      setSummary(null);
      showError(err?.response?.data?.message || '获取资金汇总失败');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRangeChange = (vals: [Dayjs | null, Dayjs | null] | null) => {
    if (!vals || !vals[0] || !vals[1]) return;
    if (vals[1].diff(vals[0], 'day') + 1 > FUND_MAX_SPAN_DAYS) {
      showError(`统计日期跨度不能超过 ${FUND_MAX_SPAN_DAYS} 天`);
      return;
    }
    setDateRange([vals[0], vals[1]]);
  };

  const pay = summary?.pay;
  const refund = summary?.refund;
  const settle = summary?.settle;
  const withdraw = summary?.withdraw;

  const bizTypeColumns: ColumnsType<AdminFundPayBizTypeItem> = [
    {
      title: '业务类型', key: 'biz_type', width: 130,
      render: (_: any, r: AdminFundPayBizTypeItem) => {
        const m = BIZ_TYPE_META[r.biz_type];
        return <Tag color={m?.color || 'default'} title={m?.label ?? r.biz_type}>{m?.label ?? r.biz_type}</Tag>;
      },
    },
    { title: '支付金额（元）', dataIndex: 'cents', key: 'cents', width: 100, render: (v: number) => formatCents(v) },
    { title: '支付笔数', dataIndex: 'count', key: 'count', width: 90 },
    { title: '已退款笔数', dataIndex: 'refunded_count', key: 'refunded_count', width: 100 },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <RangePicker
          value={dateRange}
          allowClear={false}
          disabledDate={disabledFutureDate}
          onChange={handleRangeChange}
        />
        <span style={{ color: '#666', fontSize: 13 }}>
          统计区间：{toSlashDate(summary?.start_date || '')} ~ {toSlashDate(summary?.end_date || '')}（北京时间自然日）
        </span>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
      </Space>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="支付" loading={loading} style={{ marginBottom: 0 }}>
            <Row gutter={[8, 16]}>
              <Col xs={12} sm={8}><StatCell label="支付金额" value={yuan(pay?.cents)} color="#1890ff" /></Col>
              <Col xs={12} sm={8}><StatCell label="支付笔数" value={pay?.count ?? '-'} /></Col>
              <Col xs={12} sm={8}><StatCell label="已退款笔数" value={pay?.refunded_count ?? '-'} color="#f5222d" /></Col>
            </Row>
            <StandardTable
              rowKey="biz_type"
              columns={bizTypeColumns}
              dataSource={pay?.by_biz_type || []}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="入账" loading={loading}>
            <Row gutter={[8, 16]}>
              <Col xs={12} sm={8}><StatCell label="入账笔数" value={settle?.count ?? '-'} /></Col>
              <Col xs={12} sm={8}><StatCell label="毛收入" value={yuan(settle?.gross_cents)} color="#1890ff" /></Col>
              <Col xs={12} sm={8}><StatCell label="手续费" value={yuan(settle?.fee_cents)} color="#faad14" /></Col>
              <Col xs={12} sm={8}><StatCell label="净收入" value={yuan(settle?.net_cents)} color="#52c41a" /></Col>
              <Col xs={12} sm={8}><StatCell label="一致笔数" value={settle?.matched_count ?? '-'} color="#52c41a" /></Col>
              <Col xs={12} sm={8}><StatCell label="差异笔数" value={settle?.diff_count ?? '-'} color="#f5222d" /></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="退费" loading={loading}>
            <Row gutter={[8, 16]}>
              <Col xs={12} sm={8}><StatCell label="退款金额" value={yuan(refund?.success_cents)} color="#13c2c2" /></Col>
              <Col xs={12} sm={8}><StatCell label="成功笔数" value={refund?.success_count ?? '-'} /></Col>
              <Col xs={12} sm={8}><StatCell label="处理中" value={refund?.processing_count ?? '-'} /></Col>
              <Col xs={12} sm={8}><StatCell label="失败" value={refund?.failed_count ?? '-'} /></Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="提现" loading={loading}>
            <Row gutter={[8, 16]}>
              <Col xs={12} sm={8}><StatCell label="提现金额" value={yuan(withdraw?.success_cents)} color="#722ed1" /></Col>
              <Col xs={12} sm={8}><StatCell label="成功笔数" value={withdraw?.success_count ?? '-'} /></Col>
              <Col xs={12} sm={8}><StatCell label="待审核" value={withdraw?.pending_review_count ?? '-'} /></Col>
              <Col xs={12} sm={8}><StatCell label="处理中" value={withdraw?.processing_count ?? '-'} /></Col>
              <Col xs={12} sm={8}><StatCell label="失败" value={withdraw?.failed_count ?? '-'} /></Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// ======================== 对账汇总 ========================

const ReconcileTab: React.FC = () => {
  const { error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(6, 'day'), dayjs()]);
  const [channel, setChannel] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<AdminReconcileSummaryItem[]>([]);
  const reqIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const params: any = {
        start_date: dateRange[0].format('YYYYMMDD'),
        end_date: dateRange[1].format('YYYYMMDD'),
      };
      if (channel) params.channel = channel;
      const res: any = await xpayApi.getReconcileSummary(params);
      if (reqId !== reqIdRef.current) return;
      setItems(Array.isArray(res) ? res : []);
    } catch (err: any) {
      if (reqId !== reqIdRef.current) return;
      setItems([]);
      showError(err?.response?.data?.message || '获取对账汇总失败');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, channel]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns: ColumnsType<AdminReconcileSummaryItem> = [
    { title: '账期日', dataIndex: 'bill_date', key: 'bill_date', width: 120, render: (v: string) => toSlashDate(v) },
    {
      title: '渠道', dataIndex: 'channel', key: 'channel', width: 100,
      render: (v: number) => {
        const m = CHANNEL_META[v];
        return <Tag color={m?.color || 'default'} title={m?.title ?? v}>{m?.label ?? v}</Tag>;
      },
    },
    { title: '交易笔数', dataIndex: 'trade_count', key: 'trade_count', width: 90 },
    { title: '交易额（元）', dataIndex: 'gross_amount_cents', key: 'gross_amount_cents', width: 100, render: (v: number) => formatCents(v) },
    { title: '手续费（元）', dataIndex: 'fee_cents', key: 'fee_cents', width: 100, render: (v: number) => formatCents(v) },
    { title: '净额（元）', dataIndex: 'net_amount_cents', key: 'net_amount_cents', width: 100, render: (v: number) => formatCents(v) },
    { title: '一致笔数', dataIndex: 'matched_count', key: 'matched_count', width: 90 },
    {
      title: '差异笔数', dataIndex: 'diff_count', key: 'diff_count', width: 90,
      render: (v: number) => (v > 0 ? <span style={{ color: '#f5222d' }}>{v}</span> : v),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <RangePicker
          value={dateRange}
          allowClear={false}
          disabledDate={disabledFutureDate}
          onChange={(vals) => { if (vals && vals[0] && vals[1]) setDateRange([vals[0], vals[1]]); }}
        />
        <Select
          style={{ width: 130 }}
          allowClear
          placeholder="全部渠道"
          value={channel}
          onChange={(v) => setChannel(v ?? undefined)}
          options={[
            { label: '微信', value: PayBillChannel.WECHAT },
            { label: 'Apple', value: PayBillChannel.APPLE },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
      </Space>
      <StandardTable
        rowKey={(r) => `${r.bill_date}-${r.channel}`}
        columns={columns}
        dataSource={items}
        loading={loading}
      />
    </div>
  );
};

// ======================== 报喜赠送账单 ========================

/** 赠送账单查询条件（点查询才生效；筛选控件只改本地值） */
interface TributeQuery {
  range: [Dayjs, Dayjs] | null;
  kind?: number;
  status?: number;
  keyword: string;
}

const TributeTab: React.FC = () => {
  const { error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [kind, setKind] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<number | undefined>(undefined);
  const [keywordInput, setKeywordInput] = useState('');
  const [query, setQuery] = useState<TributeQuery>({ range: null, keyword: '' });
  const [summary, setSummary] = useState<AdminTributeSummaryResponse | null>(null);
  const reqIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const res: any = await congratulationApi.getTributeSummary({
        start_at: query.range ? dayjsToApi(query.range[0].startOf('day')) : undefined,
        end_at: query.range ? dayjsToApi(query.range[1].endOf('day')) : undefined,
        kind: query.kind,
        status: query.status,
        keyword: query.keyword || undefined,
      });
      if (reqId !== reqIdRef.current) return;
      setSummary(res || null);
    } catch (err: any) {
      if (reqId !== reqIdRef.current) return;
      setSummary(null);
      showError(err?.response?.data?.message || '获取赠送账单汇总失败');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => {
    setQuery({ range, kind, status, keyword: keywordInput.trim() });
  };
  const handleReset = () => {
    setRange(null);
    setKind(undefined);
    setStatus(undefined);
    setKeywordInput('');
    setQuery({ range: null, keyword: '' });
  };

  const statusCounts = summary?.status_counts ?? [];

  const groupColumns: ColumnsType<AdminTributeGroup> = [
    {
      title: '类型', dataIndex: 'kind', key: 'kind', width: 90,
      render: (v: number) => {
        const m = TRIBUTE_KIND_META[v];
        return <Tag color={m?.color || 'default'} title={m?.label ?? v}>{m?.label ?? v}</Tag>;
      },
    },
    {
      title: '礼物', key: 'gift',
      render: (_: any, r: AdminTributeGroup) => (
        <Space size={8}>
          {r.gift_image
            ? <Image src={getSmallUrl(r.gift_image)} alt={r.gift_name} preview={{ src: r.gift_image }} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
            : null}
          <span style={{ wordBreak: 'break-word' }}>{r.gift_name || '-'}</span>
        </Space>
      ),
    },
    { title: '数量', dataIndex: 'count', key: 'count', width: 90 },
    { title: '金币', dataIndex: 'coins', key: 'coins', width: 100 },
    { title: '现金（元）', dataIndex: 'cents', key: 'cents', width: 100, render: (v: number) => formatCents(v) },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <RangePicker
          value={range}
          onChange={(vals) => { setRange(vals && vals[0] && vals[1] ? [vals[0], vals[1]] : null); }}
        />
        <Select
          style={{ width: 120 }}
          allowClear
          placeholder="全部类型"
          value={kind}
          onChange={(v) => setKind(v ?? undefined)}
          options={[
            { label: '站内礼物', value: CongratulationTributeKind.GIFT },
            { label: '现金红包', value: CongratulationTributeKind.CASH },
          ]}
        />
        <Select
          style={{ width: 120 }}
          allowClear
          placeholder="全部状态"
          value={status}
          onChange={(v) => setStatus(v ?? undefined)}
          options={[
            { label: '待支付', value: CongratulationTributeStatus.PENDING },
            { label: '已完成', value: CongratulationTributeStatus.COMPLETED },
            { label: '已退款', value: CongratulationTributeStatus.REFUNDED },
            { label: '已关闭', value: CongratulationTributeStatus.CLOSED },
          ]}
        />
        <Input
          style={{ width: 180 }}
          allowClear
          placeholder="搜索赠送人昵称"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onPressEnter={handleSearch}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} md={8} lg={8}>
          <StatCell label="记录总数" value={summary?.total_count ?? '-'} />
        </Col>
        <Col xs={12} sm={12} md={8} lg={8}>
          <StatCell label="已完成数" value={summary?.completed_count ?? '-'} color="#52c41a" />
        </Col>
        <Col xs={12} sm={12} md={8} lg={8}>
          <StatCell label="赠送人数" value={summary?.total_users ?? '-'} color="#1890ff" />
        </Col>
        <Col xs={12} sm={12} md={8} lg={8}>
          <StatCell label="金币合计" value={summary?.total_coins ?? '-'} color="#faad14" />
        </Col>
        <Col xs={12} sm={12} md={8} lg={8}>
          <StatCell label="现金合计" value={yuan(summary?.total_cents)} color="#eb2f96" />
        </Col>
      </Row>

      <Card title="状态分布" size="small" style={{ marginBottom: 16 }}>
        {statusCounts.length > 0 ? (
          <Space wrap size={8}>
            {[...statusCounts]
              .sort((a, b) => a.status - b.status)
              .map((s) => {
                const m = TRIBUTE_STATUS_META[s.status];
                const label = m?.label ?? s.status;
                return <Tag key={s.status} color={m?.color || 'default'} title={`${label} ${s.count}`}>{label} {s.count}</Tag>;
              })}
          </Space>
        ) : (
          <span style={{ color: '#999' }}>-</span>
        )}
      </Card>

      <Card title="类型与礼物分组" size="small">
        <StandardTable
          rowKey={(r) => `${r.kind}-${r.gift_id || r.gift_name}`}
          columns={groupColumns}
          dataSource={summary?.groups || []}
          loading={loading}
        />
      </Card>
    </div>
  );
};

// ======================== 页面 ========================

const FinanceStats = () => {
  const [tabKey, setTabKey] = useState('fund');

  return (
    <StandardPage
      title="财务统计"
      description="查看支付、入账、退费与提现的资金汇总，渠道对账结果以及报喜赠送账单汇总。"
      table={
        <Tabs
          activeKey={tabKey}
          onChange={setTabKey}
          items={[
            { key: 'fund', label: '资金汇总', children: tabKey === 'fund' ? <FundSummaryTab /> : null },
            { key: 'reconcile', label: '对账汇总', children: tabKey === 'reconcile' ? <ReconcileTab /> : null },
            { key: 'tribute', label: '赠送账单', children: tabKey === 'tribute' ? <TributeTab /> : null },
          ]}
        />
      }
    />
  );
};

export default FinanceStats;
