import { useState, useEffect, useCallback } from 'react';
import { Button, Space, Form, Switch, InputNumber, DatePicker, Radio } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { activityApi, Activity } from '@/api/services/activity-v1';
import ImageUpload from '@/components/common/ImageUpload';
import SourceQrcodeModal from '@/components/common/SourceQrcodeModal';
import { parseApiTime, dayjsToApi } from '@/utils/format';

/** 大屏用户显示方式（onsite_config.user_display）：昵称（默认）/ 姓名 */
export const USER_DISPLAY_NICKNAME = 'nickname';
export const USER_DISPLAY_REAL_NAME = 'real_name';

interface OnsiteConfigTabProps {
  activityId: string;
  /** 列表行数据（与编辑弹窗回填同源）；缺省时用详情接口兜底 */
  activity?: Activity | null;
}

/** 现场图片二维码：解析 extra_params 顶层 onsite_qrcode 键（与编辑表单一致） */
const parseOnsiteQrcodeFromExtra = (extraParams?: string): string => {
  try {
    const obj = JSON.parse(extraParams || '{}');
    if (obj && typeof obj === 'object') return obj.onsite_qrcode || '';
  } catch { /* 原值非法则留空 */ }
  return '';
};

/**
 * 现场配置 TAB：与活动编辑表单中的现场内容完全一致——
 * 现场签到开关、签到开始时间、现场心动机会数、现场大屏背景图、现场图片二维码。
 * 回填与编辑弹窗同源（列表数据优先），详情接口仅作兜底与保存后刷新。
 */
const OnsiteConfigTab: React.FC<OnsiteConfigTabProps> = ({ activityId, activity: activityProp }) => {
  const { success, error: showError } = useAppNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  /** 最近一次读取的活动原始数据（保存时原对象透传 extra_params / onsite_config） */
  const [activity, setActivity] = useState<any>(activityProp || null);

  const checkinEnabled = Form.useWatch('checkin_enabled', form);

  /** 回填现场字段（与编辑表单 pickOnsiteFields 一致） */
  const fillForm = useCallback((data: any) => {
    const checkinStart = data?.checkin_start ? parseApiTime(data.checkin_start) : undefined;
    let onsiteBgScreen = '';
    let onsiteUserDisplay: string = USER_DISPLAY_NICKNAME;
    try {
      const obj = JSON.parse(data?.onsite_config || '{}');
      if (obj && typeof obj === 'object') {
        onsiteBgScreen = obj.bg_screen || '';
        // 用户显示：real_name=姓名；其余（含未配置）=昵称
        onsiteUserDisplay = obj.user_display === USER_DISPLAY_REAL_NAME ? USER_DISPLAY_REAL_NAME : USER_DISPLAY_NICKNAME;
      }
    } catch { /* 原值非法则留空 */ }
    form.setFieldsValue({
      checkin_enabled: data?.checkin_enabled ?? false,
      // 防御后端 time.Time 零值（0001-01-01T00:00:00Z）被回显为异常日期
      checkin_start: checkinStart && checkinStart.year() >= 1970 ? checkinStart : undefined,
      onsite_loves_chances: data?.onsite_loves_chances ?? 0,
      onsite_bg_screen: onsiteBgScreen,
      onsite_user_display: onsiteUserDisplay,
      onsite_qrcode: parseOnsiteQrcodeFromExtra(data?.extra_params),
    });
  }, [form]);

  // 列表数据优先：延迟回填（等表单挂载，与编辑弹窗一致）
  useEffect(() => {
    if (!activityProp) return;
    setActivity(activityProp);
    const timer = setTimeout(() => fillForm(activityProp), 50);
    return () => clearTimeout(timer);
  }, [activityProp, fillForm]);

  /** 详情接口兜底（列表未传数据时）+ 保存后刷新 */
  const fetchConfig = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    try {
      const res: any = await activityApi.getDetail(activityId);
      setActivity(res);
      fillForm(res);
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取现场配置失败');
    } finally {
      setLoading(false);
    }
  }, [activityId, fillForm, showError]);

  useEffect(() => {
    if (activityProp) return; // 有列表数据时不走详情兜底（保存后仍会刷新）
    fetchConfig();
  }, [activityProp, fetchConfig]);

  /** 保存：与编辑表单提交逻辑完全一致 */
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: Record<string, any> = {};

      // 现场签到：默认关闭；开启且填写了开始时间才上传（RFC3339 可选，PATCH 缺省不更新）
      payload.checkin_enabled = !!values.checkin_enabled;
      if (values.checkin_enabled) {
        if (values.checkin_start) {
          payload.checkin_start = dayjsToApi(values.checkin_start as any) || '';
        }
        // 现场心动机会数：仅开启签到时提交（与签到开始时间同显隐）
        payload.onsite_loves_chances = values.onsite_loves_chances ?? 0;
      }

      // onsite_config 为 JSON（服务端透明存储），原对象透传 + 仅管理 bg_screen（大屏背景图）/ user_display（用户显示）键
      let checkinObj: Record<string, any> = {};
      try {
        const parsed = JSON.parse(activity?.onsite_config || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) checkinObj = parsed;
      } catch { /* 原值非法则从空对象开始 */ }
      const onsiteBg = String(form.getFieldValue('onsite_bg_screen') ?? '').trim();
      if (onsiteBg) {
        checkinObj.bg_screen = onsiteBg;
      } else {
        delete checkinObj.bg_screen;
      }
      // 用户显示：姓名显式存 real_name；昵称为默认语义，删除键（未配置=昵称）
      const onsiteUserDisplay = form.getFieldValue('onsite_user_display') === USER_DISPLAY_REAL_NAME
        ? USER_DISPLAY_REAL_NAME
        : USER_DISPLAY_NICKNAME;
      if (onsiteUserDisplay === USER_DISPLAY_REAL_NAME) {
        checkinObj.user_display = USER_DISPLAY_REAL_NAME;
      } else {
        delete checkinObj.user_display;
      }
      payload.onsite_config = JSON.stringify(checkinObj);

      // extra_params：原对象透传（保留未知键）+ 现场图片二维码（onsite_qrcode 键）
      let extraObj: Record<string, any> = {};
      try {
        const parsed = JSON.parse(activity?.extra_params || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) extraObj = parsed;
      } catch { /* 原值非法则从空对象开始 */ }
      const onsiteQrcode = String(form.getFieldValue('onsite_qrcode') ?? '').trim();
      if (onsiteQrcode) {
        extraObj.onsite_qrcode = onsiteQrcode;
      } else {
        delete extraObj.onsite_qrcode;
      }
      payload.extra_params = JSON.stringify(extraObj);

      await activityApi.update(activityId, payload);
      success('现场配置已保存');
      fetchConfig();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <Form form={form} layout="vertical">
        <Form.Item
          label={
            <Space size={4}>
              <span>现场签到</span>
              {activity && checkinEnabled && (
                <SourceQrcodeModal
                  basePage={`pages/h5/index?url=${encodeURIComponent(`https://ttfm-h5.liteweb.cn/v5/2025/cheng/h5/index.html#/pages/activity-onsite/index?id=${activityId}`)}`}
                  showSource={false}
                  showShortlink={false}
                />
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

            <Form.Item
              label="现场大屏背景图"
              name="onsite_bg_screen"
              extra="用于活动现场大屏的背景画面展示"
            >
              <ImageUpload />
            </Form.Item>

            <Form.Item
              label="用户显示"
              name="onsite_user_display"
              extra="现场大屏上用户名称的展示方式，默认昵称"
            >
              <Radio.Group>
                <Radio value={USER_DISPLAY_NICKNAME}>昵称</Radio>
                <Radio value={USER_DISPLAY_REAL_NAME}>姓名</Radio>
              </Radio.Group>
            </Form.Item>
          </>
        )}

        <Form.Item
          label="现场图片二维码"
          name="onsite_qrcode"
          extra="用于活动现场展示的图片二维码"
        >
          <ImageUpload />
        </Form.Item>

        <Space>
          <Button type="primary" icon={<SaveOutlined />} loading={saving || loading} onClick={handleSave}>
            保存
          </Button>
        </Space>
      </Form>
    </div>
  );
};

export default OnsiteConfigTab;
