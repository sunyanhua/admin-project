import { useEffect } from 'react';
import { Form, Space, Button, Divider } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { ReactNode } from 'react';
import type { FormInstance } from 'antd';

export interface AddEditModalProps {
  title: string;
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  submitting?: boolean;
  entity?: any | null;
  form: FormInstance;
  children: ReactNode;
  submitText?: string;
  width?: number;
  footer?: ReactNode;
}

export const AddEditModal: React.FC<AddEditModalProps> = ({
  title,
  open,
  onCancel,
  onSubmit,
  submitting = false,
  entity,
  form,
  children,
  submitText,
  width = 600,
  footer,
}) => {
  const isEditing = !!entity;

  useEffect(() => {
    if (!open) {
      // 关闭时清空表单，防止下次打开残留上次内容
      form.resetFields();
      return;
    }
    if (entity) {
      form.setFieldsValue(entity);
    } else {
      // 创建模式打开时强制重置，防止残留上次编辑的内容
      form.resetFields();
    }
  }, [entity, open, form]);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const modalTitle = isEditing ? `编辑${title}` : `添加${title}`;
  const defaultSubmitText = isEditing ? '保存' : '创建';

  return (
    <ScrollableModal
      title={modalTitle}
      open={open}
      onCancel={handleCancel}
      footer={footer ?? (
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" loading={submitting} onClick={() => {
            form.validateFields().then((values) => {
              onSubmit(values);
            }).catch(() => {
              // Validation failed, form will show errors
            });
          }}>
            {submitText ?? defaultSubmitText}
          </Button>
        </Space>
      )}
      width={width}
      destroyOnHidden
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        autoComplete="off"
        scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
      >
        {children}
      </Form>
    </ScrollableModal>
  );
};
