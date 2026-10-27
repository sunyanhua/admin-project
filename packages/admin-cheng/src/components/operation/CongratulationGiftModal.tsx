import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Switch, InputNumber, DatePicker } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { GiftStatus } from '@shared/constants';
import { congratulationApi, CongratulationGiftItem } from '@/api/services/congratulation';
import ImageUpload from '@/components/common/ImageUpload';
import ScrollableModal from '@/components/templates/ScrollableModal';

export interface CongratulationGiftModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  gift: CongratulationGiftItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 报喜礼物配置弹窗：名称/图片/金币价格（≥0，0=免费）/排序/状态/可购买窗口（可空=不限）。
 * 编辑走 PATCH 语义（仅提交出现字段）。
 */
const CongratulationGiftModal: React.FC<CongratulationGiftModalProps> = ({ visible, mode, gift, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && gift) {
      setStatusEnabled(gift.status === GiftStatus.ENABLED);
      const timer = setTimeout(() => {
        form.setFieldsValue({
          name: gift.name || '',
          image: gift.image || '',
          price_coins: gift.price_coins ?? 0,
          sort_order: gift.sort_order ?? 0,
          valid_from: gift.valid_from ? gift.valid_from : null,
          valid_to: gift.valid_to ? gift.valid_to : null,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
    setStatusEnabled(true);
    form.resetFields();
  }, [visible, mode, gift, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const fmt = (d: any) => (d ? d.format('YYYY-MM-DD HH:mm:ss') : undefined);
      const payload = {
        name: values.name,
        image: values.image || '',
        price_coins: values.price_coins ?? 0,
        sort_order: values.sort_order ?? 0,
        valid_from: fmt(values.valid_from),
        valid_to: fmt(values.valid_to),
      };
      if (mode === 'edit' && gift) {
        await congratulationApi.updateGift(gift.id, payload);
        if (gift.status !== (statusEnabled ? GiftStatus.ENABLED : GiftStatus.DISABLED)) {
          await congratulationApi.toggleGiftStatus(gift.id, statusEnabled ? GiftStatus.ENABLED : GiftStatus.DISABLED);
        }
        success('更新成功');
      } else {
        const created: any = await congratulationApi.createGift({ ...payload, status: statusEnabled ? GiftStatus.ENABLED : GiftStatus.DISABLED });
        if (!statusEnabled && !created?.id) {
          // 创建接口已带 status，无需补调
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
      title={mode === 'create' ? '添加报喜礼物' : '编辑报喜礼物'}
      open={visible}
      onCancel={onClose}
      width={560}
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
        initialValues={{ price_coins: 0, sort_order: 0 }}
      >
        <Form.Item
          label="礼物名称"
          name="name"
          rules={[{ required: true, message: '请输入礼物名称' }, { max: 64, message: '最多64个字符' }]}
        >
          <Input placeholder="如：玫瑰花束" maxLength={64} showCount />
        </Form.Item>

        <Form.Item
          label="礼物图片"
          name="image"
          rules={[{ required: true, message: '请上传礼物图片' }]}
        >
          <ImageUpload />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="金币价格" name="price_coins" extra="0 = 免费" rules={[{ required: true, message: '请输入金币价格' }]}>
            <InputNumber min={0} precision={0} style={{ width: '100%' }} suffix="金币" />
          </Form.Item>
          <Form.Item label="排序" name="sort_order" extra="数值越大排序越靠前">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="可购买开始时间" name="valid_from" extra="留空 = 不限">
            <DatePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} placeholder="不限" />
          </Form.Item>
          <Form.Item label="可购买结束时间" name="valid_to" extra="留空 = 不限">
            <DatePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} placeholder="不限" />
          </Form.Item>
        </div>

        <Form.Item label="状态">
          <Switch checked={statusEnabled} onChange={setStatusEnabled} checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default CongratulationGiftModal;
