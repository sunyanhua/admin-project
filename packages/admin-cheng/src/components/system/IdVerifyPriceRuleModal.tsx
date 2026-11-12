import { useState, useEffect } from 'react';
import type { Dayjs } from 'dayjs';
import { Button, Form, Input, InputNumber, Radio, DatePicker } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { idverifyApi, PriceRule, PriceRuleStatus } from '@/api/services/idverify';
import { xpayApi, buildMpProductId, CoinProductStatus, CoinProductItem } from '@/api/services/xpay';
import { parseApiTime, dayjsToApi } from '@/utils/format';

export interface IdVerifyPriceRuleModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  rule: PriceRule | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface PriceRuleFormValues {
  name: string;
  /** 价格（元，两位小数；0 表示免费）——提交时 ×100 转金币（1 金币 = 1 分） */
  price_yuan: number;
  original_price_yuan?: number;
  start_at: Dayjs;
  end_at: Dayjs;
  status: number;
  remark?: string;
}

/** 结束时间必须晚于开始时间（表单规则校验函数，独立导出便于测试） */
export const endAfterStartRule = (getFieldValue: (name: string) => any) => ({
  validator(_: unknown, value: Dayjs) {
    const start = getFieldValue('start_at');
    if (!value || !start || value.valueOf() > start.valueOf()) return Promise.resolve();
    return Promise.reject(new Error('结束时间必须晚于开始时间'));
  },
});

/** 价格校验：0=免费，付费价格最低 1 元（独立导出便于测试） */
export const priceFloorRule = {
  validator(_: unknown, value: number | null | undefined) {
    if (value != null && value !== 0 && value < 1) {
      return Promise.reject(new Error('付费价格最低 1 元（0 表示免费）'));
    }
    return Promise.resolve();
  },
};

/** 新增/编辑实人认证价格规则弹窗（时间区间启用规则不可重叠，后端 42226 兜底） */
const IdVerifyPriceRuleModal: React.FC<IdVerifyPriceRuleModalProps> = ({
  visible, mode, rule, onClose, onSuccess,
}) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<PriceRuleFormValues>();

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && rule) {
      // 延迟回填：等弹窗 Form 挂载后再写入；关闭/切换时清除定时器，防止旧数据写回
      const timer = setTimeout(() => {
        form.setFieldsValue({
          name: rule.name || '',
          // 金币 → 元（1 金币 = 1 分）
          price_yuan: (rule.price_coins ?? 0) / 100,
          original_price_yuan: (rule.original_price_coins ?? 0) / 100,
          start_at: parseApiTime(rule.start_at),
          end_at: parseApiTime(rule.end_at),
          status: rule.status ?? PriceRuleStatus.ENABLED,
          remark: rule.remark || '',
        });
      }, 50);
      return () => clearTimeout(timer);
    }
    // 新增：重置表单并落默认值（状态默认启用）
    form.resetFields();
    form.setFieldsValue({ status: PriceRuleStatus.ENABLED, price_yuan: 0, original_price_yuan: 0 });
    return undefined;
  }, [visible, mode, rule, form]);

  const handleSubmit = async (values: PriceRuleFormValues) => {
    if (loading) return; // 防 Enter 重复提交
    setLoading(true);
    /** 充值档位是否已成功创建（第二步失败时提示部分成功，运营可感知孤儿档位） */
    let tierCreated = false;
    try {
      // 元 → 金币（1 金币 = 1 分，与红包档位等额口径一致）
      const priceCoins = Math.round((values.price_yuan ?? 0) * 100);
      const originalPriceCoins = Math.round((values.original_price_yuan ?? 0) * 100);
      // 价格不为 0：先创建等额虚拟支付充值档位（coin_amount = price_cents = 金币数，1 金币 = 1 分），
      // 拿到 ID 保存到价格规则；管理端列表不返回规则已有档位 ID，编辑保存同样新建（旧档位闲置）；免费不创建
      let rechargeProductId: string | undefined;
      if (priceCoins > 0) {
        const tier: CoinProductItem = await xpayApi.createCoinProduct({
          name: values.name.trim(),
          coin_amount: priceCoins,
          price_cents: priceCoins,
          mp_product_id: buildMpProductId('idv'),
          sort_order: 0,
          status: CoinProductStatus.ENABLED,
        });
        rechargeProductId = tier?.id;
        tierCreated = Boolean(rechargeProductId);
        if (!rechargeProductId) throw new Error('创建充值档位失败');
      }
      const payload = {
        name: values.name.trim(),
        price_coins: priceCoins,
        original_price_coins: originalPriceCoins,
        recharge_product_id: rechargeProductId,
        start_at: dayjsToApi(values.start_at) || '',
        end_at: dayjsToApi(values.end_at) || '',
        status: values.status,
        remark: (values.remark || '').trim(),
      };
      if (mode === 'edit' && rule) {
        await idverifyApi.updatePriceRule(rule.id, payload);
        success('规则已更新');
      } else {
        await idverifyApi.createPriceRule(payload);
        success('规则已创建');
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
      title={mode === 'edit' ? '编辑价格规则' : '新增价格规则'}
      open={visible}
      onCancel={onClose}
      width={520}
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
          label="规则名称"
          name="name"
          rules={[{ required: true, whitespace: true, message: '请输入规则名称' }]}
        >
          <Input placeholder="请输入规则名称" maxLength={50} />
        </Form.Item>

        <Form.Item
          label="价格（元，0 表示免费，付费最低 1 元）"
          name="price_yuan"
          rules={[
            { required: true, message: '请输入价格' },
            priceFloorRule,
          ]}
        >
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0 表示免费，付费最低 1 元" />
        </Form.Item>

        <Form.Item
          label="原价（元，0 表示无原价）"
          name="original_price_yuan"
        >
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0 表示无原价" />
        </Form.Item>

        <Form.Item
          label="生效开始时间"
          name="start_at"
          rules={[{ required: true, message: '请选择生效开始时间' }]}
        >
          <DatePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="生效结束时间"
          name="end_at"
          dependencies={['start_at']}
          rules={[
            { required: true, message: '请选择生效结束时间' },
            ({ getFieldValue }) => endAfterStartRule(getFieldValue),
          ]}
        >
          <DatePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="状态" name="status" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value={PriceRuleStatus.ENABLED}>启用</Radio>
            <Radio value={PriceRuleStatus.DISABLED}>停用</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={2} placeholder="选填，规则说明" maxLength={200} />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default IdVerifyPriceRuleModal;
