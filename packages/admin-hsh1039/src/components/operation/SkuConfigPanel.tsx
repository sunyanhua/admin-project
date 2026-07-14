import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Button, Select, Table, Input, InputNumber, Switch, Divider, Popconfirm, DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { productApi } from '../../api/services/product';
import { useAppNotification } from '@/hooks/useAppNotification';

// ---- Types ----
interface SpecValue { id?: number; value: string; }
interface SpecGroup { id?: number; name: string; values: SpecValue[]; is_time_type?: boolean; }
interface SkuRow {
  key: string; spec_indices: string; specText: string;
  price: number; stock: number; status: number; skuId?: number;
}

function cartesian(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  return cartesian(rest).flatMap((combo) => first.map((v) => [v, ...combo]));
}

export interface SkuConfigPanelHandle {
  save: () => Promise<boolean>;
}

export interface SkuConfigPanelProps {
  productId: number;
  /** 保存成功的回调 */
  onSaved?: () => void;
  /** 自定义底部按钮 */
  renderFooter?: (opts: { saving: boolean; handleSave: () => Promise<boolean> }) => React.ReactNode;
}

const SkuConfigPanel = forwardRef<SkuConfigPanelHandle, SkuConfigPanelProps>(
  function SkuConfigPanel({ productId, onSaved, renderFooter }, ref) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const originalSpecIdsRef = useRef<number[]>([]);
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
      if (productId) {
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
      }
    }, [productId]);

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
        const edits = editedSkus[indices] || {};
        return { key: `gen-${idx}`, spec_indices: indices, specText,
          price: edits.price ?? existing?.price ?? 0, stock: edits.stock ?? existing?.stock ?? 0,
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
      setEditedSkus((prev) => ({ ...prev, [row.spec_indices]: { ...(prev[row.spec_indices] || {}), [field]: value } }));
    };

    const batchUpdate = (field: string, value: any) => {
      if (selectedRowKeys.length === 0) { warning('请先选择SKU行'); return; }
      const indicesSet = new Set(generatedSkus.filter((r) => selectedRowKeys.includes(r.key)).map((r) => r.spec_indices));
      setEditedSkus((prev) => { const next = { ...prev }; indicesSet.forEach((k) => { next[k] = { ...(next[k] || {}), [field]: value }; }); return next; });
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

        // 4. 全量重建 SKU
        if (payload.length > 0 && freshList.length > 0) {
          // 用 specText（规格值名称组合）在 generatedSkus 中查找用户编辑的价格/限额
          const skuByText = new Map<string, SkuRow>();
          for (const row of generatedSkus) { skuByText.set(row.specText, row); }

          const valueArrays = freshList.map((s: any) => (s.values || []).map((v: any) => v.value || '?'));
          const skuList: { price: number; spec_indices: string; stock?: number }[] = [];

          for (const combo of cartesian(valueArrays)) {
            const idParts: string[] = [];
            const specText = freshList.map((s: any, si: number) => {
              const values = s.values || [];
              const vi = values.findIndex((v: any) => v.value === combo[si]);
              const val = values[vi >= 0 ? vi : 0] as any;
              idParts.push(String(val?.id ?? 0));
              return `${s.name || '?'}:${val?.value || combo[si]}`;
            }).join(' | ');
            const row = skuByText.get(specText);
            skuList.push({ spec_indices: idParts.join('_'), price: row?.price || 0, stock: row?.stock || undefined });
          }
          if (skuList.length > 0) { await productApi.batchCreateSkus(productId, skuList); }
        }

        success('配置保存成功'); onSaved?.(); return true;
      } catch (err: any) { showError(err?.response?.data?.message || err?.message || '保存失败'); return false; }
      finally { setSaving(false); }
    };

    useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

    const skuColumns: ColumnsType<SkuRow> = [
      { title: '规格组合', dataIndex: 'specText', key: 'specText', width: 200 },
      { title: '价格(元)', dataIndex: 'price', key: 'price', width: 160,
        render: (v: number, r: SkuRow) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InputNumber min={0} precision={2} value={v} prefix="￥" style={{ width: 110 }} onChange={(val) => updateSku(r.key, 'price', val ?? 0)} />
            <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }}
              onClick={() => updateSku(r.key, 'price', 0)}>免费</Button>
          </span>
        ) },
      { title: '限额', dataIndex: 'stock', key: 'stock', width: 140,
        render: (v: number, r: SkuRow) => (
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InputNumber min={0} precision={0} value={v} style={{ width: 80 }} placeholder="不限"
              onChange={(val) => updateSku(r.key, 'stock', val ?? 0)} />
            <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }}
              onClick={() => updateSku(r.key, 'stock', 99999)}>不限</Button>
          </span>
        ) },
      { title: '上架', dataIndex: 'status', key: 'status', width: 70,
        render: (v: number, r: SkuRow) => (<Switch checked={v === 1} checkedChildren="上架" unCheckedChildren="下架" onChange={(c) => updateSku(r.key, 'status', c ? 1 : 0)} />) },
    ];

    return (
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>规格项目</div>
        {specs.map((spec, si) => (
          <div key={si} style={{ border: '1px solid #e8e8e8', borderRadius: 4, padding: 12, marginBottom: 12, background: '#f5f5f5', position: 'relative' }}>
            <Popconfirm title="确定删除此规格组？" onConfirm={() => removeSpec(si)}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />}
                style={{ position: 'absolute', top: 8, right: 8 }} />
            </Popconfirm>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingRight: 32 }}>
              <span style={{ whiteSpace: 'nowrap' }}>项目：</span>
              <Select value={spec.is_time_type ? 'date' : 'normal'} style={{ width: 80 }}
                options={[{ label: '普通', value: 'normal' }, { label: '日期', value: 'date' }]}
                onChange={(val) => {
                  const isDate = val === 'date';
                  setSpecs((prev) => prev.map((s, i) => i === si ? {
                    ...s,
                    is_time_type: isDate,
                    values: isDate ? s.values.map((v) => dayjs(v.value).isValid() ? v : { value: '' }) : s.values,
                  } : s));
                }} />
              <Input value={spec.name} placeholder="请输入项目名称，如：票种" style={{ width: 260 }} onChange={(e) => updateSpecName(si, e.target.value)} maxLength={32} />
            </div>
            {/* 3 列网格布局 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 8,
              paddingLeft: 16,
              paddingRight: 0,
            }}>
              {spec.values.map((v, vi) => spec.is_time_type ? (
                <DatePicker key={vi}
                  value={v.value ? dayjs(v.value) : null}
                  style={{ width: '100%' }}
                  placeholder="选择日期"
                  suffixIcon={
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 1, display: 'inline-block' }} />
                      <DeleteOutlined
                        hidden={spec.values.length <= 1}
                        style={{
                          color: '#ff4d4f',
                          cursor: 'pointer',
                          fontSize: 12,
                          display: spec.values.length > 1 ? 'inline' : 'none',
                        }}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          removeSpecValue(si, vi);
                        }}
                      />
                    </span>
                  }
                  onChange={(_, dateStr) => updateSpecValue(si, vi, typeof dateStr === 'string' ? dateStr : '')}
                />
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
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addSpecValue(si)} style={{ marginLeft: 16 }}>添加项目值</Button>
          </div>
        ))}
        <Button type="dashed" icon={<PlusOutlined />} onClick={addSpec} style={{ marginBottom: 16, width: '100%' }}>添加规格项目</Button>
        <Divider />

        {/* SKU 标题行 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 600 }}>SKU 组合（{generatedSkus.length} 种）</span>
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
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={batchEnabled.stock} style={{ marginRight: 4 }}
                  onChange={(e) => setBatchEnabled((prev) => ({ ...prev, stock: e.target.checked }))} />
                限额
              </label>
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
                {batchEnabled.price && <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }}
                  onClick={() => setBatchPrice(0)}>免费</Button>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <InputNumber min={0} precision={0} value={batchStock} prefix="限额"
                  disabled={!batchEnabled.stock}
                  style={{ flex: 1, opacity: batchEnabled.stock ? 1 : 0.5 }} placeholder="不限" onChange={(v) => setBatchStock(v ?? 0)} />
                {batchEnabled.stock && <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }}
                  onClick={() => setBatchStock(99999)}>不限</Button>}
              </span>
              <Select value={batchStatus}
                disabled={!batchEnabled.status}
                style={{ opacity: batchEnabled.status ? 1 : 0.5 }}
                options={[{ label: '上架', value: 1 }, { label: '下架', value: 0 }]}
                onChange={(v) => setBatchStatus(v)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button type="primary" onClick={() => {
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
    );
  }
);

export default SkuConfigPanel;
