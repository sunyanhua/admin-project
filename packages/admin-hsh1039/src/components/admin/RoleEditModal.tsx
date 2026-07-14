import { useState, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Form, Input, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { adminApi, AdminRole } from '../../api/services/admin';

export interface RoleEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  role: AdminRole | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const RoleEditModal: React.FC<RoleEditModalProps> = ({ visible, mode, role, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();
  const isCreate = mode === 'create';

  useEffect(() => {
    if (visible) {
      if (role && !isCreate) {
        form.setFieldsValue({
          name: role.name || '',
          description: role.description || '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, role, isCreate, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      if (isCreate) {
        await adminApi.createRole({
          code: values.code,
          name: values.name,
          description: values.description || undefined,
        });
        success('角色创建成功');
      } else {
        if (!role) return;
        await adminApi.updateRole(role.id, {
          name: values.name,
          description: values.description || undefined,
        });
        success('角色更新成功');
      }

      form.resetFields();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || (isCreate ? '创建失败' : '更新失败');
      showError(errorMessage);
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
      title={isCreate ? '添加角色' : '编辑角色'}
      open={visible}
      onCancel={handleCancel}
      width={520}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} onClick={() => form.submit()}>{isCreate ? "创建" : "保存"}</Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        {isCreate && (
          <Form.Item
            label="角色标识"
            name="code"
            extra="唯一标识，创建后不可修改，如 super_admin"
            rules={[
              { required: true, message: '请输入角色标识' },
              { max: 32, message: '角色标识最多32个字符' },
              { pattern: /^[a-z][a-z0-9_]*$/, message: '仅支持小写字母、数字、下划线，以字母开头' },
            ]}
          >
            <Input placeholder="如 super_admin" />
          </Form.Item>
        )}

        <Form.Item
          label="角色名称"
          name="name"
          rules={[
            { required: true, message: '请输入角色名称' },
            { max: 32, message: '角色名称最多32个字符' },
          ]}
        >
          <Input placeholder="如 超级管理员" />
        </Form.Item>

        <Form.Item
          label="描述"
          name="description"
          rules={[{ max: 256, message: '描述最多256个字符' }]}
        >
          <Input.TextArea placeholder="角色描述（选填）" rows={3} />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default RoleEditModal;
