import { useState, useEffect, useMemo } from 'react';
import { Button, Space, Form, Input, Switch, Select, InputNumber, DatePicker } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { ActivityV1Status, ActivityType, ActivityTypeLabels } from '@shared/constants';
import { activityApi, Activity, CreateActivityRequest } from '@/api/services/activity-v1';
import { zoneApi, Zone } from '@/api/services/zone';
import CropperImageUpload from '@/components/common/CropperImageUpload';
import MultiImageUpload from '@/components/common/MultiImageUpload';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import FormConfigEditor from '@/components/operation/FormConfigEditor';
import ScrollableModal from '@/components/templates/ScrollableModal';
import dayjs, { Dayjs } from 'dayjs';
import { dayjsToApi, safeDayjs } from '@/utils/format';

export interface ActivityEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  activity: Activity | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTIVITY_TYPE_OPTIONS = [
  { label: ActivityTypeLabels[ActivityType.FREE_FCFS], value: ActivityType.FREE_FCFS },
  { label: ActivityTypeLabels[ActivityType.PAID_FCFS], value: ActivityType.PAID_FCFS },
  { label: ActivityTypeLabels[ActivityType.FREE_REVIEW], value: ActivityType.FREE_REVIEW },
];

const ActivityEditModal: React.FC<ActivityEditModalProps> = ({ visible, mode, activity, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [activityType, setActivityType] = useState<number>(ActivityType.FREE_FCFS);
  const [genderEnabled, setGenderEnabled] = useState(false);
  const [zoneOptions, setZoneOptions] = useState<{ label: string; value: string }[]>([]);
  const [form] = Form.useForm();

  const needsSlots = activityType === ActivityType.FREE_FCFS || activityType === ActivityType.PAID_FCFS;

  const initValues = useMemo(() => {
    if (!activity) return { activity_type: ActivityType.FREE_FCFS, sort_order: 0, gender_enabled: false, zone_id: '' };
    const type = activity.activity_type ?? ActivityType.FREE_FCFS;
    let locName = '';
    let locCoord = '';
    try { const loc = JSON.parse(activity.location || '{}'); locName = loc.name || ''; locCoord = loc.coordinate || ''; } catch { locName = activity.location || ''; }
    let imageUrls: string[] = [];
    try { const img = JSON.parse(activity.image || '[]'); imageUrls = Array.isArray(img) ? img : []; } catch { /* ignore */ }
    return {
      title: activity.title || '',
      cover: activity.cover || '',
      zone_id: activity.zone_id || '',
      gender_enabled: activity.gender_enabled ?? false,
      image: imageUrls,
      time_range: activity.start_time && activity.end_time ? [safeDayjs(activity.start_time), safeDayjs(activity.end_time)] : undefined,
      register_range: activity.register_start && activity.register_end ? [safeDayjs(activity.register_start), dayjs(activity.register_end)] : undefined,
      location_name: locName,
      location_coordinate: locCoord || '',
      activity_type: type,
      fee: (activity.fee ?? 0) / 100,
      slots: activity.slots ?? undefined,
      male_slots: activity.male_slots ?? undefined,
      female_slots: activity.female_slots ?? undefined,
      description: activity.description || '',
      form_config: activity.form_config || '',
      sort_order: activity.sort_order ?? 0,
    };
  }, [activity]);

  useEffect(() => {
    zoneApi.getList({ page: 1, size: 100 }).then((res: any) => {
      const list = Array.isArray(res) ? res : (res?.list || []);
      setZoneOptions(list.map((z: Zone) => ({ label: z.name, value: z.id })));
    }).catch(() => setZoneOptions([]));
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && activity) {
      const type = activity.activity_type ?? ActivityType.FREE_FCFS;
      setActivityType(type);
      setStatusEnabled(activity.status === ActivityV1Status.ENABLED);
      setHidden(activity.hidden ?? false);
      setGenderEnabled(activity.gender_enabled ?? false);

      let locName = '';
      let locCoord = '';
      try { const loc = JSON.parse(activity.location || '{}'); locName = loc.name || ''; locCoord = loc.coordinate || ''; } catch { locName = activity.location || ''; }

      let imageUrls: string[] = [];
      try { const img = JSON.parse(activity.image || '[]'); imageUrls = Array.isArray(img) ? img : []; } catch { /* ignore */ }

      setTimeout(() => {
        form.setFieldsValue({
          title: activity.title || '',
          cover: activity.cover || '',
          zone_id: activity.zone_id || '',
          gender_enabled: activity.gender_enabled ?? false,
          image: imageUrls,
          time_range: activity.start_time && activity.end_time ? [safeDayjs(activity.start_time), safeDayjs(activity.end_time)] : undefined,
          register_range: activity.register_start && activity.register_end ? [safeDayjs(activity.register_start), dayjs(activity.register_end)] : undefined,
          location_name: locName,
          location_coordinate: locCoord || '',
          activity_type: type,
          fee: (activity.fee ?? 0) / 100,
          slots: activity.slots ?? undefined,
          male_slots: activity.male_slots ?? undefined,
          female_slots: activity.female_slots ?? undefined,
          description: activity.description || '',
          form_config: activity.form_config || '',
          sort_order: activity.sort_order ?? 0,
        });
      }, 50);
    } else {
      form.resetFields();
      setActivityType(ActivityType.FREE_FCFS);
      setStatusEnabled(true);
      setHidden(false);
      setGenderEnabled(false);
    }
  }, [visible, mode, activity, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const [startTime, endTime] = values.time_range || [];
      const [registerStart, registerEnd] = values.register_range || [];

      const location = JSON.stringify({
        name: values.location_name || '',
        coordinate: values.location_coordinate || '',
      });

      const image = JSON.stringify(values.image || []);

      const payload: CreateActivityRequest = {
        title: values.title,
        cover: values.cover || '',
        image,
        activity_type: activityType,
        description: values.description || '',
        start_time: dayjsToApi(startTime as Dayjs) || '',
        end_time: dayjsToApi(endTime as Dayjs) || '',
        register_start: dayjsToApi(registerStart as Dayjs) || '',
        register_end: dayjsToApi(registerEnd as Dayjs) || '',
        location,
        form_config: values.form_config || '',
        require_match_profile: true,
        sort_order: values.sort_order ?? 0,
        status: statusEnabled ? ActivityV1Status.ENABLED : ActivityV1Status.DISABLED,
      };

      // 所属专区：选择"无专区"时 zone_id 为空字符串，明确传空给后端
      payload.zone_id = values.zone_id ?? '';
      if (values.gender_enabled != null) payload.gender_enabled = values.gender_enabled;

      if (needsSlots) {
        if (genderEnabled) {
          if (values.male_slots != null) payload.male_slots = values.male_slots;
          if (values.female_slots != null) payload.female_slots = values.female_slots;
        } else {
          if (values.slots != null) payload.slots = values.slots;
        }
      }

      if (activityType === ActivityType.PAID_FCFS && values.fee != null) {
        payload.fee = Math.round(values.fee * 100);
      } else {
        payload.fee = 0;
      }

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
        initialValues={initValues}
      >
        {/* ====== 1. 活动标题 ====== */}
        <Form.Item
          label="活动标题"
          name="title"
          rules={[{ required: true, message: '请输入活动标题' }, { max: 256, message: '最多256个字符' }]}
        >
          <Input placeholder="请输入活动标题" maxLength={256} showCount />
        </Form.Item>

        {/* ====== 2. 活动封面 ====== */}
        <Form.Item
          label="活动封面"
          name="cover"
          rules={[{ required: true, message: '请上传活动封面' }]}
          extra="建议尺寸：600 × 300 像素"
        >
          <CropperImageUpload aspect={600 / 300} sizeHint="建议尺寸：600 × 300 像素" />
        </Form.Item>

        {/* ====== 3. 所属专区 ====== */}
        <Form.Item label="所属专区" name="zone_id" rules={[{ required: true, message: '请选择所属专区' }]}>
          <Select
            placeholder="请选择所属专区"
            options={[{ label: '无专区', value: '' }, ...zoneOptions]}
          />
        </Form.Item>

        {/* ====== 4 & 5. 活动时间 + 报名时间 ====== */}
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

        {/* ====== 6. 活动地点 ====== */}
        <Form.Item label="活动地点" required>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name="location_name" noStyle
              rules={[{ required: true, message: '请输入活动地点' }]}>
              <Input placeholder="请输入地点名称" />
            </Form.Item>
            <Space>
              <Form.Item name="location_coordinate" noStyle>
                <Input placeholder="坐标（可选，如 113.xxx,22.xxx）" style={{ width: 320 }} />
              </Form.Item>
              <a href="https://lbs.qq.com/tool/getpoint/index.html" target="_blank" rel="noopener noreferrer">
                查询坐标
              </a>
            </Space>
          </Space>
        </Form.Item>

        {/* ====== 7. 活动图片 ====== */}
        <Form.Item
          label="活动图片"
          name="image"
          rules={[{ required: true, message: '请上传活动图片' }]}
          extra="建议尺寸：600 × 480 像素，可上传多张"
        >
          <MultiImageUpload maxCount={9} cropAspect={600 / 480} cropSizeHint="建议尺寸：600 × 480 像素" />
        </Form.Item>

        {/* ====== 8. 活动介绍 ====== */}
        <Form.Item label="活动介绍" name="description">
          <RichTextEditor placeholder="请输入活动介绍" showImageUpload={false} className="rich-text-editor-short" />
        </Form.Item>

        {/* ====== 9. 报名要求 ====== */}
        <div style={{ background: '#fafafa', borderLeft: '3px solid #1677ff', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1677ff' }}>报名要求</div>

          <Form.Item
            label="报名方式"
            name="activity_type"
            rules={[{ required: true, message: '请选择报名方式' }]}
          >
            <Select
              options={ACTIVITY_TYPE_OPTIONS}
              onChange={(v) => setActivityType(v)}
            />
          </Form.Item>

          {activityType === ActivityType.PAID_FCFS && (
            <Form.Item label="收费金额（元）" name="fee" rules={[{ required: true, message: '请输入收费金额' }]}>
              <InputNumber min={0} precision={2} style={{ width: 200 }} placeholder="0.00" prefix="¥" />
            </Form.Item>
          )}

          {needsSlots && (
            <>
              <Form.Item label="区分性别报名限额" name="gender_enabled" valuePropName="checked">
                <Switch checkedChildren="开启" unCheckedChildren="关闭"
                  onChange={(v) => setGenderEnabled(v)} />
              </Form.Item>

              {genderEnabled ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <Form.Item
                    label="男性名额"
                    name="male_slots"
                    rules={[{ required: true, message: '请输入男性名额' }]}
                  >
                    <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item
                    label="女性名额"
                    name="female_slots"
                    rules={[{ required: true, message: '请输入女性名额' }]}
                  >
                    <InputNumber min={1} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                </div>
              ) : (
                <Form.Item
                  label="人数限制"
                  name="slots"
                  rules={[{ required: true, message: '请输入人数限制' }]}
                >
                  <InputNumber min={1} precision={0} style={{ width: 200 }} placeholder="总名额" />
                </Form.Item>
              )}
            </>
          )}

          <div style={{ height: 1, background: '#e8e8e8', margin: '0 0 16px 0' }} />
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>其他报名所需信息</div>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
            配置用户报名时除脱单资料外所需的信息字段
          </div>
          <Form.Item name="form_config" style={{ marginBottom: 0 }}>
            <FormConfigEditor />
          </Form.Item>
        </div>

        {/* ====== 10. 权重 ====== */}
        <Form.Item label="权重" name="sort_order" extra="数值越大排序越靠前">
          <InputNumber min={0} precision={0} style={{ width: 200 }} />
        </Form.Item>

        {/* ====== 11 & 12. 状态 & 显示状态 ====== */}
        <div style={{ display: 'flex', gap: 48 }}>
          <Form.Item label="状态">
            <Switch
              checked={statusEnabled}
              onChange={setStatusEnabled}
              checkedChildren="上线"
              unCheckedChildren="下线"
            />
          </Form.Item>

          <Form.Item label="显示状态">
            <Switch
              checked={!hidden}
              onChange={(v) => setHidden(!v)}
              checkedChildren="显示"
              unCheckedChildren="隐藏"
            />
          </Form.Item>
        </div>
      </Form>
    </ScrollableModal>
  );
};

export default ActivityEditModal;
