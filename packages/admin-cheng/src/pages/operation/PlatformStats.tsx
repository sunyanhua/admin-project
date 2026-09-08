import { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Typography, Empty } from 'antd';
import {
  UserOutlined, HeartOutlined, TeamOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import {
  platformDatacubeApi,
  UserTotalResponse,
  InteractionTotalResponse,
  MatchDistributionResponse,
  UserDistributionResponse,
  DistributionItem,
} from '@/api/services/platformDatacube';
import { useAppNotification } from '@/hooks/useAppNotification';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const toDateStr = (d: Dayjs) => d.format('YYYYMMDD');

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
  { key: 'audit_status', title: '审核状态' },
  { key: 'is_active', title: '脱单状态' },
];

const USER_DIMS: Array<{ key: keyof UserDistributionResponse; title: string }> = [
  { key: 'channel', title: '渠道' },
  { key: 'migration', title: '迁移类型' },
  { key: 'activated', title: '激活状态' },
  { key: 'status', title: '用户状态' },
  { key: 'has_profile', title: '基础资料填写' },
  { key: 'has_match_profile', title: '脱单档案提交' },
  { key: 'gender', title: '性别' },
  { key: 'age', title: '年龄段' },
  { key: 'source', title: '来源' },
];

/** 布尔/编码维度的 label 兜底美化（后端返回原始值时） */
const BOOL_LABELS: Record<string, Record<string, string>> = {
  is_active: { true: '在脱单', false: '已退出' },
  activated: { true: '已激活', false: '未激活' },
  has_profile: { true: '已填写', false: '未填写' },
  has_match_profile: { true: '已提交', false: '未提交' },
  status: { '0': '正常', '1': '禁用' },
  audit_status: { '0': '待审核', '1': '已通过', '2': '已拒绝', '3': '已撤销' },
};

const prettyLabel = (dimKey: string, raw: string): string => {
  const map = BOOL_LABELS[dimKey];
  return (map && map[raw] != null) ? map[raw] : raw;
};

/** 横向分布小图（label 作 Y 轴） */
const DistributionChart: React.FC<{ items: DistributionItem[]; dimKey: string }> = ({ items, dimKey }) => {
  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />;
  }
  const data = items.map((i) => ({ name: prettyLabel(dimKey, i.label), count: i.count }));
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
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);

  // 无参数接口：挂载时拉一次（showError 不入依赖，避免引用不稳定导致无限循环请求）
  useEffect(() => {
    setLoading(true);
    Promise.all([
      platformDatacubeApi.getInteraction(),
      platformDatacubeApi.getMatchDistribution(),
      platformDatacubeApi.getUserDistribution(),
    ]).then(([itRes, mdRes, udRes]: any[]) => {
      setInteraction(itRes || null);
      setMatchDist(mdRes || null);
      setUserDist(udRes || null);
    }).catch((e: any) => {
      showError(e?.response?.data?.message || '获取统计数据失败');
    }).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 用户总览：随日期范围变化（仅窗口卡响应）
  const fetchUserTotal = useCallback(async () => {
    try {
      const res: any = await platformDatacubeApi.getUserTotal({
        from_date: toDateStr(dateRange[0]),
        to_date: toDateStr(dateRange[1]),
      });
      setUserTotal(res || null);
    } catch (e: any) {
      showError(e?.response?.data?.message || '获取用户总数失败');
    }
    // 只随日期范围变化触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => { fetchUserTotal(); }, [fetchUserTotal]);

  const audit = userTotal?.match_profile_by_audit;

  const statCards = (
    title: string, value: string | number, icon: React.ReactNode, color: string,
  ) => (
    <Card><Statistic title={title} value={value} prefix={icon} valueStyle={{ color }} /></Card>
  );

  return (
    <div>
      <Title level={2}>平台数据统计</Title>
      <Text type="secondary">平台用户总数、互动操作与用户分布统计</Text>

      {/* ====== 1. 用户总览 ====== */}
      <Card
        title="用户总览"
        style={{ marginTop: 24, marginBottom: 24 }}
        extra={
          <RangePicker
            value={dateRange}
            onChange={(d) => { if (d?.[0] && d?.[1]) setDateRange([d[0], d[1]]); }}
          />
        }
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          窗口新注册 / 窗口新脱单随日期范围变化（默认近 30 天），其余为全量累计
        </Text>
        <Row gutter={[16, 16]}>
          {[
            ['总授权人数', userTotal?.authorized_user_count ?? '-', <UserOutlined />, '#1890ff'],
            ['授权会话数', userTotal?.authorized_wxa_login_count ?? '-', <TeamOutlined />, '#13c2c2'],
            ['注册总人数', userTotal?.registered_total ?? '-', <UserOutlined />, '#722ed1'],
            ['脱单人数', userTotal?.match_profile_total ?? '-', <HeartOutlined />, '#eb2f96'],
            ['退出脱单人数', userTotal?.exited_match_count ?? '-', <HeartOutlined />, '#f5222d'],
            ['旧平台用户数', userTotal?.migrated_total ?? '-', <UserOutlined />, '#fa8c16'],
            ['旧平台已激活', userTotal?.migrated_activated ?? '-', <UserOutlined />, '#52c41a'],
            ['激活脱单人数', userTotal?.migrated_activated_matched ?? '-', <HeartOutlined />, '#faad14'],
          ].map(([t, v, i, c]: any, idx) => (
            <Col xs={24} sm={12} md={8} lg={3} key={idx}>
              {statCards(t, v, i, c)}
            </Col>
          ))}
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {[
            ['待审核', audit?.pending ?? '-', '#faad14'],
            ['审核通过', audit?.approved ?? '-', '#52c41a'],
            ['审核拒绝', audit?.rejected ?? '-', '#f5222d'],
            ['已撤销', audit?.revoked ?? '-', '#8c8c8c'],
          ].map(([t, v, c]: any, idx) => (
            <Col xs={24} sm={12} md={6} key={idx}>
              <Card><Statistic title={`脱单档案·${t}`} value={v} valueStyle={{ color: c }} /></Card>
            </Col>
          ))}
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic
              title={`窗口新注册（${toDateStr(dateRange[0])}~${toDateStr(dateRange[1])}）`}
              value={userTotal?.new_registered_count ?? '-'} valueStyle={{ color: '#1890ff' }} /></Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card><Statistic
              title={`窗口新脱单（${toDateStr(dateRange[0])}~${toDateStr(dateRange[1])}）`}
              value={userTotal?.new_matched_count ?? '-'} valueStyle={{ color: '#eb2f96' }} /></Card>
          </Col>
        </Row>
      </Card>

      {/* ====== 2. 互动统计 ====== */}
      <Card title="互动统计" style={{ marginBottom: 24 }} loading={loading}>
        <Row gutter={[16, 16]}>
          {[
            ['心动', interaction?.loves ?? '-', '#eb2f96'],
            ['关注', interaction?.feeling?.like ?? '-', '#1890ff'],
            ['无感', interaction?.feeling?.dislike ?? '-', '#8c8c8c'],
            ['撤销无感', interaction?.feeling?.undo ?? '-', '#bfbfbf'],
            ['撮合', interaction?.opinion?.match ?? '-', '#f5222d'],
            ['拆散', interaction?.opinion?.split ?? '-', '#722ed1'],
            ['礼物赠送', interaction?.gift ?? '-', '#52c41a'],
            ['神助攻', interaction?.divine ?? '-', '#faad14'],
          ].map(([t, v, c]: any, idx) => (
            <Col xs={24} sm={12} md={8} lg={3} key={idx}>
              <Card><Statistic title={t} value={v} prefix={<ThunderboltOutlined />} valueStyle={{ color: c }} /></Card>
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
                <DistributionChart items={matchDist?.[key] || []} dimKey={key} />
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
                <DistributionChart items={userDist?.[key] || []} dimKey={key} />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default PlatformStats;
