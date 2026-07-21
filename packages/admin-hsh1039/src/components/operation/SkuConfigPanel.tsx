import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Button, Select, Table, Input, InputNumber, Switch, Popconfirm, DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { productApi } from '../../api/services/product';
import { useAppNotification } from '@/hooks/useAppNotification';

// ---- Types ----
export interface SpecValue { id?: number; value: string; }
export interface SpecGroup { id?: number; name: string; values: SpecValue[]; is_time_type?: boolean; }
export interface SkuRow {
  key: string; spec_indices: string; specText: string;
  price: number; stock: number; status: number; skuId?: number;
}

export function cartesian(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  return cartesian(rest).flatMap((combo) => first.map((v) => [v, ...combo]));
}

export interface SkuConfigPanelHandle {
  save: () => Promise<boolean>;
  /** 获取当前 specs 和编辑中的 SKU 数据（key 为 specText，如 "票种:成人票 | 日期:2026-07-01"） */
  getState: () => {
    specs: SpecGroup[];
    /** specText → 编辑数据（价格/限额/上架），key 格式保证与保存时一致 */
    editedSkus: Record<string, Partial<SkuRow>>;
    /** API 加载的原始 SKU 数据 */
    loadedSkus: SkuRow[];
  };
}

export interface SkuConfigPanelProps {
  productId: number;
  /** 保存成功的回调 */
  onSaved?: () => void;
  /** 自定义底部按钮 */
  renderFooter?: (opts: { saving: boolean; handleSave: () => Promise<boolean> }) => React.ReactNode;
  /** 从向导返回时恢复的快照数据（有值时跳过 API 加载） */
  initialState?: { specs: SpecGroup[]; editedSkus: Record<string, Partial<SkuRow>> } | null;
  /** 门票模式：隐藏限额列、免费按钮、价格最小值0.01、stock默认99999 */
  ticketMode?: boolean;
  /** 商品模式：无免费、隐藏报名期限、stock标签"库存" */
  productMode?: boolean;
}

const SkuConfigPanel = forwardRef<SkuConfigPanelHandle, SkuConfigPanelProps>(
  function SkuConfigPanel({ productId, onSaved, renderFooter, initialState, ticketMode, productMode }, ref) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const originalSpecIdsRef = useRef<number[]>([]);
    const loadedPidRef = useRef<number>(0);
    const [specs, setSpecs] = useState<SpecGroup[]>([]);
    const [loadedSkus, setLoadedSkus] = useState<SkuRow[]>([]);
    const [editedSkus, setEditedSkus] = useState<Record<string, Partial<SkuRow>>>({});
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [batchMode, setBatchMode] = useState(false);
    const [batchPrice, setBatchPrice] = useState<number>(0);
    const [batchStock, setBatchStock] = useState<number>(0);
    const [batchStatus, setBatchStatus] = useState<number>(1);
    const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<number, string>>({});
    const [batchEnabled, setBatchEnabled] = useState({ price: true, stock: true, status: true });
    const { success, error: showError, warning } = useAppNotification();

    useEffect(() => {
      if (!productId) return;

      if (initialState) {
        // 从向导返回时恢复快照，不调 API
        setSpecs(initialState.specs);
        originalSpecIdsRef.current = initialState.specs.map((s) => s.id).filter(Boolean) as number[];
        setEditedSkus(initialState.editedSkus);
        setLoadedSkus([]);
        setLoading(false);
        return;
      }

      // ref 防 StrictMode 双重触发
      if (loadedPidRef.current === productId) return;
      loadedPidRef.current = productId;

      setLoading(true);
      setEditedSkus({});
      Promise.all([
        productApi.getSpecs(productId).catch(() => []),
        productApi.getSkus(productId).catch(() => []),
      ]).then(([specsRes, skusRes]: any[]) => {
        const loadedSpecs = (Array.isArray(specsRes) ? specsRes : []) as SpecGroup[];
        setSpecs(loadedSpecs);
        originalSpecIdsRef.current = loadedSpecs.map((s) => s.id).filter(Boolean) as number[];
        const list: any[] = Array.isArray(skusRes) ? skusRes : (skusRes?.list || []);
        setLoadedSkus(list.map((s: any) => ({
          key: String(s.id || Math.random()), spec_indices: s.spec_indices || '',
          specText: s.spec_text || s.spec_indices || '', price: s.price || 0,
          stock: s.stock || 0, status: s.status ?? 1, skuId: s.id,
        })));
      }).catch(() => { setSpecs([]); setLoadedSkus([]); })
      .finally(() => setLoading(false));
    }, [productId, initialState]);

    const generatedSkus = useMemo((): SkuRow[] => {
      if (specs.length === 0) return [];
      const names = specs.map((s) => s.name || '?');
      const valueArrays = specs.map((s) => s.values.map((v) => v.value || '?'));
      return cartesian(valueArrays).map((combo, idx) => {
        const specText = names.map((n, i) => `${n}:${combo[i]}`).join(' | ');
        const indices = specs.map((s, i) => {
          const vi = s.values.findIndex((v: any) => (v.value || v) === combo[i]);
          const val = s.values[vi >= 0 ? vi : 0] as any;
          return (val?.id ? String(val.id) : String(vi >= 0 ? vi : i));
        }).join('_');
        const existing = loadedSkus.find((s) => s.spec_indices === indices);
        const edits = editedSkus[specText] || {};
        return { key: `gen-${idx}`, spec_indices: indices, specText,
          price: edits.price ?? existing?.price ?? 0, stock: edits.stock ?? existing?.stock ?? (ticketMode ? 99999 : 0),
          status: edits.status ?? existing?.status ?? 1, skuId: existing?.skuId };
      });
    }, [specs, loadedSkus, editedSkus]);

  // 开启批量编辑时默认全选，关闭时清空
  const toggleBatchMode = useCallback((on: boolean) => {
    setBatchMode(on);
    if (on) {
      setSelectedRowKeys(generatedSkus.map((r) => r.key));
      setSelectedSpecFilters({});
    } else {
      setSelectedRowKeys([]);
      setSelectedSpecFilters({});
    }
  }, [generatedSkus]);

    const addSpec = () => setSpecs((prev) => [...prev, { name: '', values: [{ value: '' }, { value: '' }, { value: '' }] }]);
    const updateSpecName = (idx: number, name: string) => setSpecs((prev) => prev.map((s, i) => i === idx ? { ...s, name } : s));
    const updateSpecValue = (si: number, vi: number, value: string) =>
      setSpecs((prev) => prev.map((s, i) => i !== si ? s : { ...s, values: s.values.map((v, j) => j === vi ? { value } : v) }));
    const addSpecValue = (si: number) => setSpecs((prev) => prev.map((s, i) => i !== si ? s : { ...s, values: [...s.values, { value: '' }] }));
    const removeSpecValue = (si: number, vi: number) =>
      setSpecs((prev) => prev.map((s, i) => i !== si || s.values.length <= 1 ? s : { ...s, values: s.values.filter((_, j) => j !== vi) }));
    const removeSpec = (idx: number) => setSpecs((prev) => prev.filter((_, i) => i !== idx));

    const updateSku = (key: string, field: string, value: any) => {
      const row = generatedSkus.find((r) => r.key === key);
      if (!row) return;
      setEditedSkus((prev) => ({ ...prev, [row.specText]: { ...(prev[row.specText] || {}), [field]: value } }));
    };

    const batchUpdate = (field: string, value: any) => {
      if (selectedRowKeys.length === 0) { warning('请先选择SKU行'); return; }
      const textSet = new Set(generatedSkus.filter((r) => selectedRowKeys.includes(r.key)).map((r) => r.specText));
      setEditedSkus((prev) => { const next = { ...prev }; textSet.forEach((k) => { next[k] = { ...(next[k] || {}), [field]: value }; }); return next; });
    };

    const handleSave = async (): Promise<boolean> => {
      if (!productId) return false;
      try { setSaving(true);

        // 1. 清空全部 SKU
        await productApi.clearAllSkus(productId).catch(() => {});

        // 2. Upsert specs + 删除被移除的
        const payload = specs.map((s) => ({
          id: s.id, name: s.name, is_time_type: s.is_time_type || false,
          values: s.values.filter((v) => v.value).map((v: any) => ({ id: v.id, value: v.value })),
        })).filter((s) => s.name && s.values.length > 0);

        const newPayloadIds: number[] = [];
        for (let pi = 0; pi < payload.length; pi++) {
          const p = payload[pi], body: any = { name: p.name, is_time_type: p.is_time_type, values: p.values.map((v) => ({ value: v.value })) };
          if (p.id) { await productApi.updateSpec(productId, p.id, body); newPayloadIds.push(p.id); }
          else { const res: any = await productApi.createSpec(productId, body); if (res?.id) newPayloadIds.push(res.id); }
        }

        // 删除 orphan specs
        const toDelete = originalSpecIdsRef.current.filter((id) => !newPayloadIds.includes(id));
        for (const oldId of toDelete) {
          await productApi.deleteSpec(productId, oldId).catch(() => {});
        }

        // 3. 重新获取 specs 拿到最新的 value ID（PUT 不返回 values）
        const freshSpecs = (await productApi.getSpecs(productId).catch(() => [])) as any[];
        const freshList: any[] = Array.isArray(freshSpecs) ? freshSpecs : [];

        // 4. 全量重建 SKU（editedSkus 用 specText 做 key，直接查找）
        if (payload.length > 0 && freshList.length > 0) {
          const valueArrays = freshList.map((s: any) => (s.values || []).map((v: any) => v.value || '?'));
          const skuList: { price: number; spec_indices: string; stock?: number; status?: number }[] = [];

          for (const combo of cartesian(valueArrays)) {
            const idParts: string[] = [];
            const specText = freshList.map((s: any, si: number) => {
              const values = s.values || [];
              const vi = values.findIndex((v: any) => v.value === combo[si]);
              const val = values[vi >= 0 ? vi : 0] as any;
              idParts.push(String(val?.id ?? 0));
              return `${s.name || '?'}:${val?.value || combo[si]}`;
            }).join(' | ');
            const edits = editedSkus[specText] || {};
            skuList.push({
              spec_indices: idParts.join('_'),
              price: edits.price ?? 0,
              stock: edits.stock ?? (ticketMode ? 99999 : 0),
              status: edits.status ?? 1,
            });
          }
          if (skuList.length > 0) { await productApi.batchCreateSkus(productId, skuList); }
        }

        success('配置保存成功'); onSaved?.(); return true;
      } catch (err: any) { showError(err?.response?.data?.message || err?.message || '保存失败'); return false; }
      finally { setSaving(false); }
    };

    useImperativeHandle(ref, () => ({
      save: handleSave,
      getState: () => ({ specs, editedSkus, loadedSkus }),
    }), [handleSave, specs, editedSkus, loadedSkus]);

    const skuColumns: ColumnsType<SkuRow> = [
      { title: '规格组合', dataIndex: 'specText', key: 'specText', width: 200 },
      { title: '价格(元)', dataIndex: 'price', key: 'price', width: 160,
        render: (v: number, r: SkuRow) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InputNumber min={(ticketMode || productMode) ? 0.01 : 0} precision={2} value={v} prefix="￥" style={{ width: 110 }} onChange={(val) => updateSku(r.key, 'price', val ?? 0)} />
            {!(ticketMode || productMode) && (
              <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }}
                onClick={() => updateSku(r.key, 'price', 0)}>免费</Button>
            )}
          </span>
        ) },
      ...(ticketMode ? [] : [{ title: productMode ? '库存' : '限额', dataIndex: 'stock', key: 'stock', width: 140,
        render: (v: number, r: SkuRow) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InputNumber min={0} precision={0} value={v} style={{ width: 80 }} placeholder="不限"
              onChange={(val) => updateSku(r.key, 'stock', val ?? 0)} />
            {!productMode && <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }}
              onClick={() => updateSku(r.key, 'stock', 99999)}>不限</Button>}
          </span>
        ) }]),
      { title: '上架', dataIndex: 'status', key: 'status', width: 70,
        render: (v: number, r: SkuRow) => (<Switch checked={v === 1} checkedChildren="上架" unCheckedChildren="下架" onChange={(c) => updateSku(r.key, 'status', c ? 1 : 0)} />) },
    ];

    return (
      <div>
        <div style={{ background: '#fafafa', borderLeft: '3px solid #1677ff', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1677ff' }}>规格项目</div>
        {specs.map((spec, si) => (
          <div key={si} style={{ border: '1px solid #e8e8e8', borderRadius: 4, padding: 12, marginBottom: 12, background: '#f5f5f5', position: 'relative' }}>
            <Popconfirm title="确定删除此规格组？" onConfirm={() => removeSpec(si)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />}
                style={{ position: 'absolute', top: 8, right: 8 }} />
            </Popconfirm>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingRight: 32 }}>
              <span style={{ whiteSpace: 'nowrap' }}>项目：</span>
              {!(ticketMode || productMode) && (
              <Select value={spec.is_time_type ? 'date' : 'normal'} style={{ width: 80 }}
                options={[{ label: '普通', value: 'normal' }, { label: '日期', value: 'date' }]}
                onChange={(val) => {
                  const isDate = val === 'date';
                  if (isDate && specs.some((s, i) => i !== si && s.is_time_type)) {
                    warning('只能有一个日期类型的规格项目');
                    return;
                  }
                  setSpecs((prev) => prev.map((s, i) => ({
                    ...s,
                    is_time_type: i === si ? isDate : (isDate ? false : s.is_time_type),
                    values: i === si && isDate ? s.values.map((v) => dayjs(v.value).isValid() ? v : { value: '' }) : s.values,
                  })));
                }} />
              )}
              <Input value={spec.name} placeholder="请输入项目名称，如：票种" style={{ width: 260 }} onChange={(e) => updateSpecName(si, e.target.value)} maxLength={32} />
            </div>
            {/* 3 列网格 + 添加按钮 — 整体与上方下拉框左对齐 */}
            <div style={{ paddingLeft: 55 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginBottom: 8,
              }}>
                {spec.values.map((v, vi) => spec.is_time_type ? (
                  <div key={vi} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <DatePicker
                      value={v.value ? dayjs(v.value) : null}
                      style={{ flex: 1 }}
                      placeholder="选择日期"
                      onChange={(_, dateStr) => updateSpecValue(si, vi, typeof dateStr === 'string' ? dateStr : '')}
                    />
                    {spec.values.length > 1 && (
                      <DeleteOutlined
                        style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          removeSpecValue(si, vi);
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <Input key={vi} value={v.value} placeholder="如：成人票" style={{ flex: 1 }}
                    onChange={(e) => updateSpecValue(si, vi, e.target.value)} maxLength={64}
                    suffix={spec.values.length > 1 ? (
                      <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 12 }}
                        onClick={() => removeSpecValue(si, vi)} />
                    ) : undefined}
                  />
                ))}
              </div>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addSpecValue(si)}>添加项目值</Button>
            </div>
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={addSpec} style={{ marginBottom: 0, width: '100%' }}>添加规格项目</Button>
        </div>

        <div style={{ height: 1, background: '#e8e8e8', margin: '0 0 16px 0' }} />

        {/* ====== SKU 组合 ====== */}
        <div style={{ background: '#fafafa', borderLeft: '3px solid #722ed1', borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#722ed1' }}>SKU 组合</div>

        {/* SKU 标题行 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>共 {generatedSkus.length} 种</span>
          <Button type="link" size="small" onClick={() => toggleBatchMode(!batchMode)}>
            {batchMode ? '收起批量设置' : '批量设置'}
          </Button>
        </div>

        {/* 批量设置面板 */}
        {batchMode && (
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 12, marginBottom: 12, background: '#f5f5f5' }}>
            {/* 标题行 + 勾选设置项 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>批量设置</span>
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={batchEnabled.price} style={{ marginRight: 4 }}
                  onChange={(e) => setBatchEnabled((prev) => ({ ...prev, price: e.target.checked }))} />
                价格
              </label>
              {!ticketMode && (
                <label style={{ fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={batchEnabled.stock} style={{ marginRight: 4 }}
                    onChange={(e) => setBatchEnabled((prev) => ({ ...prev, stock: e.target.checked }))} />
                  限额
                </label>
              )}
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={batchEnabled.status} style={{ marginRight: 4 }}
                  onChange={(e) => setBatchEnabled((prev) => ({ ...prev, status: e.target.checked }))} />
                上架
              </label>
            </div>

            {/* 筛选区 */}
            {specs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {specs.map((spec, si) => (
                  <Select key={si} allowClear
                    placeholder={`全部${spec.name || `规格${si + 1}`}`}
                    value={selectedSpecFilters[si]}
                    options={spec.values.filter((v) => v.value).map((v) => ({ label: v.value, value: v.value }))}
                    onChange={(val) => {
                      setSelectedSpecFilters((prev) => ({ ...prev, [si]: val }));
                      const allFilters = { ...selectedSpecFilters, [si]: val };
                      const newKeys: string[] = [];
                      for (const row of generatedSkus) {
                        const parts = row.specText.split(' | ');
                        let match = true;
                        for (const [k, filterVal] of Object.entries(allFilters)) {
                          if (filterVal && parts[Number(k)]?.split(':')[1] !== filterVal) { match = false; break; }
                        }
                        if (match) newKeys.push(row.key);
                      }
                      setSelectedRowKeys(newKeys);
                    }}
                  />
                ))}
              </div>
            )}

            {/* 设置区 — 禁用项变灰 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <InputNumber min={0} precision={2} value={batchPrice} prefix="价格￥"
                  disabled={!batchEnabled.price}
                  style={{ flex: 1, opacity: batchEnabled.price ? 1 : 0.5 }} placeholder="价格" onChange={(v) => setBatchPrice(v ?? 0)} />
                {!(ticketMode || productMode) && batchEnabled.price && <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }}
                  onClick={() => setBatchPrice(0)}>免费</Button>}
              </span>
              {!ticketMode && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <InputNumber min={0} precision={0} value={batchStock} prefix={productMode ? "库存" : "限额"}
                    disabled={!batchEnabled.stock}
                    style={{ flex: 1, opacity: batchEnabled.stock ? 1 : 0.5 }} placeholder="不限" onChange={(v) => setBatchStock(v ?? 0)} />
                  {!productMode && batchEnabled.stock && <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }}
                    onClick={() => setBatchStock(99999)}>不限</Button>}
                </span>
              )}
              <Select value={batchStatus}
                disabled={!batchEnabled.status}
                style={{ opacity: batchEnabled.status ? 1 : 0.5 }}
                options={[{ label: '上架', value: 1 }, { label: '下架', value: 0 }]}
                onChange={(v) => setBatchStatus(v)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button onClick={() => {
                if (selectedRowKeys.length === 0) { warning('请先选择SKU行'); return; }
                if (batchEnabled.price) batchUpdate('price', batchPrice);
                if (batchEnabled.stock) batchUpdate('stock', batchStock);
                if (batchEnabled.status) batchUpdate('status', batchStatus);
              }}>应用设置</Button>
              <span style={{ color: '#999', fontSize: 12 }}>已选 {selectedRowKeys.length} 项</span>
            </div>
          </div>
        )}

        {/* SKU 表格 */}
        <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
        <Table loading={loading} rowKey="key" columns={skuColumns} dataSource={generatedSkus} size="small" pagination={false} scroll={{ y: 300 }}
          rowSelection={batchMode ? { columnWidth: 32, selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as string[]) } : undefined} />
        {renderFooter?.({ saving, handleSave })}
        </div>

        </div>
      </div>
    );
  }
);

export default SkuConfigPanel;
