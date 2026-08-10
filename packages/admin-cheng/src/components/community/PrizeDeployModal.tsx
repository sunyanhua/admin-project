import { useState } from 'react';
import { Button, Space, Form, InputNumber, Input } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { PrizeType } from '@shared/constants';
import { lotteryApi, Prize } from '@/api/services/lottery';
import ScrollableModal from '@/components/templates/ScrollableModal';

const { TextArea } = Input;

interface PrizeDeployModalProps {
  visible: boolean;
  prize: Prize | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PrizeDeployModal: React.FC<PrizeDeployModalProps> = ({ visible, prize, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const isVoucher = prize?.prize_type === PrizeType.VOUCHER;

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const payload: any = { total_count: values.total_count };
      if (isVoucher && values.voucher_codes) {
        payload.voucher_codes = values.voucher_codes
          .split('\n')
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      await lotteryApi.deployPrize(prize!.id, payload);
      success('投放任务已创建，后台处理中');
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
      title={`投放奖品 - ${prize?.name || ''}`}
      open={visible}
      onCancel={onClose}
      width={520}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>确认投放</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off"
        scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
      >
        <Form.Item label="投放数量" name="total_count"
          rules={[{ required: true, message: '请输入投放数量' }]}
          extra={`总库存 ${prize?.total_count ?? 0}，已抽中 ${prize?.used_count ?? 0}`}
        >
          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>

        {isVoucher && (
          <Form.Item label="券码列表" name="voucher_codes"
            rules={[{ required: true, message: '请输入券码' }]}
            extra="每行一个券码，数量需与投放数量一致"
          >
            <TextArea rows={8} placeholder="每行一个券码&#10;如：&#10;ABC123&#10;DEF456" />
          </Form.Item>
        )}
      </Form>
    </ScrollableModal>
  );
};

export default PrizeDeployModal;
