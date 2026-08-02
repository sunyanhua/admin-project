import { useState, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Form, Input, InputNumber, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { logisticsApi, LogisticsCompany } from '@/api/services/logistics';

export interface LogisticsEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  company: LogisticsCompany | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const LogisticsEditModal: React.FC<LogisticsEditModalProps> = ({ visible, mode, company, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();
  const isCreate = mode === 'create';

  useEffect(() => {
    if (visible) {
      if (company && !isCreate) {
        form.setFieldsValue({
          code: company.code || '',
          name: company.name || '',
          website: company.website || '',
          sort_order: company.sort_order ?? 0,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, company, isCreate, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      if (isCreate) {
        await logisticsApi.createCompany({
          code: values.code,
          name: values.name,
          website: values.website || undefined,
          sort_order: values.sort_order ?? 0,
        });
        success('物流公司创建成功');
      } else {
        if (!company) return;
        await logisticsApi.updateCompany(company.id, {
          name: values.name,
          website: values.website || undefined,
          sort_order: values.sort_order ?? 0,
        });
        success('物流公司更新成功');
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
      title={isCreate ? '添加物流公司' : '编辑物流公司'}
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
        <Form.Item
          label="物流标识"
          name="code"
          extra={isCreate ? "唯一标识，如 sf_express" : "创建后不可修改"}
          rules={[
            { required: true, message: '请输入物流标识' },
            { max: 32, message: '最多32个字符' },
          ]}
        >
          <Input placeholder="如 sf_express" disabled={!isCreate} />
        </Form.Item>

        <Form.Item
          label="物流名称"
          name="name"
          rules={[
            { required: true, message: '请输入物流名称' },
            { max: 64, message: '最多64个字符' },
          ]}
        >
          <Input placeholder="如 顺丰速运" />
        </Form.Item>

        <Form.Item
          label="官网地址"
          name="website"
          rules={[{ type: 'url', message: '请输入有效的 URL' }, { max: 256, message: '最多256个字符' }]}
        >
          <Input placeholder="如 https://www.sf-express.com" />
        </Form.Item>

        <Form.Item
          label="排序"
          name="sort_order"
          extra="数值越小越靠前"
        >
          <InputNumber min={0} precision={0} style={{ width: 120 }} />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default LogisticsEditModal;
