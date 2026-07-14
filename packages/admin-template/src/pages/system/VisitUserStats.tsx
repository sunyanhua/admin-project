import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Space, Typography, message, Table } from 'antd';
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

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface RetainTotalData {
  visit_uv: number;
  visit_uv_new: number;
}

interface SummaryTotalData {
  visit_total: number;
  share_pv: number;
  share_uv: number;
}

interface UserDailyItem {
  ref_date: string;
  visit_uv: number;
  visit_uv_new: number;
}

interface SummaryDailyItem {
  ref_date: string;
  share_pv: number;
  share_uv: number;
}

const VisitUserStats = () => {
  const [loading, setLoading] = useState(false);
  const [retainTotalData, setRetainTotalData] = useState<RetainTotalData | null>(null);
  const [summaryTotalData, setSummaryTotalData] = useState<SummaryTotalData | null>(null);
  const [userDailyData, setUserDailyData] = useState<UserDailyItem[]>([]);
  const [summaryDailyData, setSummaryDailyData] = useState<SummaryDailyItem[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);

  const fetchTotalData = useCallback(async () => {
    try {
      const [retainRes, summaryRes]: [any, any] = await Promise.all([
        statisticsApi.getRetainTotal({
          date_min: dateRange[0].format('YYYY-MM-DD HH:mm:ss'),
          date_max: dateRange[1].format('YYYY-MM-DD HH:mm:ss'),
        }),
        statisticsApi.getSummaryTotal({
          date_min: dateRange[0].format('YYYY-MM-DD HH:mm:ss'),
          date_max: dateRange[1].format('YYYY-MM-DD HH:mm:ss'),
        }),
      ]);

      const retainList = retainRes?.data?.list || retainRes?.data || [];
      if (retainList.length > 0) {
        setRetainTotalData(retainList[0]);
      } else {
        setRetainTotalData(null);
      }

      const summaryList = summaryRes?.data?.list || summaryRes?.data || [];
      if (summaryList.length > 0) {
        setSummaryTotalData(summaryList[0]);
      } else {
        setSummaryTotalData(null);
      }
    } catch (error: any) {
      message.error(error.response?.data?.msg || '获取累计数据失败');
      setRetainTotalData(null);
      setSummaryTotalData(null);
    }
  }, [dateRange]);

  const fetchDailyData = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, summaryRes]: [any, any] = await Promise.all([
        statisticsApi.getRetainDaily({
          date_min: dateRange[0].format('YYYY-MM-DD HH:mm:ss'),
          date_max: dateRange[1].format('YYYY-MM-DD HH:mm:ss'),
          start: 0,
          length: 100,
        }),
        statisticsApi.getSummaryDaily({
          date_min: dateRange[0].format('YYYY-MM-DD HH:mm:ss'),
          date_max: dateRange[1].format('YYYY-MM-DD HH:mm:ss'),
          start: 0,
          length: 100,
        }),
      ]);

      const userList = userRes?.data?.list || userRes?.data || [];
      const summaryList = summaryRes?.data?.list || summaryRes?.data || [];

      const validUserList = userList.filter((item: UserDailyItem) => item.ref_date);
      const validSummaryList = summaryList.filter((item: SummaryDailyItem) => item.ref_date);

      const sortedUser = [...validUserList].sort((a: UserDailyItem, b: UserDailyItem) =>
        dayjs(a.ref_date).valueOf() - dayjs(b.ref_date).valueOf()
      );
      const sortedSummary = [...validSummaryList].sort((a: SummaryDailyItem, b: SummaryDailyItem) =>
        dayjs(a.ref_date).valueOf() - dayjs(b.ref_date).valueOf()
      );

      setUserDailyData(sortedUser);
      setSummaryDailyData(sortedSummary);
    } catch (error: any) {
      message.error(error.response?.data?.msg || '获取趋势数据失败');
      setUserDailyData([]);
      setSummaryDailyData([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchTotalData();
  }, [fetchTotalData]);

  useEffect(() => {
    fetchDailyData();
  }, [fetchDailyData]);

  const chartData = userDailyData.map((userItem, index) => {
    const summaryItem = summaryDailyData[index] || {};
    return {
      date: dayjs(userItem.ref_date).format('YYYY-MM-DD'),
      用户访问: userItem.visit_uv,
      用户新增: userItem.visit_uv_new,
      转发次数: summaryItem.share_pv || 0,
      转发人数: summaryItem.share_uv || 0,
    };
  });

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
              title="用户访问"
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
              disabledDate={(current) => current && current < dayjs('2026-06-04').startOf('day')}
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
