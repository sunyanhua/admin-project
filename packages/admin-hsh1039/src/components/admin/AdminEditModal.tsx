import { useState, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Form, Input, Select, Button, Space, Divider } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { adminApi, AdminUser, AdminRole } from '../../api/services/admin';

export interface AdminEditModalProps {
  visible: boolean;
  onClose: () => void;
  admin: AdminUser | null;
  onSuccess?: () => void;
}

// 强密码验证（编辑时可选）
const validateStrongPassword = (_: any, value: string): Promise<void> => {
  if (!value) return Promise.resolve();

  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    const missingTypes = [];
    if (!hasUpperCase) missingTypes.push('大写字母');
    if (!hasLowerCase) missingTypes.push('小写字母');
    if (!hasNumber) missingTypes.push('数字');
    if (!hasSpecialChar) missingTypes.push('特殊符号');
    return Promise.reject(
      new Error(`密码必须包含大写字母、小写字母、数字、特殊符号。当前缺少: ${missingTypes.join('、')}`)
    );
  }

  return Promise.resolve();
};

const AdminEditModal: React.FC<AdminEditModalProps> = ({ visible, onClose, admin, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<AdminRole[]>([]);

  useEffect(() => {
    if (admin && visible) {
      adminApi.getRoles().then((roleList: AdminRole[]) => {
        setRoles(roleList);

        // admin.roles 返回的是中文名称数组，如 ['全站管理员']
        const roleNames: string[] = (admin.roles || []).map((r: any) =>
          typeof r === 'string' ? r : r?.name
        ).filter(Boolean);

        // 优先按 name 匹配，兜底按 code 匹配
        const matchedRole = roleNames.length
          ? roleList.find((r) => roleNames.includes(r.name) || roleNames.includes(r.code))
          : null;

        form.setFieldsValue({
          real_name: admin.real_name || '',
          phone: admin.phone || '',
          role_id: matchedRole?.id ?? undefined,
          status: admin.status ?? 1,
        });
      }).catch(() => {
        setRoles([]);
        form.setFieldsValue({
          real_name: admin.real_name || '',
          phone: admin.phone || '',
          status: admin.status ?? 1,
        });
      });
    }
  }, [admin, visible, form]);

  const handleSubmit = async (values: any) => {
    if (!admin) return;

    try {
      setLoading(true);

      const submitData: any = {
        real_name: values.real_name ?? '',
        phone: values.phone ?? '',
        role_ids: values.role_id != null ? [values.role_id] : undefined,
        status: values.status,
      };

      if (values.password) {
        submitData.password = values.password;
      }

      await adminApi.updateAdmin(admin.id, submitData);

      success('管理员更新成功');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || '更新失败';
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <ScrollableModal
      title={`编辑管理员 — ${admin?.username || ''}`}
      open={visible}
      onCancel={handleCancel}
      width={600}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} onClick={() => form.submit()}>保存</Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="用户名"
        >
          <Input value={admin?.username || ''} disabled />
        </Form.Item>

        <Form.Item
          label="姓名"
          name="real_name"
          rules={[{ max: 32, message: '姓名最多32个字符' }]}
        >
          <Input placeholder="请输入真实姓名" />
        </Form.Item>

        <Form.Item
          label="手机号"
          name="phone"
          rules={[{ max: 20, message: '手机号最多20个字符' }]}
        >
          <Input placeholder="请输入手机号" />
        </Form.Item>

        <Divider>修改密码（可选）</Divider>

        <Form.Item
          label="新密码"
          name="password"
          rules={[
            { min: 6, message: '密码至少6个字符' },
            { max: 64, message: '密码最多64个字符' },
            { validator: validateStrongPassword },
          ]}
        >
          <Input.Password
            placeholder="不修改请留空"
            autoComplete="new-password"
          />
        </Form.Item>

        <Divider>角色与状态</Divider>

        <Form.Item
          label="角色"
          name="role_id"
        >
          <Select
            placeholder="选择角色"
            options={roles.map((r) => ({ label: r.name, value: r.id }))}
          />
        </Form.Item>

        <Form.Item
          label="状态"
          name="status"
        >
          <Select>
            <Select.Option value={1}>正常</Select.Option>
            <Select.Option value={0}>屏蔽</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default AdminEditModal;
