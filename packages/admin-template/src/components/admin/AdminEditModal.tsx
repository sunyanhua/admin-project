import { useState, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Modal, Form, Input, Select, Button, Space, Divider } from 'antd';
import { AdminRole, AdminRule, AdminRoleMap, AdminRuleMap } from '@shared/constants/admin.enums';
import { adminApi, AdminUser } from '../../api/services/admin';

const { Option } = Select;

export interface AdminEditModalProps {
  visible: boolean;
  onClose: () => void;
  admin: AdminUser | null;
  onSuccess?: () => void;
}

// 强密码验证函数
const validateStrongPassword = (_: any, value: string): Promise<void> => {
  if (!value) {
    return Promise.resolve(); // 编辑时密码可选
  }

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
  const { success, error } = useAppNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);

  // 当admin变化或弹窗显示时，重置表单数据
  useEffect(() => {
    if (admin && visible) {
      setSelectedRole(admin.role);
      form.setFieldsValue({
        name: admin.name,
        role: admin.role,
        rule: admin.rule,
      });
    }
  }, [admin, visible, form]);

  const handleRoleChange = (value: AdminRole) => {
    setSelectedRole(value);
    // 如果是超级管理员，rule 自动设为 0；否则清空权限选择
    if (value === AdminRole.SUPER_ADMIN) {
      setTimeout(() => form.setFieldValue('rule', 0), 0);
    } else {
      setTimeout(() => form.setFieldValue('rule', undefined), 0);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!admin) return;

    try {
      setLoading(true);

      // 准备提交数据 - 严格按照接口文档
      const submitData: {
        name?: string;
        pass?: string;
        role?: number;
        rule?: number;
      } = {
        name: values.name,
        role: values.role,
        rule: values.role === AdminRole.SUPER_ADMIN ? 0 : values.rule,
      };

      // 如果填写了密码，则包含密码
      if (values.pass) {
        submitData.pass = values.pass;
      }

      // 调用API更新管理员
      await adminApi.updateAdmin(admin.id, submitData);

      success('管理员更新成功');
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }, 100);
    } catch (err: any) {
      error(err.response?.data?.msg || err.response?.data?.error || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedRole(null);
    onClose();
  };

  return (
    <Modal
      title="编辑管理员"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="用户名"
          name="name"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { max: 20, message: '用户名最多20个字符' },
          ]}
        >
          <Input placeholder="请输入用户名" />
        </Form.Item>

        <Divider>修改密码（可选）</Divider>

        <Form.Item
          label="新密码"
          name="pass"
          rules={[
            { min: 8, message: '密码至少8个字符' },
            { validator: validateStrongPassword },
          ]}
        >
          <Input.Password
            placeholder="不修改请留空（至少8位，包含大写字母、小写字母、数字、特殊符号）"
            autoComplete="new-password"
          />
        </Form.Item>

        <Divider>权限设置</Divider>

        <Form.Item
          label="角色"
          name="role"
          rules={[{ required: true, message: '请选择角色' }]}
        >
          <Select placeholder="请选择角色" onChange={handleRoleChange}>
            <Option value={AdminRole.SUPER_ADMIN}>{AdminRoleMap[AdminRole.SUPER_ADMIN].text}</Option>
            <Option value={AdminRole.NORMAL_ADMIN}>{AdminRoleMap[AdminRole.NORMAL_ADMIN].text}</Option>
          </Select>
        </Form.Item>

        {selectedRole === AdminRole.NORMAL_ADMIN && (
          <Form.Item
            label="权限"
            name="rule"
            rules={[{ required: true, message: '请选择权限' }]}
          >
            <Select placeholder="请选择权限">
              <Option value={AdminRule.VIEW_ONLY}>{AdminRuleMap[AdminRule.VIEW_ONLY]}</Option>
              <Option value={AdminRule.AUDITOR}>{AdminRuleMap[AdminRule.AUDITOR]}</Option>
              <Option value={AdminRule.EDITOR}>{AdminRuleMap[AdminRule.EDITOR]}</Option>
            </Select>
          </Form.Item>
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AdminEditModal;
