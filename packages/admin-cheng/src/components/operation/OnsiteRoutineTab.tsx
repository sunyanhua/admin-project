import { useState, useEffect, useCallback } from 'react';
import { Button, Input, InputNumber, Select, Space, Empty, Spin } from 'antd';
import { SaveOutlined, PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { activityApi, Activity } from '@/api/services/activity-v1';
import { LUCKY_GENDER_OPTIONS, LuckyGender } from '@/pages/operation/luckyPools.utils';
import { parseGroupNames } from './onsiteGrouping.utils';
import {
  parseRoutine,
  findInvalidPersonGroup,
  RoutineStep,
  RoutineStepType,
  ROUTINE_STEP_TYPE_LABELS,
} from './onsiteRoutine.utils';

interface OnsiteRoutineTabProps {
  activityId: string;
  /** 列表行数据（与其他现场 TAB 同源）；缺省时用详情接口兜底 */
  activity?: Activity | null;
}

const STEP_TYPE_OPTIONS = (Object.keys(ROUTINE_STEP_TYPE_LABELS) as RoutineStepType[]).map((v) => ({
  value: v,
  label: ROUTINE_STEP_TYPE_LABELS[v],
}));

/** 各类型默认参数（切换类型时重置，备注保留） */
const defaultStepOf = (type: RoutineStepType, note = ''): RoutineStep =>
  type === 'lucky' ? { type, count: 1, gender: 'any' as LuckyGender, note }
  : type === 'groupDraw' ? { type, count: 1, note }
  : type === 'personDraw' ? { type, count: 1, note }
  : { type, note };

/**
 * 流程编排 TAB：提前编排现场大屏的操作步骤（幸运之星/分组代表/组中选组/单组选人）。
 * 保存到 onsite_config.routine（原对象透传），现场大屏按 9 进入编排执行模式逐步执行。
 */
const OnsiteRoutineTab: React.FC<OnsiteRoutineTabProps> = ({ activityId, activity: activityProp }) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  /** 最近一次读取的活动原始数据（保存时 onsite_config 原对象透传） */
  const [activity, setActivity] = useState<any>(activityProp || null);
  /** 编排步骤（编辑态） */
  const [steps, setSteps] = useState<RoutineStep[]>([]);
  /** 已配置的分组名称（单组选人组名下拉） */
  const [groups, setGroups] = useState<string[]>([]);
  /** 拖拽排序：被拖动步骤下标 */
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  /** 回填：解析 onsite_config 的分组名称与编排步骤 */
  const fillSteps = useCallback((data: any) => {
    try {
      const obj = JSON.parse(data?.onsite_config || '{}');
      const rawGroups = obj && typeof obj === 'object' && typeof obj.groups === 'string' ? obj.groups : '';
      setGroups(parseGroupNames(rawGroups));
      setSteps(parseRoutine(data?.onsite_config));
    } catch { setGroups([]); setSteps([]); }
  }, []);

  // 列表数据优先：延迟回填（等表单挂载，与其他现场 TAB 一致）
  useEffect(() => {
    if (!activityProp) return;
    setActivity(activityProp);
    const timer = setTimeout(() => fillSteps(activityProp), 50);
    return () => clearTimeout(timer);
  }, [activityProp, fillSteps]);

  /** 详情接口兜底（列表未传数据时）+ 保存后刷新 */
  const fetchConfig = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    try {
      const res: any = await activityApi.getDetail(activityId);
      setActivity(res);
      fillSteps(res);
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取流程编排失败');
    } finally {
      setLoading(false);
    }
  }, [activityId, fillSteps, showError]);

  useEffect(() => {
    if (activityProp) return;
    fetchConfig();
  }, [activityProp, fetchConfig]);

  /** 修改步骤字段（不可变更新） */
  const updateStep = (idx: number, patch: Partial<RoutineStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  /** 切换步骤类型：重置为该类型默认参数（备注保留） */
  const changeType = (idx: number, type: RoutineStepType) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? defaultStepOf(type, s.note) : s)));
  };

  const addStep = () => setSteps((prev) => [...prev, defaultStepOf('lucky')]);
  const removeStep = (idx: number) => setSteps((prev) => prev.filter((_, i) => i !== idx));

  /** 保存：onsite_config 原对象透传 + 仅管理 routine 键（步骤清空则删除该键） */
  const handleSave = async () => {
    const hasGroupSteps = steps.some((s) => s.type !== 'lucky');
    if (hasGroupSteps && !groups.length) {
      showError('编排包含分组相关步骤，请先在「分组管理」中配置分组名称');
      return;
    }
    // 组中选组指定结果：指定的分组必须在当前分组名称中
    const fixedGroups = steps.flatMap((s) => (s.type === 'groupDraw' && s.fixed ? s.fixed : []));
    if (fixedGroups.length && fixedGroups.some((g) => !groups.includes(g))) {
      showError('组中选组步骤指定的分组已不存在，请重新选择');
      return;
    }
    if (findInvalidPersonGroup(steps, groups) !== -1) {
      showError('单组选人步骤未选择有效分组，请为每一步选择分组');
      return;
    }
    setSaving(true);
    try {
      let obj: Record<string, any> = {};
      try {
        const parsed = JSON.parse(activity?.onsite_config || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = parsed;
      } catch { /* 原值非法则从空对象开始 */ }
      if (steps.length) {
        obj.routine = steps.map((s) => {
          const clean: RoutineStep = { type: s.type, note: (s.note || '').trim() };
          if (s.type === 'lucky') { clean.count = s.count ?? 1; clean.gender = s.gender ?? 'any'; }
          else if (s.type === 'groupDraw') {
            // 指定结果时抽组数=所选中组数（不存 count）；未指定则随机抽取
            if (s.fixed && s.fixed.length) clean.fixed = [...s.fixed];
            else clean.count = s.count ?? 1;
          } else if (s.type === 'personDraw') { clean.count = s.count ?? 1; clean.group = (s.group || '').trim(); }
          if (!clean.note) delete clean.note;
          return clean;
        });
      } else {
        delete obj.routine;
      }
      await activityApi.update(activityId, { onsite_config: JSON.stringify(obj) });
      success('流程编排已保存');
      await fetchConfig();
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  /** 拖拽排序：悬停即交换位置（连续悬停实现多步移动） */
  const handleDragEnter = (idx: number) => {
    if (dragIdx == null || dragIdx === idx) return;
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };

  const groupOptions = groups.map((g) => ({ value: g, label: `${g}组` }));
  const groupDrawMax = Math.max(1, groups.length);

  return (
    <div>
      <div style={{ fontSize: 13, color: '#666', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '10px 14px', marginBottom: 14, lineHeight: 1.8 }}>
        提前编排现场大屏的操作步骤，活动现场无需再切换模式与配置：大屏按 <b>9</b> 进入编排执行，<b>O</b> 开始 · <b>P</b> 停止 · <b>R</b> 重抽本步 · <b>←/→</b> 切换步骤 · 按 <b>9</b> 退出。
      </div>

      <Spin spinning={loading}>
        {steps.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无编排步骤，点击下方「添加步骤」开始编排" style={{ padding: '24px 0' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map((s, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(idx));
                  setDragIdx(idx);
                }}
                onDragEnd={() => setDragIdx(null)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDragEnter={() => handleDragEnter(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  border: dragIdx === idx ? '1px dashed #1677ff' : '1px solid #eee',
                  borderRadius: 8, background: '#fff', padding: '8px 12px',
                  opacity: dragIdx === idx ? 0.5 : 1,
                }}
              >
                <HolderOutlined style={{ color: '#bbb', cursor: 'grab' }} />
                <span style={{ minWidth: 22, height: 22, borderRadius: '50%', background: '#1677ff', color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {idx + 1}
                </span>
                <Select
                  size="small"
                  value={s.type}
                  onChange={(v: RoutineStepType) => changeType(idx, v)}
                  style={{ width: 108 }}
                  options={STEP_TYPE_OPTIONS}
                />
                {s.type === 'lucky' && (
                  <Space size={6}>
                    <span style={{ color: '#666' }}>人数</span>
                    <InputNumber size="small" min={1} max={5} precision={0} value={s.count ?? 1} onChange={(v) => updateStep(idx, { count: v ?? 1 })} style={{ width: 64 }} />
                    <span style={{ color: '#666' }}>性别</span>
                    <Select size="small" value={s.gender ?? 'any'} onChange={(v: LuckyGender) => updateStep(idx, { gender: v })} style={{ width: 78 }} options={LUCKY_GENDER_OPTIONS} />
                  </Space>
                )}
                {s.type === 'groupRep' && <span style={{ color: '#999', fontSize: 12 }}>每组从已签到成员中抽取一名代表</span>}
                {s.type === 'groupDraw' && (
                  <Space size={6}>
                    <span style={{ color: '#666' }}>抽组数</span>
                    <InputNumber size="small" min={1} max={groupDrawMax} precision={0} disabled={!!(s.fixed && s.fixed.length)} value={s.fixed && s.fixed.length ? s.fixed.length : (s.count ?? 1)} onChange={(v) => updateStep(idx, { count: v ?? 1 })} style={{ width: 64 }} />
                    <span style={{ color: '#666' }}>指定结果</span>
                    <Select
                      mode="multiple"
                      size="small"
                      placeholder="不指定则随机"
                      value={s.fixed || []}
                      onChange={(v: string[]) => updateStep(idx, { fixed: v.length ? v : undefined })}
                      style={{ minWidth: 190 }}
                      options={groupOptions}
                    />
                    <span style={{ color: '#999', fontSize: 12 }}>指定后抽组数=所选中组数</span>
                  </Space>
                )}
                {s.type === 'personDraw' && (
                  <Space size={6}>
                    <span style={{ color: '#666' }}>指定组</span>
                    <Select size="small" placeholder="选择分组" value={s.group || undefined} onChange={(v: string) => updateStep(idx, { group: v })} style={{ width: 96 }} options={groupOptions} />
                    <span style={{ color: '#666' }}>人数</span>
                    <InputNumber size="small" min={1} max={26} precision={0} value={s.count ?? 1} onChange={(v) => updateStep(idx, { count: v ?? 1 })} style={{ width: 64 }} />
                  </Space>
                )}
                <Input
                  size="small"
                  value={s.note || ''}
                  onChange={(e) => updateStep(idx, { note: e.target.value })}
                  placeholder="备注（大屏进度条显示）"
                  maxLength={50}
                  style={{ flex: 1, minWidth: 120 }}
                />
                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeStep(idx)} title="删除本步" />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Space>
            <Button icon={<PlusOutlined />} onClick={addStep}>添加步骤</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving || loading} onClick={handleSave}>保存</Button>
          </Space>
        </div>
      </Spin>
    </div>
  );
};

export default OnsiteRoutineTab;
