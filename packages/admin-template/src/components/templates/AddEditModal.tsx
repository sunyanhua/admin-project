import { useEffect } from 'react';
import { Modal, Form, Space, Button, Divider } from 'antd';
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
    if (entity && open) {
      form.setFieldsValue(entity);
    }
  }, [entity, open, form]);

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const modalTitle = isEditing ? `编辑${title}` : `添加${title}`;
  const defaultSubmitText = isEditing ? '保存' : '创建';

  return (
    <Modal
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
      >
        {children}
      </Form>
    </Modal>
  );
};
