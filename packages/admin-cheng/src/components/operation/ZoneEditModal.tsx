import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Switch } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { ZoneStatus } from '@shared/constants';
import { zoneApi, Zone, CreateZoneRequest } from '@/api/services/zone';
import CropperImageUpload from '@/components/common/CropperImageUpload';
import ImageUpload from '@/components/common/ImageUpload';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import FormConfigEditor from '@/components/operation/FormConfigEditor';
import AgreementEditor from '@/components/operation/AgreementEditor';
import ScrollableModal from '@/components/templates/ScrollableModal';

export interface ZoneEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  zone: Zone | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ZoneEditModal: React.FC<ZoneEditModalProps> = ({ visible, mode, zone, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && zone) {
        setStatusEnabled(zone.status === ZoneStatus.ENABLED);
        setTimeout(() => {
          form.setFieldsValue({
            name: zone.name || '',
            logo: zone.logo || '',
            banner: zone.banner || '',
            description: zone.description || '',
            form_config: zone.form_config || '',
            agreement: zone.agreement || '',
          });
        }, 0);
      } else {
        setStatusEnabled(true);
        setTimeout(() => form.resetFields(), 0);
      }
    }
  }, [visible, mode, zone, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: CreateZoneRequest = {
        name: values.name,
        logo: values.logo || '',
        banner: values.banner || '',
        description: values.description || '',
        form_config: values.form_config || '',
        agreement: values.agreement || '',
        status: statusEnabled ? ZoneStatus.ENABLED : ZoneStatus.DISABLED,
      };

      if (mode === 'edit' && zone) {
        await zoneApi.update(zone.id, payload);
        success('更新成功');
      } else {
        await zoneApi.create(payload);
        success('创建成功');
      }
      onClose();
      onSuccess();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollableModal
      title={mode === 'create' ? '创建专区' : '编辑专区'}
      open={visible}
      onCancel={onClose}
      width={720}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {mode === 'create' ? '创建' : '保存'}
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
      >
        <Form.Item
          label="专区名称"
          name="name"
          rules={[{ required: true, message: '请输入专区名称' }, { max: 64, message: '最多64个字符' }]}
        >
          <Input placeholder="请输入专区名称" maxLength={64} showCount />
        </Form.Item>

        <Form.Item
          label="专区 Logo"
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
          label="专区介绍"
          name="description"
        >
          <RichTextEditor placeholder="请输入专区介绍" showImageUpload={false} className="rich-text-editor-short" />
        </Form.Item>

        {/* ====== 申请表单配置 ====== */}
        <div style={{ background: '#fafafa', borderLeft: '3px solid #1677ff', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1677ff' }}>申请表单配置</div>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>配置用户申请专区时需要填写的字段</div>
          <Form.Item name="form_config" style={{ marginBottom: 0 }}>
            <FormConfigEditor />
          </Form.Item>
        </div>

        {/* ====== 相关文档 ====== */}
        <div style={{ background: '#fafafa', borderLeft: '3px solid #1677ff', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1677ff' }}>相关文档</div>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>配置专区用户协议、隐私政策等文档，可添加多项</div>
          <Form.Item name="agreement" style={{ marginBottom: 0 }}>
            <AgreementEditor />
          </Form.Item>
        </div>

        <Form.Item label="状态">
          <Switch
            checked={statusEnabled}
            onChange={setStatusEnabled}
            checkedChildren="启用"
            unCheckedChildren="禁用"
          />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default ZoneEditModal;
