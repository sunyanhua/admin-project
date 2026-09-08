import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Space, Typography, Table } from 'antd';
import {
  EyeOutlined, UserAddOutlined, ClockCircleOutlined, BarChartOutlined, ShareAltOutlined,
} from '@ant-design/icons';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import { datacubeApi, OverviewResponse, VisitTrendItem, PageRankingItem } from '@/api/services/datacube';
import { useAppNotification } from '@/hooks/useAppNotification';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const toDateStr = (d: Dayjs) => d.format('YYYYMMDD');

const fmtDuration = (s: number) => {
  if (!s || s === 0) return '0秒';
  const mins = Math.floor(s / 60);
  const secs = Math.round(s % 60);
  return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #d9d9d9', padding: 12, fontSize: 12 }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
        {payload.map((item: any, idx: number) => (
          <p key={idx} style={{ margin: '4px 0', color: item.color }}>
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const VisitStatistics = () => {
  const { error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [trend, setTrend] = useState<VisitTrendItem[]>([]);
  const [pages, setPages] = useState<PageRankingItem[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs().subtract(1, 'day')]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = { start_date: toDateStr(dateRange[0]), end_date: toDateStr(dateRange[1]) };
    try {
      const [ovRes, trRes, prRes]: any[] = await Promise.all([
        datacubeApi.getOverview(params),
        datacubeApi.getVisitTrend(params),
        datacubeApi.getPageRanking(params),
      ]);
      setOverview(ovRes as OverviewResponse);
      setTrend(Array.isArray(trRes) ? trRes : []);
      setPages(Array.isArray(prRes) ? prRes : []);
    } catch (e: any) {
      showError(e?.response?.data?.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedTrend = [...trend].sort((a, b) => a.ref_date.localeCompare(b.ref_date));
  const chartData = sortedTrend.map(d => ({
    date: d.ref_date,
    访问次数: d.visit_pv,
    访问人数: d.visit_uv,
    新用户数: d.visit_uv_new,
  }));

  const pageColumns = [
    { title: '页面路径', dataIndex: 'path', key: 'path', render: (v: string) => <span style={{ wordBreak: 'break-all' }}>{v}</span> },
    { title: 'PV', dataIndex: 'visit_pv', key: 'visit_pv', width: 100 },
    { title: 'UV', dataIndex: 'visit_uv', key: 'visit_uv', width: 100 },
    { title: '平均停留', dataIndex: 'avg_stay_time_page', key: 'avg_stay_time_page', width: 120,
      render: (v: number) => fmtDuration(v) },
  ];

  return (
    <div>
      <Title level={2}>访问统计</Title>
      <Text type="secondary">小程序访问数据概览与趋势</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={3}>
          <Card loading={loading}><Statistic title="访问次数 PV" value={overview?.visit_pv ?? '-'} prefix={<EyeOutlined />} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={3}>
          <Card loading={loading}><Statistic title="访问人数 UV" value={overview?.visit_uv ?? '-'} prefix={<UserAddOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={3}>
          <Card loading={loading}><Statistic title="新用户数" value={overview?.visit_uv_new ?? '-'} prefix={<UserAddOutlined />} valueStyle={{ color: '#722ed1' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={3}>
          <Card loading={loading}><Statistic title="人均停留" value={fmtDuration(overview?.avg_stay_time_uv ?? 0)} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#fa8c16' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={3}>
          <Card loading={loading}><Statistic title="次均停留" value={fmtDuration(overview?.avg_stay_time_session ?? 0)} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#eb2f96' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={3}>
          <Card loading={loading}><Statistic title="平均深度" value={overview?.avg_visit_depth?.toFixed(1) ?? '-'} suffix="页" prefix={<BarChartOutlined />} valueStyle={{ color: '#13c2c2' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={3}>
          <Card loading={loading}><Statistic title="转发次数" value={overview?.share_pv ?? '-'} prefix={<ShareAltOutlined />} valueStyle={{ color: '#722ed1' }} /></Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={3}>
          <Card loading={loading}><Statistic title="转发人数" value={overview?.share_uv ?? '-'} prefix={<ShareAltOutlined />} valueStyle={{ color: '#fa8c16' }} /></Card>
        </Col>
      </Row>

      <Card
        title="访问趋势"
        extra={
          <RangePicker value={dateRange}
            disabledDate={(current) => current != null && current.isAfter(dayjs().subtract(1, 'day'), 'day')}
            onChange={d => { if (d?.[0] && d?.[1]) setDateRange([d[0], d[1]]); }} />
        }
        style={{ marginBottom: 24 }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: '次数', angle: -90, position: 'insideLeft', fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: '人数', angle: 90, position: 'insideRight', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="访问次数" fill="#1890ff" name="PV" />
            <Line yAxisId="right" type="monotone" dataKey="访问人数" stroke="#52c41a" strokeWidth={2} dot={false} name="UV" />
            <Line yAxisId="right" type="monotone" dataKey="新用户数" stroke="#722ed1" strokeWidth={2} dot={false} name="新用户" />
          </ComposedChart>
        </ResponsiveContainer>
        <Table dataSource={chartData} rowKey="date" pagination={false} size="small" style={{ marginTop: 16 }}
          columns={[
            { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
            { title: 'PV', dataIndex: '访问次数', key: 'pv', width: 100 },
            { title: 'UV', dataIndex: '访问人数', key: 'uv', width: 100 },
            { title: '新用户', dataIndex: '新用户数', key: 'new', width: 100 },
          ]}
        />
      </Card>

      <Card title="页面排行 TOP 50">
        <Table dataSource={pages} rowKey="path" pagination={false} size="small" columns={pageColumns} loading={loading} />
      </Card>
    </div>
  );
};

export default VisitStatistics;
