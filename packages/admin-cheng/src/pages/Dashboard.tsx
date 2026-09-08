import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Col, Row, Statistic, Typography, Table, Empty, Button, Space, Descriptions } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserOutlined, CopyOutlined, HeartOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { px } from '@/styles/constants';
import { platformDatacubeApi } from '@/api/services/platformDatacube';
import { authApi } from '@/api/services/auth';
import SourceQrcodeModal from '@/components/common/SourceQrcodeModal';
import { formatDateTime } from '@/utils/format';
import { useAppNotification } from '@/hooks/useAppNotification';

const { Title } = Typography;

const Dashboard = () => {
  const { success, error: showError } = useAppNotification();
  const navigate = useNavigate();
  const [stats, setStats] = useState([
    { title: '用户总数', value: '-', icon: <UserOutlined />, color: '#1890ff', bg: '#e6f7ff', path: '/operation/users' },
    { title: '脱单人数', value: '-', icon: <HeartOutlined />, color: '#eb2f96', bg: '#fff0f6', path: '/operation/match-profiles' },
    { title: '新注册', value: '-', icon: <UserOutlined />, color: '#13c2c2', bg: '#e6fffb', path: '/operation/users' },
    { title: '旧平台已激活', value: '-', icon: <UserOutlined />, color: '#52c41a', bg: '#f6ffed', path: '/operation/users' },
  ]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    // v1 平台用户数据（用户总数/脱单/新注册/旧平台激活）
    platformDatacubeApi.getUserTotal({
      from_date: dayjs().subtract(30, 'day').format('YYYYMMDD'),
      to_date: dayjs().format('YYYYMMDD'),
    }).then((res: any) => {
      const d = res || {};
      setStats((prev) => prev.map((s) => {
        if (s.title === '用户总数') return { ...s, value: d.registered_total ?? '-' };
        if (s.title === '脱单人数') return { ...s, value: d.match_profile_total ?? '-' };
        if (s.title === '新注册') return { ...s, value: d.new_registered_count ?? '-' };
        if (s.title === '旧平台已激活') return { ...s, value: d.migrated_activated ?? '-' };
        return s;
      }));
    }).catch((err: any) => {
      showError(err?.response?.data?.message || '获取平台用户数据失败');
    });

    setLogsLoading(true);
    authApi.getMyLogs({ page: 1, size: 5 }).then((res: any) => {
      setLogs(res?.list || res || []);
    }).catch((err: any) => {
      showError(err?.response?.data?.message || '获取操作日志失败');
    }).finally(() => setLogsLoading(false));
  }, []);

  const logColumns: ColumnsType<any> = [
    { title: '操作内容', dataIndex: 'summary', key: 'summary', render: (v: string) => <span style={{ color: '#666' }}>{v}</span> },
    { title: 'IP地址', dataIndex: 'ip', key: 'ip', width: 140 },
    { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 180, render: (v: string) => formatDateTime(v) },
  ];

  return (
    <div>
      <Title level={2}>数据看板</Title>
      <p style={{ color: '#666', marginBottom: px(24) }}>欢迎回来，管理员！以下是系统概览。</p>

      <Card title="小程序信息" style={{ marginBottom: 16 }}>
        <Descriptions column={4} size="small">
          <Descriptions.Item label="小程序名称">
            <Space size={4}>
              他俩能成
              <SourceQrcodeModal basePage="pages/index/index" />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="原始ID">
            <Space size={4}>
              gh_6cea97604e22
              <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText('gh_6cea97604e22'); success('复制成功'); }} />
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="微信ID">
            <Space size={4}>
              wx8aed7b2d08302c3b
              <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText('wx8aed7b2d08302c3b'); success('复制成功'); }} />
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
