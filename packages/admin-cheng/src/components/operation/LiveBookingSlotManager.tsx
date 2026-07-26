import { useState, useEffect, useMemo, useRef } from 'react';
import { Switch, Button, Table, Tag, Space, Input, InputNumber, Checkbox, Radio, DatePicker } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { productApi, bookingSlotApi, BookingSlot } from '../../api/services/product';
import { useAppNotification } from '@/hooks/useAppNotification';

// ---- Types ----

interface SkuLabel {
  specText: string;
  spec_indices: string;
}

interface LiveSlot {
  key: string;
  spec_text: string;
  spec_indices: string;
  slot_date: string;
  title: string;
  capacity: number;
  slot_id: number;
  status: string;
}

interface LiveBookingSlotManagerProps {
  productId: number;
  skuLabels: SkuLabel[];
}

// ---- Helpers ----

let _keyCounter = Date.now();
function uid() { return `ls-${++_keyCounter}`; }

async function fetchAllSlots(productId: number): Promise<BookingSlot[]> {
  const all: BookingSlot[] = [];
  for (let pg = 1; ; pg++) {
    const sr: any = await bookingSlotApi.getSlots(productId, { page: pg, page_size: 100 });
    const page: BookingSlot[] = sr?.list || [];
    all.push(...page);
    if (page.length < 100) break;
  }
  return all;
}

function buildSpecTexts(specs: any[], skus: any[]) {
  const vMap = new Map<number, string>();
  for (const spec of specs) for (const v of spec.values || []) vMap.set(v.id, v.value || '');
  const buildText = (indices: string) => {
    if (!indices) return '';
    return indices.split('_').map((pid, i) => {
      const vId = parseInt(pid);
      return `${specs[i]?.name || '?'}:${vMap.get(vId) || pid}`;
    }).join(' | ');
  };
  const skuIdToText = new Map<number, string>();
  const skuIdToIndices = new Map<number, string>();
  for (const sku of skus) {
    skuIdToText.set(sku.id, buildText(sku.spec_indices || ''));
    skuIdToIndices.set(sku.id, sku.spec_indices || '');
  }
  return { skuIdToText, skuIdToIndices };
}

// ---- Component ----

const LiveBookingSlotManager: React.FC<LiveBookingSlotManagerProps> = ({ productId, skuLabels }) => {
  const [slots, setSlots] = useState<LiveSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { success, error: showError } = useAppNotification();

  // 批量添加表单
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [dayFilter, setDayFilter] = useState<'all' | 'weekday' | 'weekend'>('all');
  const [slotDefs, setSlotDefs] = useState<{ key: string; title: string }[]>([{ key: 's1', title: '' }]);
  const [slotCapacity, setSlotCapacity] = useState(10);

  // 加载
  const load = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [apiSlots, specRes, skuRes]: any[] = await Promise.all([
        fetchAllSlots(productId),
        productApi.getSpecs(productId),
        productApi.getSkus(productId),
      ]);
      const specs: any[] = Array.isArray(specRes) ? specRes : [];
      const skus: any[] = Array.isArray(skuRes) ? skuRes : (skuRes?.list || []);
      const { skuIdToText } = buildSpecTexts(specs, skus);
      setSlots(apiSlots.map((s) => ({
        key: `live-${s.id}`, slot_id: s.id,
        spec_text: skuIdToText.get(s.sku_id) || String(s.sku_id),
        spec_indices: String(s.sku_id),
        slot_date: s.slot_date || '', title: s.title || '',
        capacity: s.capacity || 1, status: s.status || 'active',
      })));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- 操作 ----

  const handleDelete = (slot: LiveSlot) => {
    bookingSlotApi.deleteSlot(productId, slot.slot_id).then(() => {
      setSlots((prev) => prev.filter((s) => s.key !== slot.key));
      success('时段已删除');
    }).catch((err: any) => showError(err?.response?.data?.message || err?.message || '删除失败'));
  };

  const handleToggleStatus = (slot: LiveSlot) => {
    const newStatus = slot.status === 'active' ? 'inactive' : 'active';
    bookingSlotApi.toggleSlotStatus(productId, slot.slot_id, newStatus).then(() => {
      setSlots((prev) => prev.map((s) => s.key === slot.key ? { ...s, status: newStatus } : s));
      success(newStatus === 'active' ? '已启用' : '已停用');
    }).catch((err: any) => showError(err?.response?.data?.message || err?.message || '操作失败'));
  };

  const handleUpdateCapacity = (slot: LiveSlot, newCapacity: number | null) => {
    if (newCapacity == null || newCapacity < 1) return;
    bookingSlotApi.updateSlot(productId, slot.slot_id, { capacity: newCapacity }).then(() => {
      setSlots((prev) => prev.map((s) => s.key === slot.key ? { ...s, capacity: newCapacity } : s));
    }).catch((err: any) => showError(err?.response?.data?.message || err?.message || '更新失败'));
  };

  // ---- 批量添加 ----

  const openCreate = () => {
    setSelectedSkus([]);
    setDateRange(null);
    setDayFilter('all');
    setSlotDefs([{ key: 's1', title: '' }]);
    setSlotCapacity(10);
    setModalOpen(true);
  };

  const addSlotDef = () => setSlotDefs((prev) => [...prev, { key: uid(), title: '' }]);
  const removeSlotDef = (key: string) => setSlotDefs((prev) => prev.filter((s) => s.key !== key));

  const handleBatchSubmit = async () => {
    if (selectedSkus.length === 0) { showError('请至少选择一个 SKU'); return; }
    if (!dateRange) { showError('请选择日期范围'); return; }
    const filled = slotDefs.filter((s) => s.title.trim());
    if (filled.length === 0) { showError('请至少填写一个时段名称'); return; }

    const dates: string[] = [];
    let cursor = dateRange[0];
    const end = dateRange[1];
    while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
      const dow = cursor.day();
      if (dayFilter === 'all'
        || (dayFilter === 'weekday' && dow >= 1 && dow <= 5)
        || (dayFilter === 'weekend' && (dow === 0 || dow === 6))) {
        dates.push(cursor.format('YYYY-MM-DD'));
      }
      cursor = cursor.add(1, 'day');
    }

    setLoading(true);
    try {
      const raw: any = await productApi.getSkus(productId);
      const skus: any[] = Array.isArray(raw) ? raw : (raw?.list || []);
      const indicesToId = new Map<string, number>();
      for (const s of skus) indicesToId.set(s.spec_indices || '', s.id);

      const batch: { sku_id: number; slot_date: string; title: string; capacity: number }[] = [];
      for (const indices of selectedSkus) {
        const skuId = indicesToId.get(indices);
        if (!skuId) continue;
        for (const d of dates) {
          for (const sd of filled) {
            batch.push({ sku_id: skuId, slot_date: d, title: sd.title.trim(), capacity: slotCapacity });
          }
        }
      }
      if (batch.length > 0) {
        await bookingSlotApi.batchCreateSlots(productId, batch);
        success(`已创建 ${batch.length} 个预约时段`);
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || '创建失败');
    } finally { setLoading(false); }
  };

  // ---- 列 ----

  const visible = useMemo(() => [...slots].sort((a, b) => a.slot_date.localeCompare(b.slot_date)), [slots]);

  const columns = [
    { title: '日期', dataIndex: 'slot_date', key: 'slot_date', width: 110 },
    { title: '时段', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: '关联SKU', dataIndex: 'spec_text', key: 'spec_text', width: 200, ellipsis: true },
    {
      title: '容量', key: 'capacity', width: 120,
      render: (_: unknown, record: LiveSlot) => (
        <InputNumber min={1} size="small" style={{ width: 70 }} value={record.capacity}
          onBlur={(e) => { const v = parseInt(e.target.value); if (v && v !== record.capacity) handleUpdateCapacity(record, v); }}
          onPressEnter={(e) => { const v = parseInt((e.target as HTMLInputElement).value); if (v && v !== record.capacity) handleUpdateCapacity(record, v); }} />
      ),
    },
    {
      title: '状态', key: 'status', width: 100,
      render: (_: unknown, record: LiveSlot) => (
        <Switch checked={record.status === 'active'} checkedChildren="启用" unCheckedChildren="停用"
          onChange={() => handleToggleStatus(record)} />
      ),
    },
    {
      title: '操作', key: 'actions', width: 80,
      render: (_: unknown, record: LiveSlot) => (
        <Button type="link" size="small" danger onClick={() => handleDelete(record)}>删除</Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>预约时段（{visible.length} 个）</span>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>添加时段</Button>
      </div>
      <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
        <Table rowKey="key" columns={columns} dataSource={visible} loading={loading}
          size="small" pagination={false} scroll={{ y: 240 }} />
      </div>

      <ScrollableModal title="批量添加时段" open={modalOpen} onCancel={() => setModalOpen(false)} width={600} destroyOnHidden
        footer={<Space><Button onClick={() => setModalOpen(false)}>取消</Button><Button type="primary" loading={loading} onClick={handleBatchSubmit}>生成</Button></Space>}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>关联SKU</div>
          <Checkbox.Group value={selectedSkus} onChange={(vals) => setSelectedSkus(vals as string[])}
            style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            options={skuLabels.map((l) => ({ label: l.specText, value: l.spec_indices }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>日期范围</div>
          <DatePicker.RangePicker value={dateRange} onChange={(vals) => setDateRange(vals as [Dayjs, Dayjs] | null)}
            style={{ width: '100%' }} disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
          <div style={{ marginTop: 8 }}>
            <Radio.Group value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
              <Radio.Button value="all">不限</Radio.Button>
              <Radio.Button value="weekday">仅限工作日</Radio.Button>
              <Radio.Button value="weekend">仅限周末</Radio.Button>
            </Radio.Group>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 500 }}>时段</span>
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addSlotDef}>添加时段</Button>
          </div>
          {slotDefs.map((sd) => (
            <div key={sd.key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Input placeholder="如：上午场" maxLength={128} style={{ flex: 1 }} value={sd.title}
                onChange={(e) => setSlotDefs((prev) => prev.map((s) => s.key === sd.key ? { ...s, title: e.target.value } : s))} />
              {slotDefs.length > 1 && <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeSlotDef(sd.key)} />}
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>容量</div>
          <InputNumber min={1} style={{ width: '100%' }} value={slotCapacity} onChange={(v) => setSlotCapacity(v ?? 10)} />
        </div>
      </ScrollableModal>
    </>
  );
};

export default LiveBookingSlotManager;
