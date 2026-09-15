import { useState, useEffect, useMemo } from 'react';
import { Button, Space, Form, Input, Switch, Select, InputNumber, DatePicker, Checkbox } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { ActivityV1Status, ActivityType, ActivityTypeLabels } from '@shared/constants';
import { activityApi, Activity, CreateActivityRequest } from '@/api/services/activity-v1';
import { zoneApi, Zone } from '@/api/services/zone';
import CropperImageUpload from '@/components/common/CropperImageUpload';
import MultiImageUpload from '@/components/common/MultiImageUpload';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import FormConfigEditor from '@/components/operation/FormConfigEditor';
import WarmUpConfigEditor from '@/components/operation/WarmUpConfigEditor';
import ScrollableModal from '@/components/templates/ScrollableModal';
import SourceQrcodeModal from '@/components/common/SourceQrcodeModal';
import { settingsApi, SettingItem } from '@/api/services/settings';
import { useAuth } from '@/contexts/AuthContext';
import {
  parseStoredValue,
  parsePromiseIdsFromExtra,
  EXTRA_PROMISE_KEY,
  PROMISE_SETTING_KEY,
  type PromiseTemplate,
} from './promiseTemplate.utils';
import type { Dayjs } from 'dayjs';
import { dayjsToApi, parseApiTime } from '@/utils/format';

export interface ActivityEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  activity: Activity | null;
  onClose: () => void;
  onSuccess: () => void;
  /** 打开「承诺书模版管理」弹窗的回调，用于子段「去配置」按钮 */
  onOpenPromiseModal?: () => void;
  /** 锁定专区模式（专区管理后台使用）：隐藏专区下拉、强制 zone_id、创建默认 zone_only=true */
  lockedZone?: ActivityLockedZone;
}

export interface ActivityLockedZone {
  id: string;
  name: string;
}

const ACTIVITY_TYPE_OPTIONS = [
  { label: ActivityTypeLabels[ActivityType.FREE_FCFS], value: ActivityType.FREE_FCFS },
  { label: ActivityTypeLabels[ActivityType.PAID_FCFS], value: ActivityType.PAID_FCFS },
  { label: ActivityTypeLabels[ActivityType.FREE_REVIEW], value: ActivityType.FREE_REVIEW },
];

/** 预热与现场签到 5 字段的回填值（编辑模式 initialValues 与 setFieldsValue 共用） */
const pickOnsiteFields = (activity: Activity) => {
  const checkinStart = activity.checkin_start ? parseApiTime(activity.checkin_start) : undefined;
  // 页面ID：解析 warm_up_config 顶层 page_id 键（小程序端预热页面标识）
  let warmUpPageId = '';
  try {
    const obj = JSON.parse(activity.warm_up_config || '{}');
    if (obj && typeof obj === 'object') warmUpPageId = obj.page_id || '';
  } catch { /* 原值非法则留空 */ }
  return {
    checkin_enabled: activity.checkin_enabled ?? false,
    // 防御后端 time.Time 零值（0001-01-01T00:00:00Z）被回显为异常日期
    checkin_start: checkinStart && checkinStart.year() >= 1970 ? checkinStart : undefined,
    onsite_loves_chances: activity.onsite_loves_chances ?? 0,
    warm_up_enabled: activity.warm_up_enabled ?? false,
    warm_up_config: activity.warm_up_config ?? '',
    warm_up_page_id: warmUpPageId,
  };
};

const ActivityEditModal: React.FC<ActivityEditModalProps> = ({ visible, mode, activity, onClose, onSuccess, onOpenPromiseModal, lockedZone }) => {
  const { success, error: showError } = useAppNotification();
  const { user } = useAuth();
  /** 预热配置仅超级管理员（isRoot）可见可编辑，其他管理员提交时不更新该字段 */
  const isSuperAdmin = user?.isRoot ?? false;
  const [loading, setLoading] = useState(false);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [activityType, setActivityType] = useState<number>(ActivityType.FREE_FCFS);
  const [genderEnabled, setGenderEnabled] = useState(false);
  const [zoneOptions, setZoneOptions] = useState<{ label: string; value: string }[]>([]);
  const [promiseTemplates, setPromiseTemplates] = useState<PromiseTemplate[]>([]);
  const [form] = Form.useForm();
  /** 当前选择的所属专区（用于控制"仅本专区用户可报名"开关可用性） */
  const zoneId = Form.useWatch('zone_id', form);
  /** 现场签到开关（驱动签到开始时间显隐） */
  const checkinEnabled = Form.useWatch('checkin_enabled', form);
  /** 活动预热开关（驱动预热配置编辑器显隐） */
  const warmUpEnabled = Form.useWatch('warm_up_enabled', form);

  const needsSlots = activityType === ActivityType.FREE_FCFS || activityType === ActivityType.PAID_FCFS;

  const initValues = useMemo(() => {
    if (!activity) return { activity_type: ActivityType.FREE_FCFS, sort_order: 0, gender_enabled: false, zone_id: lockedZone?.id ?? 0, zone_only: !!lockedZone, promise_ids: [], checkin_enabled: false, onsite_loves_chances: 0, warm_up_enabled: false, warm_up_config: '', warm_up_page_id: '' };
    const type = activity.activity_type ?? ActivityType.FREE_FCFS;
    let locName = '';
    let locCoord = '';
    try { const loc = JSON.parse(activity.location || '{}'); locName = loc.name || ''; locCoord = loc.coordinate || ''; } catch { locName = activity.location || ''; }
    let imageUrls: string[] = [];
    try { const img = JSON.parse(activity.image || '[]'); imageUrls = Array.isArray(img) ? img : []; } catch { /* ignore */ }
    return {
      title: activity.title || '',
      cover: activity.cover || '',
      zone_id: lockedZone?.id ?? (activity.zone_id || 0),
      zone_only: activity.zone_only ?? !!lockedZone,
      gender_enabled: activity.gender_enabled ?? false,
      image: imageUrls,
      time_range: activity.start_time && activity.end_time ? [parseApiTime(activity.start_time)!, parseApiTime(activity.end_time)!] : undefined,
      register_range: activity.register_start && activity.register_end ? [parseApiTime(activity.register_start)!, parseApiTime(activity.register_end)!] : undefined,
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
      ...pickOnsiteFields(activity),
    };
  }, [activity, lockedZone]);

  useEffect(() => {
    // 锁定模式下专区固定，无需拉取专区选项
    if (lockedZone) return;
    zoneApi.getList({ page: 1, size: 100 }).then((res: any) => {
      const list = Array.isArray(res) ? res : (res?.list || []);
      setZoneOptions(list.map((z: Zone) => ({ label: z.name, value: z.id })));
    }).catch(() => setZoneOptions([]));
  }, [lockedZone]);

  /** 加载 setting 接口中的承诺书模版列表（多选勾选的数据源） */
  useEffect(() => {
    if (!visible) return;
    settingsApi.getSettings({ keyword: PROMISE_SETTING_KEY, size: 100 })
      .then((res: any) => {
        const list: SettingItem[] = res?.list ?? [];
        const item = list.find((s) => s.key === PROMISE_SETTING_KEY);
        setPromiseTemplates(item ? parseStoredValue(item.value) : []);
      })
      .catch(() => setPromiseTemplates([]));
  }, [visible]);

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

      // 延迟回填：等弹窗 Form 挂载后再写入；关闭/切换模式时清除定时器，防止旧数据写回
      const timer = setTimeout(() => {
        form.setFieldsValue({
          title: activity.title || '',
          cover: activity.cover || '',
          zone_id: lockedZone?.id ?? (activity.zone_id || 0),
          zone_only: activity.zone_only ?? !!lockedZone,
          gender_enabled: activity.gender_enabled ?? false,
          image: imageUrls,
          time_range: activity.start_time && activity.end_time ? [parseApiTime(activity.start_time)!, parseApiTime(activity.end_time)!] : undefined,
          register_range: activity.register_start && activity.register_end ? [parseApiTime(activity.register_start)!, parseApiTime(activity.register_end)!] : undefined,
          location_name: locName,
          location_coordinate: locCoord || '',
          activity_type: type,
          fee: (activity.fee ?? 0) / 100,
          slots: activity.slots ?? undefined,
          male_slots: activity.male_slots ?? undefined,
          female_slots: activity.female_slots ?? undefined,
          description: activity.description || '',
          form_config: activity.form_config || '',
          promise_ids: parsePromiseIdsFromExtra(activity.extra_params),
          sort_order: activity.sort_order ?? 0,
          ...pickOnsiteFields(activity),
        });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // 创建模式：显式全量覆盖所有字段为默认值（resetFields 会回退到上次会话的旧 initialValues，导致残留）
      form.setFieldsValue({
        title: '',
        cover: '',
        zone_id: lockedZone?.id ?? 0,
        zone_only: !!lockedZone,
        gender_enabled: false,
        image: [],
        time_range: undefined,
        register_range: undefined,
        location_name: '',
        location_coordinate: '',
        activity_type: ActivityType.FREE_FCFS,
        fee: undefined,
        slots: undefined,
        male_slots: undefined,
        female_slots: undefined,
        description: '',
        form_config: '',
        promise_ids: [],
        sort_order: 0,
        checkin_enabled: false,
        checkin_start: undefined,
        onsite_loves_chances: 0,
        warm_up_enabled: false,
        warm_up_config: '',
        warm_up_page_id: '',
      });
      setActivityType(ActivityType.FREE_FCFS);
      setStatusEnabled(true);
      setHidden(false);
      setGenderEnabled(false);
    }
  }, [visible, mode, activity, form, lockedZone]);

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

      // 承诺书：勾选的 id 查回完整模板对象，写入 extra_params.promise
      const selectedIds: string[] = values.promise_ids || [];
      const selectedTemplates = selectedIds
        .map((id) => promiseTemplates.find((t) => t.id === id))
        .filter((t): t is PromiseTemplate => !!t);
      const extraParams = selectedTemplates.length > 0
        ? JSON.stringify({ [EXTRA_PROMISE_KEY]: selectedTemplates })
        : '{}';

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
        extra_params: extraParams,
        require_match_profile: true,
        status: statusEnabled ? ActivityV1Status.ENABLED : ActivityV1Status.DISABLED,
      };

      // 所属专区：锁定模式强制锁定值；否则选择"无专区"时传空字符串
      payload.zone_id = lockedZone?.id ?? (values.zone_id || '');
      // 仅本专区用户可报名：显式传值（服务端缺省口径为"传 zone_id → true"）；
      // 锁定模式缺省 true，普通模式未选择专区时强制 false
      payload.zone_only = lockedZone
        ? (values.zone_only ?? true)
        : (values.zone_id ? (values.zone_only ?? false) : false);
      if (values.gender_enabled != null) payload.gender_enabled = values.gender_enabled;
      // 显示状态（Switch checked = 显示）
      payload.hidden = hidden;

      // 权重：专区模式不管理权重，不提交（PATCH 缺省不更新，创建走服务端默认）
      if (!lockedZone) payload.sort_order = values.sort_order ?? 0;

      // 预热与现场签到：专区模式不管理，不提交（PATCH 缺省不更新，避免覆盖小程序端配置）
      if (!lockedZone) {
        payload.warm_up_enabled = !!values.warm_up_enabled;
        // warm_up_config 提交：store 原对象透传（从 store 取值而非 values——预热关闭时该 Form.Item
        // 未挂载，validateFields 的 values 不含它，空串会按 PATCH「空串=清空」语义抹掉已有配置）
        // 再合并页面ID（page_id 键）；非超管也因此只可能改动 page_id，其余内容原样保留
        let warmUpObj: Record<string, any> = {};
        try {
          const parsed = JSON.parse(form.getFieldValue('warm_up_config') ?? '');
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) warmUpObj = parsed;
        } catch { /* 原值非法则从空对象开始 */ }
        const warmUpPageId = String(form.getFieldValue('warm_up_page_id') ?? '').trim();
        if (warmUpPageId) {
          warmUpObj.page_id = warmUpPageId;
        } else {
          delete warmUpObj.page_id;
        }
        payload.warm_up_config = JSON.stringify(warmUpObj);
        // 现场签到：默认关闭；开启且填写了开始时间才上传（RFC3339 可选，PATCH 缺省不更新）
        payload.checkin_enabled = !!values.checkin_enabled;
        if (values.checkin_enabled) {
          if (values.checkin_start) {
            payload.checkin_start = dayjsToApi(values.checkin_start as Dayjs) || '';
          }
          // 现场心动机会数：仅开启签到时提交（与签到开始时间同显隐）
          payload.onsite_loves_chances = values.onsite_loves_chances ?? 0;
        }
      }

      if (needsSlots) {
        if (genderEnabled) {
          if (values.male_slots != null) payload.male_slots = values.male_slots;
          if (values.female_slots != null) payload.female_slots = values.female_slots;
        } else {
          if (values.slots != null) payload.slots = values.slots;
        }
      }

      // 审核模式：表单不展示人数限制，默认报名人数限制 999
      if (activityType === ActivityType.FREE_REVIEW) {
        payload.slots = 999;
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

        {/* ====== 3. 所属专区（锁定模式下固定显示、不可选） ====== */}
        {lockedZone ? (
          <>
            <Form.Item label="所属专区">
              <Input value={lockedZone.name} disabled />
            </Form.Item>
            {/* 隐藏字段保证 Form.useWatch('zone_id') 拿到锁定值（驱动 zone_only 开关可用性） */}
            <Form.Item name="zone_id" hidden>
              <Input />
            </Form.Item>
          </>
        ) : (
          <Form.Item label="所属专区" name="zone_id">
            <Select
              placeholder="请选择所属专区"
              options={[{ label: '无专区', value: 0 }, ...zoneOptions]}
              onChange={(v) => {
                // 切回"无专区"时同步关闭"仅本专区用户可报名"
                if (!v) form.setFieldsValue({ zone_only: false });
              }}
            />
          </Form.Item>
        )}

        {/* ====== 3.5 仅本专区用户可报名（选择专区后才可操作） ====== */}
        <Form.Item
          label="仅本专区用户可报名"
          name="zone_only"
          valuePropName="checked"
          extra={zoneId ? '开启后仅所选专区的用户可报名' : '请先选择所属专区'}
        >
          <Switch checkedChildren="开启" unCheckedChildren="关闭" disabled={!zoneId} />
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

          <div style={{ height: 1, background: '#e8e8e8', margin: '16px 0' }} />
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>报名承诺书</div>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
            勾选后用户报名时需勾选对应承诺书才能提交，多选
          </div>
          <Form.Item name="promise_ids" style={{ marginBottom: 0 }}>
            {promiseTemplates.length === 0 ? (
              <div style={{ color: '#999', fontSize: 13 }}>
                尚未配置任何承诺书模版
                {onOpenPromiseModal && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: '0 0 0 8px', height: 'auto' }}
                    onClick={onOpenPromiseModal}
                  >
                    去配置
                  </Button>
                )}
              </div>
            ) : (
              <Checkbox.Group style={{ width: '100%' }}>
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {promiseTemplates.map((tpl) => (
                    <Checkbox key={tpl.id} value={tpl.id}>
                      {tpl.title}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            )}
          </Form.Item>
        </div>

        {/* ====== 9.5 预热与现场签到（专区模式不管理，隐藏） ====== */}
        {!lockedZone && (
          <div style={{ background: '#fafafa', borderLeft: '3px solid #fa8c16', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#fa8c16' }}>预热与现场签到</div>

            <Form.Item label="启用预热" name="warm_up_enabled" valuePropName="checked" style={{ marginBottom: 12 }}>
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>

            {warmUpEnabled && (
              <Form.Item label="页面ID" name="warm_up_page_id" extra="小程序端预热页面的页面ID，写入预热配置">
                <Input placeholder="请输入页面ID" style={{ width: 240 }} />
              </Form.Item>
            )}

            {warmUpEnabled && isSuperAdmin && (
              <Form.Item
                label="预热配置"
                name="warm_up_config"
                extra="配置小程序端预热展示的信息字段"
              >
                <WarmUpConfigEditor />
              </Form.Item>
            )}
            {warmUpEnabled && !isSuperAdmin && (
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>预热配置内容仅超级管理员可编辑</div>
            )}

            <div style={{ height: 1, background: '#e8e8e8', margin: '0 0 16px 0' }} />

            <Form.Item
              label={
                <Space size={4}>
                  <span>现场签到</span>
                  {mode === 'edit' && activity && checkinEnabled && (
                    <SourceQrcodeModal basePage={`pages/activity-onsite/index?id=${activity.id}`} showSource={false} showShortlink={false} />
                  )}
                </Space>
              }
              name="checkin_enabled"
              valuePropName="checked"
              extra="开启后用户可在活动现场签到"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>

            {checkinEnabled && (
              <>
                <Form.Item label="签到开始时间" name="checkin_start" extra="选填">
                  <DatePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  label="现场心动机会数"
                  name="onsite_loves_chances"
                  extra="活动现场用户的心动机会数，与每日心动次数相互独立"
                >
                  <InputNumber min={0} precision={0} style={{ width: 200 }} />
                </Form.Item>
              </>
            )}
          </div>
        )}

        {/* ====== 10. 权重（专区模式不管理，隐藏） ====== */}
        {!lockedZone && (
          <Form.Item label="权重" name="sort_order" extra="数值越大排序越靠前">
            <InputNumber min={0} precision={0} style={{ width: 200 }} />
          </Form.Item>
        )}

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
