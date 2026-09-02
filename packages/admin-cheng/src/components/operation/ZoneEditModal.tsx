import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Switch } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { ZoneStatus } from '@shared/constants';
import { zoneApi, Zone, CreateZoneRequest } from '@/api/services/zone';
import { adminApi } from '@/api/services/admin';
import type { AdminUserListItem } from '@/api/types/admin';
import { validateStrongPassword } from '@/utils/password';
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

/** 专区管理员角色标识（后端约定：role_ids 传 100 即专区管理员） */
const ZONE_ADMIN_ROLE_ID = 100;

const ZoneEditModal: React.FC<ZoneEditModalProps> = ({ visible, mode, zone, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(true);
  /** 该专区已有的管理员（无则 null；创建模式恒为 null） */
  const [existingAdmin, setExistingAdmin] = useState<AdminUserListItem | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;
    setExistingAdmin(null);
    if (mode === 'edit' && zone) {
      setStatusEnabled(zone.status === ZoneStatus.ENABLED);
      // 延迟回填：等弹窗 Form 挂载后再写入；关闭/切换模式时清除定时器，防止旧数据写回
      const timer = setTimeout(() => {
        form.setFieldsValue({
          name: zone.name || '',
          logo: zone.logo || '',
          banner: zone.banner || '',
          description: zone.description || '',
          form_config: zone.form_config || '',
          agreement: zone.agreement || '',
          admin_username: '',
          admin_password: '',
        });
      }, 50);
      // 查询该专区已有的管理员（管理员列表接口无 zone_id 筛选，前端按 zone_id 匹配）
      adminApi.getAdmins({ page: 1, size: 100 })
        .then((res: any) => {
          const list = Array.isArray(res) ? res : (res?.list || []);
          const found = list.find((a: AdminUserListItem) => a.zone_id && String(a.zone_id) === String(zone.id)) || null;
          setExistingAdmin(found);
          if (found) form.setFieldsValue({ admin_username: found.username || '' });
        })
        .catch(() => setExistingAdmin(null));
      return () => clearTimeout(timer);
    } else {
      setStatusEnabled(true);
      form.resetFields();
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

      let zoneId = '';
      if (mode === 'edit' && zone) {
        await zoneApi.update(zone.id, payload);
        zoneId = zone.id;
      } else {
        const created: any = await zoneApi.create(payload);
        zoneId = created?.id || '';
      }

      // 专区管理员：已有管理员则仅更新密码（账号不可改）；无管理员则创建（角色 100 + zone_id）
      try {
        if (existingAdmin) {
          if (values.admin_password) {
            await adminApi.updateAdmin(existingAdmin.id, { password: values.admin_password });
          }
        } else if (zoneId) {
          await adminApi.createAdmin({
            username: values.admin_username,
            password: values.admin_password,
            role_ids: [ZONE_ADMIN_ROLE_ID],
            zone_id: zoneId,
          });
        }
        success(mode === 'edit' ? '更新成功' : '创建成功');
      } catch (adminErr: any) {
        showError(`专区已保存，但管理员操作失败：${adminErr?.response?.data?.message || adminErr?.message || '未知错误'}。请重新打开编辑补设管理员`);
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

        {/* ====== 专区管理员 ====== */}
        <div style={{ background: '#fafafa', borderLeft: '3px solid #722ed1', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#722ed1' }}>专区管理员</div>
          <Form.Item
            label="管理员账号"
            name="admin_username"
            rules={[
              { required: true, message: '请输入管理员账号' },
              { min: 2, message: '账号至少2个字符' },
              { max: 32, message: '账号最多32个字符' },
            ]}
            extra={existingAdmin ? '该专区已有管理员，账号不可修改' : '该专区暂无管理员，保存后将自动创建专区管理员'}
          >
            <Input placeholder="请输入管理员账号" maxLength={32} disabled={!!existingAdmin} />
          </Form.Item>
          <Form.Item
            label="管理员密码"
            name="admin_password"
            rules={[
              { required: !existingAdmin, message: '请输入管理员密码' },
              { min: 8, message: '密码至少8个字符' },
              { max: 64, message: '密码最多64个字符' },
              { validator: validateStrongPassword },
            ]}
            extra={existingAdmin ? '留空则保持原密码不变' : '至少8位，包含大写字母、小写字母、数字、特殊符号'}
          >
            <Input.Password
              placeholder={existingAdmin ? '留空则保持原密码不变' : '请输入管理员密码'}
              autoComplete="new-password"
            />
          </Form.Item>
        </div>
      </Form>
    </ScrollableModal>
  );
};

export default ZoneEditModal;
