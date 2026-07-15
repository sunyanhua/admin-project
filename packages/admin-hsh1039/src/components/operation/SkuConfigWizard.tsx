import { useState, useRef, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Button, Switch, Radio, Select, Table, DatePicker, TimePicker, InputNumber } from 'antd';
import ExtraInfoEditor, { ExtraInfoData } from './ExtraInfoEditor';
import type { ExtraInfoGroup } from './ExtraInfoEditor';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import SkuConfigPanel, {
  SkuConfigPanelHandle, SpecGroup, SkuRow, cartesian,
} from './SkuConfigPanel';
import { productApi } from '../../api/services/product';
import { useAppNotification } from '@/hooks/useAppNotification';

/** Step 2 中展示的 SKU 行 */
interface Step2SkuRow {
  key: string;
  spec_indices: string;
  specText: string;
  dateValue?: string;
  usable?: string | null;
  expiry?: string | null;
}

export interface SkuConfigWizardHandle {
  /** 当前步 (0-1) */
  currentStep: number;
  /** 是否正在保存 */
  saving: boolean;
  /** 进入下一步 */
  goNext: () => void;
  /** 返回上一步 */
  goPrev: () => void;
  /** 完成并执行全量保存，返回 true 表示成功 */
  finish: () => Promise<boolean>;
  /** 设置 steps 标签 */
  steps: { title: string }[];
}

export interface SkuConfigWizardProps {
  productId: number;
  /** 向导步骤标签 */
  stepLabels?: [string, string];
  /** 保存成功回调 */
  onSaved?: () => void;
  /** 步数变化回调 */
  onStepChange?: (step: number) => void;
}

const SkuConfigWizard = forwardRef<SkuConfigWizardHandle, SkuConfigWizardProps>(function SkuConfigWizard({
  productId, stepLabels, onSaved, onStepChange,
}, ref) {
  const [current, setCurrent] = useState(0);
  const panelRef = useRef<SkuConfigPanelHandle>(null);

  const [wizardSpecs, setWizardSpecs] = useState<SpecGroup[]>([]);
  const [wizardEditedSkus, setWizardEditedSkus] = useState<Record<string, Partial<SkuRow>>>({});
  const [step2Edits, setStep2Edits] = useState<Record<string, { usable?: string | null; expiry?: string | null }>>({});
  const [expiryMode, setExpiryMode] = useState<'unified' | 'individual'>('unified');
  const [unifiedUsable, setUnifiedUsable] = useState<Dayjs | null>(null);
  const [unifiedExpiry, setUnifiedExpiry] = useState<Dayjs | null>(null);
  const [isListed, setIsListed] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchUsable, setBatchUsable] = useState<Dayjs | null>(null);
  const [batchExpiry, setBatchExpiry] = useState<Dayjs | null>(null);
  const [batchEnabled, setBatchEnabled] = useState({ usable: true, expiry: true });
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<number, string>>({});
  const [batchUsableMode, setBatchUsableMode] = useState<'fixed' | 'relative'>('fixed');
  const [batchExpiryMode, setBatchExpiryMode] = useState<'fixed' | 'relative'>('fixed');
  const [batchUsableDays, setBatchUsableDays] = useState<number>(0);
  const [batchUsableTime, setBatchUsableTime] = useState<Dayjs | null>(null);
  const [batchExpiryDays, setBatchExpiryDays] = useState<number>(0);
  const [batchExpiryTime, setBatchExpiryTime] = useState<Dayjs | null>(null);

  // 报名附加信息
  const [extraInfo, setExtraInfo] = useState<ExtraInfoData>({ mode: 'none', groups: [] });
  // 各 SKU 的附加信息配置（仅 individual 模式）：spec_indices → [{groupKey, count}]
  const [extraFieldSkus, setExtraFieldSkus] = useState<Record<string, { groupKey: string; count: number }[]>>({});
  // 附加信息分配批量设置
  const [efBatchMode, setEfBatchMode] = useState(false);
  const [efBatchSelectedKeys, setEfBatchSelectedKeys] = useState<string[]>([]);
  const [efBatchEnabled, setEfBatchEnabled] = useState<Record<string, boolean>>({});
  const [efBatchValues, setEfBatchValues] = useState<Record<string, number>>({});
  const [efBatchSpecFilters, setEfBatchSpecFilters] = useState<Record<number, string>>({});

  // 敏感字段检测
  const hasSensitive = useMemo(() => {
    if (extraInfo.mode === 'none' || extraInfo.groups.length === 0) return false;
    return extraInfo.groups.some((g) =>
      g.fields.some((f) => f.format === 'mobile' || f.label === '身份证号' || f.label === '手机号'),
    );
  }, [extraInfo]);

  const dateSpecIndex = useMemo(() => wizardSpecs.findIndex((s) => s.is_time_type), [wizardSpecs]);
  const hasDateSpec = dateSpecIndex >= 0;

  const { success, error: showError, warning } = useAppNotification();

  // 将后端存储格式 [{name, config:[{name,type,...}]}] 还原为 ExtraInfoData
  const parseExtraInfoFromProduct = (detail: any): ExtraInfoData => {
    const raw: any[] = detail?.additional_fields_config;
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      return { mode: 'none', groups: [] };
    }
    const presetNames = ['姓名', '手机号', '性别', '年龄', '工作单位'];
    let gk = 0;
    const groups: ExtraInfoGroup[] = raw.map((g: any) => ({
      key: `g_restore_${++gk}_${Date.now()}`,
      name: g.name || '',
      fields: (g.config || []).map((f: any, fi: number) => ({
        key: `f_restore_${fi}_${Date.now()}`,
        label: f.name || '',
        type: f.type || 'text',
        required: f.required === true,
        format: f.format || '',
        options: f.options || undefined,
        preset: presetNames.includes(f.name),
      })),
    }));
    return { mode: groups.length === 1 ? 'unified' : 'individual', groups };
  };

  // 加载产品状态（ref 防 StrictMode 双重触发）
  const loadedPidRef = useRef<number>(0);

  useEffect(() => {
    if (productId && loadedPidRef.current !== productId) {
      loadedPidRef.current = productId;
      setCurrent(0);
      setStep2Edits({});
      setExpiryMode('unified');
      setSelectedRowKeys([]);
      setBatchMode(false);
      setExtraFieldSkus({});
      productApi.getProductDetail(productId).then((detail: any) => {
        setIsListed(detail?.is_listed === true);
        if (detail?.usable) setUnifiedUsable(dayjs(detail.usable));
        else setUnifiedUsable(null);
        if (detail?.expiry) setUnifiedExpiry(dayjs(detail.expiry));
        else setUnifiedExpiry(null);
        // 还原已保存的附加信息库
        setExtraInfo(parseExtraInfoFromProduct(detail));
      }).catch(() => {});
    }
  }, [productId]);

  // memoize 传给 SkuConfigPanel 的初始状态
  const panelInitialState = useMemo(() => {
    if (wizardSpecs.length === 0) return null;
    return { specs: wizardSpecs, editedSkus: wizardEditedSkus };
  }, [wizardSpecs, wizardEditedSkus]);

  // Step 2 SKU 列表
  const step2Skus = useMemo((): Step2SkuRow[] => {
    if (wizardSpecs.length === 0) return [];
    const names = wizardSpecs.map((s) => s.name || '?');
    const valueArrays = wizardSpecs.map((s) => s.values.map((v) => v.value || '?'));

    return cartesian(valueArrays).map((combo, idx) => {
      const specText = names.map((n, i) => `${n}:${combo[i]}`).join(' | ');
      const indices = wizardSpecs.map((s, si) => {
        const vi = s.values.findIndex((v) => v.value === combo[si]);
        const val = s.values[vi >= 0 ? vi : 0];
        return (val?.id ? String(val.id) : String(vi >= 0 ? vi : si));
      }).join('_');
      const dateValue = hasDateSpec ? combo[dateSpecIndex] : undefined;
      const s2e = step2Edits[indices] || {};
      return {
        key: `step2-${idx}`, spec_indices: indices, specText, dateValue,
        usable: s2e.usable != null ? s2e.usable : undefined,
        expiry: s2e.expiry != null ? s2e.expiry : undefined,
      };
    });
  }, [wizardSpecs, step2Edits, hasDateSpec, dateSpecIndex]);

  const handleNext = () => {
    const state = panelRef.current?.getState();
    if (!state) return;
    const validSpecs = state.specs.filter((s) => s.name.trim() && s.values.some((v) => v.value.trim()));
    if (validSpecs.length === 0) { warning('请至少配置一个有效的规格项目'); return; }
    setWizardSpecs(validSpecs);

    // 重映射 editedSkus key：过滤掉无效 spec 对应的部分
    const filteredEdited: Record<string, Partial<SkuRow>> = {};
    for (const [oldKey, edits] of Object.entries(state.editedSkus)) {
      const parts = oldKey.split(' | ');
      // 只保留在 validSpecs 中的 spec（通过名称匹配）
      const newParts: string[] = [];
      for (let i = 0; i < parts.length; i++) {
        const [name] = parts[i].split(':');
        if (validSpecs.some((s) => s.name === name)) {
          newParts.push(parts[i]);
        }
      }
      if (newParts.length > 0) {
        filteredEdited[newParts.join(' | ')] = edits;
      }
    }
    setWizardEditedSkus(filteredEdited);
    setStep2Edits({});
    setBatchMode(false);
    setSelectedRowKeys([]);
    setSelectedSpecFilters({});
    setCurrent(1);
    onStepChange?.(1);
  };

  const handlePrev = () => { setCurrent(0); onStepChange?.(0); };

  const updateStep2Sku = (specIndices: string, field: 'usable' | 'expiry', value: string | null) => {
    setStep2Edits((prev) => ({ ...prev, [specIndices]: { ...(prev[specIndices] || {}), [field]: value } }));
  };

  const computeRelativeTime = (dateValue: string | undefined, days: number, time: Dayjs | null): string | null => {
    if (!dateValue || days == null) return null;
    const date = dayjs(dateValue);
    if (!date.isValid()) return null;
    const result = date.subtract(days, 'day');
    if (time) return result.hour(time.hour()).minute(time.minute()).second(0).format('YYYY-MM-DDTHH:mm:ssZ');
    return result.format('YYYY-MM-DDTHH:mm:ssZ');
  };

  const applyStep2Batch = () => {
    if (selectedRowKeys.length === 0) { warning('请先选择SKU行'); return; }
    const selectedSkus = step2Skus.filter((r) => selectedRowKeys.includes(r.key));
    setStep2Edits((prev) => {
      const next = { ...prev };
      for (const row of selectedSkus) {
        const edits: { usable?: string | null; expiry?: string | null } = {};
        if (batchEnabled.usable) {
          edits.usable = (hasDateSpec && batchUsableMode === 'relative')
            ? computeRelativeTime(row.dateValue, batchUsableDays, batchUsableTime)
            : batchUsable ? batchUsable.format('YYYY-MM-DDTHH:mm:ssZ') : null;
        }
        if (batchEnabled.expiry) {
          edits.expiry = (hasDateSpec && batchExpiryMode === 'relative')
            ? computeRelativeTime(row.dateValue, batchExpiryDays, batchExpiryTime)
            : batchExpiry ? batchExpiry.format('YYYY-MM-DDTHH:mm:ssZ') : null;
        }
        next[row.spec_indices] = { ...(next[row.spec_indices] || {}), ...edits };
      }
      return next;
    });
  };

  // ---- 附加信息分配批量应用 ----
  const applyEfBatch = () => {
    if (efBatchSelectedKeys.length === 0) { warning('请先选择SKU行'); return; }
    const selectedSkus = step2Skus.filter((r) => efBatchSelectedKeys.includes(r.key));
    setExtraFieldSkus((prev) => {
      const next = { ...prev };
      for (const row of selectedSkus) {
        const existing = prev[row.spec_indices] || [];
        const merged = new Map<string, number>();
        for (const e of existing) merged.set(e.groupKey, e.count);
        for (const g of extraInfo.groups) {
          if (efBatchEnabled[g.key] && efBatchValues[g.key] != null) {
            const val = efBatchValues[g.key];
            if (val > 0) merged.set(g.key, val);
            else merged.delete(g.key);
          }
        }
        next[row.spec_indices] = Array.from(merged.entries()).map(([groupKey, count]) => ({ groupKey, count }));
      }
      return next;
    });
  };

  const handleFinish = async (): Promise<boolean> => {
    if (!productId) return false;

    // 统一模式必须且仅需1个附加信息库
    if (extraInfo.mode === 'unified' && extraInfo.groups.length !== 1) {
      warning(extraInfo.groups.length === 0
        ? '全部项目统一下，请先添加一个附加信息库'
        : '全部项目统一下，仅需一个附加信息库，请删除多余信息库');
      return false;
    }

    try {
      setSaving(true);

      // 0. 清空前先读取现有 SKU 数据，作为价格/限额/状态的兜底
      let existingByIndices = new Map<string, { price: number; stock: number; status: number }>();
      try {
        const raw: any = await productApi.getSkus(productId);
        const arr: any[] = Array.isArray(raw) ? raw : (raw?.list || []);
        for (const s of arr) existingByIndices.set(s.spec_indices || '', { price: s.price || 0, stock: s.stock || 0, status: s.status ?? 1 });
      } catch { /* ignore */ }

      await productApi.clearAllSkus(productId);

      const payload = wizardSpecs
        .filter((s) => s.name.trim() && s.values.some((v) => v.value.trim()))
        .map((s) => ({
          id: s.id, name: s.name, is_time_type: s.is_time_type || false,
          values: s.values.filter((v) => v.value).map((v: any) => ({ id: v.id, value: v.value })),
        }));

      const originalSpecIds: number[] = [];
      try {
        const origSpecs: any = await productApi.getSpecs(productId);
        (Array.isArray(origSpecs) ? origSpecs : []).forEach((s: any) => { if (s.id) originalSpecIds.push(s.id); });
      } catch { /* ignore */ }

      const newPayloadIds: number[] = [];
      for (const p of payload) {
        const body: any = { name: p.name, is_time_type: p.is_time_type, values: p.values.map((v) => ({ value: v.value })) };
        if (p.id) { await productApi.updateSpec(productId, p.id, body); newPayloadIds.push(p.id); }
        else { const res: any = await productApi.createSpec(productId, body); if (res?.id) newPayloadIds.push(res.id); }
      }
      for (const oldId of originalSpecIds.filter((id) => !newPayloadIds.includes(id))) {
        await productApi.deleteSpec(productId, oldId).catch(() => {});
      }

      const freshSpecs: any = await productApi.getSpecs(productId);
      const freshList: any[] = Array.isArray(freshSpecs) ? freshSpecs : [];

      if (payload.length > 0 && freshList.length > 0) {
        const step2IndicesToText = new Map<string, string>();
        for (const row of step2Skus) step2IndicesToText.set(row.spec_indices, row.specText);
        const textToStep2 = new Map<string, { usable?: string | null; expiry?: string | null }>();
        for (const [oldIndices, edits] of Object.entries(step2Edits)) {
          const text = step2IndicesToText.get(oldIndices);
          if (text) textToStep2.set(text, edits);
        }
        // 将清空前读到的现有 SKU 数据转为 specText key（兜底价格/限额/状态）
        const existingByText = new Map<string, { price: number; stock: number; status: number }>();
        for (const [oldIndices, data] of existingByIndices.entries()) {
          const text = step2IndicesToText.get(oldIndices);
          if (text) existingByText.set(text, data);
        }
        // 同样为 extraFieldSkus 建立 specText 桥接
        const textToExtraFields = new Map<string, { groupKey: string; count: number }[]>();
        for (const [oldIndices, cfg] of Object.entries(extraFieldSkus)) {
          const text = step2IndicesToText.get(oldIndices);
          if (text) textToExtraFields.set(text, cfg);
        }

        const valueArrays = freshList.map((s: any) => (s.values || []).map((v: any) => v.value || '?'));
        // 附加信息 — 统一模式取全部 groups，单独模式按 SKU 各自配置+数量展开
        const isExtraUnified = extraInfo.mode === 'unified';
        const unifiedExtraFields = isExtraUnified
          ? extraInfo.groups.map((g) => ({
            name: g.name,
            config: g.fields.map(({ key, preset, ...rest }) => rest),
          }))
          : null;

        const skuList: {
          price: number; spec_indices: string; stock?: number; status?: number;
          usable?: string | null; expiry?: string | null;
          additional_fields_config?: any;
        }[] = [];

        for (const combo of cartesian(valueArrays)) {
          const idParts: string[] = [];
          const specTextParts: string[] = [];
          freshList.forEach((s: any, si: number) => {
            const values = s.values || [];
            const vi = values.findIndex((v: any) => v.value === combo[si]);
            const val = values[vi >= 0 ? vi : 0];
            idParts.push(String(val?.id ?? 0));
            specTextParts.push(`${s.name || '?'}:${val?.value || combo[si]}`);
          });
          const specText = specTextParts.join(' | ');

          // 价格/限额/状态：wizardEditedSkus（用户编辑） > 现有 SKU 数据（兜底） > 默认值
          const wEdits = wizardEditedSkus[specText];
          const existing = existingByText.get(specText);
          const price = wEdits?.price ?? existing?.price ?? 0;
          const stock = wEdits?.stock ?? existing?.stock ?? 0;
          const status = wEdits?.status ?? existing?.status ?? 1;

          let usable: string | null = null, expiry: string | null = null;
          if (expiryMode === 'unified') {
            usable = unifiedUsable ? unifiedUsable.format('YYYY-MM-DDTHH:mm:ssZ') : null;
            expiry = unifiedExpiry ? unifiedExpiry.format('YYYY-MM-DDTHH:mm:ssZ') : null;
          } else {
            const s2e = textToStep2.get(specText) || {};
            usable = s2e.usable || null;
            expiry = s2e.expiry || null;
          }
          // 附加信息配置
          let afc = null;
          if (unifiedExtraFields) {
            afc = unifiedExtraFields;
          } else if (extraInfo.mode === 'individual') {
            const skuCfg = textToExtraFields.get(specText);
            if (skuCfg && skuCfg.length > 0) {
              // 展开为 [{name:'成人1', config}, {name:'成人2', config}]
              afc = [];
              for (const c of skuCfg) {
                const g = extraInfo.groups.find((grp) => grp.key === c.groupKey);
                if (!g || c.count <= 0) continue;
                const strippedConfig = g.fields.map(({ key, preset, ...rest }) => rest);
                for (let i = 1; i <= c.count; i++) {
                  afc.push({
                    name: c.count > 1 ? `${g.name}${i}` : g.name,
                    config: strippedConfig,
                  });
                }
              }
              if (afc.length === 0) afc = null;
            }
          }

          skuList.push({ spec_indices: idParts.join('_'), price, stock, status, usable, expiry, additional_fields_config: afc });
        }
        if (skuList.length > 0) await productApi.batchCreateSkus(productId, skuList);
      }

      // 5. 合并更新产品：usable + expiry + 附加信息 + 上下架（一次 PUT）
      const toStorageGroup = (g: ExtraInfoGroup) => ({
        name: g.name,
        config: g.fields.map(({ key, preset, ...rest }) => rest),
      });

      const unifiedUsableStr = unifiedUsable ? unifiedUsable.format('YYYY-MM-DDTHH:mm:ssZ') : null;
      const unifiedExpiryStr = unifiedExpiry ? unifiedExpiry.format('YYYY-MM-DDTHH:mm:ssZ') : null;

      await productApi.updateProduct(productId, {
        usable: expiryMode === 'unified' ? (unifiedUsableStr || null) : null,
        expiry: expiryMode === 'unified' ? (unifiedExpiryStr || null) : null,
        additional_fields_config: extraInfo.mode !== 'none' && extraInfo.groups.length > 0
          ? extraInfo.groups.map(toStorageGroup)
          : null,
        additional_fields_has_sensitive: hasSensitive,
        is_listed: isListed,
      });

      success('配置已保存');
      onSaved?.();
      return true;
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || '保存失败');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ---- 向导步骤定义 ----
  const steps = [{ title: stepLabels?.[0] || '项目配置' }, { title: stepLabels?.[1] || '上架管理' }];

  useImperativeHandle(ref, () => ({
    get currentStep() { return current; },
    get saving() { return saving; },
    goNext: handleNext,
    goPrev: handlePrev,
    finish: handleFinish,
    steps,
  }), [current, saving, handleNext, handlePrev, handleFinish]);

  // ---- Step 2 SKU 表格列 ----
  const skuColumns: ColumnsType<Step2SkuRow> = [
    { title: '规格组合', dataIndex: 'specText', key: 'specText', width: 200 },
    { title: '开始时间', dataIndex: 'usable', key: 'usable', width: 200,
      render: (v: string | undefined, r: Step2SkuRow) => (
        <DatePicker showTime value={v ? dayjs(v) : null} placeholder="不限" style={{ width: '100%' }}
          onChange={(_, dateStr) => updateStep2Sku(r.spec_indices, 'usable', typeof dateStr === 'string' ? dateStr : null)} />
      ),
    },
    { title: '截止时间', dataIndex: 'expiry', key: 'expiry', width: 200,
      render: (v: string | undefined, r: Step2SkuRow) => (
        <DatePicker showTime value={v ? dayjs(v) : null} placeholder="不限" style={{ width: '100%' }}
          onChange={(_, dateStr) => updateStep2Sku(r.spec_indices, 'expiry', typeof dateStr === 'string' ? dateStr : '')} />
      ),
    },
  ];

  // ---- 渲染 ----
  return (
    <>
      {/* ====== 项目配置 ====== */}
      {current === 0 && (
        <SkuConfigPanel ref={panelRef} productId={productId} initialState={panelInitialState} />
      )}

      {/* ====== 上架管理 ====== */}
      {current === 1 && (
        <div style={{ padding: '0 4px' }}>

          {/* ====== 报名期限 ====== */}
          <div style={{ background: '#fafafa', borderLeft: '3px solid #1677ff', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1677ff' }}>报名期限</div>
            <Radio.Group value={expiryMode} onChange={(e) => setExpiryMode(e.target.value)} style={{ marginBottom: expiryMode === 'unified' ? 0 : 12 }}>
              <Radio.Button value="unified">全部项目统一</Radio.Button>
              <Radio.Button value="individual">各项目单独设置</Radio.Button>
            </Radio.Group>

            {expiryMode === 'unified' && (
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>开始时间</span>
                  <DatePicker showTime value={unifiedUsable} placeholder="不限" onChange={(v) => setUnifiedUsable(v)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ whiteSpace: 'nowrap' }}>截止时间</span>
                  <DatePicker showTime value={unifiedExpiry} placeholder="不限" onChange={(v) => setUnifiedExpiry(v)} />
                </div>
              </div>
            )}

            {expiryMode === 'individual' && (
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>SKU 组合（{step2Skus.length} 种）</span>
                  <Button type="link" size="small" onClick={() => {
                    const next = !batchMode;
                    setBatchMode(next);
                    if (next) { setSelectedRowKeys(step2Skus.map((s) => s.key)); setSelectedSpecFilters({}); }
                    else { setSelectedRowKeys([]); setSelectedSpecFilters({}); }
                  }}>{batchMode ? '收起批量设置' : '批量设置'}</Button>
                </div>

                {batchMode && (
                  <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 12, marginBottom: 12, background: '#f5f5f5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>批量设置</span>
                      <label style={{ fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={batchEnabled.usable} style={{ marginRight: 4 }} onChange={(e) => setBatchEnabled((prev) => ({ ...prev, usable: e.target.checked }))} /> 开始时间
                      </label>
                      <label style={{ fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={batchEnabled.expiry} style={{ marginRight: 4 }} onChange={(e) => setBatchEnabled((prev) => ({ ...prev, expiry: e.target.checked }))} /> 截止时间
                      </label>
                    </div>

                    {wizardSpecs.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                        {wizardSpecs.map((spec, si) => (
                          <Select key={si} allowClear placeholder={`全部${spec.name || `规格${si + 1}`}`} value={selectedSpecFilters[si]}
                            options={spec.values.filter((v) => v.value).map((v) => ({ label: v.value, value: v.value }))}
                            onChange={(val) => {
                              setSelectedSpecFilters((prev) => ({ ...prev, [si]: val }));
                              const allFilters = { ...selectedSpecFilters, [si]: val };
                              const newKeys: string[] = [];
                              for (const row of step2Skus) {
                                const parts = row.specText.split(' | ');
                                let match = true;
                                for (const [k, filterVal] of Object.entries(allFilters)) {
                                  if (filterVal && parts[Number(k)]?.split(':')[1] !== filterVal) { match = false; break; }
                                }
                                if (match) newKeys.push(row.key);
                              }
                              setSelectedRowKeys(newKeys);
                            }} />
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
                      <div style={{ opacity: batchEnabled.usable ? 1 : 0.5 }}>
                        {hasDateSpec && (
                          <Radio.Group size="small" value={batchUsableMode} onChange={(e) => setBatchUsableMode(e.target.value)} disabled={!batchEnabled.usable} style={{ marginBottom: 4 }}>
                            <Radio.Button value="fixed" style={{ fontSize: 11, padding: '0 8px' }}>指定日期</Radio.Button>
                            <Radio.Button value="relative" style={{ fontSize: 11, padding: '0 8px' }}>提前天数</Radio.Button>
                          </Radio.Group>
                        )}
                        {(!hasDateSpec || batchUsableMode === 'fixed') ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#666' }}>开始时间</span>
                            <DatePicker showTime placeholder="不限" value={batchUsable} onChange={(v) => setBatchUsable(v)} disabled={!batchEnabled.usable} style={{ flex: 1 }} />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <InputNumber min={0} value={batchUsableDays} prefix="提前" disabled={!batchEnabled.usable} style={{ width: 100 }} onChange={(v) => setBatchUsableDays(v ?? 0)} />
                            <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>天</span>
                            <TimePicker value={batchUsableTime} format="HH:mm" disabled={!batchEnabled.usable} style={{ flex: 1 }} onChange={(v) => setBatchUsableTime(v)} placeholder="时间" />
                          </div>
                        )}
                      </div>
                      <div style={{ opacity: batchEnabled.expiry ? 1 : 0.5 }}>
                        {hasDateSpec && (
                          <Radio.Group size="small" value={batchExpiryMode} onChange={(e) => setBatchExpiryMode(e.target.value)} disabled={!batchEnabled.expiry} style={{ marginBottom: 4 }}>
                            <Radio.Button value="fixed" style={{ fontSize: 11, padding: '0 8px' }}>指定日期</Radio.Button>
                            <Radio.Button value="relative" style={{ fontSize: 11, padding: '0 8px' }}>提前天数</Radio.Button>
                          </Radio.Group>
                        )}
                        {(!hasDateSpec || batchExpiryMode === 'fixed') ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#666' }}>截止时间</span>
                            <DatePicker showTime placeholder="不限" value={batchExpiry} onChange={(v) => setBatchExpiry(v)} disabled={!batchEnabled.expiry} style={{ flex: 1 }} />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <InputNumber min={0} value={batchExpiryDays} prefix="提前" disabled={!batchEnabled.expiry} style={{ width: 100 }} onChange={(v) => setBatchExpiryDays(v ?? 0)} />
                            <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>天</span>
                            <TimePicker value={batchExpiryTime} format="HH:mm" disabled={!batchEnabled.expiry} style={{ flex: 1 }} onChange={(v) => setBatchExpiryTime(v)} placeholder="时间" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <Button onClick={applyStep2Batch}>应用设置</Button>
                      <span style={{ color: '#999', fontSize: 12 }}>已选 {selectedRowKeys.length} 项</span>
                    </div>
                  </div>
                )}

                <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
                  <Table rowKey="key" columns={skuColumns} dataSource={step2Skus} size="small" pagination={false} scroll={{ y: 280 }}
                    rowSelection={batchMode ? { columnWidth: 32, selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as string[]) } : undefined} />
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 1, background: '#e8e8e8', margin: '0 0 16px 0' }} />

          {/* ====== 报名附加信息 ====== */}
          <div style={{ background: '#fafafa', borderLeft: '3px solid #1677ff', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1677ff' }}>报名附加信息</div>
            <ExtraInfoEditor value={extraInfo} onChange={setExtraInfo} />
          </div>

          {/* SKU 附加信息配置表格（仅"各项目单独设置"时显示） */}
          {extraInfo.mode === 'individual' && extraInfo.groups.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600 }}>SKU 附加信息配置（{step2Skus.length} 种）</span>
                    <Button type="link" size="small" onClick={() => {
                      const next = !efBatchMode;
                      setEfBatchMode(next);
                      if (next) {
                        setEfBatchSelectedKeys(step2Skus.map((s) => s.key));
                        setEfBatchSpecFilters({});
                        const en: Record<string, boolean> = {};
                        const vals: Record<string, number> = {};
                        for (const g of extraInfo.groups) { en[g.key] = true; vals[g.key] = 0; }
                        setEfBatchEnabled(en);
                        setEfBatchValues(vals);
                      } else {
                        setEfBatchSelectedKeys([]);
                        setEfBatchSpecFilters({});
                      }
                    }}>
                      {efBatchMode ? '收起批量设置' : '批量设置'}
                    </Button>
                  </div>

                  {/* 批量设置面板 */}
                  {efBatchMode && (
                    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 12, marginBottom: 12, background: '#f5f5f5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600 }}>批量设置</span>
                        {extraInfo.groups.map((g) => (
                          <label key={g.key} style={{ fontSize: 13, cursor: 'pointer' }}>
                            <input type="checkbox" checked={efBatchEnabled[g.key] || false} style={{ marginRight: 4 }}
                              onChange={(e) => setEfBatchEnabled((prev) => ({ ...prev, [g.key]: e.target.checked }))} />
                            {g.name}
                          </label>
                        ))}
                      </div>

                      {/* 筛选区 */}
                      {wizardSpecs.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                          {wizardSpecs.map((spec, si) => (
                            <Select key={si} allowClear placeholder={`全部${spec.name || `规格${si + 1}`}`} value={efBatchSpecFilters[si]}
                              options={spec.values.filter((v) => v.value).map((v) => ({ label: v.value, value: v.value }))}
                              onChange={(val) => {
                                setEfBatchSpecFilters((prev) => ({ ...prev, [si]: val }));
                                const allFilters = { ...efBatchSpecFilters, [si]: val };
                                const newKeys: string[] = [];
                                for (const row of step2Skus) {
                                  const parts = row.specText.split(' | ');
                                  let match = true;
                                  for (const [k, filterVal] of Object.entries(allFilters)) {
                                    if (filterVal && parts[Number(k)]?.split(':')[1] !== filterVal) { match = false; break; }
                                  }
                                  if (match) newKeys.push(row.key);
                                }
                                setEfBatchSelectedKeys(newKeys);
                              }} />
                          ))}
                        </div>
                      )}

                      {/* 设置区 — 禁用项变灰 */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                        {extraInfo.groups.map((g) => (
                          <InputNumber key={g.key} min={0} max={99}
                            value={efBatchValues[g.key] ?? 0} prefix={g.name}
                            disabled={!efBatchEnabled[g.key]}
                            style={{ width: '100%', opacity: efBatchEnabled[g.key] ? 1 : 0.5 }}
                            onChange={(v) => setEfBatchValues((prev) => ({ ...prev, [g.key]: v ?? 0 }))} />
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Button onClick={applyEfBatch}>应用设置</Button>
                        <span style={{ color: '#999', fontSize: 12 }}>已选 {efBatchSelectedKeys.length} 项</span>
                      </div>
                    </div>
                  )}

                  {/* SKU 表格：规格组合 + 每信息库一列（数量） */}
                  <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
                    <Table rowKey="key" size="small" pagination={false} scroll={{ y: 280 }}
                      dataSource={step2Skus}
                      rowSelection={efBatchMode ? { columnWidth: 32, selectedRowKeys: efBatchSelectedKeys, onChange: (keys) => setEfBatchSelectedKeys(keys as string[]) } : undefined}
                      columns={[
                        { title: '规格组合', dataIndex: 'specText', key: 'specText', width: 200 },
                        ...extraInfo.groups.map((g) => ({
                          title: g.name,
                          key: g.key,
                          width: 120,
                          render: (_: any, r: Step2SkuRow) => {
                            const cfg = extraFieldSkus[r.spec_indices] || [];
                            const entry = cfg.find((c) => c.groupKey === g.key);
                            return (
                              <InputNumber min={0} max={99} size="small" style={{ width: 70 }}
                                value={entry?.count || 0}
                                onChange={(val) => {
                                  setExtraFieldSkus((prev) => {
                                    const next = { ...prev };
                                    const cur = [...(next[r.spec_indices] || [])];
                                    const idx = cur.findIndex((c) => c.groupKey === g.key);
                                    if (idx >= 0) {
                                      if (val === 0 || val == null) cur.splice(idx, 1);
                                      else cur[idx] = { groupKey: g.key, count: val };
                                    } else if (val && val > 0) {
                                      cur.push({ groupKey: g.key, count: val });
                                    }
                                    next[r.spec_indices] = cur;
                                    return next;
                                  });
                                }} />
                            );
                          },
                        })),
                      ]}
                    />
                  </div>
                  <div style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
                    注：数量为 0 表示该 SKU 不要求填写此附加信息库
                  </div>
            </div>
          )}

          <div style={{ height: 1, background: '#e8e8e8', margin: '0 0 16px 0' }} />

          {/* ====== 是否上架 ====== */}
          <div style={{ background: '#fafafa', borderLeft: '3px solid #fa8c16', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#fa8c16' }}>是否上架</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Switch checked={isListed} checkedChildren="上架" unCheckedChildren="下架" onChange={(checked) => setIsListed(checked)} />
              <span style={{ color: '#666', fontSize: 13 }}>{isListed ? '活动已上架，用户可看到并购买' : '活动已下架，用户无法看到'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default SkuConfigWizard;
