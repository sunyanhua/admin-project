import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, DatePicker, Space, Button, Table } from 'antd';
import { Pie, Bar } from '@ant-design/charts';
import {
  ComposedChart,
  Bar as RechartsBar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { UserOutlined, FilterOutlined } from '@ant-design/icons';
import { statisticsApi } from '@/api/services/statistics';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const UserStats = () => {
  const [statsData, setStatsData] = useState<any>(null);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [ageData, setAgeData] = useState<any[]>([]);
  const [zodiacData, setZodiacData] = useState<any[]>([]);
  const [mbtiData, setMbtiData] = useState<any[]>([]);
  const [registerData, setRegisterData] = useState<any[]>([]);
  const [registerDateRange, setRegisterDateRange] = useState<any>([dayjs().subtract(7, 'day'), dayjs()]);
  const [loading, setLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const fetchRegisterData = async () => {
    if (!registerDateRange || registerDateRange.length !== 2) return;
    setRegisterLoading(true);
    try {
      const [min, max] = registerDateRange;
      const res: any = await statisticsApi.getUserRegister({
        min: min.format('YYYY-MM-DD HH:mm:ss'),
        max: max.format('YYYY-MM-DD HH:mm:ss'),
      });
      setRegisterData((res || []).map((item: any) => ({
        ...item,
        name: String(item.name).substring(0, 10),
      })));
    } catch (error) {
      console.error('获取注册统计数据失败:', error);
    } finally {
      setRegisterLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, genderRes, ageRes, zodiacRes, mbtiRes]: any[] = await Promise.all([
          statisticsApi.getUserDatacube(),
          statisticsApi.getUserGender(),
          statisticsApi.getUserAge(),
          statisticsApi.getUserZodiac(),
          statisticsApi.getUserMbti(),
        ]);
        setStatsData(statsRes?.data || statsRes || {});
        setGenderData((genderRes?.data || genderRes || []).map((item: any) => ({
          ...item,
          name: item.name === 1 ? '男' : item.name === 2 ? '女' : '未知',
        })));
        setAgeData(ageRes?.data || ageRes || []);
        setZodiacData(zodiacRes?.data || zodiacRes || []);
        setMbtiData(mbtiRes?.data || mbtiRes || []);
      } catch (error) {
        console.error('获取统计数据失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    fetchRegisterData();
  }, []);

  useEffect(() => {
    fetchRegisterData();
  }, [registerDateRange]);

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
      <Title level={2}>用户统计</Title>
      <Text type="secondary">社区注册用户数据统计</Text>

      <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="总用户数"
              value={statsData?.total || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: 32 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="正常状态"
              value={statsData?.status_0_total || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="已屏蔽"
              value={statsData?.status_1_total || 0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="未激活"
              value={statsData?.status_3_total || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="已实名认证"
              value={statsData?.real_auth_total || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="商户认证"
              value={statsData?.coop_auth_1_total || 0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="主理人认证"
              value={statsData?.coop_auth_2_total || 0}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={loading}>
            <Statistic
              title="官方认证"
              value={statsData?.coop_auth_3_total || 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 性别和年龄统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card loading={loading} title="性别统计">
            <Pie
              data={genderData}
              angleField="value"
              colorField="name"
              radius={0.8}
              legend={{ position: 'bottom' }}
              height={300}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card loading={loading} title="年龄段统计">
            <Pie
              data={ageData}
              angleField="value"
              colorField="name"
              radius={0.8}
              innerRadius={0.6}
              legend={{ position: 'bottom' }}
              height={300}
              paddingAngle={2}
            />
          </Card>
        </Col>
      </Row>

      {/* 星座和MBTI统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card loading={loading} title="星座统计">
            <Bar
              data={zodiacData}
              xField="name"
              yField="value"
              legend={false}
              height={300}
              maxBarWidth={10}
              scale={{ y: { nice: true } }}
              yAxis={{ tickCount: 10 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card loading={loading} title="MBTI统计">
            <Bar
              data={mbtiData}
              xField="name"
              yField="value"
              legend={false}
              height={300}
              maxBarWidth={10}
              scale={{ y: { nice: true } }}
              yAxis={{ tickCount: 10 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 注册趋势统计 */}
      <Card
        loading={registerLoading}
        title="注册趋势统计"
        extra={
          <Space>
            <RangePicker
              value={registerDateRange}
              onChange={(dates) => {
                if (dates) {
                  setRegisterDateRange(dates);
                }
              }}
            />
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={registerData} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
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
            <RechartsBar dataKey="value" fill="#1890ff" name="注册人数" />
          </ComposedChart>
        </ResponsiveContainer>
        <Table
          dataSource={registerData}
          rowKey="name"
          pagination={false}
          size="small"
          style={{ marginTop: 16 }}
          columns={[
            { title: '日期', dataIndex: 'name', key: 'name', width: 120 },
            { title: '注册人数', dataIndex: 'value', key: 'value', width: 100 },
          ]}
        />
      </Card>
    </div>
  );
};

export default UserStats;
