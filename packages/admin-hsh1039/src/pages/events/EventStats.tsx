import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Select, Button, Space, App } from 'antd';
import { SearchOutlined, TeamOutlined, DollarOutlined, ShopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import request from '@/api';
import { statisticsApi } from '@/api/services/statistics';
import { categoryApi } from '@/api/services/category';

const { RangePicker } = DatePicker;

interface StatsData {
  total: number;
  status_1_total: number;
  status_2_total: number;
  status_3_total: number;
  status_4_total: number;
  status_5_total: number;
  status_6_total: number;
  order_total: number;
  order_paycost: number;
  order_payfree: number;
  order_payable: number;
  settlement_total: number;
  settlement_orders_total: number;
  settlement_noshow_total: number;
  settlement_noshow_amount: number;
  settlement_wallet_amount: number;
  settlement_platform_amount: number;
}

interface UserItem {
  id: string;
  nick: string;
  coop_role: number;
}

interface CategoryItem {
  id: number;
  title: string;
}

const COOP_ROLE_MAP: Record<number, string> = {
  3: '官方用户',
  1: '合作商户',
  2: '主理人',
};

const EventStats = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [userOptions, setUserOptions] = useState<{ label: string; options: { label: string; value: string }[] }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [trigger, setTrigger] = useState(0);

  // 使用ref存储当前筛选值，确保fetchStats总能读到最新值
  const filterRef = useRef({ dateRange: [null, null] as [Dayjs | null, Dayjs | null], selectedUser: '', selectedCategory: undefined as number | undefined });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      const { dateRange: dr, selectedUser: su, selectedCategory: sc } = filterRef.current;
      if (dr[0]) params.min = dr[0].format('YYYY-MM-DD');
      if (dr[1]) params.max = dr[1].format('YYYY-MM-DD');
      if (su) params.userid = su;
      if (sc) params.category = sc;

      const res = await statisticsApi.getEventDatacube(params) as any;
      setStats(res?.data || res || null);
    } catch (err: any) {
      message.error(err.response?.data?.msg || '获取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 页面加载时默认调用接口
  useEffect(() => {
    fetchStats();
  }, [trigger]);

  // 加载分类列表
  const loadCategoryOptions = useCallback(async () => {
    try {
      const res = await categoryApi.getCategories({ status: 0, start: 0, length: 100 } as any) as any;
      const list = res?.data?.list || res?.data || [];
      setCategoryOptions(list.map((c: CategoryItem) => ({ id: c.id, title: c.title })));
    } catch {
      setCategoryOptions([]);
    }
  }, []);

  // 加载用户列表，按coop_role分组
  const loadUserOptions = useCallback(async () => {
    try {
      // 获取所有合作认证用户（coop_role = 1,2,3）
      const res = await request.get('/admin/v6/user', {
        params: { coop_role: 1, start: 0, length: 500 }
      }) as any;
      const list1: UserItem[] = res?.data?.list || res?.data || [];

      const res2 = await request.get('/admin/v6/user', {
        params: { coop_role: 2, start: 0, length: 500 }
      }) as any;
      const list2: UserItem[] = res2?.data?.list || res2?.data || [];

      const res3 = await request.get('/admin/v6/user', {
        params: { coop_role: 3, start: 0, length: 500 }
      }) as any;
      const list3: UserItem[] = res3?.data?.list || res3?.data || [];

      const allUsers = [...list1, ...list2, ...list3].filter(u => u.id);

      // 按coop_role分组
      const groups: Record<number, { label: string; options: { label: string; value: string }[] }> = {};
      allUsers.forEach((u: UserItem) => {
        const role = u.coop_role || 0;
        if (!groups[role]) {
          groups[role] = { label: COOP_ROLE_MAP[role] || '其他', options: [] };
        }
        groups[role].options.push({
          label: u.nick || u.id,
          value: u.id,
        });
      });

      // 按官方用户->商户->主理人排序
      const order = [3, 1, 2];
      const sortedGroups = order
        .filter(r => groups[r]?.options?.length > 0)
        .map(r => groups[r]);

      setUserOptions(sortedGroups);
    } catch {
      setUserOptions([]);
    }
  }, []);

  // 使用loadedRef确保初始化只执行一次
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadCategoryOptions();
    loadUserOptions();
  }, []);

  const handleDateChange = (dates: any, dateStrings: [string, string]) => {
    setDateRange(dates);
    filterRef.current.dateRange = dates;
  };

  const handleCategoryChange = (value: number) => {
    setSelectedCategory(value);
    filterRef.current.selectedCategory = value;
  };

  const handleUserChange = (value: string) => {
    setSelectedUser(value);
    filterRef.current.selectedUser = value;
  };

  const handleSearch = () => {
    fetchStats();
  };

  const handleReset = () => {
    setDateRange([null, null]);
    setSelectedCategory(undefined);
    setSelectedUser('');
    filterRef.current = { dateRange: [null, null], selectedUser: '', selectedCategory: undefined };
    setTrigger(t => t + 1);
  };

  const formatAmount = (amount?: number) => {
    if (amount == null) return '¥0.00';
    return `¥${(amount / 100).toFixed(2)}`;
  };

  return (
    <div>
      <h2>活动数据统计</h2>
      <p style={{ color: '#666', marginBottom: 24 }}>平台活动相关数据统计报表。</p>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <RangePicker
            value={dateRange}
            onChange={handleDateChange}
            placeholder={['开始日期', '结束日期']}
          />
          <Select
            value={selectedCategory}
            onChange={handleCategoryChange}
            placeholder="活动类型"
            style={{ width: 150 }}
            allowClear
          >
            {categoryOptions.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.title}
              </Select.Option>
            ))}
          </Select>
          <Select
            value={selectedUser || undefined}
            onChange={handleUserChange}
            placeholder="官方用户/商户/主理人"
            style={{ width: 200 }}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {userOptions.map((group) => (
              <Select.OptGroup key={group.label} label={group.label}>
                {group.options.map((opt) => (
                  <Select.Option key={opt.value} value={opt.value} label={opt.label}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select.OptGroup>
            ))}
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={4}>
          <Card loading={loading}>
            <Statistic
              title="活动总数"
              value={stats?.total ?? 0}
              prefix={<ShopOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={4}>
          <Card loading={loading}>
            <Statistic
              title="进行中"
              value={stats?.status_1_total ?? 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={4}>
          <Card loading={loading}>
            <Statistic
              title="已完成"
              value={stats?.status_6_total ?? 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={4}>
          <Card loading={loading}>
            <Statistic
              title="已锁定"
              value={stats?.status_3_total ?? 0}
              valueStyle={{ color: '#999' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={4}>
          <Card loading={loading}>
            <Statistic
              title="已取消"
              value={stats?.status_4_total ?? 0}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={4}>
          <Card loading={loading}>
            <Statistic
              title="已退款取消"
              value={stats?.status_5_total ?? 0}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={12} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="报名人数"
              value={stats?.order_total ?? 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="收入总额"
              value={formatAmount(stats?.order_payable)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="已结算总额"
              value={formatAmount(stats?.settlement_wallet_amount)}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default EventStats;
