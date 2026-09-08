import { useState, useEffect, useCallback } from 'react';
import { Card, DatePicker, Typography, Statistic, Empty } from 'antd';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import dayjs, { Dayjs } from 'dayjs';
import {
  platformDatacubeApi,
  InteractionTrendItem,
  RegisterTrendItem,
  UserTrendResponse,
  UserCumulativeResponse,
  USER_SERIES_LABELS,
  UserTrendSeries,
  UserCumulativeSeries,
} from '@/api/services/platformDatacube';
import { useAppNotification } from '@/hooks/useAppNotification';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const toDateStr = (d: Dayjs) => d.format('YYYYMMDD');

/** 5 系列固定配色 */
const SERIES_COLORS_5 = ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#13c2c2'];
/** 7 系列 = 5 系列 + 2 */
const SERIES_COLORS_7 = [...SERIES_COLORS_5, '#f5222d', '#fa8c16'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #d9d9d9', padding: 12, fontSize: 12 }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
        {payload.map((item: any, idx: number) => (
          <p key={idx} style={{ margin: '4px 0', color: item.color }}>
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/** 用户趋势展示系列（其余系列不展示：迁移提交档案/累计注册/迁移用户） */
const USER_SERIES_VISIBLE = ['wxa_login', 'new_registered', 'activated', 'activated_matched', 'match_profile'];

/**
 * dates + series → recharts 行数据（以 dates 为源迭代，缺值补 0；
 * 只展示 USER_SERIES_VISIBLE 中的系列，未知 key 回退原文）
 */
const toRows = (dates: string[], series: Array<UserTrendSeries | UserCumulativeSeries>, valueKey: 'increments' | 'cumulatives') => {
  const visible = (series ?? []).filter((s) => USER_SERIES_VISIBLE.includes(s.key));
  return (dates ?? []).map((date, i) => {
    const row: Record<string, number | string> = { date };
    visible.forEach((s) => {
      row[USER_SERIES_LABELS[s.key] ?? s.key] = (s as any)[valueKey]?.[i] ?? 0;
    });
    return row;
  });
};

const NoData = () => (
  <div style={{ textAlign: 'center', padding: 32 }}>
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />
  </div>
);

const TrendStats = () => {
  const { error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [interactionTrend, setInteractionTrend] = useState<InteractionTrendItem[]>([]);
  const [registerTrend, setRegisterTrend] = useState<RegisterTrendItem[]>([]);
  const [userTrend, setUserTrend] = useState<UserTrendResponse | null>(null);
  const [userCumulative, setUserCumulative] = useState<UserCumulativeResponse | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = { from_date: toDateStr(dateRange[0]), to_date: toDateStr(dateRange[1]) };
    try {
      const [itRes, rtRes, utRes, ucRes]: any[] = await Promise.all([
        platformDatacubeApi.getInteractionTrend(params),
        platformDatacubeApi.getRegisterTrend(params),
        platformDatacubeApi.getUserTrend(params),
        platformDatacubeApi.getUserCumulative(params),
      ]);
      setInteractionTrend(Array.isArray(itRes) ? itRes : []);
      setRegisterTrend(Array.isArray(rtRes) ? rtRes : []);
      setUserTrend(utRes || null);
      setUserCumulative(ucRes || null);
    } catch (e: any) {
      showError(e?.response?.data?.message || '获取趋势数据失败');
    } finally {
      setLoading(false);
    }
    // 只随日期范围变化触发（showError 不入依赖，避免引用不稳定导致无限循环请求）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedInteraction = [...interactionTrend].sort((a, b) => a.date.localeCompare(b.date));
  /** 互选操作：关注、无感、心动、礼物 */
  const mutualRows = sortedInteraction.map((d) => ({
    date: d.date,
    关注: d.feeling_like,
    无感: d.feeling_dislike,
    心动: d.loves,
    礼物: d.gift,
  }));
  /** 牵线操作：撮合、拆散、神助攻 */
  const matchRows = sortedInteraction.map((d) => ({
    date: d.date,
    撮合: d.opinion_match,
    拆散: d.opinion_split,
    神助攻: d.divine,
  }));

  const registerRows = [...registerTrend].sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({
    date: d.date,
    注册人数: d.register_count,
    提交脱单档案: d.match_profile_count,
  }));

  const userTrendRows = toRows(userTrend?.dates || [], userTrend?.series || [], 'increments');
  const cumulativeRows = toRows(userCumulative?.dates || [], userCumulative?.series || [], 'cumulatives');
  const userTrendSeriesKeys = USER_SERIES_VISIBLE.map((key) => USER_SERIES_LABELS[key] ?? key);
  const cumulativeSeriesKeys = USER_SERIES_VISIBLE.map((key) => USER_SERIES_LABELS[key] ?? key);

  return (
    <div>
      <Title level={2}>趋势统计</Title>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Text type="secondary">按日趋势；用户累计曲线为全历史前缀和（仅截取所选区间，显式区间 ≤366 天）</Text>
        <RangePicker
          value={dateRange}
          onChange={(d) => { if (d?.[0] && d?.[1]) setDateRange([d[0], d[1]]); }}
        />
      </div>

      {/* ====== 1. 注册趋势 ====== */}
      <Card title="注册与脱单档案趋势" loading={loading} style={{ marginBottom: 24 }}>
        {registerRows.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={registerRows} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="注册人数" fill="#1890ff" />
              <Line type="monotone" dataKey="提交脱单档案" stroke="#52c41a" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </Card>

      {/* ====== 2. 用户增量趋势 ====== */}
      <Card title="用户按日增量" loading={loading} style={{ marginBottom: 24 }}>
        {userTrendRows.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={userTrendRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {userTrendSeriesKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={SERIES_COLORS_5[i % SERIES_COLORS_5.length]} strokeWidth={2} dot={false} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </Card>

      {/* ====== 3. 用户累计趋势 ====== */}
      <Card
        title="用户按日累计"
        loading={loading}
        extra={
          <Statistic
            title="当前退出脱单人数"
            value={userCumulative?.exited_match_count ?? '-'}
            valueStyle={{ fontSize: 16, color: '#f5222d' }}
          />
        }
      >
        {cumulativeRows.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={cumulativeRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {cumulativeSeriesKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={SERIES_COLORS_7[i % SERIES_COLORS_7.length]} strokeWidth={2} dot={false} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </Card>

      {/* ====== 4. 互动操作趋势（互选操作 + 牵线操作） ====== */}
      <Card title="互选操作趋势" loading={loading} style={{ marginBottom: 24 }}>
        {mutualRows.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={mutualRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="关注" stroke="#1890ff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="无感" stroke="#8c8c8c" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="心动" stroke="#eb2f96" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="礼物" stroke="#52c41a" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </Card>

      <Card title="牵线操作趋势" loading={loading}>
        {matchRows.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={matchRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="撮合" stroke="#f5222d" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="拆散" stroke="#722ed1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="神助攻" stroke="#faad14" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <NoData />
        )}
      </Card>
    </div>
  );
};

export default TrendStats;
