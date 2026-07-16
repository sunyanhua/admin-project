import { useState, useEffect, useMemo, useCallback } from 'react';
import { App, Button, Radio, Space, Table, InputNumber, Switch, Select, DatePicker, TimePicker } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { productApi } from '../../api/services/product';
import { useAppNotification } from '@/hooks/useAppNotification';

// ==================== Types ====================

interface SpecInfo { name: string; values: { id: number; value: string }[]; is_time_type?: boolean; }

interface SkuItem {
  key: string; id: number; specText: string; specParts: string[];
  price: number; stock: number; status: number;
  usable?: string | null; expiry?: string | null; additional_fields_config?: any[] | null;
}

type SkuEdits = {
  price?: number; stock?: number; status?: number;
  usable?: string | null; expiry?: string | null;
  additional_fields_config?: any[] | null;
};

export interface SkuPriceModalProps {
  visible: boolean; productId: number; productTitle: string;
  onClose: () => void; onSuccess?: () => void; onEnterFullConfig?: () => void;
}

// ==================== 单 SKU 完整编辑弹窗 ====================

const SkuFullEditModal: React.FC<{
  open: boolean; sku: SkuItem | null; productGroups: any[];
  onClose: () => void; onApply: (key: string, edits: SkuEdits) => void;
}> = ({ open, sku, productGroups, onClose, onApply }) => {
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [status, setStatus] = useState(1);
  const [usable, setUsable] = useState<Dayjs | null>(null);
  const [expiry, setExpiry] = useState<Dayjs | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open && sku) {
      setPrice(sku.price);
      setStock(sku.stock);
      setStatus(sku.status);
      setUsable(sku.usable ? dayjs(sku.usable) : null);
      setExpiry(sku.expiry ? dayjs(sku.expiry) : null);
      const map: Record<string, number> = {};
      for (const g of productGroups) map[g.name] = 0;
      for (const f of (sku.additional_fields_config || [])) {
        map[f.name] = typeof f.num === 'number' ? f.num : 1;
      }
      setCounts(map);
    }
  }, [open, sku, productGroups]);

  const handleApply = () => {
    if (!sku) return;
    const afc: any[] = [];
    for (const g of productGroups) {
      const num = counts[g.name] || 0;
      if (num > 0) afc.push({ name: g.name, num, config: g.config || [] });
    }
    onApply(sku.key, {
      price, stock, status,
      usable: usable ? usable.format('YYYY-MM-DDTHH:mm:ssZ') : null,
      expiry: expiry ? expiry.format('YYYY-MM-DDTHH:mm:ssZ') : null,
      additional_fields_config: afc,
    });
    onClose();
  };

  if (!sku) return null;
  return (
    <ScrollableModal title="编辑 SKU" open={open} onCancel={onClose} width={600} destroyOnHidden
      footer={<Space><Button onClick={onClose}>取消</Button><Button type="primary" onClick={handleApply}>应用</Button></Space>}>
      <div style={{ padding: '0 8px' }}>
        <div style={{ fontWeight: 600, marginBottom: 16 }}>{sku.specText}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>价格(元)</div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <InputNumber min={0} precision={2} value={price} prefix="￥" style={{ flex: 1 }}
                onChange={(v) => setPrice(v ?? 0)} />
              <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px' }} onClick={() => setPrice(0)}>免费</Button>
            </span>
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>限额</div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <InputNumber min={0} precision={0} value={stock} style={{ flex: 1 }} placeholder="不限"
                onChange={(v) => setStock(v ?? 0)} />
              <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px' }} onClick={() => setStock(99999)}>不限</Button>
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>开始时间</div>
            <DatePicker showTime value={usable} placeholder="不限" style={{ width: '100%' }} onChange={(v) => setUsable(v)} />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>截止时间</div>
            <DatePicker showTime value={expiry} placeholder="不限" style={{ width: '100%' }} onChange={(v) => setExpiry(v)} />
          </div>
        </div>

        {productGroups.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>报名信息</div>
            {productGroups.map((g: any) => (
              <div key={g.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '6px 8px', background: '#fafafa', borderRadius: 4 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: '#999' }}>
                    {(g.config || []).map((f: any) => f.label || f.name || '?').join('、')}
                  </div>
                </div>
                <InputNumber min={0} max={99} size="small" style={{ width: 60 }}
                  value={counts[g.name] ?? 0}
                  onChange={(v) => setCounts((prev) => ({ ...prev, [g.name]: v ?? 0 }))} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <div style={{ fontSize: 13 }}>上架</div>
          <Switch checked={status === 1} checkedChildren="是" unCheckedChildren="否" onChange={(v) => setStatus(v ? 1 : 0)} />
        </div>
      </div>
    </ScrollableModal>
  );
};

// ==================== 轻量配置主弹窗 ====================

const SkuPriceModal: React.FC<SkuPriceModalProps> = ({
  visible, productId, productTitle, onClose, onSuccess, onEnterFullConfig,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [originalSkus, setOriginalSkus] = useState<SkuItem[]>([]);
  const [editedSkus, setEditedSkus] = useState<Record<string, SkuEdits>>({});
  const [specs, setSpecs] = useState<SpecInfo[]>([]);
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [batchMode, setBatchMode] = useState(false);

  // 批量设置 — 价格/限额/上架
  const [batchPrice, setBatchPrice] = useState<number>(0);
  const [batchStock, setBatchStock] = useState<number>(0);
  const [batchStatus, setBatchStatus] = useState<number>(1);
  const [bpEnabled, setBpEnabled] = useState({ price: true, stock: true, status: true });
  // 批量设置 — 报名期限
  const [batchUsable, setBatchUsable] = useState<Dayjs | null>(null);
  const [batchExpiry, setBatchExpiry] = useState<Dayjs | null>(null);
  const [btEnabled, setBtEnabled] = useState({ usable: true, expiry: true });
  const [batchUsableMode, setBatchUsableMode] = useState<'fixed' | 'relative'>('fixed');
  const [batchExpiryMode, setBatchExpiryMode] = useState<'fixed' | 'relative'>('fixed');
  const [batchUsableDays, setBatchUsableDays] = useState<number>(0);
  const [batchUsableTime, setBatchUsableTime] = useState<Dayjs | null>(null);
  const [batchExpiryDays, setBatchExpiryDays] = useState<number>(0);
  const [batchExpiryTime, setBatchExpiryTime] = useState<Dayjs | null>(null);
  // 批量设置 — 报名信息
  const [baEnabled, setBaEnabled] = useState<Record<string, boolean>>({});
  const [baValues, setBaValues] = useState<Record<string, number>>({});

  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<number, string>>({});

  const [editSku, setEditSku] = useState<SkuItem | null>(null);

  const { success, error: showError, warning } = useAppNotification();
  const { modal } = App.useApp();

  // 是否有日期 spec
  const dateSpecIndex = useMemo(() => specs.findIndex((sp) => sp.is_time_type), [specs]);
  const hasDateSpec = dateSpecIndex >= 0;

  // 加载
  useEffect(() => {
    if (visible && productId) {
      setLoading(true);
      setEditedSkus({});
      setSelectedRowKeys([]);
      setBatchMode(false);
      setSelectedSpecFilters({});
      Promise.all([
        productApi.getSkus(productId).catch(() => []),
        productApi.getSpecs(productId).catch(() => []),
        productApi.getProductDetail(productId).catch(() => ({})),
      ]).then(([skusRes, specsRes, detail]: any[]) => {
        const specList: any[] = Array.isArray(specsRes) ? specsRes : [];
        const parsedSpecs: SpecInfo[] = specList.map((sp: any) => ({
          name: sp.name || '',
          values: (sp.values || []).map((v: any) => ({ id: v.id, value: v.value || '' })),
          is_time_type: sp.is_time_type || false,
        }));
        setSpecs(parsedSpecs);
        setProductGroups(detail?.additional_fields_config || []);

        const valueById = new Map<number, string>();
        for (const sp of parsedSpecs) { for (const v of sp.values) { if (v.id != null) valueById.set(v.id, v.value); } }
        const list: any[] = Array.isArray(skusRes) ? skusRes : (skusRes?.list || []);
        setOriginalSkus(list.map((s: any) => {
          const idParts = (s.spec_indices || '').split('_');
          const specParts: string[] = [];
          const partsWithNames: string[] = [];
          for (let i = 0; i < idParts.length; i++) {
            const vid = Number(idParts[i]);
            const valText = valueById.get(vid) || idParts[i];
            specParts.push(valText);
            partsWithNames.push(`${parsedSpecs[i]?.name || '?'}:${valText}`);
          }
          return {
            key: String(s.id), id: s.id, specText: partsWithNames.join(' | '), specParts,
            price: s.price || 0, stock: s.stock || 0, status: s.status ?? 1,
            usable: s.usable || null, expiry: s.expiry || null,
            additional_fields_config: s.additional_fields_config || null,
          };
        }));
      }).catch(() => { setOriginalSkus([]); setSpecs([]); })
      .finally(() => setLoading(false));
    }
  }, [visible, productId]);

  const displaySkus = useMemo(() => {
    return originalSkus.map((s) => {
      const edits = editedSkus[s.key] || {};
      return {
        ...s,
        price: edits.price ?? s.price,
        stock: edits.stock ?? s.stock,
        status: edits.status ?? s.status,
        usable: edits.usable !== undefined ? edits.usable : s.usable,
        expiry: edits.expiry !== undefined ? edits.expiry : s.expiry,
        additional_fields_config: edits.additional_fields_config !== undefined ? edits.additional_fields_config : s.additional_fields_config,
      };
    });
  }, [originalSkus, editedSkus]);

  const updateSkuField = useCallback((key: string, edits: SkuEdits) => {
    setEditedSkus((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), ...edits } }));
  }, []);

  const handleSingleEditApply = useCallback((key: string, edits: SkuEdits) => {
    updateSkuField(key, edits);
  }, [updateSkuField]);

  // 相对时间计算
  const computeRelativeTime = (dateValue: string | undefined, days: number, time: Dayjs | null): string | null => {
    if (!dateValue || days == null) return null;
    const date = dayjs(dateValue);
    if (!date.isValid()) return null;
    const result = date.subtract(days, 'day');
    if (time) return result.hour(time.hour()).minute(time.minute()).second(0).format('YYYY-MM-DDTHH:mm:ssZ');
    return result.format('YYYY-MM-DDTHH:mm:ssZ');
  };

  // ---- 批量设置 ----
  const toggleBatchMode = useCallback((on: boolean) => {
    setBatchMode(on);
    if (on) {
      setSelectedRowKeys(displaySkus.map((r) => r.key));
      setSelectedSpecFilters({});
      const en: Record<string, boolean> = {};
      const vals: Record<string, number> = {};
      for (const g of productGroups) { en[g.name] = true; vals[g.name] = 0; }
      setBaEnabled(en);
      setBaValues(vals);
    } else {
      setSelectedRowKeys([]);
      setSelectedSpecFilters({});
    }
  }, [displaySkus, productGroups]);

  const applyBatch = useCallback(() => {
    if (selectedRowKeys.length === 0) { warning('请先选择SKU行'); return; }
    setEditedSkus((prev) => {
      const next = { ...prev };
      selectedRowKeys.forEach((k) => {
        const existing = next[k] || {};
        const patch: SkuEdits = {};

        if (bpEnabled.price) patch.price = batchPrice;
        if (bpEnabled.stock) patch.stock = batchStock;
        if (bpEnabled.status) patch.status = batchStatus;

        if (btEnabled.usable) {
          patch.usable = (hasDateSpec && batchUsableMode === 'relative')
            ? computeRelativeTime(displaySkus.find((r) => r.key === k)?.specParts?.[dateSpecIndex], batchUsableDays, batchUsableTime)
            : batchUsable ? batchUsable.format('YYYY-MM-DDTHH:mm:ssZ') : null;
        }
        if (btEnabled.expiry) {
          patch.expiry = (hasDateSpec && batchExpiryMode === 'relative')
            ? computeRelativeTime(displaySkus.find((r) => r.key === k)?.specParts?.[dateSpecIndex], batchExpiryDays, batchExpiryTime)
            : batchExpiry ? batchExpiry.format('YYYY-MM-DDTHH:mm:ssZ') : null;
        }

        // 报名信息
        if (productGroups.some((g) => baEnabled[g.name])) {
          const existingAfc: any[] = existing.additional_fields_config ?? displaySkus.find((r) => r.key === k)?.additional_fields_config ?? [];
          const merged = new Map<string, number>();
          for (const e of existingAfc) merged.set(e.name, typeof e.num === 'number' ? e.num : 1);
          for (const g of productGroups) {
            if (baEnabled[g.name]) {
              const val = baValues[g.name] || 0;
              if (val > 0) merged.set(g.name, val); else merged.delete(g.name);
            }
          }
          patch.additional_fields_config = Array.from(merged.entries()).map(([name, num]) => {
            const g = productGroups.find((pg) => pg.name === name);
            return { name, num, config: g?.config || [] };
          });
        }

        next[k] = { ...existing, ...patch };
      });
      return next;
    });
  }, [selectedRowKeys, batchPrice, batchStock, batchStatus, bpEnabled, btEnabled, batchUsable, batchExpiry, batchUsableMode, batchExpiryMode, batchUsableDays, batchUsableTime, batchExpiryDays, batchExpiryTime, baEnabled, baValues, productGroups, displaySkus, hasDateSpec, dateSpecIndex, warning]);

  // ---- 保存配置 ----
  const handleSave = async () => {
    try {
      setSaving(true);
      const updates: Promise<any>[] = [];
      for (const sku of displaySkus) {
        const edits = editedSkus[sku.key];
        if (!edits) continue;
        const body: Record<string, any> = {};
        if (edits.price !== undefined) body.price = edits.price;
        if (edits.stock !== undefined) body.stock = edits.stock;
        if (edits.status !== undefined) body.status = edits.status;
        if (edits.usable !== undefined) body.usable = edits.usable;
        if (edits.expiry !== undefined) body.expiry = edits.expiry;
        if (edits.additional_fields_config !== undefined) body.additional_fields_config = edits.additional_fields_config;
        if (Object.keys(body).length > 0) updates.push(productApi.updateSku(productId, sku.id, body));
      }
      if (updates.length === 0) { success('没有需要保存的更改'); onClose(); return; }
      await Promise.all(updates);
      success('配置已保存');
      onClose();
      onSuccess?.();
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存失败');
    } finally { setSaving(false); }
  };

  const handleModifyCombo = async () => {
    try {
      const detail: any = await productApi.getProductDetail(productId);
      if (detail?.is_listed === true) {
        modal.confirm({
          title: '修改项目组合', content: '修改项目组合需要先将商品下架，确认下架并继续？',
          okText: '确认下架并继续', cancelText: '取消',
          onOk: async () => {
            try { await productApi.updateListStatus(productId, false); onSuccess?.(); onEnterFullConfig?.(); }
            catch (err: any) { showError(err?.response?.data?.message || '下架失败，请重试'); }
          },
        });
      } else { onEnterFullConfig?.(); }
    } catch (err: any) { showError(err?.response?.data?.message || '获取商品状态失败'); }
  };

  const fmtTime = (v?: string | null) => v ? dayjs(v).format('YYYY/MM/DD HH:mm') : '-';

  const fmtAfc = (list?: any[] | null) => {
    if (!list || list.length === 0) return '-';
    return list.map((f: any) => `${f.name} x${typeof f.num === 'number' ? f.num : 1}`).join(', ');
  };

  const skuColumns: ColumnsType<SkuItem> = [
    { title: '规格组合', dataIndex: 'specText', key: 'specText', width: 180 },
    {
      title: '价格(元)', dataIndex: 'price', key: 'price', width: 160,
      render: (v: number, r: SkuItem) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <InputNumber min={0} precision={2} value={v} prefix="￥" style={{ width: 110 }}
            onChange={(val) => updateSkuField(r.key, { price: val ?? 0 })} />
          <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }}
            onClick={() => updateSkuField(r.key, { price: 0 })}>免费</Button>
        </span>
      ),
    },
    {
      title: '限额', dataIndex: 'stock', key: 'stock', width: 140,
      render: (v: number, r: SkuItem) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <InputNumber min={0} precision={0} value={v} style={{ width: 80 }} placeholder="不限"
            onChange={(val) => updateSkuField(r.key, { stock: val ?? 0 })} />
          <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }}
            onClick={() => updateSkuField(r.key, { stock: 99999 })}>不限</Button>
        </span>
      ),
    },
    {
      title: '报名期限', key: 'time', width: 150,
      render: (_: any, r: SkuItem) => {
        const d = displaySkus.find((dd) => dd.key === r.key);
        return (
          <div style={{ lineHeight: 1.6, cursor: 'pointer' }} onClick={() => setEditSku(d || r)}>
            <span style={{ color: '#1677ff', fontSize: 11 }}>
              <div>{fmtTime(d?.usable)}</div>
              <div>{fmtTime(d?.expiry)}</div>
            </span>
          </div>
        );
      },
    },
    {
      title: '报名信息', key: 'afc', width: 140,
      render: (_: any, r: SkuItem) => {
        const d = displaySkus.find((dd) => dd.key === r.key);
        return (
          <div style={{ cursor: 'pointer' }} onClick={() => setEditSku(d || r)}>
            <span style={{ color: '#1677ff', fontSize: 12 }}>{fmtAfc(d?.additional_fields_config)}</span>
          </div>
        );
      },
    },
    {
      title: '上架', dataIndex: 'status', key: 'status', width: 70,
      render: (v: number, r: SkuItem) => (
        <Switch checked={v === 1} checkedChildren="上架" unCheckedChildren="下架"
          onChange={(checked) => updateSkuField(r.key, { status: checked ? 1 : 0 })} />
      ),
    },
  ];

  return (
    <>
      <ScrollableModal
        title={`快捷配置 — ${productTitle}`}
        open={visible}
        onCancel={onClose}
        width={1150}
        destroyOnHidden
        footer={
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>保存配置</Button>
          </Space>
        }
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontWeight: 600 }}>SKU 列表（{originalSkus.length} 种）</span>
          <Button type="link" size="small" onClick={() => toggleBatchMode(!batchMode)}>
            {batchMode ? '收起批量设置' : '批量设置'}
          </Button>
        </div>

        {batchMode && (
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 12, marginBottom: 12, background: '#f5f5f5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600 }}>批量设置</span>
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={bpEnabled.price} style={{ marginRight: 4 }}
                  onChange={(e) => setBpEnabled((prev) => ({ ...prev, price: e.target.checked }))} /> 价格
              </label>
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={bpEnabled.stock} style={{ marginRight: 4 }}
                  onChange={(e) => setBpEnabled((prev) => ({ ...prev, stock: e.target.checked }))} /> 限额
              </label>
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={bpEnabled.status} style={{ marginRight: 4 }}
                  onChange={(e) => setBpEnabled((prev) => ({ ...prev, status: e.target.checked }))} /> 上架
              </label>
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={btEnabled.usable} style={{ marginRight: 4 }}
                  onChange={(e) => setBtEnabled((prev) => ({ ...prev, usable: e.target.checked }))} /> 开始时间
              </label>
              <label style={{ fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={btEnabled.expiry} style={{ marginRight: 4 }}
                  onChange={(e) => setBtEnabled((prev) => ({ ...prev, expiry: e.target.checked }))} /> 截止时间
              </label>
              {productGroups.map((g) => (
                <label key={g.name} style={{ fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={baEnabled[g.name] || false} style={{ marginRight: 4 }}
                    onChange={(e) => setBaEnabled((prev) => ({ ...prev, [g.name]: e.target.checked }))} /> {g.name}
                </label>
              ))}
            </div>

            {specs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {specs.map((spec, si) => (
                  <Select key={si} allowClear placeholder={`全部${spec.name || `规格${si + 1}`}`} value={selectedSpecFilters[si]}
                    options={spec.values.filter((v) => v.value).map((v) => ({ label: v.value, value: v.value }))}
                    onChange={(val) => {
                      setSelectedSpecFilters((prev) => ({ ...prev, [si]: val }));
                      const allFilters = { ...selectedSpecFilters, [si]: val };
                      const newKeys: string[] = [];
                      for (const row of displaySkus) {
                        let match = true;
                        for (const [k, filterVal] of Object.entries(allFilters)) {
                          if (filterVal && row.specParts[Number(k)] !== filterVal) { match = false; break; }
                        }
                        if (match) newKeys.push(row.key);
                      }
                      setSelectedRowKeys(newKeys);
                    }} />
                ))}
              </div>
            )}

            {/* 价格/限额/上架 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <InputNumber min={0} precision={2} value={batchPrice} prefix="价格￥" disabled={!bpEnabled.price}
                  style={{ flex: 1, opacity: bpEnabled.price ? 1 : 0.5 }} placeholder="价格" onChange={(v) => setBatchPrice(v ?? 0)} />
                {bpEnabled.price && <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }} onClick={() => setBatchPrice(0)}>免费</Button>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <InputNumber min={0} precision={0} value={batchStock} prefix="限额" disabled={!bpEnabled.stock}
                  style={{ flex: 1, opacity: bpEnabled.stock ? 1 : 0.5 }} placeholder="不限" onChange={(v) => setBatchStock(v ?? 0)} />
                {bpEnabled.stock && <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px', minWidth: 'auto' }} onClick={() => setBatchStock(99999)}>不限</Button>}
              </span>
              <Select value={batchStatus} disabled={!bpEnabled.status} style={{ opacity: bpEnabled.status ? 1 : 0.5 }}
                options={[{ label: '上架', value: 1 }, { label: '下架', value: 0 }]} onChange={(v) => setBatchStatus(v)} />
            </div>

            {/* 报名期限 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
              <div style={{ opacity: btEnabled.usable ? 1 : 0.5 }}>
                {hasDateSpec && (
                  <Radio.Group size="small" value={batchUsableMode} onChange={(e) => setBatchUsableMode(e.target.value)} disabled={!btEnabled.usable} style={{ marginBottom: 4 }}>
                    <Radio.Button value="fixed" style={{ fontSize: 11, padding: '0 8px' }}>指定时间</Radio.Button>
                    <Radio.Button value="relative" style={{ fontSize: 11, padding: '0 8px' }}>提前天数</Radio.Button>
                  </Radio.Group>
                )}
                {(!hasDateSpec || batchUsableMode === 'fixed') ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#666' }}>开始时间</span>
                    <DatePicker showTime placeholder="不限" value={batchUsable} onChange={(v) => setBatchUsable(v)} disabled={!btEnabled.usable} style={{ flex: 1 }} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <InputNumber min={0} value={batchUsableDays} prefix="提前" disabled={!btEnabled.usable} style={{ width: 100 }} onChange={(v) => setBatchUsableDays(v ?? 0)} />
                    <span style={{ fontSize: 12 }}>天</span>
                    <TimePicker value={batchUsableTime} format="HH:mm" disabled={!btEnabled.usable} style={{ flex: 1 }} onChange={(v) => setBatchUsableTime(v)} placeholder="时间" />
                  </div>
                )}
              </div>
              <div style={{ opacity: btEnabled.expiry ? 1 : 0.5 }}>
                {hasDateSpec && (
                  <Radio.Group size="small" value={batchExpiryMode} onChange={(e) => setBatchExpiryMode(e.target.value)} disabled={!btEnabled.expiry} style={{ marginBottom: 4 }}>
                    <Radio.Button value="fixed" style={{ fontSize: 11, padding: '0 8px' }}>指定时间</Radio.Button>
                    <Radio.Button value="relative" style={{ fontSize: 11, padding: '0 8px' }}>提前天数</Radio.Button>
                  </Radio.Group>
                )}
                {(!hasDateSpec || batchExpiryMode === 'fixed') ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#666' }}>截止时间</span>
                    <DatePicker showTime placeholder="不限" value={batchExpiry} onChange={(v) => setBatchExpiry(v)} disabled={!btEnabled.expiry} style={{ flex: 1 }} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <InputNumber min={0} value={batchExpiryDays} prefix="提前" disabled={!btEnabled.expiry} style={{ width: 100 }} onChange={(v) => setBatchExpiryDays(v ?? 0)} />
                    <span style={{ fontSize: 12 }}>天</span>
                    <TimePicker value={batchExpiryTime} format="HH:mm" disabled={!btEnabled.expiry} style={{ flex: 1 }} onChange={(v) => setBatchExpiryTime(v)} placeholder="时间" />
                  </div>
                )}
              </div>
            </div>

            {/* 报名信息 — 标题与开始/截止时间对齐 */}
            {productGroups.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 12, whiteSpace: 'nowrap', color: '#666' }}>报名信息</span>
                <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                {productGroups.map((g) => (
                  <InputNumber key={g.name} min={0} max={99}
                    value={baValues[g.name] ?? 0} prefix={g.name}
                    disabled={!baEnabled[g.name]}
                    style={{ flex: 1, opacity: baEnabled[g.name] ? 1 : 0.5 }}
                    onChange={(v) => setBaValues((prev) => ({ ...prev, [g.name]: v ?? 0 }))} />
                ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Button onClick={applyBatch}>应用设置</Button>
              <span style={{ color: '#999', fontSize: 12 }}>已选 {selectedRowKeys.length} 项</span>
            </div>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
          <Table loading={loading} rowKey="key" columns={skuColumns} dataSource={displaySkus} size="small" pagination={false} scroll={{ y: 400 }}
            rowSelection={batchMode ? { columnWidth: 32, selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as string[]) } : undefined} />
        </div>

        <div style={{ fontSize: 13, marginTop: 12, lineHeight: 1.8 }}>
          <div>点击"报名期限"或"报名信息"列可编辑单条SKU，点击"保存配置"提交所有修改。</div>
          <div>
            如需进行更多配置（如修改规格项目组合、调整报名信息模板等），请点击{' '}
            <Button type="link" size="small" style={{ padding: 0, fontSize: 13 }} onClick={handleModifyCombo}>高级配置管理</Button>。
          </div>
        </div>
      </ScrollableModal>

      <SkuFullEditModal
        open={!!editSku} sku={editSku} productGroups={productGroups}
        onClose={() => setEditSku(null)}
        onApply={handleSingleEditApply}
      />
    </>
  );
};

export default SkuPriceModal;
