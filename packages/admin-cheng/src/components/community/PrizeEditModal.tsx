import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Switch, Select, InputNumber } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { PrizeType, PrizeTypeLabels } from '@shared/constants';
import { lotteryApi, Prize, CreatePrizeRequest } from '@/api/services/lottery';
import CropperImageUpload from '@/components/common/CropperImageUpload';
import ScrollableModal from '@/components/templates/ScrollableModal';

const { TextArea } = Input;

export interface PrizeEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  poolId: string;
  prize: Prize | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PRIZE_TYPE_OPTIONS = [
  { label: PrizeTypeLabels[PrizeType.PHYSICAL], value: PrizeType.PHYSICAL },
  { label: PrizeTypeLabels[PrizeType.VOUCHER], value: PrizeType.VOUCHER },
  { label: PrizeTypeLabels[PrizeType.COINS], value: PrizeType.COINS },
];

const PrizeEditModal: React.FC<PrizeEditModalProps> = ({ visible, mode, poolId, prize, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [prizeType, setPrizeType] = useState<number>(PrizeType.PHYSICAL);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && prize) {
      const pt = prize.prize_type ?? PrizeType.PHYSICAL;
      setStatusEnabled(prize.status === 0);
      setPrizeType(pt);
      setTimeout(() => {
        form.setFieldsValue({
          name: prize.name || '',
          icon: prize.icon || '',
          prize_type: pt,
          amount: prize.amount ? (prize.amount / 100).toFixed(2) : undefined,
          description: prize.description || '',
        });
      }, 50);
    } else {
      setStatusEnabled(true);
      setPrizeType(PrizeType.PHYSICAL);
      form.resetFields();
    }
  }, [visible, mode, prize, form]);

  const isRedPacket = prizeType === PrizeType.COINS;
  const isVoucher = prizeType === PrizeType.VOUCHER;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const payload: CreatePrizeRequest = {
        name: values.name,
        prize_type: prizeType,
        amount: isRedPacket ? Math.round((values.amount || 0) * 100) : 0,
        description: isVoucher ? (values.description || '') : '',
        icon: values.icon || '',
        image: '',
      };
      if (mode === 'edit' && prize) {
        await lotteryApi.updatePrize(prize.id, payload);
        if (prize.status !== (statusEnabled ? 0 : 1)) {
          await lotteryApi.togglePrizeStatus(prize.id, statusEnabled ? 0 : 1);
        }
        success('更新成功');
      } else {
        const created: any = await lotteryApi.createPrize(poolId, payload);
        if (!statusEnabled && created?.id) {
          await lotteryApi.togglePrizeStatus(created.id, 1);
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
      title={mode === 'create' ? '创建奖品' : '编辑奖品'}
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
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off"
        scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
        initialValues={{ prize_type: PrizeType.COINS }}
      >
        <Form.Item label="奖品名称" name="name" rules={[{ required: true, message: '请输入奖品名称' }, { max: 64, message: '最多64个字符' }]}>
          <Input placeholder="如：iPhone 16" maxLength={64} showCount />
        </Form.Item>

        <Form.Item label="奖品图标" name="icon" extra="建议尺寸：200 × 200 像素"
          rules={[{ required: true, message: '请上传奖品图标' }]}
        >
          <CropperImageUpload aspect={1} sizeHint="建议尺寸：200 × 200 像素" />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="奖品类型" name="prize_type" rules={[{ required: true }]}>
            <Select options={PRIZE_TYPE_OPTIONS} onChange={(v) => setPrizeType(v)} />
          </Form.Item>

          {isRedPacket && (
            <Form.Item label="金额（元）" name="amount"
              rules={[{ required: true, message: '请输入金额' }]}
            >
              <InputNumber min={0.01} precision={2} style={{ width: '100%' }} prefix="¥" />
            </Form.Item>
          )}
        </div>

        {isVoucher && (
          <Form.Item label="券码说明" name="description"
            rules={[{ required: true, message: '请输入券码说明' }]}
          >
            <TextArea placeholder="请输入券码使用说明" rows={3} maxLength={512} showCount />
          </Form.Item>
        )}

        <Form.Item label="状态">
          <Switch checked={statusEnabled} onChange={setStatusEnabled} checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default PrizeEditModal;
