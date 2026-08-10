import { useState, useCallback, useEffect } from 'react';
import { Button, Switch, Tag, Modal, Form, Input, InputNumber, DatePicker, Space, Divider, Row, Col } from 'antd';
import { statusSwitchColumn } from '@/components/templates/ColumnHelpers';
import { EyeOutlined, SendOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { dayjsToApi } from '@/utils/format';
import { couponApi } from '@/api/services/coupon';
import { categoryApi } from '@/api/services/category';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { AddEditModal } from '@/components/templates/AddEditModal';
import ScrollableModal from '@/components/templates/ScrollableModal';
import ScopeFields, { ProductOption, CategoryNode } from '@/components/finance/ScopeFields';

// ---- 常量 ----

const COUPON_STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '启用', color: 'green' },
  1: { text: '停用', color: 'default' },
};

const SCOPE_TYPE_MAP: Record<string, string> = {
  all: '全场通用',
  category: '指定分类',
  product: '指定产品',
};

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '停用', value: 1 },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

// ---- 类型 ----

interface CouponRecord {
  id: number;
  name: string;
  discount_amount: number;
  threshold_amount: number;
  total_stock: number;
  claimed_count?: number;
  used_count?: number;
  scope_type: string;
  scope_ids?: number[];
  start_time: string;
  end_time: string;
  status: number;
  allow_rollback: boolean;
  created_at?: string;
}

const formatAmount = (amount: number) => `¥${(amount / 100).toFixed(2)}`;

// ---- 主组件 ----

const CouponManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<CouponRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const { success, error: showError } = useAppNotification();

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendCouponId, setSendCouponId] = useState<number>(0);
  const [sendCouponName, setSendCouponName] = useState('');
  const [sendUserIds, setSendUserIds] = useState('');
  const [sendSubmitting, setSendSubmitting] = useState(false);

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [addProductLabels, setAddProductLabels] = useState<ProductOption[]>([]);

  useEffect(() => {
    categoryApi.getMallCategories().then((res: any) => {
      setCategories(Array.isArray(res) ? res : (res?.list || []));
    }).catch(() => setCategories([]));
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<CouponRecord>({
    fetchFn: useCallback(async (params: any) => couponApi.getCoupons(params), []),
    formatResponse: useCallback((res: any) => ({ list: res?.list || [], count: res?.total ?? 0 }), []),
  });

  const buildScopeIds = (vals: any): number[] | undefined => {
    if (vals.scope_type === 'all') return undefined;
    if (vals.scope_type === 'category') return vals.category_ids || undefined;
    if (vals.scope_type === 'product') return vals.product_ids || undefined;
    return undefined;
  };

  // ---- 添加 ----
  const handleAdd = () => {
    addForm.resetFields();
    addForm.setFieldsValue({ scope_type: 'all', allow_rollback: true, threshold_amount: 0, user_daily_limit: 0, user_total_limit: 0 });
    setAddProductLabels([]);
    setAddModalOpen(true);
  };

  const handleAddSubmit = async (vals: any) => {
    setSubmitting(true);
    try {
      const couponBody: any = {
        name: vals.name,
        discount_amount: Math.round(vals.discount_amount * 100),
        threshold_amount: Math.round((vals.threshold_amount || 0) * 100),
        total_stock: vals.total_stock,
        scope_type: vals.scope_type || 'all',
        scope_ids: buildScopeIds(vals),
        allow_rollback: vals.allow_rollback ?? true,
      };
      if (vals.start_time) couponBody.start_time = dayjsToApi(vals.start_time);
      if (vals.end_time) couponBody.end_time = dayjsToApi(vals.end_time);
      const couponRes: any = await couponApi.createCoupon(couponBody);
      const couponId = couponRes?.id ?? couponRes?.data?.id;
      if (!couponId) { success('创建成功（领取规则创建失败）'); setAddModalOpen(false); refresh(); return; }

      try {
        const ruleBody: any = { coupon_id: couponId, points_required: vals.points_required, total_limit: vals.total_limit ?? 0, user_daily_limit: vals.user_daily_limit ?? 0, user_total_limit: vals.user_total_limit ?? 0 };
        await couponApi.createExchangeConfig(ruleBody);
      } catch { /* 规则创建失败不影响优惠券 */ }

      success('创建成功');
      setAddModalOpen(false);
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- 编辑 ----
  const handleEdit = (record: CouponRecord) => {
    setEditRecord(record);
    editForm.setFieldsValue({
      name: record.name,
      discount_amount: record.discount_amount / 100,
      threshold_amount: record.threshold_amount / 100,
      total_stock: record.total_stock,
      start_time: record.start_time ? dayjs(record.start_time) : undefined,
      end_time: record.end_time ? dayjs(record.end_time) : undefined,
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (vals: any) => {
    if (!editRecord) return;
    setSubmitting(true);
    try {
      const data: any = {};
      if (vals.name !== editRecord.name) data.name = vals.name;
      if (vals.start_time !== undefined) data.start_time = vals.start_time ? vals.start_time.toISOString() : '';
      if (vals.end_time !== undefined) data.end_time = vals.end_time ? vals.end_time.toISOString() : '';
      await couponApi.updateCoupon(editRecord.id, data);
      success('更新成功');
      setEditModalOpen(false); setEditRecord(null);
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.message || '更新失败');
    } finally { setSubmitting(false); }
  };

  // ---- 删除 / 启停 / 发放 ----
  const handleDelete = (record: CouponRecord) => {
    Modal.confirm({
      title: '确认删除', content: `确定要删除优惠券"${record.name}"吗？`, okText: '确认', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try { await couponApi.deleteCoupon(record.id); success('删除成功'); refresh(); }
        catch (err: any) { showError(err.response?.data?.message || '删除失败'); }
      },
    });
  };

  const handleStatusToggle = async (record: CouponRecord, checked: boolean) => {
    if (!record?.id) { showError('优惠券ID缺失'); return; }
    try { await couponApi.toggleCouponStatus(record.id, checked ? 0 : 1); success(checked ? '已启用' : '已停用'); refresh(); }
    catch (err: any) { showError(err.response?.data?.message || '操作失败'); }
  };

  const openSendModal = (record: CouponRecord) => { setSendCouponId(record.id); setSendCouponName(record.name); setSendUserIds(''); setSendModalOpen(true); };

  const handleSend = async () => {
    const ids = sendUserIds.split(/[\n,，]/).map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) { showError('请填写至少一个用户ID'); return; }
    setSendSubmitting(true);
    try { await couponApi.sendCoupon({ coupon_id: sendCouponId, user_ids: ids }); success(`已向 ${ids.length} 个用户发放优惠券`); setSendModalOpen(false); refresh(); }
    catch (err: any) { showError(err.response?.data?.message || '发放失败'); }
    finally { setSendSubmitting(false); }
  };

  // ---- 表格 ----
  const columns: ColumnsType<CouponRecord> = [
    { title: '优惠券名称', dataIndex: 'name', key: 'name', render: (text: string) => <div style={{ wordBreak: 'break-word' }}>{text}</div> },
    {
      title: '优惠', key: 'discount', width: 160,
      render: (_: any, r: CouponRecord) => r.threshold_amount > 0
        ? `满${(r.threshold_amount / 100).toFixed(2)}减${(r.discount_amount / 100).toFixed(2)}`
        : `减${(r.discount_amount / 100).toFixed(2)}`,
    },
    { title: '库存', key: 'stock', width: 100, render: (_: any, r: CouponRecord) => <span>{r.claimed_count ?? 0} / {r.total_stock}</span> },
    { title: '适用范围', dataIndex: 'scope_type', key: 'scope_type', width: 100, render: (v: string) => <Tag>{SCOPE_TYPE_MAP[v] || v}</Tag> },
    {
      title: '有效期', key: 'validity', width: 200,
      render: (_: any, r: CouponRecord) => {
        const start = r.start_time ? dayjs(r.start_time).format('YYYY/MM/DD HH:mm') : '立即生效';
        const end = r.end_time ? dayjs(r.end_time).format('YYYY/MM/DD HH:mm') : '永久有效';
        return `${start} ~ ${end}`;
      },
    },
    statusSwitchColumn<CouponRecord>('status', 0, 1, handleStatusToggle, '启用', '停用', 100),
    {
      title: '操作', key: 'action', width: 180, fixed: 'right' as const,
      render: (_: any, r: CouponRecord) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Button type="link" size="small" icon={<SendOutlined />} onClick={() => openSendModal(r)}>发放</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(r)}>删除</Button>
        </Space>
      ),
    },
  ];

  const handleChange = (name: string, value: any) => setValues((prev) => ({ ...prev, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setValues({}); search({}); };

  // 表单内容渲染（disabled 用于编辑模式只读）
  const renderFormFields = (form: any, productLabels: ProductOption[], setProductLabels: React.Dispatch<React.SetStateAction<ProductOption[]>>, disabled = false) => (
    <>
      <Divider orientation="left" style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>优惠券信息</Divider>
      <Form.Item name="name" label="优惠券名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input placeholder="请输入优惠券名称" maxLength={64} />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="discount_amount" label="优惠金额（元）" rules={disabled ? [] : [{ required: true, message: '请输入优惠金额' }]}>
            <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="请输入优惠金额" disabled={disabled} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="threshold_amount" label="满减门槛（元）" extra="0 表示无门槛" initialValue={0}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0 表示无门槛" disabled={disabled} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="total_stock" label="发放总量" rules={disabled ? [] : [{ required: true, message: '请输入发放总量' }]}>
        <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入发放总量" disabled={disabled} />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="start_time" label="生效时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="不填则立即生效" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="end_time" label="截止时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="不填则永久有效" />
          </Form.Item>
        </Col>
      </Row>
      {disabled ? (
        <>
          <Form.Item label="适用范围"><Input value={SCOPE_TYPE_MAP[editRecord?.scope_type || 'all']} disabled /></Form.Item>
          {editRecord?.scope_type === 'category' && editRecord?.scope_ids && (
            <Form.Item label="已选分类"><Input value={editRecord.scope_ids.join(', ')} disabled /></Form.Item>
          )}
          {editRecord?.scope_type === 'product' && editRecord?.scope_ids && (
            <Form.Item label="已选产品"><Input value={editRecord.scope_ids.join(', ')} disabled /></Form.Item>
          )}
          <Form.Item label="取消退还"><Switch checked={editRecord?.allow_rollback} disabled /></Form.Item>
        </>
      ) : (
        <>
          <ScopeFields form={form} productLabels={productLabels} setProductLabels={setProductLabels} categories={categories} />
          <Form.Item name="allow_rollback" label="取消退还" initialValue={true} valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </>
      )}

      <Divider orientation="left" style={{ fontSize: 14, fontWeight: 600, margin: '24px 0 12px' }}>领取规则</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="points_required" label="所需积分" rules={disabled ? [] : [{ required: true, message: '请输入所需积分' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入所需积分" disabled={disabled} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="total_limit" hidden initialValue={0}>
        <InputNumber />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="user_daily_limit" label="每人每日限制" extra="0 表示不限制" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0 表示不限制" disabled={disabled} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="user_total_limit" label="每人总量限制" extra="0 表示不限制" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0 表示不限制" disabled={disabled} />
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  return (
    <>
      <StandardPage
        title="优惠券管理"
        description="管理优惠券模板，支持创建满减券、配置领取规则、启用/停用、发放到指定用户。"
        showAddButton onAdd={handleAdd} addButtonText="创建优惠券"
        showRefreshButton onRefresh={refresh}
        searchArea={<SearchPanel filters={filters} values={values} onChange={handleChange} onSearch={handleSearch} onReset={handleReset} />}
        table={<StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} scroll={{ x: 1100 }} />}
      />

      <AddEditModal title="优惠券" open={addModalOpen} onCancel={() => setAddModalOpen(false)} onSubmit={handleAddSubmit} submitting={submitting} form={addForm} width={600}>
        {renderFormFields(addForm, addProductLabels, setAddProductLabels)}
      </AddEditModal>

      <ScrollableModal
        title={`编辑优惠券 — ${editRecord?.name || ''}`}
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditRecord(null); }}
        width={600}
        destroyOnHidden
        footer={
          <Space>
            <Button onClick={() => { setEditModalOpen(false); setEditRecord(null); }}>取消</Button>
            <Button type="primary" loading={submitting} onClick={() => editForm.submit()}>保存</Button>
          </Space>
        }
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditSubmit} autoComplete="off" scrollToFirstError={{ behavior: 'smooth', block: 'center' }}>
          {renderFormFields(editForm, [], () => {}, true)}
        </Form>
      </ScrollableModal>

      <ScrollableModal title={`发放优惠券 — ${sendCouponName}`} open={sendModalOpen} onCancel={() => setSendModalOpen(false)} width={500} destroyOnHidden
        footer={<Space><Button onClick={() => setSendModalOpen(false)}>取消</Button><Button type="primary" loading={sendSubmitting} onClick={handleSend}>发放</Button></Space>}>
        <div style={{ marginBottom: 8 }}>用户ID（每行一个，或以逗号分隔）</div>
        <Input.TextArea rows={6} placeholder="请输入用户ID，多个换行或用逗号分隔" value={sendUserIds} onChange={(e) => setSendUserIds(e.target.value)} />
      </ScrollableModal>
    </>
  );
};

export default CouponManagement;
