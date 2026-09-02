import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Switch, DatePicker } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { PoolType } from '@shared/constants';
import { parseApiTime, dayjsToApi } from '@/utils/format';
import { lotteryApi, Pool, CreatePoolRequest } from '@/api/services/lottery';
import ScrollableModal from '@/components/templates/ScrollableModal';

export interface PoolEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  pool: Pool | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PoolEditModal: React.FC<PoolEditModalProps> = ({ visible, mode, pool, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && pool) {
      setStatusEnabled(pool.status === 0);
      // 延迟回填：等弹窗 Form 挂载后再写入；关闭/切换模式时清除定时器，防止旧数据写回
      const timer = setTimeout(() => {
        form.setFieldsValue({
          name: pool.name || '',
          pool_type: pool.pool_type ?? PoolType.ONCE,
          description: pool.description || '',
          icon: pool.icon || '',
          image: pool.image || '',
          time_range: pool.start_time && pool.end_time ? [parseApiTime(pool.start_time)!, parseApiTime(pool.end_time)!] : undefined,
        });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setStatusEnabled(true);
      form.resetFields();
    }
  }, [visible, mode, pool, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const [startTime, endTime] = values.time_range || [];
      const payload: CreatePoolRequest = {
        name: values.name,
        pool_type: PoolType.ONCE,
        description: mode === 'edit' ? (values.description || '') : undefined,
        icon: values.icon || '',
        image: values.image || '',
        start_time: dayjsToApi(startTime as any),
        end_time: dayjsToApi(endTime as any),
      };
      if (mode === 'edit' && pool) {
        await lotteryApi.updatePool(pool.id, payload);
        if (pool.status !== (statusEnabled ? 0 : 1)) {
          await lotteryApi.togglePoolStatus(pool.id, statusEnabled ? 0 : 1);
        }
        success('更新成功');
      } else {
        const created: any = await lotteryApi.createPool(payload);
        if (!statusEnabled && created?.id) {
          await lotteryApi.togglePoolStatus(created.id, 1);
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
      title={mode === 'create' ? '创建奖池' : '编辑奖池'}
      open={visible}
      onCancel={onClose}
      width={520}
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
      >
        <Form.Item label="奖池名称" name="name" rules={[{ required: true, message: '请输入奖池名称' }, { max: 64, message: '最多64个字符' }]}>
          <Input placeholder="如：春节抽奖活动" maxLength={64} showCount />
        </Form.Item>

        <Form.Item label="有效时间" name="time_range" rules={[{ required: true, message: '请选择有效时间' }]}>
          <DatePicker.RangePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="状态">
          <Switch checked={statusEnabled} onChange={setStatusEnabled} checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default PoolEditModal;
