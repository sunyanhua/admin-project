import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, DatePicker, Space, Table } from 'antd';
import { FileTextOutlined, CommentOutlined, LikeOutlined, StarOutlined } from '@ant-design/icons';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { statisticsApi } from '@/api/services/statistics';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const FeedStats = () => {
  const [statsData, setStatsData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<any>([dayjs().subtract(7, 'day'), dayjs()]);
  const [loading, setLoading] = useState(false);

  const fetchDailyData = async () => {
    if (!dateRange || dateRange.length !== 2) return;
    setLoading(true);
    try {
      const [min, max] = dateRange;
      const res: any = await statisticsApi.getFeedDaily({
        min: min.format('YYYY-MM-DD HH:mm:ss'),
        max: max.format('YYYY-MM-DD HH:mm:ss'),
      });
      const transformed = (res || []).map((item: any) => ({
        date: String(item.date).substring(0, 10),
        动态数: item.total || 0,
        评论数: item.comments_total || 0,
        点赞数: item.likes_total || 0,
        收藏数: item.favorites_total || 0,
      }));
      setDailyData(transformed);
    } catch (error) {
      console.error('获取动态趋势数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res: any = await statisticsApi.getFeedDatacube();
        setStatsData(res || {});
      } catch (error) {
        console.error('获取动态统计数据失败:', error);
      }
    };
    fetchData();
    fetchDailyData();
  }, []);

  useEffect(() => {
    fetchDailyData();
  }, [dateRange]);

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
      <Title level={2}>动态统计</Title>
      <Text type="secondary">社区动态发布与评论数据统计</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="动态发布总数"
              value={statsData?.total || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="评论发布总数"
              value={statsData?.comments_total || 0}
              prefix={<CommentOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="点赞总数"
              value={statsData?.likes_total || 0}
              prefix={<LikeOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="收藏总数"
              value={statsData?.favorites_total || 0}
              prefix={<StarOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="互动趋势统计"
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates) {
                  setDateRange(dates);
                }
              }}
            />
          </Space>
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dailyData} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#d9d9d9' }}
              tickLine={{ stroke: '#d9d9d9' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#d9d9d9' }}
              tickLine={{ stroke: '#d9d9d9' }}
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
            <Bar dataKey="动态数" fill="#1890ff" name="动态数" />
            <Bar dataKey="评论数" fill="#52c41a" name="评论数" />
            <Bar dataKey="点赞数" fill="#ff4d4f" name="点赞数" />
            <Bar dataKey="收藏数" fill="#fa8c16" name="收藏数" />
          </ComposedChart>
        </ResponsiveContainer>
        <Table
          dataSource={dailyData}
          rowKey="date"
          pagination={false}
          size="small"
          style={{ marginTop: 16 }}
          columns={[
            { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
            { title: '动态数', dataIndex: '动态数', key: '动态数', width: 100 },
            { title: '评论数', dataIndex: '评论数', key: '评论数', width: 100 },
            { title: '点赞数', dataIndex: '点赞数', key: '点赞数', width: 100 },
            { title: '收藏数', dataIndex: '收藏数', key: '收藏数', width: 100 },
          ]}
        />
      </Card>
    </div>
  );
};

export default FeedStats;
