import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Switch, InputNumber } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { GiftStatus } from '@shared/constants';
import { giftApi, Gift, CreateGiftRequest } from '@/api/services/gift';
import ImageUpload from '@/components/common/ImageUpload';
import ScrollableModal from '@/components/templates/ScrollableModal';

export interface GiftEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  gift: Gift | null;
  onClose: () => void;
  onSuccess: () => void;
}

const GiftEditModal: React.FC<GiftEditModalProps> = ({ visible, mode, gift, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && gift) {
      setStatusEnabled((gift as any).status === GiftStatus.ENABLED);
      setTimeout(() => {
        form.setFieldsValue({
          name: gift.name || '',
          icon: gift.icon || '',
          popularity: gift.popularity ?? 1,
          price_coins: gift.price_coins ?? 0,
          free_quota: gift.free_quota ?? 0,
          sort_order: gift.sort_order ?? 0,
        });
      }, 50);
    } else {
      setStatusEnabled(true);
      form.resetFields();
    }
  }, [visible, mode, gift, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: CreateGiftRequest = {
        name: values.name,
        icon: values.icon || '',
        gift_type: 1,
        popularity: values.popularity ?? 1,
        price_coins: values.price_coins ?? 0,
        price_cashs: 0,
        free_quota: values.free_quota ?? 0,
        sort_order: values.sort_order ?? 0,
      };

      if (mode === 'edit' && gift) {
        await giftApi.update(gift.id, payload);
        if ((gift as any).status !== (statusEnabled ? GiftStatus.ENABLED : GiftStatus.DISABLED)) {
          await giftApi.toggleStatus(gift.id, statusEnabled ? GiftStatus.ENABLED : GiftStatus.DISABLED);
        }
        success('更新成功');
      } else {
        const created: any = await giftApi.create(payload);
        if (!statusEnabled && created?.id) {
          await giftApi.toggleStatus(created.id, GiftStatus.DISABLED);
        }
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
      title={mode === 'create' ? '创建礼物' : '编辑礼物'}
      open={visible}
      onCancel={onClose}
      width={600}
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
        initialValues={{ popularity: 1, sort_order: 0 }}
      >
        <Form.Item
          label="礼物名称"
          name="name"
          rules={[{ required: true, message: '请输入礼物名称' }, { max: 64, message: '最多64个字符' }]}
        >
          <Input placeholder="如：玫瑰花束" maxLength={64} showCount />
        </Form.Item>

        <Form.Item
          label="礼物图标"
          name="icon"
          rules={[{ required: true, message: '请上传礼物图标' }]}
        >
          <ImageUpload />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
          <Form.Item
            label="人气值"
            name="popularity"
            rules={[{ required: true, message: '请输入人气值' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="金币价格"
            name="price_coins"
            rules={[{ required: true, message: '请输入金币价格' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} suffix="金币" />
          </Form.Item>

          <Form.Item
            label="免费额度"
            name="free_quota"
            rules={[{ required: true, message: '请输入免费额度' }]}
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </div>

        <Form.Item label="权重" name="sort_order" extra="数值越大排序越靠前">
          <InputNumber min={0} precision={0} style={{ width: 200 }} />
        </Form.Item>

        <Form.Item label="状态">
          <Switch
            checked={statusEnabled}
            onChange={setStatusEnabled}
            checkedChildren="启用"
            unCheckedChildren="禁用"
          />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default GiftEditModal;
