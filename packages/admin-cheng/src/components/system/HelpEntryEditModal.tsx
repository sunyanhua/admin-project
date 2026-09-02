import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Select, InputNumber } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { helpEntryApi, HelpEntry, CreateHelpEntryRequest } from '@/api/services/helps-v1';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import ScrollableModal from '@/components/templates/ScrollableModal';

export interface HelpEntryEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  entry: HelpEntry | null;
  categoryOptions: { label: string; value: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

const HelpEntryEditModal: React.FC<HelpEntryEditModalProps> = ({
  visible, mode, entry, categoryOptions, onClose, onSuccess,
}) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && entry) {
      // 延迟回填：等弹窗 Form 挂载后再写入；关闭/切换模式时清除定时器，防止旧数据写回
      const timer = setTimeout(() => {
        form.setFieldsValue({
          question: entry.question || '',
          answer: entry.answer || '',
          category_id: entry.category_id || undefined,
          sort_order: entry.sort_order ?? 0,
        });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      form.resetFields();
    }
  }, [visible, mode, entry, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: CreateHelpEntryRequest = {
        question: values.question,
        answer: values.answer || '',
        sort_order: values.sort_order ?? 0,
      };
      if (values.category_id) payload.category_id = values.category_id;

      if (mode === 'edit' && entry) {
        await helpEntryApi.update(entry.id, payload);
        success('更新成功');
      } else {
        await helpEntryApi.create(payload);
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
      title={mode === 'create' ? '添加条目' : '编辑条目'}
      open={visible}
      onCancel={onClose}
      width={800}
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
          label="问题标题"
          name="question"
          rules={[{ required: true, message: '请输入问题标题' }, { max: 256, message: '最多256个字符' }]}
        >
          <Input placeholder="如：如何找回密码？" maxLength={256} showCount />
        </Form.Item>

        <Form.Item
          label="所属分类"
          name="category_id"
          rules={[{ required: true, message: '请选择所属分类' }]}
        >
          <Select placeholder="请选择分类" options={categoryOptions} showSearch
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
          />
        </Form.Item>

        <Form.Item
          label="答案内容"
          name="answer"
          rules={[{ required: true, message: '请输入答案内容' }]}
        >
          <RichTextEditor placeholder="请输入答案内容" showImageUpload />
        </Form.Item>

        <Form.Item label="权重" name="sort_order" extra="数值越大排序越靠前">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default HelpEntryEditModal;
