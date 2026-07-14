import { useState, useEffect, useRef } from 'react';
import { Card, Form, InputNumber, Button, Typography, Space, Table, Tag } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { configApi } from '@/api/services/config';
import { useAppNotification } from '@/hooks/useAppNotification';

const { Title } = Typography;

interface RewardItem {
  id: number;
  name: string;
  title: string;
  points: number;
  daily_limit: number | null;
  weekly_limit: number | null;
  monthly_limit: number | null;
  yearly_limit: number | null;
  usable: string;
  expiry: string;
  status: number;
}

// name 枚举来自后端文档
const REWARD_TYPES = [
  { key: 'user', label: '用户注册积分', name: 'USER' },
  { key: 'sign', label: '签到积分', name: 'USER.Checkin' },
  { key: 'feed', label: '动态发布积分', name: 'UGC.Feed' },
  { key: 'comment', label: '评论积分', name: 'UGC.Feed.Comment' },
  { key: 'activity', label: '活动报名积分', name: 'UGC.Event.Order' },
];

const PointsSettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rewardIds, setRewardIds] = useState<Record<string, number>>({});
  const { success, error: showError } = useAppNotification();
  const isFirstRender = useRef(true);
  const fetchPointsConfigRef = useRef<() => void>();

  // 加载积分配置数据
  const fetchPointsConfig = async () => {
    try {
      setInitialLoading(true);
      const res = await configApi.getRewardConfig({
        start: 0,
        length: 100,
      }) as any;

      // axios 拦截器已返回 data.data 格式: { start, length, word, count, data: [...] }
      const rewards = res?.data || [];

      // 按 name 分组（name 枚举来自后端文档）
      const userReward = rewards.find((r: RewardItem) => r.name === 'USER');
      const signReward = rewards.find((r: RewardItem) => r.name === 'USER.Checkin');
      const feedReward = rewards.find((r: RewardItem) => r.name === 'UGC.Feed');
      const commentReward = rewards.find((r: RewardItem) => r.name === 'UGC.Feed.Comment');
      const activityReward = rewards.find((r: RewardItem) => r.name === 'UGC.Event.Order');

      // 记录各配置项的 id
      const ids: Record<string, number> = {};
      if (userReward) ids.USER = userReward.id;
      if (signReward) ids.USER_Checkin = signReward.id;
      if (feedReward) ids.UGC_Feed = feedReward.id;
      if (commentReward) ids.UGC_Feed_Comment = commentReward.id;
      if (activityReward) ids.UGC_Event_Order = activityReward.id;
      setRewardIds(ids);

      const values: Record<string, any> = {};

      if (userReward) {
        values.user_points = userReward.points;
      }

      if (signReward) {
        values.sign_points = signReward.points;
        values.sign_daily = signReward.daily_limit ?? 1;
      }

      if (feedReward) {
        values.feed_points = feedReward.points;
        values.feed_daily = feedReward.daily_limit;
        values.feed_monthly = feedReward.monthly_limit;
      }

      if (commentReward) {
        values.comment_points = commentReward.points;
        values.comment_daily = commentReward.daily_limit;
        values.comment_monthly = commentReward.monthly_limit;
      }

      if (activityReward) {
        values.activity_points = activityReward.points;
        values.activity_daily = activityReward.daily_limit;
        values.activity_monthly = activityReward.monthly_limit;
      }

      setTimeout(() => form.setFieldsValue(values), 0);
    } catch (err: any) {
      showError(err.response?.data?.msg || err.response?.data?.error || '加载配置失败');
    } finally {
      setInitialLoading(false);
    }
  };

  fetchPointsConfigRef.current = fetchPointsConfig;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchPointsConfigRef.current?.();
    }
  }, []);

  const handleSave = async (values: any) => {
    try {
      setSaving(true);

      // 构建更新数据 - 不限制的字段不传，name 使用后端文档定义的值
      // 有 id 则编辑，无 id 则新增
      const userData: any = {
        name: 'USER',
        title: '用户注册积分',
        points: values.user_points || 0,
        status: 0,
      };
      if (rewardIds.USER) userData.id = rewardIds.USER;

      const signData: any = {
        name: 'USER.Checkin',
        title: '签到积分',
        points: values.sign_points || 0,
        daily_limit: 1,
        status: 0,
      };
      if (rewardIds.USER_Checkin) signData.id = rewardIds.USER_Checkin;

      const feedData: any = {
        name: 'UGC.Feed',
        title: '动态发布积分',
        points: values.feed_points || 0,
        status: 0,
      };
      if (values.feed_daily != null) feedData.daily_limit = values.feed_daily;
      if (values.feed_monthly != null) feedData.monthly_limit = values.feed_monthly;
      if (rewardIds.UGC_Feed) feedData.id = rewardIds.UGC_Feed;

      const commentData: any = {
        name: 'UGC.Feed.Comment',
        title: '评论积分',
        points: values.comment_points || 0,
        status: 0,
      };
      if (values.comment_daily != null) commentData.daily_limit = values.comment_daily;
      if (values.comment_monthly != null) commentData.monthly_limit = values.comment_monthly;
      if (rewardIds.UGC_Feed_Comment) commentData.id = rewardIds.UGC_Feed_Comment;

      const activityData: any = {
        name: 'UGC.Event.Order',
        title: '活动报名积分',
        points: values.activity_points || 0,
        status: 0,
      };
      if (values.activity_daily != null) activityData.daily_limit = values.activity_daily;
      if (values.activity_monthly != null) activityData.monthly_limit = values.activity_monthly;
      if (rewardIds.UGC_Event_Order) activityData.id = rewardIds.UGC_Event_Order;

      // 批量更新
      await Promise.all([
        configApi.updateRewardConfig(userData),
        configApi.updateRewardConfig(signData),
        configApi.updateRewardConfig(feedData),
        configApi.updateRewardConfig(commentData),
        configApi.updateRewardConfig(activityData),
      ]);

      success('保存成功');
      fetchPointsConfig();
    } catch (err: any) {
      showError(err.response?.data?.msg || err.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Title level={2}>积分设置</Title>
      <p style={{ color: '#666', marginBottom: 24 }}>配置平台积分规则。</p>

      <Card loading={initialLoading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            user_points: 0,
            sign_points: 0,
            sign_daily: 1,
            feed_points: 0,
            feed_daily: null,
            feed_monthly: null,
            comment_points: 0,
            comment_daily: null,
            comment_monthly: null,
            activity_points: 0,
            activity_daily: null,
            activity_monthly: null,
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={4}>用户注册积分</Typography.Title>
            <Space size="large" wrap>
              <Form.Item name="user_points">
                <InputNumber min={0} style={{ width: 120 }} />
              </Form.Item>
            </Space>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={4}>签到积分</Typography.Title>
            <Space size="large" wrap>
              <Form.Item label="单次积分" name="sign_points">
                <InputNumber min={0} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item label="每日上限（次数）" name="sign_daily">
                <InputNumber min={0} style={{ width: 120 }} disabled />
              </Form.Item>
            </Space>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={4}>动态发布积分</Typography.Title>
            <Space size="large" wrap>
              <Form.Item label="单次积分" name="feed_points">
                <InputNumber min={0} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item label="每日上限（次数）" name="feed_daily">
                <InputNumber min={0} placeholder="不限制" style={{ width: 120 }} />
              </Form.Item>
              <Form.Item label="每月上限（次数）" name="feed_monthly">
                <InputNumber min={0} placeholder="不限制" style={{ width: 120 }} />
              </Form.Item>
            </Space>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={4}>评论积分</Typography.Title>
            <Space size="large" wrap>
              <Form.Item label="单次积分" name="comment_points">
                <InputNumber min={0} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item label="每日上限（次数）" name="comment_daily">
                <InputNumber min={0} placeholder="不限制" style={{ width: 120 }} />
              </Form.Item>
              <Form.Item label="每月上限（次数）" name="comment_monthly">
                <InputNumber min={0} placeholder="不限制" style={{ width: 120 }} />
              </Form.Item>
            </Space>
          </div>

          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={4}>活动报名积分</Typography.Title>
            <Space size="large" wrap>
              <Form.Item label="单次积分" name="activity_points">
                <InputNumber min={0} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item label="每日上限（次数）" name="activity_daily">
                <InputNumber min={0} placeholder="不限制" style={{ width: 120 }} />
              </Form.Item>
              <Form.Item label="每月上限（次数）" name="activity_monthly">
                <InputNumber min={0} placeholder="不限制" style={{ width: 120 }} />
              </Form.Item>
            </Space>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                保存配置
              </Button>
              <Button onClick={fetchPointsConfig} icon={<ReloadOutlined />}>
                刷新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PointsSettings;
