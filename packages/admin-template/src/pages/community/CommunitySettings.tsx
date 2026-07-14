import { useState, useEffect, useRef } from 'react';
import { Card, Form, Radio, Button, Typography, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { configApi } from '@/api/services/config';
import { useAppNotification } from '@/hooks/useAppNotification';

const { Title } = Typography;

interface SettingItem {
  name: string;
  value: string;
  value_type: number;
  description: string;
}

// 审核模式：32-先发后审，16-先审后发
const AUDIT_MODE = {
  POST_FIRST: '32',
  REVIEW_FIRST: '16',
};

const CommunitySettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const isFirstRender = useRef(true);
  const fetchSettingsRef = useRef<() => void>();
  const { success, error: showError } = useAppNotification();

  // 加载设置数据
  const fetchSettings = async () => {
    try {
      setInitialLoading(true);
      // 一次请求获取所有配置，前端按 name 过滤
      const res = await configApi.getCommunitySettings({
        start: 0,
        length: 100,
      }) as any;

      // axios 拦截器已返回 data.data 格式: { start, length, word, count, data: [...] }
      const allSettings = res?.data || [];

      const values: Record<string, string> = {};

      // 动态审核模式
      const feedSetting = allSettings.find((s: SettingItem) => s.name === 'UGC.FEED.STATUS');
      if (feedSetting) {
        values.audit_mode = feedSetting.value === AUDIT_MODE.REVIEW_FIRST ? '16' : '32';
      }

      // 评论审核模式
      const commentSetting = allSettings.find((s: SettingItem) => s.name === 'UGC.FEED.COMMENT.STATUS');
      if (commentSetting) {
        values.comment_audit_mode = commentSetting.value === AUDIT_MODE.REVIEW_FIRST ? '16' : '32';
      }

      setTimeout(() => form.setFieldsValue(values), 0);
    } catch (err: any) {
      showError(err.response?.data?.msg || err.response?.data?.error || '加载配置失败');
    } finally {
      setInitialLoading(false);
    }
  };

  fetchSettingsRef.current = fetchSettings;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchSettingsRef.current?.();
    }
  }, []);

  const handleSave = async (values: any) => {
    try {
      setLoading(true);
      // 保存动态审核模式和评论审核模式配置
      await Promise.all([
        configApi.updateCommunitySettings({
          name: 'UGC.FEED.STATUS',
          value: values.audit_mode,
          value_type: 0,
          description: '动态审核模式：32-先发后审，16-先审后发',
        }),
        configApi.updateCommunitySettings({
          name: 'UGC.FEED.COMMENT.STATUS',
          value: values.comment_audit_mode,
          value_type: 0,
          description: '评论审核模式：32-先发后审，16-先审后发',
        }),
      ]);
      success('保存成功');
    } catch (err: any) {
      showError(err.response?.data?.msg || err.response?.data?.error || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>审核模式</Title>
      <p style={{ color: '#666', marginBottom: 24 }}>配置社区动态和评论的审核模式。</p>

      <Card loading={initialLoading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            audit_mode: '32',
            comment_audit_mode: '32',
          }}
        >
          <Form.Item label="动态审核模式" name="audit_mode">
            <Radio.Group>
              <Radio value="32">先发后审（用户发布后直接展示）</Radio>
              <Radio value="16">先审后发（用户发布后需审核通过才展示）</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item label="评论审核模式" name="comment_audit_mode">
            <Radio.Group>
              <Radio value="32">先发后审（用户评论后直接展示）</Radio>
              <Radio value="16">先审后发（用户评论后需审核通过才展示）</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                保存配置
              </Button>
              <Button onClick={fetchSettings}>
                刷新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CommunitySettings;
