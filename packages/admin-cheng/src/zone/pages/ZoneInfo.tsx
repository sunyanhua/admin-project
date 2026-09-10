import { useEffect, useState } from 'react';
import { Card, Form, Spin, Input, Button, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useAuth } from '@/contexts/AuthContext';
import { zoneApi, Zone } from '@/api/services/zone';
import CropperImageUpload from '@/components/common/CropperImageUpload';
import ImageUpload from '@/components/common/ImageUpload';
import SourceQrcodeModal from '@/components/common/SourceQrcodeModal';
import { RichTextEditor } from '@/components/templates/RichTextEditor';

/**
 * 专区信息（默认页）：只读展示名称/状态/成员数，仅可修改图标（Logo）、Banner 和简介。
 */
const ZoneInfo = () => {
  const { user } = useAuth();
  const { success, error: showError } = useAppNotification();
  const [zone, setZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const loadDetail = async () => {
    if (!user?.zoneId) return;
    setLoading(true);
    try {
      const detail: any = await zoneApi.getProfile(user.zoneId);
      setZone(detail);
      form.setFieldsValue({
        logo: detail?.logo || '',
        banner: detail?.banner || '',
        description: detail?.description || '',
      });
    } catch (err: any) {
      showError(err?.response?.data?.message || '专区信息加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.zoneId]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      // 指针语义：仅传可编辑的三项，空串为主动清空（专区管理员专用 profile 路由）
      await zoneApi.updateProfile(user!.zoneId, {
        logo: values.logo || '',
        banner: values.banner || '',
        description: values.description || '',
      });
      success('保存成功');
      await loadDetail();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Card title="专区信息管理" extra="仅可修改图标、Banner 和简介">
        <Spin spinning={loading}>
          <Form form={form} layout="vertical" style={{ maxWidth: 720 }} onFinish={handleSave}>
            <Form.Item label="专区名称">
              <Space size={4}>
                <Input value={zone?.name || ''} disabled placeholder="专区名称" style={{ width: 320 }} />
                <SourceQrcodeModal basePage={`/pages/zone/index?id=${zone?.id || user?.zoneId || ''}`} showSource={false} showShortlink={false} />
              </Space>
            </Form.Item>

            <Form.Item
              label="专区图标（Logo）"
              name="logo"
              extra="建议尺寸：200 × 200 像素"
            >
              <CropperImageUpload aspect={1} sizeHint="建议尺寸：200 × 200 像素" />
            </Form.Item>

            <Form.Item
              label="专区 Banner"
              name="banner"
              extra="建议尺寸：750 × 300 像素"
            >
              <ImageUpload />
            </Form.Item>

            <Form.Item
              label="专区简介"
              name="description"
            >
              <RichTextEditor placeholder="请输入专区介绍" showImageUpload={false} className="rich-text-editor-short" />
            </Form.Item>

            <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving}>
              保存
            </Button>
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

export default ZoneInfo;
