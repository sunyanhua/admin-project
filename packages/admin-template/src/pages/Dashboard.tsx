import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Statistic, Typography, Table, Empty, Button, Space, Descriptions, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserOutlined, ShopOutlined, FileTextOutlined, DollarOutlined, CopyOutlined } from '@ant-design/icons';
import { px } from '@/styles/constants';
import { statisticsApi } from '@/api/services/statistics';
import { authApi } from '@/api/services/auth';
import SourceQrcodeModal from '@/components/wechat/SourceQrcodeModal';
import { formatDateTime } from '@/utils/format';

const { Title } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { title: '用户总数', value: '-', icon: <UserOutlined />, color: '#1890ff', bg: '#e6f7ff', path: '/community/users' },
    { title: '动态总数', value: '-', icon: <FileTextOutlined />, color: '#faad14', bg: '#fff7e6', path: '/community/feeds' },
    { title: '活动总数', value: '-', icon: <ShopOutlined />, color: '#52c41a', bg: '#f6ffed', path: '/events/list' },
    { title: '收入总额', value: '-', icon: <DollarOutlined />, color: '#722ed1', bg: '#f9f0ff', path: '/events/finance/payments' },
  ]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    statisticsApi.getDatacube().then((res: any) => {
      const d = res?.data || res || {};
      setStats([
        { title: '用户总数', value: d.users_total ?? d.user_total ?? '-', icon: <UserOutlined />, color: '#1890ff', bg: '#e6f7ff', path: '/community/users' },
        { title: '动态总数', value: d.feeds_total ?? d.feed_total ?? '-', icon: <FileTextOutlined />, color: '#faad14', bg: '#fff7e6', path: '/community/feeds' },
        { title: '活动总数', value: d.events_total ?? d.event_total ?? '-', icon: <ShopOutlined />, color: '#52c41a', bg: '#f6ffed', path: '/events/list' },
        { title: '收入总额', value: (() => { const v = d.event_order_payable; return v != null ? `¥${(v / 100).toFixed(2)}` : '-'; })(), icon: <DollarOutlined />, color: '#722ed1', bg: '#f9f0ff', path: '/events/finance/payments' },
      ]);
    }).catch(console.error);

    setLogsLoading(true);
    authApi.getMyLogs({ start: 0, length: 5 }).then((res: any) => {
      setLogs(res?.data || res || []);
    }).catch(console.error).finally(() => setLogsLoading(false));
  }, []);

  const logColumns: ColumnsType<any> = [
    { title: '操作内容', dataIndex: 'data', key: 'data', render: (v: string) => <span style={{ color: '#666' }}>{v}</span> },
    { title: 'IP地址', dataIndex: 'ip', key: 'ip', width: 140 },
    { title: '时间', dataIndex: 'tick', key: 'tick', width: 180, render: (v: string) => formatDateTime(v) },
  ];

  return (
    <div>
      <Title level={2}>数据看板</Title>
      <p style={{ color: '#666', marginBottom: px(24) }}>欢迎回来，管理员！以下是系统概览。</p>

      <Card title="小程序信息" style={{ marginBottom: 16 }}>
        <Descriptions column={4} size="small">
          <Descriptions.Item label="小程序名称">
            <Space size={4}>
              搭子计划
              <SourceQrcodeModal basePage="pages/index/index" />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="原始ID">
            <Space size={4}>
              gh_1a79e8bbfa0f
              <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText('gh_1a79e8bbfa0f'); message.success('复制成功'); }} />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="微信ID">
            <Space size={4}>
              wxb0f15549e07308d5
              <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText('wxb0f15549e07308d5'); message.success('复制成功'); }} />
            </Space>
          </Descriptions.Item>
                  </Descriptions>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card
              hoverable
              onClick={() => navigate(stat.path)}
              style={{ cursor: 'pointer' }}
              bodyStyle={{ backgroundColor: stat.bg }}
            >
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title="我的最近操作日志"
        extra={<a onClick={() => navigate('/system/my-logs')}>更多</a>}
      >
        <Table
          columns={logColumns}
          dataSource={logs}
          loading={logsLoading}
          rowKey="id"
          pagination={false}
          size="middle"
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" /> }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
