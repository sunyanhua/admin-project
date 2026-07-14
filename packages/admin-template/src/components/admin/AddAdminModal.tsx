import { useState } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Modal, Form, Input, Select, Button, Space } from 'antd';
import { AdminRole, AdminRule, AdminRoleMap, AdminRuleMap } from '@shared/constants/admin.enums';
import { adminApi } from '../../api/services/admin';

const { Option } = Select;

export interface AddAdminModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// 强密码验证函数
// 要求：至少8位，包含大写字母、小写字母、数字、特殊符号
const validateStrongPassword = (_: any, value: string): Promise<void> => {
  if (!value) {
    return Promise.reject(new Error('请输入密码'));
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

const AddAdminModal: React.FC<AddAdminModalProps> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const { success, error } = useAppNotification();

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
    try {
      setLoading(true);

      // 准备提交数据 - 严格按照接口文档
      const submitData = {
        name: values.name,
        pass: values.pass,
        role: values.role,
        rule: values.role === AdminRole.SUPER_ADMIN ? 0 : values.rule,
      };

      // 调用API创建管理员
      await adminApi.createAdmin(submitData);

      success('管理员创建成功');
      form.resetFields();
      setSelectedRole(null);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      const errorMessage = error?.message || '创建失败';
      error(errorMessage);
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
      title="添加管理员"
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

        <Form.Item
          label="密码"
          name="pass"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 8, message: '密码至少8个字符' },
            { validator: validateStrongPassword },
          ]}
        >
          <Input.Password
            placeholder="请输入密码（至少8位，包含大写字母、小写字母、数字、特殊符号）"
            autoComplete="new-password"
          />
        </Form.Item>

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
              创建
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddAdminModal;
