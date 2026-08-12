import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Space, Typography, Table, Spin, Select, Tabs } from 'antd';
import {
  UserOutlined, UserAddOutlined, PercentageOutlined, TeamOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import { datacubeApi, RetainResponse, PortraitItem } from '@/api/services/datacube';
import { useAppNotification } from '@/hooks/useAppNotification';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const toDateStr = (d: Dayjs) => d.format('YYYYMMDD');

const PORTRAIT_MAP: Record<number, string> = { 1: '性别分布', 2: '年龄分布', 3: '地域分布' };

const VisitUserStats = () => {
  const { error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [retain, setRetain] = useState<RetainResponse | null>(null);
  const [portrait, setPortrait] = useState<PortraitItem[]>([]);
  const [portraitTab, setPortraitTab] = useState('1');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = { start_date: toDateStr(dateRange[0]), end_date: toDateStr(dateRange[1]) };
    try {
      const [retRes, porRes]: any[] = await Promise.all([
        datacubeApi.getRetain(params).catch(() => null),
        datacubeApi.getPortrait(params),
      ]);
      setRetain(retRes as RetainResponse | null);
      setPortrait(Array.isArray(porRes) ? porRes : []);
    } catch (e: any) {
      showError(e?.response?.data?.message || '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 留存图表数据
  const retainDaily = retain?.retain_json?.daily || [];
  const retainWeekly = retain?.retain_json?.weekly || [];
  const retainMonthly = retain?.retain_json?.monthly || [];
  const retainLabels = ['1天后', '2天后', '3天后', '4天后', '5天后', '6天后', '7天后', '14天后', '30天后'];
  const retainChartData = retainDaily.map((d, i) => ({
    name: retainLabels[i] || `第${d.key}天`,
    日留存: +(d.value * 100).toFixed(1),
    周留存: +(retainWeekly[i]?.value ?? 0) * 100,
    月留存: +(retainMonthly[i]?.value ?? 0) * 100,
  }));

  // 画像 Tab
  const portraitByTab = portrait.filter(p => p.category === PORTRAIT_MAP[+portraitTab]);
  const genderData = portrait.filter(p => p.category === '性别分布').map(p => ({ name: p.name, value: p.value, percentage: p.percentage }));
  const genderChart = genderData.map(d => ({ name: d.name, UV: d.value }));

  return (
    <div>
      <Title level={2}>访问用户统计</Title>
      <Text type="secondary">用户留存数据、画像分布分析</Text>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="活跃 UV" value={retain?.visit_uv ?? '-'} prefix={<TeamOutlined />} valueStyle={{ color: '#1890ff' }} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="新用户 UV" value={retain?.visit_uv_new ?? '-'} prefix={<UserAddOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="次日留存率" value={retainDaily[0] ? `${(retainDaily[0].value * 100).toFixed(1)}%` : '-'} prefix={<PercentageOutlined />} valueStyle={{ color: '#722ed1' }} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic title="数据日期" value={retain?.ref_date || '-'} prefix={<UserOutlined />} valueStyle={{ fontSize: 16 }} /></Card>
          </Col>
        </Row>

        <Card title="用户留存" style={{ marginBottom: 24 }}>
          {retainChartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={retainChartData} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="日留存" fill="#1890ff" name="日留存" />
                  <Bar dataKey="周留存" fill="#52c41a" name="周留存" />
                  <Bar dataKey="月留存" fill="#722ed1" name="月留存" />
                </BarChart>
              </ResponsiveContainer>
              <Table dataSource={retainChartData} rowKey="name" pagination={false} size="small" style={{ marginTop: 16 }}
                columns={[
                  { title: '指标', dataIndex: 'name', key: 'name', width: 120 },
                  { title: '日留存', dataIndex: '日留存', key: 'd', width: 100, render: (v: number) => `${v}%` },
                  { title: '周留存', dataIndex: '周留存', key: 'w', width: 100, render: (v: number) => `${v}%` },
                  { title: '月留存', dataIndex: '月留存', key: 'm', width: 100, render: (v: number) => `${v}%` },
                ]}
              />
            </>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>暂无留存数据</div>
          )}
        </Card>

        <Card
          title="用户画像"
          extra={
            <RangePicker value={dateRange} size="small"
              onChange={d => { if (d?.[0] && d?.[1]) setDateRange([d[0], d[1]]); }} />
          }
        >
          <Tabs
            activeKey={portraitTab}
            onChange={setPortraitTab}
            items={[
              {
                key: '1',
                label: '性别分布',
                children: (
                  <Row gutter={24}>
                    <Col xs={24} md={12}>
                      <Table dataSource={genderData} rowKey="name" pagination={false} size="small"
                        columns={[
                          { title: '性别', dataIndex: 'name', key: 'name', width: 80 },
                          { title: 'UV', dataIndex: 'value', key: 'value', width: 100 },
                          { title: '占比', dataIndex: 'percentage', key: 'percentage', width: 100,
                            render: (v: number) => `${(v * 100).toFixed(1)}%` },
                        ]}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={genderChart}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="UV" fill="#1890ff" name="UV" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Col>
                  </Row>
                ),
              },
              {
                key: '2',
                label: '年龄分布',
                children: (
                  <Table dataSource={portrait.filter(p => p.category === '年龄分布').map(p => ({ ...p, percent: `${(p.percentage * 100).toFixed(1)}%` }))}
                    rowKey="name" pagination={false} size="small"
                    columns={[
                      { title: '年龄段', dataIndex: 'name', key: 'name' },
                      { title: 'UV', dataIndex: 'value', key: 'value', width: 120 },
                      { title: '占比', dataIndex: 'percent', key: 'percent', width: 120 },
                    ]}
                  />
                ),
              },
              {
                key: '3',
                label: '地域分布',
                children: (
                  <Table dataSource={portrait.filter(p => p.category === '地域分布').map(p => ({ ...p, percent: `${(p.percentage * 100).toFixed(1)}%` }))}
                    rowKey="key" pagination={false} size="small"
                    columns={[
                      { title: '地区', dataIndex: 'name', key: 'name' },
                      { title: 'UV', dataIndex: 'value', key: 'value', width: 120 },
                      { title: '占比', dataIndex: 'percent', key: 'percent', width: 120 },
                    ]}
                  />
                ),
              },
            ]}
          />
        </Card>
      </Spin>
    </div>
  );
};

export default VisitUserStats;
