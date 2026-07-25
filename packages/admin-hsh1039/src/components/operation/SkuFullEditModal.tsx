import { useState, useEffect } from 'react';
import { Button, Space, InputNumber, Switch, DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import ScrollableModal from '@/components/templates/ScrollableModal';

export interface SkuItem {
  key: string;
  id: number;
  specText: string;
  specParts: string[];
  spec_indices: string;
  price: number;
  stock: number;
  status: number;
  usable?: string | null;
  expiry?: string | null;
  additional_fields_config?: any[] | null;
}

export type SkuEdits = {
  price?: number;
  stock?: number;
  status?: number;
  usable?: string | null;
  expiry?: string | null;
  additional_fields_config?: any[] | null;
};

const SkuFullEditModal: React.FC<{
  open: boolean;
  sku: SkuItem | null;
  productGroups: any[];
  onClose: () => void;
  onApply: (key: string, edits: SkuEdits) => void;
  ticketMode?: boolean;
  productMode?: boolean;
}> = ({ open, sku, productGroups, onClose, onApply, ticketMode, productMode }) => {
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
              <InputNumber min={(ticketMode || productMode) ? 0.01 : 0} precision={2} value={price} prefix="￥" style={{ flex: 1 }}
                onChange={(v) => setPrice(v ?? 0)} />
              {!(ticketMode || productMode) && <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px' }} onClick={() => setPrice(0)}>免费</Button>}
            </span>
          </div>
          {!ticketMode && (
            <div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>{productMode ? '库存' : '限额'}</div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <InputNumber min={0} precision={0} value={stock} style={{ flex: 1 }} placeholder="不限"
                  onChange={(v) => setStock(v ?? 0)} />
                {!productMode && <Button type="link" size="small" style={{ fontSize: 11, padding: '0 2px' }} onClick={() => setStock(99999)}>不限</Button>}
              </span>
            </div>
          )}
        </div>

        {!(ticketMode || productMode) && (
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
        )}

        {productGroups.length > 0 && (
          <div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{(productMode ? '购买信息' : ticketMode ? '购票信息' : '报名信息')}</div>
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
              {productGroups.map((g: any, idx: number) => (
                <div key={g.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#fff',
                  borderBottom: idx < productGroups.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}>
                  <div>
                    <div style={{ fontSize: 13 }}>{g.name}</div>
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

export default SkuFullEditModal;
