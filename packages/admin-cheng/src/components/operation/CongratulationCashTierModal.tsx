import { useState, useEffect } from 'react';
import { Button, Form, Input, InputNumber, Radio } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { congratulationApi, AdminCashTierItem } from '@/api/services/congratulation';
import { xpayApi, buildMpProductId, CoinProductStatus, CoinProductItem } from '@/api/services/xpay';
import { GiftStatus } from '@shared/constants';

export interface CongratulationCashTierModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  tier: AdminCashTierItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface CashTierFormValues {
  name: string;
  /** 金额（元，1.00~5.20，两位小数） */
  amount_yuan: number;
  sort_order?: number;
  status: number;
}

/** 红包金额范围：100~520 分（1.00~5.20 元） */
const MIN_CENTS = 100;
const MAX_CENTS = 520;

/** 新增/编辑现金红包档位弹窗（创建/金额变化时先创建等额充值档位，拿到 ID 再保存） */
const CongratulationCashTierModal: React.FC<CongratulationCashTierModalProps> = ({
  visible, mode, tier, onClose, onSuccess,
}) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<CashTierFormValues>();

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && tier) {
      const timer = setTimeout(() => {
        form.setFieldsValue({
          name: tier.name || '',
          amount_yuan: tier.amount_cents / 100,
          sort_order: tier.sort_order ?? 0,
          status: tier.status ?? GiftStatus.ENABLED,
        });
      }, 50);
      return () => clearTimeout(timer);
    }
    form.resetFields();
    form.setFieldsValue({ status: GiftStatus.ENABLED, sort_order: 0 });
    return undefined;
  }, [visible, mode, tier, form]);

  const handleSubmit = async (values: CashTierFormValues) => {
    if (loading) return; // 防 Enter 重复提交
    if (mode === 'edit' && !tier) {
      showError('编辑数据缺失，请关闭弹窗后重试');
      return;
    }
    setLoading(true);
    /** 充值档位是否已成功创建（第二步失败时提示部分成功，运营可感知孤儿档位） */
    let tierCreated = false;
    try {
      const name = values.name.trim();
      // 金额：元 → 分（表单校验已限制 1.00~5.20，两位小数）；代币数与金额等额（实报实销）
      const amountCents = Math.round((values.amount_yuan ?? 0) * 100);
      // 编辑且金额未变化：复用列表返回的旧充值档位 ID；金额变化或新增：先创建等额充值档位
      let rechargeProductId = mode === 'edit' && tier && amountCents === tier.amount_cents
        ? tier.recharge_product_id
        : '';
      if (!rechargeProductId) {
        const product: CoinProductItem = await xpayApi.createCoinProduct({
          name,
          coin_amount: amountCents,
          price_cents: amountCents,
          mp_product_id: buildMpProductId('cash'),
          sort_order: values.sort_order ?? 0,
          status: CoinProductStatus.ENABLED,
        });
        rechargeProductId = product?.id || '';
        tierCreated = Boolean(rechargeProductId);
        if (!rechargeProductId) throw new Error('创建充值档位失败');
      }
      const payload = {
        name,
        amount_cents: amountCents,
        coin_amount: amountCents,
        recharge_product_id: rechargeProductId,
        sort_order: values.sort_order ?? 0,
        status: values.status,
      };
      if (mode === 'edit' && tier) {
        await congratulationApi.updateCashTier(tier.id, payload);
        success('红包档位已更新');
      } else {
        await congratulationApi.createCashTier(payload);
        success('红包档位已创建');
      }
      onClose();
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '保存失败';
      showError(tierCreated ? `充值档位已创建，但保存失败：${msg}` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollableModal
      title={mode === 'edit' ? '编辑红包档位' : '新增红包档位'}
      open={visible}
      onCancel={onClose}
      width={480}
      destroyOnHidden
      footer={
        <Button type="primary" loading={loading} onClick={() => form.submit()}>
          保存
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="档位名称"
          name="name"
          rules={[{ required: true, whitespace: true, message: '请输入档位名称' }]}
        >
          <Input placeholder="请输入档位名称" maxLength={64} />
        </Form.Item>

        <Form.Item
          label={`红包金额（元，${(MIN_CENTS / 100).toFixed(2)}~${(MAX_CENTS / 100).toFixed(2)}）`}
          name="amount_yuan"
          rules={[
            { required: true, message: '请输入红包金额' },
            {
              validator: (_, v: number) => {
                if (v == null || Number.isNaN(v)) return Promise.reject(new Error('请输入红包金额'));
                const cents = Math.round(v * 100);
                if (cents < MIN_CENTS || cents > MAX_CENTS) {
                  return Promise.reject(new Error(`红包金额须在 ${(MIN_CENTS / 100).toFixed(2)}~${(MAX_CENTS / 100).toFixed(2)} 元之间`));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            min={MIN_CENTS / 100}
            max={MAX_CENTS / 100}
            precision={2}
            style={{ width: '100%' }}
            placeholder={`${(MIN_CENTS / 100).toFixed(2)}~${(MAX_CENTS / 100).toFixed(2)}`}
          />
        </Form.Item>

        <Form.Item label="排序" name="sort_order">
          <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="数字越小越靠前" />
        </Form.Item>

        <Form.Item label="状态" name="status" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value={GiftStatus.ENABLED}>启用</Radio>
            <Radio value={GiftStatus.DISABLED}>停用</Radio>
          </Radio.Group>
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default CongratulationCashTierModal;
