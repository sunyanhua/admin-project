import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Switch, Select, InputNumber, DatePicker } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { ActivityV1Status, ActivityType, ActivityTypeLabels } from '@shared/constants';
import { activityApi, Activity, CreateActivityRequest } from '@/api/services/activity-v1';
import { zoneApi, Zone } from '@/api/services/zone';
import ImageUpload from '@/components/common/ImageUpload';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import FormConfigEditor from '@/components/operation/FormConfigEditor';
import ScrollableModal from '@/components/templates/ScrollableModal';
import dayjs, { Dayjs } from 'dayjs';

export interface ActivityEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  activity: Activity | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTIVITY_TYPE_OPTIONS = [
  { label: ActivityTypeLabels[ActivityType.TYPE_0], value: ActivityType.TYPE_0 },
  { label: ActivityTypeLabels[ActivityType.TYPE_1], value: ActivityType.TYPE_1 },
  { label: ActivityTypeLabels[ActivityType.TYPE_2], value: ActivityType.TYPE_2 },
];

const ActivityEditModal: React.FC<ActivityEditModalProps> = ({ visible, mode, activity, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [zoneOptions, setZoneOptions] = useState<{ label: string; value: string }[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    zoneApi.getList({ page: 1, size: 200 }).then((res: any) => {
      setZoneOptions((res?.list || []).map((z: Zone) => ({ label: z.name, value: z.id })));
    }).catch(() => setZoneOptions([]));
  }, []);

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && activity) {
        setStatusEnabled(activity.status === ActivityV1Status.ENABLED);
        setTimeout(() => {
          form.setFieldsValue({
            title: activity.title || '',
            cover: activity.cover || '',
            activity_type: activity.activity_type ?? ActivityType.TYPE_0,
            zone_id: (activity as any).zone_id || undefined,
            time_range: activity.start_time && activity.end_time
              ? [dayjs(activity.start_time), dayjs(activity.end_time)]
              : undefined,
            register_range: activity.register_start && activity.register_end
              ? [dayjs(activity.register_start), dayjs(activity.register_end)]
              : undefined,
            location: activity.location || '',
            fee: activity.fee ?? 0,
            slots: activity.slots ?? 0,
            description: activity.description || '',
            form_config: activity.form_config || '',
            require_match_profile: activity.require_match_profile ?? false,
            sort_order: activity.sort_order ?? 0,
          });
        }, 0);
      } else {
        setStatusEnabled(true);
        setTimeout(() => form.resetFields(), 0);
      }
    }
  }, [visible, mode, activity, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const [startTime, endTime] = values.time_range || [];
      const [registerStart, registerEnd] = values.register_range || [];

      const payload: CreateActivityRequest & { zone_id?: string } = {
        title: values.title,
        cover: values.cover || '',
        activity_type: values.activity_type ?? ActivityType.TYPE_0,
        description: values.description || '',
        start_time: startTime ? (startTime as Dayjs).toISOString() : '',
        end_time: endTime ? (endTime as Dayjs).toISOString() : '',
        register_start: registerStart ? (registerStart as Dayjs).toISOString() : '',
        register_end: registerEnd ? (registerEnd as Dayjs).toISOString() : '',
        location: values.location || '',
        fee: values.fee ?? 0,
        slots: values.slots ?? 0,
        form_config: values.form_config || '',
        require_match_profile: values.require_match_profile ?? false,
        sort_order: values.sort_order ?? 0,
        status: statusEnabled ? ActivityV1Status.ENABLED : ActivityV1Status.DISABLED,
      };

      // 预留 zone_id，后端就绪后生效
      if (values.zone_id) (payload as any).zone_id = values.zone_id;

      if (mode === 'edit' && activity) {
        await activityApi.update(activity.id, payload as any);
        success('更新成功');
      } else {
        await activityApi.create(payload);
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
      title={mode === 'create' ? '创建活动' : '编辑活动'}
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
        initialValues={{ activity_type: ActivityType.TYPE_0, fee: 0, slots: 0, sort_order: 0, require_match_profile: false }}
      >
        <Form.Item
          label="活动标题"
          name="title"
          rules={[{ required: true, message: '请输入活动标题' }, { max: 256, message: '最多256个字符' }]}
        >
          <Input placeholder="请输入活动标题" maxLength={256} showCount />
        </Form.Item>

        <Form.Item label="活动封面" name="cover">
          <ImageUpload />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="活动类型" name="activity_type">
            <Select options={ACTIVITY_TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item label="所属专区" name="zone_id" extra="预留字段，后端就绪后生效">
            <Select placeholder="请选择专区" options={zoneOptions} allowClear />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item
            label="活动时间"
            name="time_range"
            rules={[{ required: true, message: '请选择活动时间' }]}
          >
            <DatePicker.RangePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="报名时间"
            name="register_range"
            rules={[{ required: true, message: '请选择报名时间' }]}
          >
            <DatePicker.RangePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="活动地点" name="location">
            <Input placeholder="请输入活动地点" maxLength={512} />
          </Form.Item>

          <Form.Item label="费用（分）" name="fee">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>

          <Form.Item
            label="名额上限"
            name="slots"
            rules={[{ required: true, message: '请输入名额上限' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="请输入名额上限" />
          </Form.Item>
        </div>

        <Form.Item label="活动介绍" name="description">
          <RichTextEditor placeholder="请输入活动介绍" showImageUpload={false} />
        </Form.Item>

        <Form.Item
          label="报名表单配置"
          name="form_config"
          extra="配置用户报名时需要填写的字段"
        >
          <FormConfigEditor />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
          <Form.Item label="报名要求" name="require_match_profile" valuePropName="checked">
            <Switch checkedChildren="需脱单资料" unCheckedChildren="无要求" />
          </Form.Item>

          <Form.Item label="排序" name="sort_order" extra="数值越大越靠前">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="状态">
            <Switch
              checked={statusEnabled}
              onChange={setStatusEnabled}
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
          </Form.Item>
        </div>
      </Form>
    </ScrollableModal>
  );
};

export default ActivityEditModal;
