import { useState, useEffect, useMemo } from 'react';
import { Radio, Select, Button, DatePicker, TimePicker, Table, InputNumber, Input, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { refundRuleApi, RefundRule, RefundRuleStage } from '../../api/services/refundRule';
import { useAppNotification } from '@/hooks/useAppNotification';
import ScrollableModal from '@/components/templates/ScrollableModal';

// ==================== Types ====================

/** 退款模式 → 映射到 product.refund_type: 0=none, 1=anytime, 2=deadline, 3=staged */
export type RefundMode = 'none' | 'anytime' | 'deadline' | 'staged';

export const REFUND_TYPE_MAP: Record<RefundMode, number> = {
  none: 0,
  anytime: 1,
  deadline: 2,
  staged: 3,
};

export interface RefundSettingsData {
  mode: RefundMode;
  ruleId?: number | null;
  deadlineMode: 'unified' | 'individual';
  unifiedDeadline?: string | null;
  skuDeadlines: Record<string, string>;
}

export interface RefundSettingsProps {
  value: RefundSettingsData;
  onChange: (data: RefundSettingsData) => void;
  step2Skus?: { key: string; spec_indices: string; specText: string; dateValue?: string }[];
  wizardSpecs?: { name: string; values: { value: string }[]; is_time_type?: boolean }[];
}

// ==================== 规则描述 ====================

const fmtStages = (stages?: RefundRuleStage[]): string => {
  if (!stages || stages.length === 0) return '';
  return [...stages]
    .sort((a, b) => b.days_before - a.days_before)
    .map((s) => `提前${s.days_before}天退${s.refund_value}${s.refund_type === 'rate' ? '%' : '元'}`)
    .join('；');
};

// ==================== 新建/编辑规则弹窗 ====================

const RuleEditModal: React.FC<{
  open: boolean;
  initial?: { name: string; description?: string; stages: RefundRuleStage[]; is_hidden?: boolean } | null;
  onClose: () => void;
  onSave: (data: { name: string; description?: string; stages: RefundRuleStage[]; is_hidden?: boolean }) => void;
}> = ({ open, initial, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stages, setStages] = useState<RefundRuleStage[]>([]);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setDescription(initial?.description || '');
      setStages(initial?.stages || [
        { days_before: 30, refund_type: 'rate', refund_value: 100 },
        { days_before: 7, refund_type: 'rate', refund_value: 50 },
        { days_before: 0, refund_type: 'rate', refund_value: 0 },
      ]);
      setIsHidden(initial?.is_hidden || false);
    }
  }, [open, initial]);

  const addStage = () => setStages((prev) => [...prev, { days_before: 0, refund_type: 'rate', refund_value: 0 }]);
  const removeStage = (idx: number) => setStages((prev) => prev.filter((_, i) => i !== idx));
  const updateStage = (idx: number, patch: Partial<RefundRuleStage>) => {
    setStages((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      stages: stages.filter((s) => s.days_before >= 0).sort((a, b) => b.days_before - a.days_before),
      is_hidden: isHidden,
    });
    onClose();
  };

  return (
    <ScrollableModal
      title={initial ? '编辑退款规则' : '新建退款规则'}
      open={open}
      onCancel={onClose}
      width={650}
      destroyOnHidden
      footer={<Space><Button onClick={onClose}>取消</Button><Button type="primary" onClick={handleSave} disabled={!name.trim()}>保存</Button></Space>}
    >
      <div style={{ padding: '0 8px' }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>规则名称</div>
          <Input placeholder="如：标准阶梯退" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>规则说明</div>
          <Input.TextArea placeholder="可选，描述规则用途" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={256} rows={2} />
        </div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>退款阶梯</div>
        {stages.map((s, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 8px', background: '#fafafa', borderRadius: 4 }}>
            <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>提前</span>
            <InputNumber size="small" min={0} max={365} value={s.days_before} style={{ width: 60 }} onChange={(v) => updateStage(idx, { days_before: v ?? 0 })} />
            <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>天退</span>
            <Select size="small" value={s.refund_type} style={{ width: 70 }} options={[{ label: '%', value: 'rate' }, { label: '元', value: 'fixed' }]} onChange={(v) => updateStage(idx, { refund_type: v })} />
            <InputNumber size="small" min={0} max={s.refund_type === 'rate' ? 100 : 999999} value={s.refund_value} style={{ width: 80 }} onChange={(v) => updateStage(idx, { refund_value: v ?? 0 })} />
            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeStage(idx)} />
          </div>
        ))}
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addStage}>添加阶梯</Button>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>隐藏此规则</span>
          <Radio.Group value={isHidden ? 'yes' : 'no'} onChange={(e) => setIsHidden(e.target.value === 'yes')}>
            <Radio.Button value="no">显示</Radio.Button>
            <Radio.Button value="yes">隐藏</Radio.Button>
          </Radio.Group>
          <span style={{ color: '#999', fontSize: 12 }}>隐藏后仅在退款规则管理页可见</span>
        </div>
      </div>
    </ScrollableModal>
  );
};

// ==================== RefundSettings 主组件 ====================

const RefundSettings: React.FC<RefundSettingsProps> = ({ value, onChange, step2Skus, wizardSpecs }) => {
  const [rules, setRules] = useState<RefundRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  // 截止时间批量设置
  const [batchMode, setBatchMode] = useState(false);
  const [batchDeadline, setBatchDeadline] = useState<Dayjs | null>(null);
  const [batchDeadlineMode, setBatchDeadlineMode] = useState<'fixed' | 'relative'>('fixed');
  const [batchDeadlineDays, setBatchDeadlineDays] = useState<number>(0);
  const [batchDeadlineTime, setBatchDeadlineTime] = useState<Dayjs | null>(null);
  const [batchEnabled, setBatchEnabled] = useState(true);
  const [batchSelectedKeys, setBatchSelectedKeys] = useState<string[]>([]);
  const [batchSpecFilters, setBatchSpecFilters] = useState<Record<number, string>>({});
  const { success, error: showError, warning } = useAppNotification();

  const dateSpecIndex = useMemo(() => (wizardSpecs || []).findIndex((s) => s.is_time_type), [wizardSpecs]);
  const hasDateSpec = dateSpecIndex >= 0;

  // 加载规则列表 — 根据 mode 不同加载不同规则集
  useEffect(() => {
    setLoadingRules(true);
    if (value.mode === 'staged') {
      // 阶梯退：加载非系统、非隐藏规则（列表含 stages）
      refundRuleApi.getRules({ page_size: 200, is_system: false, is_hidden: false }).then((res: any) => {
        const list: RefundRule[] = Array.isArray(res?.list) ? res.list : (Array.isArray(res) ? res : []);
        setRules(list);
      }).catch(() => setRules([])).finally(() => setLoadingRules(false));
    } else if (value.mode === 'anytime' || value.mode === 'deadline') {
      // 随时退 / 指定日期前退：加载系统规则（自动绑定）
      refundRuleApi.getRules({ page_size: 1, is_system: true }).then((res: any) => {
        const list: RefundRule[] = Array.isArray(res?.list) ? res.list : (Array.isArray(res) ? res : []);
        setRules(list);
        if (list.length > 0) {
          // 自动绑定系统规则
          onChange({ ...value, ruleId: list[0].id });
        }
      }).catch(() => setRules([])).finally(() => setLoadingRules(false));
    } else {
      setRules([]);
      setLoadingRules(false);
    }
  }, [value.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const deadlineSkus = step2Skus || [];

  const resetBatch = () => { setBatchMode(false); setBatchSelectedKeys([]); setBatchSpecFilters({}); };

  const handleModeChange = (mode: RefundMode) => {
    resetBatch();
    const base: RefundSettingsData = { ...value, mode };
    if (mode === 'none') {
      onChange({ ...base, ruleId: null, unifiedDeadline: null, skuDeadlines: {} });
    } else if (mode === 'anytime') {
      onChange({ ...base, ruleId: null, unifiedDeadline: null, skuDeadlines: {}, deadlineMode: 'unified' });
    } else if (mode === 'deadline') {
      onChange({ ...base, ruleId: null, deadlineMode: value.deadlineMode || 'unified' });
    } else if (mode === 'staged') {
      onChange({ ...base, ruleId: null, deadlineMode: value.deadlineMode || 'unified' });
    }
  };

  const handleSaveRule = async (data: { name: string; description?: string; stages: RefundRuleStage[]; is_hidden?: boolean }) => {
    try {
      const created: any = await refundRuleApi.createRule({ name: data.name, description: data.description, stages: data.stages, is_hidden: data.is_hidden });
      const newId = created?.data?.id || created?.id;
      if (newId) {
        const newRule: RefundRule = { id: newId, name: data.name, description: data.description, stages: data.stages, is_hidden: data.is_hidden };
        setRules((prev) => [...prev, newRule]);
        onChange({ ...value, ruleId: newId });
        success('规则已创建');
      }
    } catch (err: any) { showError(err?.response?.data?.message || '创建失败'); }
  };

  const computeRelativeTime = (dateValue: string | undefined, days: number, time: Dayjs | null): string | null => {
    if (!dateValue || days == null) return null;
    const date = dayjs(dateValue);
    if (!date.isValid()) return null;
    const result = date.subtract(days, 'day');
    if (time) return result.hour(time.hour()).minute(time.minute()).second(0).format('YYYY-MM-DDTHH:mm:ssZ');
    return result.format('YYYY-MM-DDTHH:mm:ssZ');
  };

  const applyBatch = () => {
    if (batchSelectedKeys.length === 0) { warning('请先选择SKU行'); return; }
    const selectedKeys = new Set(batchSelectedKeys);
    const newDeadlines: Record<string, string> = { ...value.skuDeadlines };
    for (const row of deadlineSkus) {
      if (!selectedKeys.has(row.key)) continue;
      const val = (hasDateSpec && batchDeadlineMode === 'relative')
        ? computeRelativeTime(row.dateValue, batchDeadlineDays, batchDeadlineTime)
        : batchDeadline ? batchDeadline.format('YYYY-MM-DDTHH:mm:ssZ') : '';
      newDeadlines[row.spec_indices] = val || '';
    }
    onChange({ ...value, skuDeadlines: newDeadlines });
  };

  return (
    <>
      <Radio.Group value={value.mode} onChange={(e) => handleModeChange(e.target.value)} style={{ marginBottom: 16 }}>
        <Radio.Button value="none">不退款</Radio.Button>
        <Radio.Button value="anytime">随时退</Radio.Button>
        <Radio.Button value="deadline">指定日期前退</Radio.Button>
        <Radio.Button value="staged">阶梯退</Radio.Button>
      </Radio.Group>

      {value.mode === 'none' && <div style={{ color: '#999', fontSize: 12 }}>该活动不支持退款。</div>}
      {value.mode === 'anytime' && <div style={{ color: '#999', fontSize: 12 }}>用户在活动开始前可随时申请全额退款。退款基准时间自动设为30年后。</div>}

      {(value.mode === 'deadline' || value.mode === 'staged') && (
        <div style={{ marginTop: 4 }}>
          {value.mode === 'staged' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>退款规则</div>
              <Select
                style={{ width: '100%', maxWidth: 500 }}
                placeholder="请选择退款规则"
                loading={loadingRules}
                value={value.ruleId}
                allowClear
                options={[
                  ...rules.map((r) => ({
                    label: `${r.name}  —  ${fmtStages(r.stages)}`,
                    value: r.id,
                  })),
                  { label: '＋ 新建退款规则', value: -1 },
                ]}
                onChange={(val: any) => {
                  if (val === -1) { setRuleModalOpen(true); }
                  else { onChange({ ...value, ruleId: val }); }
                }}
              />
            </div>
          )}

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>退款截止时间</div>
          <Radio.Group
            value={value.deadlineMode}
            onChange={(e) => { onChange({ ...value, deadlineMode: e.target.value }); resetBatch(); }}
            style={{ marginBottom: 12 }}
          >
            <Radio.Button value="unified">统一设置</Radio.Button>
            <Radio.Button value="individual">各SKU单独设置</Radio.Button>
          </Radio.Group>

          {value.deadlineMode === 'unified' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#666' }}>截止时间</span>
              <DatePicker showTime
                value={value.unifiedDeadline ? dayjs(value.unifiedDeadline) : null}
                placeholder="请选择"
                onChange={(v) => onChange({ ...value, unifiedDeadline: v ? v.format('YYYY-MM-DDTHH:mm:ssZ') : null })}
              />
            </div>
          )}

          {value.deadlineMode === 'individual' && deadlineSkus.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>SKU 退款截止时间（{deadlineSkus.length} 种）</span>
                <Button type="link" size="small" onClick={() => {
                  const next = !batchMode;
                  setBatchMode(next);
                  if (next) { setBatchSelectedKeys(deadlineSkus.map((s) => s.key)); setBatchSpecFilters({}); }
                  else { setBatchSelectedKeys([]); setBatchSpecFilters({}); }
                }}>{batchMode ? '收起批量设置' : '批量设置'}</Button>
              </div>

              {batchMode && (
                <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 12, marginBottom: 12, background: '#f5f5f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>批量设置</span>
                    <label style={{ fontSize: 13, cursor: 'pointer' }}>
                      <input type="checkbox" checked={batchEnabled} style={{ marginRight: 4 }}
                        onChange={(e) => setBatchEnabled(e.target.checked)} /> 截止时间
                    </label>
                  </div>

                  {wizardSpecs && wizardSpecs.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                      {wizardSpecs.map((spec, si) => (
                        <Select key={si} allowClear placeholder={`全部${spec.name || `规格${si + 1}`}`} value={batchSpecFilters[si]}
                          options={spec.values.filter((v) => v.value).map((v) => ({ label: v.value, value: v.value }))}
                          onChange={(val) => {
                            setBatchSpecFilters((prev) => ({ ...prev, [si]: val }));
                            const allFilters = { ...batchSpecFilters, [si]: val };
                            const newKeys: string[] = [];
                            for (const row of deadlineSkus) {
                              const parts = row.specText.split(' | ');
                              let match = true;
                              for (const [k, filterVal] of Object.entries(allFilters)) {
                                if (filterVal && parts[Number(k)]?.split(':')[1] !== filterVal) { match = false; break; }
                              }
                              if (match) newKeys.push(row.key);
                            }
                            setBatchSelectedKeys(newKeys);
                          }} />
                      ))}
                    </div>
                  )}

                  <div style={{ marginBottom: 8 }}>
                    {hasDateSpec && (
                      <Radio.Group size="small" value={batchDeadlineMode} onChange={(e) => setBatchDeadlineMode(e.target.value)} disabled={!batchEnabled} style={{ marginBottom: 4 }}>
                        <Radio.Button value="fixed" style={{ fontSize: 11, padding: '0 8px' }}>指定时间</Radio.Button>
                        <Radio.Button value="relative" style={{ fontSize: 11, padding: '0 8px' }}>提前天数</Radio.Button>
                      </Radio.Group>
                    )}
                    {(!hasDateSpec || batchDeadlineMode === 'fixed') ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#666' }}>截止时间</span>
                        <DatePicker showTime placeholder="请选择" value={batchDeadline} onChange={(v) => setBatchDeadline(v)} disabled={!batchEnabled} style={{ opacity: batchEnabled ? 1 : 0.5 }} />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <InputNumber min={0} value={batchDeadlineDays} prefix="提前" disabled={!batchEnabled} style={{ width: 100, opacity: batchEnabled ? 1 : 0.5 }} onChange={(v) => setBatchDeadlineDays(v ?? 0)} />
                        <span style={{ fontSize: 12 }}>天</span>
                        <TimePicker value={batchDeadlineTime} format="HH:mm" disabled={!batchEnabled} style={{ opacity: batchEnabled ? 1 : 0.5 }} onChange={(v) => setBatchDeadlineTime(v)} placeholder="请选择" />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Button onClick={applyBatch}>应用设置</Button>
                    <span style={{ color: '#999', fontSize: 12 }}>已选 {batchSelectedKeys.length} 项</span>
                  </div>
                </div>
              )}

              <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
                <Table rowKey="key" size="small" pagination={false} scroll={{ y: 250 }} dataSource={deadlineSkus}
                  rowSelection={batchMode ? { columnWidth: 32, selectedRowKeys: batchSelectedKeys, onChange: (keys) => setBatchSelectedKeys(keys as string[]) } : undefined}
                  columns={[
                    { title: '规格组合', dataIndex: 'specText', key: 'specText', width: 250 },
                    { title: '截止时间', key: 'deadline', width: 200,
                      render: (_: any, r: any) => (
                        <DatePicker showTime
                          value={value.skuDeadlines[r.spec_indices] ? dayjs(value.skuDeadlines[r.spec_indices]) : null}
                          placeholder="请选择" style={{ width: '100%' }}
                          onChange={(v) => onChange({ ...value, skuDeadlines: { ...value.skuDeadlines, [r.spec_indices]: v ? v.format('YYYY-MM-DDTHH:mm:ssZ') : '' } })} />
                      ),
                    },
                  ]}
                />
              </div>
            </>
          )}
        </div>
      )}

      <RuleEditModal open={ruleModalOpen} onClose={() => setRuleModalOpen(false)} onSave={handleSaveRule} />
    </>
  );
};

export default RefundSettings;
