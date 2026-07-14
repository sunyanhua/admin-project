import { useState, useEffect, useRef } from 'react';
import { Card, Form, InputNumber, Button, Typography, Space } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { configApi } from '@/api/services/config';
import request from '@/api';
import { useAppNotification } from '@/hooks/useAppNotification';

const { Title } = Typography;

const FeeConfig = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeConfigId, setFeeConfigId] = useState<number>();
  const { success, error: showError } = useAppNotification();
  const isFirstRender = useRef(true);
  const fetchFeeConfigRef = useRef<() => void>();

  // 加载费率配置数据
  const fetchFeeConfig = async () => {
    try {
      setInitialLoading(true);
      const res = await configApi.getFeeConfig() as any;

      // 如果返回false或data为false，代表配置还没有进行第一次保存，不报错
      if (res === false || res?.data === false) {
        setInitialLoading(false);
        return;
      }

      // res 是 API 返回的 data.data，即 { name: "fee", data: "...", ... }
      let data: any = {};
      if (res?.data) {
        try {
          data = JSON.parse(res.data);
        } catch {
          data = { event_fee: res.data };
        }
      }

      if (data.event_fee !== undefined) {
        // 将小数转换为百分比显示，如 0.02 -> 2
        const percentValue = data.event_fee * 100;
        setTimeout(() => form.setFieldsValue({ event_fee: percentValue }), 0);
      }
    } catch (err: any) {
      // 权限错误不需要展示
      const msg = err?.response?.data?.msg || '';
      if (msg.includes('权限')) {
        setInitialLoading(false);
        return;
      }
      showError(msg || '加载配置失败');
    } finally {
      setInitialLoading(false);
    }
  };

  fetchFeeConfigRef.current = fetchFeeConfig;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchFeeConfigRef.current?.();
    }
  }, []);

  const handleSave = async (values: { event_fee: number }) => {
    try {
      setSaving(true);
      // 将百分比转换为小数，如 2 -> 0.02
      const decimalValue = (values.event_fee ?? 0) / 100;
      // 使用 formData 格式发送
      const formData = new URLSearchParams();
      formData.append('mime', 'application/json');
      formData.append('data', JSON.stringify({ event_fee: decimalValue }));
      await request.post('/admin/v6/config/fee', formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      success('保存成功');
      fetchFeeConfig();
    } catch (err: any) {
      showError(err.response?.data?.msg || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Title level={2}>费率配置</Title>
      <p style={{ color: '#666', marginBottom: 24 }}>配置平台费率规则。</p>

      <Card loading={initialLoading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            event_fee: 0,
          }}
        >
          <Form.Item
            label="活动管理费率"
            name="event_fee"
            extra="设置活动成交后的平台服务费率，如填写5表示费率5%"
          >
            <InputNumber
              min={0}
              max={100}
              precision={2}
              style={{ width: 200 }}
              placeholder="请输入费率"
              addonAfter="%"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving} icon={<SaveOutlined />}>
                保存配置
              </Button>
              <Button onClick={fetchFeeConfig} icon={<ReloadOutlined />}>
                刷新
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default FeeConfig;
