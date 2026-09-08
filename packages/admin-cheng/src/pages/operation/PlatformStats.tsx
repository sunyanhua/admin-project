import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Empty } from 'antd';
import {
  UserOutlined, HeartOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  platformDatacubeApi,
  UserTotalResponse,
  InteractionTotalResponse,
  MatchDistributionResponse,
  UserDistributionResponse,
  DistributionItem,
} from '@/api/services/platformDatacube';
import { useAppNotification } from '@/hooks/useAppNotification';

const { Title, Text } = Typography;

/** 分布维度配置：key → 标题（顺序即展示顺序） */
const MATCH_DIMS: Array<{ key: keyof MatchDistributionResponse; title: string }> = [
  { key: 'gender', title: '性别' },
  { key: 'age', title: '年龄段' },
  { key: 'education', title: '学历' },
  { key: 'marital_status', title: '婚姻状况' },
  { key: 'zone', title: '专区' },
  { key: 'height', title: '身高' },
  { key: 'income_range', title: '收入区间' },
  { key: 'blood_type', title: '血型' },
];

const USER_DIMS: Array<{ key: keyof UserDistributionResponse; title: string }> = [
  { key: 'gender', title: '性别' },
  { key: 'age', title: '年龄段' },
  { key: 'source', title: '来源' },
];

/** 横向分布小图（label 作 Y 轴） */
const DistributionChart: React.FC<{ items: DistributionItem[] }> = ({ items }) => {
  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />;
  }
  const data = items.map((i) => ({ name: i.label, count: i.count }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#1890ff" barSize={14} name="人数" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const PlatformStats = () => {
  const { error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [userTotal, setUserTotal] = useState<UserTotalResponse | null>(null);
  const [interaction, setInteraction] = useState<InteractionTotalResponse | null>(null);
  const [matchDist, setMatchDist] = useState<MatchDistributionResponse | null>(null);
  const [userDist, setUserDist] = useState<UserDistributionResponse | null>(null);

  // 全部为无参数总数接口：挂载时拉一次（showError 不入依赖，避免引用不稳定导致无限循环请求）
  useEffect(() => {
    setLoading(true);
    Promise.all([
      platformDatacubeApi.getUserTotal(),
      platformDatacubeApi.getInteraction(),
      platformDatacubeApi.getMatchDistribution(),
      platformDatacubeApi.getUserDistribution(),
    ]).then(([utRes, itRes, mdRes, udRes]: any[]) => {
      setUserTotal(utRes || null);
      setInteraction(itRes || null);
      setMatchDist(mdRes || null);
      setUserDist(udRes || null);
    }).catch((e: any) => {
      showError(e?.response?.data?.message || '获取统计数据失败');
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const audit = userTotal?.match_profile_by_audit;

  /** 数值单位（小灰色字体，放在数值后面） */
  const unitSuffix = (unit: string) => (
    <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>{unit}</span>
  );

  const statCards = (
    title: string, value: string | number, icon: React.ReactNode, color: string,
  ) => (
    <Card><Statistic title={title} value={value} prefix={icon} suffix={unitSuffix('人')} valueStyle={{ color }} /></Card>
  );

  return (
    <div>
      <Title level={2}>平台数据统计</Title>
      <Text type="secondary">平台用户总数、互动操作与用户分布统计</Text>

      {/* ====== 1. 用户总览 ====== */}
      <Card title="用户总览" style={{ marginTop: 24, marginBottom: 24 }}>
        {/* 第一行：总授权/总注册/总脱单 */}
        <Row gutter={[16, 16]}>
          {[
            ['总授权人数', userTotal?.authorized_user_count ?? '-', <UserOutlined />, '#1890ff'],
            ['总注册人数', userTotal?.registered_total ?? '-', <UserOutlined />, '#722ed1'],
            ['总脱单人数', userTotal?.match_profile_total ?? '-', <HeartOutlined />, '#eb2f96'],
          ].map(([t, v, i, c]: any, idx) => (
            <Col xs={24} sm={12} md={8} key={idx}>
              {statCards(t, v, i, c)}
            </Col>
          ))}
        </Row>
        {/* 第二行：脱单档案审核细分 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {[
            ['脱单档案通过', audit?.approved ?? '-', '#52c41a'],
            ['脱单档案拒绝', audit?.rejected ?? '-', '#f5222d'],
            ['脱单档案待审核', audit?.pending ?? '-', '#faad14'],
            ['脱单档案已撤销', audit?.revoked ?? '-', '#8c8c8c'],
          ].map(([t, v, c]: any, idx) => (
            <Col xs={24} sm={12} md={6} key={idx}>
              <Card><Statistic title={t} value={v} suffix={unitSuffix('人')} valueStyle={{ color: c }} /></Card>
            </Col>
          ))}
        </Row>
        {/* 第三行：老用户/新注册 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic
              title="老用户人数（总数/激活）"
              value={`${userTotal?.migrated_total ?? '-'}/${userTotal?.migrated_activated ?? '-'}`}
              suffix={unitSuffix('人')}
              valueStyle={{ color: '#fa8c16' }} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic
              title="老用户脱单人数（总数/激活）"
              value={`${userTotal?.migrated_matched_count ?? '-'}/${userTotal?.migrated_activated_matched ?? '-'}`}
              suffix={unitSuffix('人')}
              valueStyle={{ color: '#faad14' }} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic
              title="新注册人数"
              value={userTotal?.new_registered_count ?? '-'}
              suffix={unitSuffix('人')}
              valueStyle={{ color: '#1890ff' }} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic
              title="新注册脱单人数"
              value={userTotal?.new_matched_count ?? '-'}
              suffix={unitSuffix('人')}
              valueStyle={{ color: '#eb2f96' }} /></Card>
          </Col>
        </Row>
      </Card>

      {/* ====== 2. 互动统计 ====== */}
      <Card title="互动统计" style={{ marginBottom: 24 }} loading={loading}>
        <Row gutter={[16, 16]}>
          {[
            ['关注', interaction?.feeling?.like ?? '-', '#1890ff'],
            ['心动', interaction?.loves ?? '-', '#eb2f96'],
            ['无感', interaction?.feeling?.dislike ?? '-', '#8c8c8c'],
            ['撤销无感', interaction?.feeling?.undo ?? '-', '#bfbfbf'],
          ].map(([t, v, c]: any, idx) => (
            <Col xs={24} sm={12} md={6} key={idx}>
              <Card><Statistic title={t} value={v} prefix={<ThunderboltOutlined />} suffix={unitSuffix('次')} valueStyle={{ color: c }} /></Card>
            </Col>
          ))}
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {[
            ['撮合', interaction?.opinion?.match ?? '-', '#f5222d'],
            ['拆散', interaction?.opinion?.split ?? '-', '#722ed1'],
            ['送礼物', interaction?.gift ?? '-', '#52c41a'],
            ['神助攻', interaction?.divine ?? '-', '#faad14'],
          ].map(([t, v, c]: any, idx) => (
            <Col xs={24} sm={12} md={6} key={idx}>
              <Card><Statistic title={t} value={v} prefix={<ThunderboltOutlined />} suffix={unitSuffix('次')} valueStyle={{ color: c }} /></Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* ====== 3. 脱单分布统计 ====== */}
      <Card title="脱单分布统计" style={{ marginBottom: 24 }} loading={loading}>
        <Row gutter={[16, 16]}>
          {MATCH_DIMS.map(({ key, title }) => (
            <Col xs={24} sm={12} xl={8} key={key}>
              <Card size="small" title={title}>
                <DistributionChart items={matchDist?.[key] || []} />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* ====== 4. 注册用户分布 ====== */}
      <Card title="注册用户分布" loading={loading}>
        <Row gutter={[16, 16]}>
          {USER_DIMS.map(({ key, title }) => (
            <Col xs={24} sm={12} xl={8} key={key}>
              <Card size="small" title={title}>
                <DistributionChart items={userDist?.[key] || []} />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default PlatformStats;
