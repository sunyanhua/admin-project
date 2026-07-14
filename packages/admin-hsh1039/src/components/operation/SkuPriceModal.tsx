import { useState, useEffect, useMemo, useCallback } from 'react';
import { App, Button, Space, Table, InputNumber, Switch, Select, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { productApi } from '../../api/services/product';
import { useAppNotification } from '@/hooks/useAppNotification';

/** 规格信息（名称 + 带 ID 的值列表），用于筛选 + 重建 specText */
interface SpecInfo {
  name: string;
  values: { id: number; value: string }[];
}

interface SkuItem {
  key: string;
  id: number;
  specText: string;
  /** 每个规格位置的值文本，按 specs 排序：["成人票", "2026-07-01"] */
  specParts: string[];
  price: number;
  stock: number;
  status: number;
}

type SkuEdits = { price?: number; stock?: number; status?: number };

export interface SkuPriceModalProps {
  visible: boolean;
  productId: number;
  productTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
  onEnterFullConfig?: () => void;
}

const SkuPriceModal: React.FC<SkuPriceModalProps> = ({
  visible, productId, productTitle, onClose, onSuccess, onEnterFullConfig,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [originalSkus, setOriginalSkus] = useState<SkuItem[]>([]);
  const [editedSkus, setEditedSkus] = useState<Record<string, SkuEdits>>({});
  const [specs, setSpecs] = useState<SpecInfo[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchPrice, setBatchPrice] = useState<number>(0);
  const [batchStock, setBatchStock] = useState<number>(0);
  const [batchStatus, setBatchStatus] = useState<number>(1);
  const [batchEnabled, setBatchEnabled] = useState({ price: true, stock: true, status: true });
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<number, string>>({});
  const { success, error: showError, warning } = useAppNotification();
  const { modal } = App.useApp();

  // 加载 SKU 和规格，并用 specs 重建 specText（不依赖 API 的 spec_text 字段）
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
      ]).then(([skusRes, specsRes]: any[]) => {
        // 解析规格（保留 id）
        const specList: any[] = Array.isArray(specsRes) ? specsRes : [];
        const parsedSpecs: SpecInfo[] = specList.map((sp: any) => ({
          name: sp.name || '',
          values: (sp.values || []).map((v: any) => ({ id: v.id, value: v.value || '' })),
        }));
        setSpecs(parsedSpecs);

        // 建立 valueId → value 映射
        const valueById = new Map<number, string>();
        for (const sp of parsedSpecs) {
          for (const v of sp.values) {
            if (v.id != null) valueById.set(v.id, v.value);
          }
        }

        // 解析 SKU，自己构建 specText
        const list: any[] = Array.isArray(skusRes) ? skusRes : (skusRes?.list || []);
        const items: SkuItem[] = list.map((s: any) => {
          // spec_indices 如 "5_12"，解析出各 valueId，再映射为文本
          const idParts = (s.spec_indices || '').split('_');
          const specParts: string[] = [];
          const partsWithNames: string[] = [];
          for (let i = 0; i < idParts.length; i++) {
            const vid = Number(idParts[i]);
            const valText = valueById.get(vid) || idParts[i];
            specParts.push(valText);
            const specName = parsedSpecs[i]?.name || `规格${i + 1}`;
            partsWithNames.push(`${specName}:${valText}`);
          }
          return {
            key: String(s.id),
            id: s.id,
            specText: partsWithNames.join(' | '),
            specParts,
            price: s.price || 0,
            stock: s.stock || 0,
            status: s.status ?? 1,
          };
        });
        setOriginalSkus(items);
      }).catch(() => { setOriginalSkus([]); setSpecs([]); })
        .finally(() => setLoading(false));
    }
  }, [visible, productId]);

  // 合并原始数据和编辑
  const displaySkus = useMemo(() => {
    return originalSkus.map((s) => {
      const edits = editedSkus[s.key] || {};
      return {
        ...s,
        price: edits.price !== undefined ? edits.price : s.price,
        stock: edits.stock !== undefined ? edits.stock : s.stock,
        status: edits.status !== undefined ? edits.status : s.status,
      };
    });
  }, [originalSkus, editedSkus]);

  const updateSkuField = useCallback((key: string, edits: SkuEdits) => {
    setEditedSkus((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), ...edits } }));
  }, []);

  // 开启/关闭批量模式
  const toggleBatchMode = useCallback((on: boolean) => {
    setBatchMode(on);
    if (on) {
      setSelectedRowKeys(displaySkus.map((r) => r.key));
      setSelectedSpecFilters({});
    } else {
      setSelectedRowKeys([]);
      setSelectedSpecFilters({});
    }
  }, [displaySkus]);

  // 批量应用
  const applyBatch = useCallback(() => {
    if (selectedRowKeys.length === 0) { warning('请先选择SKU行'); return; }
    setEditedSkus((prev) => {
      const next = { ...prev };
      const edits: SkuEdits = {};
      if (batchEnabled.price) edits.price = batchPrice;
      if (batchEnabled.stock) edits.stock = batchStock;
      if (batchEnabled.status) edits.status = batchStatus;
      selectedRowKeys.forEach((k) => {
        next[k] = { ...(next[k] || {}), ...edits };
      });
      return next;
    });
    success('批量设置已应用（尚未保存）');
  }, [selectedRowKeys, batchPrice, batchStock, batchStatus, batchEnabled, warning, success]);

  // 保存配置：逐条更新 SKU（价格、限额、状态）
  const handleSave = async () => {
    try {
      setSaving(true);
      const updates: Promise<any>[] = [];
      for (const sku of originalSkus) {
        const edits = editedSkus[sku.key];
        if (!edits || (edits.price === undefined && edits.stock === undefined && edits.status === undefined)) continue;
        const body: Record<string, any> = {};
        if (edits.price !== undefined) body.price = edits.price;
        if (edits.stock !== undefined) body.stock = edits.stock;
        if (edits.status !== undefined) body.status = edits.status;
        if (Object.keys(body).length > 0) {
          updates.push(productApi.updateSku(productId, sku.id, body));
        }
      }
      if (updates.length === 0) {
        success('没有需要保存的更改');
        onClose();
        return;
      }
      await Promise.all(updates);
      success('配置已保存');
      onClose();
      onSuccess?.();
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 修改项目组合
  const handleModifyCombo = async () => {
    try {
      const detail: any = await productApi.getProductDetail(productId);
      if (detail?.is_listed === true) {
        modal.confirm({
          title: '修改项目组合',
          content: '修改项目组合需要先将商品下架，确认下架并继续？',
          okText: '确认下架并继续',
          cancelText: '取消',
          onOk: async () => {
            try {
              await productApi.updateListStatus(productId, false);
              onSuccess?.();
              onEnterFullConfig?.();
            } catch (err: any) {
              showError(err?.response?.data?.message || '下架失败，请重试');
            }
          },
        });
      } else {
        onEnterFullConfig?.();
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取商品状态失败');
    }
  };

  const skuColumns: ColumnsType<SkuItem> = [
    { title: '规格组合', dataIndex: 'specText', key: 'specText', width: 200 },
    {
      title: '价格(元)', dataIndex: 'price', key: 'price', width: 180,
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
      title: '限额', dataIndex: 'stock', key: 'stock', width: 160,
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
      title: '上架', dataIndex: 'status', key: 'status', width: 70,
      render: (v: number, r: SkuItem) => (
        <Switch checked={v === 1} checkedChildren="上架" unCheckedChildren="下架"
          onChange={(checked) => updateSkuField(r.key, { status: checked ? 1 : 0 })} />
      ),
    },
  ];

  return (
    <ScrollableModal
      title={`价格与限额 — ${productTitle}`}
      open={visible}
      onCancel={onClose}
      width={900}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>保存配置</Button>
        </Space>
      }
    >
      {/* SKU 标题行 + 批量设置开关 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600 }}>SKU 列表（{originalSkus.length} 种）</span>
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

          {/* 筛选区 — 用 specParts 直接匹配，不依赖 specText */}
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
                    for (const row of displaySkus) {
                      let match = true;
                      for (const [k, filterVal] of Object.entries(allFilters)) {
                        if (filterVal && row.specParts[Number(k)] !== filterVal) { match = false; break; }
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
            <Button onClick={applyBatch}>应用设置</Button>
            <span style={{ color: '#999', fontSize: 12 }}>已选 {selectedRowKeys.length} 项</span>
          </div>
        </div>
      )}

      {/* SKU 表格 */}
      <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
      <Table
        loading={loading}
        rowKey="key"
        columns={skuColumns}
        dataSource={displaySkus}
        size="small"
        pagination={false}
        scroll={{ y: 350 }}
        rowSelection={batchMode ? {
          columnWidth: 32,
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        } : undefined}
      />
      </div>

      <Divider />
      <div style={{ color: '#999', fontSize: 12 }}>
        如需修改规格项目组合（添加/删除/重命名规格），请点击{' '}
        <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={handleModifyCombo}>修改项目组合</Button>。
      </div>
    </ScrollableModal>
  );
};

export default SkuPriceModal;
