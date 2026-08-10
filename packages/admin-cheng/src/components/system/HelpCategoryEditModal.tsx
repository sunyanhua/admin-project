import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Select, InputNumber } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { helpCategoryApi, HelpCategory, CreateHelpCategoryRequest } from '@/api/services/helps-v1';
import ScrollableModal from '@/components/templates/ScrollableModal';

export interface HelpCategoryEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  category: HelpCategory | null;
  /** 父级分类列表（创建时可选择所属父级） */
  parentOptions: { label: string; value: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

const HelpCategoryEditModal: React.FC<HelpCategoryEditModalProps> = ({
  visible, mode, category, parentOptions, onClose, onSuccess,
}) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && category) {
      setTimeout(() => {
        form.setFieldsValue({
          name: category.name || '',
          parent_id: category.parent_id || undefined,
          sort_order: category.sort_order ?? 0,
        });
      }, 50);
    } else {
      form.resetFields();
    }
  }, [visible, mode, category, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: CreateHelpCategoryRequest = {
        name: values.name,
        sort_order: values.sort_order ?? 0,
      };
      if (values.parent_id) payload.parent_id = values.parent_id;

      if (mode === 'edit' && category) {
        await helpCategoryApi.update(category.id, payload);
        success('更新成功');
      } else {
        await helpCategoryApi.create(payload);
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
      title={mode === 'create' ? '添加分类' : '编辑分类'}
      open={visible}
      onCancel={onClose}
      width={480}
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
        initialValues={{ sort_order: 0 }}
      >
        <Form.Item
          label="分类名称"
          name="name"
          rules={[{ required: true, message: '请输入分类名称' }, { max: 64, message: '最多64个字符' }]}
        >
          <Input placeholder="如：账号相关" maxLength={64} showCount />
        </Form.Item>

        {mode === 'create' && parentOptions.length > 0 && (
          <Form.Item label="所属父级" name="parent_id" extra="不选则创建为根分类">
            <Select placeholder="请选择父级分类（可选）" options={parentOptions} allowClear />
          </Form.Item>
        )}

        <Form.Item label="权重" name="sort_order" extra="数值越大排序越靠前">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default HelpCategoryEditModal;
