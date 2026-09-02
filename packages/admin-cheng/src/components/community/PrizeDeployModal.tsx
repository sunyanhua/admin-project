import { useState, useEffect } from 'react';
import { Button, Space, Form, InputNumber, Input, DatePicker } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { PrizeType } from '@shared/constants';
import { lotteryApi, Prize } from '@/api/services/lottery';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { parseApiTime, dayjsToApi } from '@/utils/format';

const { TextArea } = Input;

interface PrizeDeployModalProps {
  visible: boolean;
  prize: Prize | null;
  poolStartTime?: string;
  poolEndTime?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PrizeDeployModal: React.FC<PrizeDeployModalProps> = ({ visible, prize, poolStartTime, poolEndTime, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const isVoucher = prize?.prize_type === PrizeType.VOUCHER;
  const poolStart = parseApiTime(poolStartTime);
  const poolEnd = parseApiTime(poolEndTime);
  const [voucherCount, setVoucherCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    // 打开时先清空表单，防止上次投放的数量/券码残留
    form.resetFields();
    setVoucherCount(0);
    if (poolStart && poolEnd) {
      // 延迟回填：等弹窗 Form 挂载后再写入；关闭时清除定时器，防止旧数据写回
      const timer = setTimeout(() => {
        form.setFieldsValue({ time_range: [poolStart, poolEnd] });
      }, 50);
      return () => clearTimeout(timer);
    }
    // 依赖原始字符串而非每次渲染新建的 Dayjs 实例，避免父组件重渲染时清掉已填内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, poolStartTime, poolEndTime, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const [start, end] = values.time_range || [];
      const codes: string[] = isVoucher && values.voucher_codes
        ? values.voucher_codes.split('\n').map((s: string) => s.trim()).filter(Boolean)
        : [];
      const payload: any = {
        total_count: isVoucher ? codes.length : values.total_count,
        voucher_codes: isVoucher ? codes : [],
      };
      if (start) payload.start_time = dayjsToApi(start as any);
      if (end) payload.end_time = dayjsToApi(end as any);
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
        {!isVoucher && (
          <Form.Item label="投放数量" name="total_count"
            rules={[{ required: true, message: '请输入投放数量' }]}
            extra={`总库存 ${prize?.total_count ?? 0}，已抽中 ${prize?.used_count ?? 0}`}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        )}

        {poolStart && poolEnd && (
          <Form.Item label="有效时间" name="time_range" required
            rules={[{ required: true, message: '请选择有效时间' }]}
            extra={`奖池时间范围：${poolStart.format('YYYY/MM/DD HH:mm')} ~ ${poolEnd.format('YYYY/MM/DD HH:mm')}`}
          >
            <DatePicker.RangePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }}
              disabledDate={(d) => d.isBefore(poolStart, 'day') || d.isAfter(poolEnd, 'day')}
            />
          </Form.Item>
        )}

        {isVoucher && (
          <Form.Item label="券码列表" name="voucher_codes"
            rules={[{ required: true, message: '请输入券码' }]}
            extra={`每行一个券码，当前已添加数量：${voucherCount}`}
          >
            <TextArea rows={8} placeholder={"每行一个券码\n如：\nABC123\nDEF456"}
              onChange={(e) => {
                const lines = e.target.value.split('\n').filter(s => s.trim());
                setVoucherCount(lines.length);
              }}
            />
          </Form.Item>
        )}
      </Form>
    </ScrollableModal>
  );
};

export default PrizeDeployModal;
