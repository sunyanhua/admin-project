import { useState, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Form, Input, Switch, InputNumber, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { categoryApi } from '../../api/services/category';

interface MallCategory {
  id: number;
  name: string;
  is_listed?: boolean;
  is_visible?: boolean;
  sort_order?: number;
}

export interface EventCategoryEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  category: MallCategory | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const EventCategoryEditModal: React.FC<EventCategoryEditModalProps> = ({
  visible, mode, category, onClose, onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();
  const isCreate = mode === 'create';

  useEffect(() => {
    if (visible) {
      if (category && !isCreate) {
        form.setFieldsValue({
          name: category.name || '',
          is_listed: category.is_listed !== false,
          is_visible: category.is_visible !== false,
          sort_order: category.sort_order ?? 0,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ is_listed: true, is_visible: true });
      }
    }
  }, [visible, category, isCreate, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      if (isCreate) {
        await categoryApi.createMallCategory({ name: values.name, parent_id: 1 });
        success('分类创建成功');
      } else {
        if (!category) return;
        await categoryApi.updateMallCategory(category.id, {
          name: values.name,
          is_listed: values.is_listed,
          is_visible: values.is_visible,
          sort_order: values.sort_order ?? 0,
        });
        success('分类更新成功');
      }
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
    <ScrollableModal title={isCreate ? '添加分类' : '编辑分类'} open={visible} onCancel={() => { form.resetFields(); onClose(); }}
      footer={
        <Space>
          <Button onClick={() => { form.resetFields(); onClose(); }}>取消</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {isCreate ? '创建' : '保存'}
          </Button>
        </Space>
      }>
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
        <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }, { max: 64, message: '最多64个字符' }]}>
          <Input placeholder="请输入分类名称" />
        </Form.Item>
        {!isCreate && (
          <>
            <Form.Item label="上架/下架" name="is_listed" valuePropName="checked">
              <Switch checkedChildren="上架" unCheckedChildren="下架" />
            </Form.Item>
            <Form.Item label="显示/隐藏" name="is_visible" valuePropName="checked">
              <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
            </Form.Item>
            <Form.Item label="权重" name="sort_order" rules={[{ required: true, message: '请输入权重' }, { type: 'integer', message: '请输入整数' }]} extra="权重越大排序越靠前，默认为0">
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </>
        )}
      </Form>
    </ScrollableModal>
  );
};

export default EventCategoryEditModal;
