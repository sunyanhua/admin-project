import { useState, useEffect, useCallback } from 'react';
import { Button, Form, Input, Select, InputNumber } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { activityApi, Activity } from '@/api/services/activity-v1';

interface OnsiteGroupTabProps {
  activityId: string;
  /** 列表行数据（与现场配置 TAB 同源）；缺省时用详情接口兜底 */
  activity?: Activity | null;
}

/** 分组名称在 onsite_config 中的键 */
export const ONSITE_GROUPS_KEY = 'groups';

/** 从 onsite_config 解析分组名称（"A|B|C" 字符串） */
const parseGroups = (onsiteConfig?: string): string => {
  try {
    const obj = JSON.parse(onsiteConfig || '{}');
    if (obj && typeof obj === 'object' && typeof obj[ONSITE_GROUPS_KEY] === 'string') return obj[ONSITE_GROUPS_KEY];
  } catch { /* 原值非法则留空 */ }
  return '';
};

/**
 * 分组管理 TAB：分组名称配置（"|" 分隔，如 A|B|C|D|E|F|G）。
 * 保存在 onsite_config（JSON 原对象透传，仅管理 groups 键，保留其他已有内容）。
 */
const OnsiteGroupTab: React.FC<OnsiteGroupTabProps> = ({ activityId, activity: activityProp }) => {
  const { success, error: showError } = useAppNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  /** 最近一次读取的活动原始数据（保存时 onsite_config 原对象透传） */
  const [activity, setActivity] = useState<any>(activityProp || null);
  /** 快速设置：组名类型（字母/数字）与组数 */
  const [quickType, setQuickType] = useState<'letter' | 'number'>('letter');
  const [quickCount, setQuickCount] = useState<number | null>(null);

  /** 快速设置：按类型与组数自动生成分组名称（字母 A|B|C… 或数字 1|2|3…） */
  const applyQuickSet = () => {
    if (quickCount == null || quickCount < 1 || quickCount > 26) {
      showError('请输入 1~26 的组数');
      return;
    }
    const names = Array.from({ length: quickCount }, (_, i) =>
      quickType === 'letter' ? String.fromCharCode(65 + i) : String(i + 1),
    );
    form.setFieldValue('groups', names.join('|'));
  };

  const fillForm = useCallback((data: any) => {
    form.setFieldsValue({ groups: parseGroups(data?.onsite_config) });
  }, [form]);

  // 列表数据优先：延迟回填（等表单挂载，与现场配置 TAB 一致）
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
      showError(err?.response?.data?.message || '获取分组配置失败');
    } finally {
      setLoading(false);
    }
  }, [activityId, fillForm, showError]);

  useEffect(() => {
    if (activityProp) return;
    fetchConfig();
  }, [activityProp, fetchConfig]);

  /** 保存：onsite_config 原对象透传 + 仅管理 groups 键 */
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const raw = String(values.groups ?? '').trim();
      // 校验：非空且每个分组名非空（无连续分隔符/首尾分隔符）
      const segments = raw.split('|').map((s) => s.trim());
      if (!raw) {
        showError('请输入分组名称');
        return;
      }
      if (segments.some((s) => !s)) {
        showError('分组名称不能为空段（检查连续或首尾的分隔符）');
        return;
      }
      setSaving(true);

      let obj: Record<string, any> = {};
      try {
        const parsed = JSON.parse(activity?.onsite_config || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = parsed;
      } catch { /* 原值非法则从空对象开始 */ }
      obj[ONSITE_GROUPS_KEY] = raw;

      await activityApi.update(activityId, { onsite_config: JSON.stringify(obj) });
      success('分组配置已保存');
      fetchConfig();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <Form form={form} layout="vertical">
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Form.Item
            label="分组名称"
            name="groups"
            rules={[{ required: true, message: '请输入分组名称' }]}
            extra='用「|」分隔，例如：A|B|C|D|E|F|G；保存后原有 onsite_config 其他内容保留'
            style={{ flex: 1, marginBottom: 0 }}
          >
            <Input placeholder="A|B|C|D|E|F|G" maxLength={512} />
          </Form.Item>
          <Button type="primary" icon={<SaveOutlined />} loading={saving || loading} onClick={handleSave} style={{ marginTop: 30 }}>
            保存
          </Button>
        </div>

        {/* 快速设置：按类型与组数自动生成分组名称 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, fontSize: 13, color: '#666' }}>
          <span>快速设置</span>
          <Select
            size="small"
            value={quickType}
            onChange={(v) => setQuickType(v)}
            style={{ width: 84 }}
            options={[
              { label: '字母', value: 'letter' },
              { label: '数字', value: 'number' },
            ]}
          />
          <InputNumber
            size="small"
            min={1}
            max={26}
            precision={0}
            value={quickCount ?? undefined}
            onChange={(v) => setQuickCount(v ?? null)}
            placeholder="组数"
            style={{ width: 84 }}
          />
          <Button size="small" onClick={applyQuickSet}>应用</Button>
          <span style={{ color: '#999' }}>如字母 + 7 → A|B|C|D|E|F|G</span>
        </div>
      </Form>
    </div>
  );
};

export default OnsiteGroupTab;
