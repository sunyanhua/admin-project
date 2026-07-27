import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Space, Typography, Table } from 'antd';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { UserOutlined, UserAddOutlined, ShareAltOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { statisticsApi } from '@/api/services/statistics';
import { useAppNotification } from '@/hooks/useAppNotification';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface RetainTrendItem {
  ref_date: string;
  appid: string;
  visit_uv: number;
  visit_uv_new: number;
  retain_json: string;
}

interface SummaryTrendItem {
  ref_date: string;
  appid: string;
  visit_total: number;
  share_pv: number;
  share_uv: number;
}

interface RetainTotalData {
  visit_uv: number;
  visit_uv_new: number;
}

interface SummaryTotalData {
  visit_total: number;
  share_pv: number;
  share_uv: number;
}

interface ChartRow {
  date: string;
  用户访问: number;
  用户新增: number;
  转发次数: number;
  转发人数: number;
}

const VisitUserStats = () => {
  const { error: showError } = useAppNotification();
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;
  const [loading, setLoading] = useState(false);
  const [retainTotalData, setRetainTotalData] = useState<RetainTotalData | null>(null);
  const [summaryTotalData, setSummaryTotalData] = useState<SummaryTotalData | null>(null);
  const [chartData, setChartData] = useState<ChartRow[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs().subtract(1, 'day')]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [retainRes, summaryRes] = await Promise.all([
        statisticsApi.getRetainTrendAggregation({
          start_date: dateRange[0].format('YYYYMMDD'),
          end_date: dateRange[1].format('YYYYMMDD'),
        }),
        statisticsApi.getSummaryTrendAggregation({
          start_date: dateRange[0].format('YYYYMMDD'),
          end_date: dateRange[1].format('YYYYMMDD'),
        }),
      ]);
      const retainList: RetainTrendItem[] = retainRes?.items || retainRes || [];
      const summaryList: SummaryTrendItem[] = summaryRes?.items || summaryRes || [];

      const validRetain = (retainList || []).filter((item: RetainTrendItem) => item.ref_date);
      const validSummary = (summaryList || []).filter((item: SummaryTrendItem) => item.ref_date);

      // 计算汇总
      if (validRetain.length > 0) {
        setRetainTotalData({
          visit_uv: validRetain.reduce((sum, item) => sum + (item.visit_uv || 0), 0),
          visit_uv_new: validRetain.reduce((sum, item) => sum + (item.visit_uv_new || 0), 0),
        });
      } else {
        setRetainTotalData(null);
      }

      if (validSummary.length > 0) {
        setSummaryTotalData({
          visit_total: validSummary.reduce((sum, item) => sum + (item.visit_total || 0), 0),
          share_pv: validSummary.reduce((sum, item) => sum + (item.share_pv || 0), 0),
          share_uv: validSummary.reduce((sum, item) => sum + (item.share_uv || 0), 0),
        });
      } else {
        setSummaryTotalData(null);
      }

      // 按日期合并两个数据集
      const summaryMap = new Map<string, SummaryTrendItem>();
      validSummary.forEach((item: SummaryTrendItem) => {
        summaryMap.set(item.ref_date, item);
      });

      const merged: ChartRow[] = [];
      const allDates = new Set<string>();
      validRetain.forEach((item: RetainTrendItem) => allDates.add(item.ref_date));
      validSummary.forEach((item: SummaryTrendItem) => allDates.add(item.ref_date));

      Array.from(allDates)
        .sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf())
        .forEach((refDate) => {
          const retainItem = validRetain.find((item: RetainTrendItem) => item.ref_date === refDate);
          const summaryItem = summaryMap.get(refDate);
          merged.push({
            date: dayjs(refDate).format('MM/DD'),
            用户访问: retainItem?.visit_uv || 0,
            用户新增: retainItem?.visit_uv_new || 0,
            转发次数: summaryItem?.share_pv || 0,
            转发人数: summaryItem?.share_uv || 0,
          });
        });

      setChartData(merged);
    } catch (err: any) {
      showErrorRef.current(err?.response?.data?.message || err?.message || '获取趋势数据失败');
      setRetainTotalData(null);
      setSummaryTotalData(null);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', border: '1px solid #d9d9d9', padding: 12, fontSize: 12 }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} style={{ margin: '4px 0', color: item.color }}>
              {item.name}: {item.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <Title level={2}>访问用户统计</Title>
      <Text type="secondary">小程序用户访问与转发数据统计</Text>

      <Row gutter={[8, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={12} md={4}>
          <Card loading={!summaryTotalData}>
            <Statistic
              title="累计用户"
              value={summaryTotalData?.visit_total ?? 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card loading={!retainTotalData}>
            <Statistic
              title="用户访问(UV)"
              value={retainTotalData?.visit_uv ?? 0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card loading={!retainTotalData}>
            <Statistic
              title="用户新增"
              value={retainTotalData?.visit_uv_new ?? 0}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card loading={!summaryTotalData}>
            <Statistic
              title="转发次数"
              value={summaryTotalData?.share_pv ?? 0}
              prefix={<ShareAltOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Card loading={!summaryTotalData}>
            <Statistic
              title="转发人数"
              value={summaryTotalData?.share_uv ?? 0}
              prefix={<ShareAltOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="用户访问趋势统计"
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              disabledDate={(current) => current && current.isAfter(dayjs().subtract(1, 'day'))}
              onChange={(dates) => {
                if (dates && dates.length === 2) {
                  setDateRange([dates[0] as Dayjs, dates[1] as Dayjs]);
                }
              }}
            />
          </Space>
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#d9d9d9' }}
              tickLine={{ stroke: '#d9d9d9' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#d9d9d9' }}
              tickLine={{ stroke: '#d9d9d9' }}
              label={{ value: '用户', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#d9d9d9' }}
              tickLine={{ stroke: '#d9d9d9' }}
              label={{ value: '转发', angle: 90, position: 'insideRight', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Bar yAxisId="right" dataKey="转发次数" fill="#fa8c16" name="转发次数" />
            <Bar yAxisId="right" dataKey="转发人数" fill="#eb2f96" name="转发人数" />
            <Line yAxisId="left" type="monotone" dataKey="用户访问" stroke="#52c41a" strokeWidth={2} dot={false} name="用户访问" />
            <Line yAxisId="left" type="monotone" dataKey="用户新增" stroke="#722ed1" strokeWidth={2} dot={false} name="用户新增" />
          </ComposedChart>
        </ResponsiveContainer>
        <Table
          dataSource={chartData}
          rowKey="date"
          pagination={false}
          size="small"
          style={{ marginTop: 16 }}
          columns={[
            { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
            { title: '用户访问', dataIndex: '用户访问', key: '用户访问', width: 100 },
            { title: '用户新增', dataIndex: '用户新增', key: '用户新增', width: 100 },
            { title: '转发次数', dataIndex: '转发次数', key: '转发次数', width: 100 },
            { title: '转发人数', dataIndex: '转发人数', key: '转发人数', width: 100 },
          ]}
        />
      </Card>
    </div>
  );
};

export default VisitUserStats;
