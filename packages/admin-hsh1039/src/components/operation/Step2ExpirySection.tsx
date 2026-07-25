import { useState, useMemo } from 'react';
import { Button, Radio, Select, DatePicker, TimePicker, InputNumber, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';

interface SkuRow {
  key: string;
  spec_indices: string;
  specText: string;
  dateValue?: string;
  usable?: string | null;
  expiry?: string | null;
}

interface SpecGroup {
  id?: number;
  name: string;
  is_time_type?: boolean;
  values: { id?: number; value: string }[];
}

interface Step2ExpirySectionProps {
  expiryMode: 'unified' | 'individual';
  setExpiryMode: (v: 'unified' | 'individual') => void;
  unifiedUsable: Dayjs | null;
  setUnifiedUsable: (v: Dayjs | null) => void;
  unifiedExpiry: Dayjs | null;
  setUnifiedExpiry: (v: Dayjs | null) => void;
  step2Skus: SkuRow[];
  wizardSpecs: SpecGroup[];
  hasDateSpec: boolean;
  updateStep2Sku: (indices: string, field: 'usable' | 'expiry', value: string | null) => void;
  computeRelativeTime: (dateValue: string | undefined, days: number, time: Dayjs | null) => string | null;
  warning: (msg: string) => void;
  ticketMode?: boolean;
  productMode?: boolean;
}

const Step2ExpirySection: React.FC<Step2ExpirySectionProps> = ({
  expiryMode, setExpiryMode, unifiedUsable, setUnifiedUsable, unifiedExpiry, setUnifiedExpiry,
  step2Skus, wizardSpecs, hasDateSpec, updateStep2Sku, computeRelativeTime, warning, ticketMode, productMode,
}) => {
  const [batchMode, setBatchMode] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<number, string>>({});
  const [batchUsable, setBatchUsable] = useState<Dayjs | null>(null);
  const [batchExpiry, setBatchExpiry] = useState<Dayjs | null>(null);
  const [batchEnabled, setBatchEnabled] = useState({ usable: true, expiry: true });
  const [batchUsableMode, setBatchUsableMode] = useState<'fixed' | 'relative'>('fixed');
  const [batchExpiryMode, setBatchExpiryMode] = useState<'fixed' | 'relative'>('fixed');
  const [batchUsableDays, setBatchUsableDays] = useState<number>(0);
  const [batchUsableTime, setBatchUsableTime] = useState<Dayjs | null>(null);
  const [batchExpiryDays, setBatchExpiryDays] = useState<number>(0);
  const [batchExpiryTime, setBatchExpiryTime] = useState<Dayjs | null>(null);

  const columns: ColumnsType<SkuRow> = useMemo(() => [
    { title: '规格组合', dataIndex: 'specText', key: 'specText', width: 200 },
    {
      title: '开始时间', dataIndex: 'usable' as const, key: 'usable', width: 200,
      render: (v: string | undefined, r: SkuRow) => (
        <DatePicker showTime value={v ? dayjs(v) : null} placeholder="不限" style={{ width: '100%' }}
          onChange={(_, dateStr) => updateStep2Sku(r.spec_indices, 'usable', typeof dateStr === 'string' ? dateStr : null)} />
      ),
    },
    {
      title: '截止时间', dataIndex: 'expiry' as const, key: 'expiry', width: 200,
      render: (v: string | undefined, r: SkuRow) => (
        <DatePicker showTime value={v ? dayjs(v) : null} placeholder="不限" style={{ width: '100%' }}
          onChange={(_, dateStr) => updateStep2Sku(r.spec_indices, 'expiry', typeof dateStr === 'string' ? dateStr : '')} />
      ),
    },
  ], [updateStep2Sku]);

  const applyStep2Batch = () => {
    if (selectedRowKeys.length === 0) { warning('请先选择SKU行'); return; }
    const selectedSkus = step2Skus.filter((r) => selectedRowKeys.includes(r.key));
    for (const row of selectedSkus) {
      if (batchEnabled.usable) {
        const usable = (hasDateSpec && batchUsableMode === 'relative')
          ? computeRelativeTime(row.dateValue, batchUsableDays, batchUsableTime)
          : batchUsable ? batchUsable.format('YYYY-MM-DDTHH:mm:ssZ') : null;
        updateStep2Sku(row.spec_indices, 'usable', usable);
      }
      if (batchEnabled.expiry) {
        const expiry = (hasDateSpec && batchExpiryMode === 'relative')
          ? computeRelativeTime(row.dateValue, batchExpiryDays, batchExpiryTime)
          : batchExpiry ? batchExpiry.format('YYYY-MM-DDTHH:mm:ssZ') : null;
        updateStep2Sku(row.spec_indices, 'expiry', expiry);
      }
    }
  };

  if (ticketMode || productMode) return null;

  return (
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
                      <Radio.Button value="fixed" style={{ fontSize: 11, padding: '0 8px' }}>指定时间</Radio.Button>
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
                      <Radio.Button value="fixed" style={{ fontSize: 11, padding: '0 8px' }}>指定时间</Radio.Button>
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
            <Table rowKey="key" columns={columns} dataSource={step2Skus} size="small" pagination={false} scroll={{ y: 280 }}
              rowSelection={batchMode ? { columnWidth: 32, selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as string[]) } : undefined} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Step2ExpirySection;
export type { SkuRow, SpecGroup, Step2ExpirySectionProps };
