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
import { UserAddOutlined, ClockCircleOutlined, BarChartOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { statisticsApi } from '@/api/services/statistics';
import { useAppNotification } from '@/hooks/useAppNotification';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface VisitTrendItem {
  ref_date: string;
  appid: string;
  visit_uv: number;
  visit_uv_new: number;
  visit_pv: number;
  stay_time_uv: number;
  stay_time_session: number;
  visit_depth: number;
}

interface TotalData {
  visit_pv: number;
  visit_uv: number;
  visit_uv_new: number;
  stay_time_uv: number;
  stay_time_session: number;
  visit_depth: number;
}

const VisitStatistics = () => {
  const { error: showError } = useAppNotification();
  const showErrorRef = useRef(showError);
  showErrorRef.current = showError;
  const [loading, setLoading] = useState(false);
  const [totalData, setTotalData] = useState<TotalData | null>(null);
  const [dailyData, setDailyData] = useState<VisitTrendItem[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs().subtract(1, 'day')]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const list: VisitTrendItem[] = await statisticsApi.getVisitTrendAggregation({
        start_date: dateRange[0].format('YYYYMMDD'),
        end_date: dateRange[1].format('YYYYMMDD'),
      });

      const validList = (list || []).filter((item: VisitTrendItem) => item.ref_date);
      const sorted = [...validList].sort((a: VisitTrendItem, b: VisitTrendItem) =>
        dayjs(a.ref_date).valueOf() - dayjs(b.ref_date).valueOf()
      );
      setDailyData(sorted);

      // 前端对趋势数据求和得到汇总卡片值
      if (sorted.length > 0) {
        setTotalData({
          visit_pv: sorted.reduce((sum, item) => sum + (item.visit_pv || 0), 0),
          visit_uv: sorted.reduce((sum, item) => sum + (item.visit_uv || 0), 0),
          visit_uv_new: sorted.reduce((sum, item) => sum + (item.visit_uv_new || 0), 0),
          stay_time_uv: sorted.length > 0
            ? sorted.reduce((sum, item) => sum + (item.stay_time_uv || 0), 0) / sorted.length
            : 0,
          stay_time_session: sorted.length > 0
            ? sorted.reduce((sum, item) => sum + (item.stay_time_session || 0), 0) / sorted.length
            : 0,
          visit_depth: sorted.length > 0
            ? sorted.reduce((sum, item) => sum + (item.visit_depth || 0), 0) / sorted.length
            : 0,
        });
      } else {
        setTotalData(null);
      }
    } catch (err: any) {
      showErrorRef.current(err?.response?.data?.message || err?.message || '获取趋势数据失败');
      setTotalData(null);
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = dailyData.map((item: VisitTrendItem) => ({
    date: dayjs(item.ref_date).format('MM/DD'),
    访问次数: item.visit_pv,
    访问人数: item.visit_uv,
    新用户数: item.visit_uv_new,
  }));

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return '0秒';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  };

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
      <Title level={2}>访问统计</Title>
      <Text type="secondary">小程序页面访问数据统计</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card loading={!totalData}>
            <Statistic
              title="访问次数(PV)"
              value={totalData?.visit_pv ?? 0}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card loading={!totalData}>
            <Statistic
              title="访问人数(UV)"
              value={totalData?.visit_uv ?? 0}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card loading={!totalData}>
            <Statistic
              title="新用户数"
              value={totalData?.visit_uv_new ?? 0}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card loading={!totalData}>
            <Statistic
              title="人均停留时长"
              value={formatDuration(totalData?.stay_time_uv ?? 0)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card loading={!totalData}>
            <Statistic
              title="次均停留时长"
              value={formatDuration(totalData?.stay_time_session ?? 0)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card loading={!totalData}>
            <Statistic
              title="平均访问深度"
              value={totalData?.visit_depth?.toFixed(2) ?? '0.00'}
              suffix="页"
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="访问趋势统计"
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
              label={{ value: '次数', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#d9d9d9' }}
              tickLine={{ stroke: '#d9d9d9' }}
              label={{ value: '人数', angle: 90, position: 'insideRight', fontSize: 12 }}
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
            <Bar yAxisId="right" dataKey="访问人数" fill="#52c41a" name="访问人数" />
            <Bar yAxisId="right" dataKey="新用户数" fill="#fa8c16" name="新用户数" />
            <Line yAxisId="left" type="monotone" dataKey="访问次数" stroke="#722ed1" strokeWidth={2} dot={false} name="访问次数" />
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
            { title: '访问次数(PV)', dataIndex: '访问次数', key: '访问次数', width: 120 },
            { title: '访问人数(UV)', dataIndex: '访问人数', key: '访问人数', width: 120 },
            { title: '新用户数', dataIndex: '新用户数', key: '新用户数', width: 100 },
          ]}
        />
      </Card>
    </div>
  );
};

export default VisitStatistics;
