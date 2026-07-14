import { useState, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Form, Input, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { categoryApi } from '../../api/services/category';

interface MallCategory {
  id: number;
  name: string;
}

export interface CategoryEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  category: MallCategory | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({
  visible, mode, category, onClose, onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();
  const isCreate = mode === 'create';

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(category && !isCreate ? { name: category.name || '' } : {});
    }
  }, [visible, category, isCreate, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      if (isCreate) {
        await categoryApi.createMallCategory({ name: values.name });
      } else if (category) {
        await categoryApi.updateMallCategory(category.id, { name: values.name });
      }
      success(isCreate ? '分类创建成功' : '分类更新成功');
      form.resetFields();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || (isCreate ? '创建失败' : '更新失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollableModal title={isCreate ? '添加分类' : '编辑分类'} open={visible}
      onCancel={() => { form.resetFields(); onClose(); }} width={520} destroyOnHidden
      footer={
        <Space>
          <Button onClick={() => { form.resetFields(); onClose(); }}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading}
            onClick={() => form.submit()}>{isCreate ? '创建' : '保存'}</Button>
        </Space>
      }>
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }, { max: 64, message: '最多64个字符' }]}>
          <Input placeholder="请输入分类名称" />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default CategoryEditModal;
