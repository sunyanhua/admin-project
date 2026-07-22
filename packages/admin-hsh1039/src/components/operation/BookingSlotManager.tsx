import { forwardRef, useImperativeHandle, useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

interface WizardSlot {
  key: string;
  spec_text: string;
  spec_indices: string;
  slot_date: string;
  slot_time: string;
  title: string;
  capacity: number;
  slot_id?: number;
  status?: string;
  _action: 'create' | 'keep';
}

export interface BookingSlotState {
  hasBooking: boolean;
  pendingWizardSlots: WizardSlot[];
}

export interface BookingSlotManagerHandle {
  getWizardState: () => BookingSlotState;
}

interface BookingSlotManagerProps {
  productId: number;
  skuLabels: SkuLabel[];
}

// ---- Helpers ----

let _keyCounter = Date.now();
function uid() { return `bs-${++_keyCounter}`; }

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

const BookingSlotManager = forwardRef<BookingSlotManagerHandle, BookingSlotManagerProps>(
  function BookingSlotManager({ productId, skuLabels }: BookingSlotManagerProps, ref) {
    const [hasBooking, setHasBooking] = useState(false);
    const [slots, setSlots] = useState<WizardSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const { success, error: showError } = useAppNotification();

    const validTexts = useMemo(() => new Set(skuLabels.map((l) => l.specText)), [skuLabels]);

    const handleGetWizardState = useCallback((): BookingSlotState => ({
      hasBooking,
      pendingWizardSlots: slots.filter((s) => s._action !== undefined && validTexts.has(s.spec_text)),
    }), [hasBooking, slots, validTexts]);

    useImperativeHandle(ref, () => ({
      getWizardState: () => handleGetWizardState(),
    }), [handleGetWizardState]);

    const loadedOnce = useRef(false);

    // SKU 变化清理孤儿
    useEffect(() => {
      if (!loadedOnce.current) return;
      setSlots((prev) =>
        prev.map((s) => (validTexts.has(s.spec_text) ? s : { ...s, _action: undefined } as WizardSlot)),
      );
    }, [validTexts]);

    useEffect(() => {
      if (!productId || loadedOnce.current || skuLabels.length === 0) return;
      loadedOnce.current = true;
      const doLoad = async () => {
        setLoading(true);
        try {
          const detail: any = await productApi.getProductDetail(productId);
          setHasBooking(detail?.has_booking === true);
        } catch { /* ignore */ }

        try {
          const [apiSlots, specRes, skuRes]: any[] = await Promise.all([
            fetchAllSlots(productId),
            productApi.getSpecs(productId),
            productApi.getSkus(productId),
          ]);
          const specs: any[] = Array.isArray(specRes) ? specRes : [];
          const skus: any[] = Array.isArray(skuRes) ? skuRes : (skuRes?.list || []);
          const { skuIdToText, skuIdToIndices } = buildSpecTexts(specs, skus);

          const mapped: WizardSlot[] = apiSlots.map((s) => ({
            key: `wiz-${s.id}`,
            spec_text: skuIdToText.get(s.sku_id) || String(s.sku_id),
            spec_indices: skuIdToIndices.get(s.sku_id) || '',
            slot_date: s.slot_date || '', slot_time: s.slot_time || '',
            title: s.title || '', capacity: s.capacity || 1,
            slot_id: s.id, status: s.status, _action: 'keep' as const,
          }));
          setSlots(mapped);
        } catch { /* ignore */ }
        finally { setLoading(false); }
      };
      doLoad();
    }, [productId, skuLabels.length]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { loadedOnce.current = false; }, [productId]);

    // has_booking 仅切换本地状态，等 finish() 时统一保存
    const handleToggleHasBooking = (checked: boolean) => setHasBooking(checked);

    // ---- 批量添加 ----
    const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
    const [dayFilter, setDayFilter] = useState<'all' | 'weekday' | 'weekend'>('all');
    const [slotDefs, setSlotDefs] = useState<{ key: string; title: string }[]>([{ key: 's1', title: '' }]);
    const [slotCapacity, setSlotCapacity] = useState(10);

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

    const handleSubmit = () => {
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

      const newSlots: WizardSlot[] = [];
      for (const indices of selectedSkus) {
        const skuLabel = skuLabels.find((l) => l.spec_indices === indices);
        for (const d of dates) {
          for (const sd of filled) {
            newSlots.push({
              key: uid(), spec_text: skuLabel ? skuLabel.specText : indices,
              spec_indices: indices, slot_date: d, slot_time: '',
              title: sd.title.trim(), capacity: slotCapacity, _action: 'create' as const,
            });
          }
        }
      }
      setSlots((prev) => [...prev, ...newSlots]);
      success(`已生成 ${newSlots.length} 个预约时段`);
      setModalOpen(false);
    };

    const handleDelete = (slot: WizardSlot) => {
      if (slot._action === 'create') {
        setSlots((prev) => prev.filter((s) => s.key !== slot.key));
      } else {
        setSlots((prev) => prev.map((s) =>
          s.key === slot.key ? { ...s, _action: undefined } : s,
        ));
      }
    };

    const visible = useMemo(() =>
      slots
        .filter((s) => s._action !== undefined && validTexts.has(s.spec_text))
        .sort((a, b) => a.slot_date.localeCompare(b.slot_date)),
      [slots, validTexts]);

    const columns = [
      { title: '日期', dataIndex: 'slot_date', key: 'slot_date', width: 110 },
      { title: '时段', dataIndex: 'title', key: 'title', ellipsis: true },
      { title: '关联SKU', dataIndex: 'spec_text', key: 'spec_text', width: 200, ellipsis: true },
      { title: '容量', dataIndex: 'capacity', key: 'capacity', width: 70 },
      {
        title: '状态', key: 'status', width: 80,
        render: (_: unknown, record: WizardSlot) => record.status
          ? <Tag color={record.status === 'active' ? 'blue' : 'default'}>{record.status === 'active' ? '启用' : '停用'}</Tag>
          : <Tag color="green">待保存</Tag>,
      },
      {
        title: '操作', key: 'actions', width: 80,
        render: (_: unknown, record: WizardSlot) => (
          <Button type="link" size="small" danger onClick={() => handleDelete(record)}>删除</Button>
        ),
      },
    ];

    return (
      <>
        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 8 }}>是否需预约使用</span>
          <Switch checked={hasBooking} checkedChildren="是" unCheckedChildren="否" onChange={handleToggleHasBooking} />
        </div>

        {hasBooking && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>预约时段（{visible.length} 个）</span>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>添加时段</Button>
            </div>
            <div style={{ background: '#fff', borderRadius: 4, border: '1px solid #d9d9d9', overflow: 'hidden' }}>
            <Table rowKey="key" columns={columns} dataSource={visible} loading={loading}
              size="small" pagination={false} scroll={{ y: 240 }} />
            </div>
            <div style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
              注：预约时段将在点击"完成"后与 SKU 一并保存
            </div>
          </div>
        )}

        <ScrollableModal title="批量添加时段" open={modalOpen} onCancel={() => setModalOpen(false)} width={600} destroyOnHidden
          footer={<Space><Button onClick={() => setModalOpen(false)}>取消</Button><Button type="primary" onClick={handleSubmit}>生成</Button></Space>}>
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
  },
);

export default BookingSlotManager;
