import { useState, useCallback, useEffect } from 'react';
import { Button, Switch, Tag, Modal, Form, Input, InputNumber, DatePicker, Select, Space } from 'antd';
import { EyeOutlined, SendOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { couponApi } from '@/api/services/coupon';
import { categoryApi } from '@/api/services/category';
import { productApi } from '@/api/services/product';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { AddEditModal } from '@/components/templates/AddEditModal';
import ScrollableModal from '@/components/templates/ScrollableModal';

// 优惠券状态
const COUPON_STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '停用', color: 'default' },
  1: { text: '启用', color: 'green' },
};

// 适用范围
const SCOPE_TYPE_MAP: Record<string, string> = {
  all: '全场通用',
  category: '指定分类',
  product: '指定产品',
};

const SCOPE_TYPE_OPTIONS = [
  { label: '全场通用', value: 'all' },
  { label: '指定分类', value: 'category' },
  { label: '指定产品', value: 'product' },
];

const STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
];

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

interface CategoryNode {
  id: number;
  name: string;
  children?: CategoryNode[];
}

interface ProductOption {
  value: number;
  label: string;
}

const formatAmount = (amount: number) => `¥${(amount / 100).toFixed(2)}`;

const CouponManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<CouponRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const { success, error: showError } = useAppNotification();

  // 发放弹窗
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendCouponId, setSendCouponId] = useState<number>(0);
  const [sendCouponName, setSendCouponName] = useState('');
  const [sendUserIds, setSendUserIds] = useState('');
  const [sendSubmitting, setSendSubmitting] = useState(false);

  // 分类数据
  const [categories, setCategories] = useState<CategoryNode[]>([]);

  // 编辑时已选产品的标签信息
  const [editProductLabels, setEditProductLabels] = useState<ProductOption[]>([]);
  const [addProductLabels, setAddProductLabels] = useState<ProductOption[]>([]);

  useEffect(() => {
    categoryApi.getMallCategories().then((res: any) => {
      const nodes: CategoryNode[] = Array.isArray(res) ? res : (res?.list || []);
      setCategories(nodes);
    }).catch(() => setCategories([]));
  }, []);

  const fetchCoupons = useCallback(async (params: any) => {
    return couponApi.getCoupons(params);
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<CouponRecord>({
    fetchFn: fetchCoupons,
    formatResponse,
  });

  const handleStatusToggle = async (record: CouponRecord, checked: boolean) => {
    try {
      await couponApi.toggleCouponStatus(record.id, checked ? 1 : 0);
      success(checked ? '已启用' : '已停用');
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.message || '操作失败');
    }
  };

  // 构建 scope_ids
  const buildScopeIds = (vals: any): number[] | undefined => {
    if (vals.scope_type === 'all') return undefined;
    if (vals.scope_type === 'category') return vals.category_ids || undefined;
    if (vals.scope_type === 'product') return vals.product_ids || undefined;
    return undefined;
  };

  const handleAdd = () => {
    addForm.resetFields();
    addForm.setFieldsValue({ scope_type: 'all', allow_rollback: true, threshold_amount: 0 });
    setAddProductLabels([]);
    setAddModalOpen(true);
  };

  const handleAddSubmit = async (vals: any) => {
    setSubmitting(true);
    try {
      await couponApi.createCoupon({
        name: vals.name,
        discount_amount: Math.round(vals.discount_amount * 100),
        threshold_amount: vals.threshold_amount ? Math.round(vals.threshold_amount * 100) : 0,
        total_stock: vals.total_stock,
        start_time: vals.start_time ? vals.start_time.toISOString() : '',
        end_time: vals.end_time ? vals.end_time.toISOString() : '',
        scope_type: vals.scope_type || 'all',
        scope_ids: buildScopeIds(vals),
        allow_rollback: vals.allow_rollback ?? true,
      });
      success('创建成功');
      setAddModalOpen(false);
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.message || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 加载编辑数据的产品标签
  const loadEditProductLabels = async (scopeIds: number[]) => {
    const labels: ProductOption[] = [];
    for (const id of scopeIds) {
      try {
        const p: any = await productApi.getProductDetail(id);
        labels.push({ value: id, label: p?.title || `产品#${id}` });
      } catch {
        labels.push({ value: id, label: `产品#${id}` });
      }
    }
    setEditProductLabels(labels);
  };

  const handleEdit = (record: CouponRecord) => {
    setEditRecord(record);
    editForm.setFieldsValue({
      name: record.name,
      discount_amount: record.discount_amount / 100,
      threshold_amount: record.threshold_amount / 100,
      total_stock: record.total_stock,
      start_time: record.start_time ? dayjs(record.start_time) : undefined,
      end_time: record.end_time ? dayjs(record.end_time) : undefined,
      scope_type: record.scope_type || 'all',
      allow_rollback: record.allow_rollback,
    });

    // 加载已选范围
    if (record.scope_type === 'category' && record.scope_ids && record.scope_ids.length > 0) {
      editForm.setFieldsValue({ category_ids: record.scope_ids });
      setEditProductLabels([]);
    } else if (record.scope_type === 'product' && record.scope_ids && record.scope_ids.length > 0) {
      editForm.setFieldsValue({ product_ids: record.scope_ids });
      loadEditProductLabels(record.scope_ids);
    } else {
      setEditProductLabels([]);
    }
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (vals: any) => {
    if (!editRecord) return;
    setSubmitting(true);
    try {
      const data: any = {};
      if (vals.name !== editRecord.name) data.name = vals.name;
      if (vals.discount_amount !== undefined) data.discount_amount = Math.round(vals.discount_amount * 100);
      if (vals.threshold_amount !== undefined) data.threshold_amount = Math.round(vals.threshold_amount * 100);
      if (vals.total_stock !== undefined) data.total_stock = vals.total_stock;
      if (vals.start_time !== undefined) data.start_time = vals.start_time ? vals.start_time.toISOString() : '';
      if (vals.end_time !== undefined) data.end_time = vals.end_time ? vals.end_time.toISOString() : '';
      data.scope_type = vals.scope_type || 'all';
      data.scope_ids = buildScopeIds(vals);
      if (vals.allow_rollback !== undefined) data.allow_rollback = vals.allow_rollback;
      await couponApi.updateCoupon(editRecord.id, data);
      success('更新成功');
      setEditModalOpen(false);
      setEditRecord(null);
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (record: CouponRecord) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除优惠券"${record.name}"吗？`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await couponApi.deleteCoupon(record.id);
          success('删除成功');
          refresh();
        } catch (err: any) {
          showError(err.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const openSendModal = (record: CouponRecord) => {
    setSendCouponId(record.id);
    setSendCouponName(record.name);
    setSendUserIds('');
    setSendModalOpen(true);
  };

  const handleSend = async () => {
    const ids = sendUserIds
      .split(/[\n,，]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      showError('请填写至少一个用户ID');
      return;
    }
    setSendSubmitting(true);
    try {
      await couponApi.sendCoupon({ coupon_id: sendCouponId, user_ids: ids });
      success(`已向 ${ids.length} 个用户发放优惠券`);
      setSendModalOpen(false);
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.message || '发放失败');
    } finally {
      setSendSubmitting(false);
    }
  };

  const columns: ColumnsType<CouponRecord> = [
    {
      title: '优惠券名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <div style={{ wordBreak: 'break-word' }}>{text}</div>,
    },
    {
      title: '优惠',
      key: 'discount',
      width: 160,
      render: (_: any, r: CouponRecord) => {
        if (r.threshold_amount > 0) {
          return `满${(r.threshold_amount / 100).toFixed(2)}减${(r.discount_amount / 100).toFixed(2)}`;
        }
        return `减${(r.discount_amount / 100).toFixed(2)}`;
      },
    },
    {
      title: '库存',
      key: 'stock',
      width: 100,
      render: (_: any, r: CouponRecord) => (
        <span>{r.claimed_count ?? 0} / {r.total_stock}</span>
      ),
    },
    {
      title: '适用范围',
      dataIndex: 'scope_type',
      key: 'scope_type',
      width: 100,
      render: (v: string) => <Tag>{SCOPE_TYPE_MAP[v] || v}</Tag>,
    },
    {
      title: '有效期',
      key: 'validity',
      width: 200,
      render: (_: any, r: CouponRecord) => {
        const start = r.start_time ? dayjs(r.start_time).format('YYYY/MM/DD HH:mm') : '立即生效';
        const end = r.end_time ? dayjs(r.end_time).format('YYYY/MM/DD HH:mm') : '永久有效';
        return `${start} ~ ${end}`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: CouponRecord) => (
        <Switch
          checked={status === 1}
          checkedChildren="启用"
          unCheckedChildren="停用"
          onChange={(checked) => handleStatusToggle(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, r: CouponRecord) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
          <Button type="link" size="small" icon={<SendOutlined />} onClick={() => openSendModal(r)}>发放</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(r)}>删除</Button>
        </Space>
      ),
    },
  ];

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  const handleReset = () => {
    setValues({});
    search({});
  };

  // 适用范围 + 分类/产品选择器
  const ScopeFields = ({ form, productLabels, setProductLabels }: {
    form: any;
    productLabels: ProductOption[];
    setProductLabels: React.Dispatch<React.SetStateAction<ProductOption[]>>;
  }) => {
    const scopeType = Form.useWatch('scope_type', form);
    // For product search dropdown
    const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [searching, setSearching] = useState(false);

    const selectedIds: number[] = Form.useWatch('product_ids', form) || [];

    const doSearch = async (keyword: string) => {
      setSearchValue(keyword);
      if (!keyword || keyword.length < 1) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res: any = await productApi.getProducts({ keyword, page: 1, page_size: 20 });
        const list: any[] = res?.list || [];
        const selectedSet = new Set(selectedIds);
        setSearchResults(
          list
            .filter((p: any) => !selectedSet.has(p.id))
            .map((p: any) => ({ value: p.id, label: p.title })),
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const addProduct = (item: ProductOption) => {
      const newIds = [...selectedIds, item.value];
      form.setFieldsValue({ product_ids: newIds });
      setProductLabels((prev) => [...prev, item]);
      setSearchValue('');
      setSearchResults([]);
    };

    const removeProduct = (id: number) => {
      const newIds = selectedIds.filter((v: number) => v !== id);
      form.setFieldsValue({ product_ids: newIds });
      setProductLabels((prev) => prev.filter((p) => p.value !== id));
    };

    return (
      <>
        <Form.Item name="scope_type" label="适用范围" initialValue="all" rules={[{ required: true }]}>
          <Select
            options={SCOPE_TYPE_OPTIONS}
            onChange={() => {
              form.setFieldsValue({ category_ids: undefined, product_ids: undefined });
              setProductLabels([]);
            }}
          />
        </Form.Item>

        {scopeType === 'category' && (
          <Form.Item name="category_ids" label="选择分类" rules={[{ required: true, message: '请选择至少一个分类' }]}>
            <Select
              mode="multiple"
              placeholder="请选择一级分类"
              style={{ width: '100%' }}
              fieldNames={{ label: 'name', value: 'id' }}
              options={categories}
            />
          </Form.Item>
        )}

        {scopeType === 'product' && (
          <div style={{ marginBottom: 24 }}>
            <Form.Item name="product_ids" label="选择产品" rules={[{ required: true, message: '请选择至少一个产品' }]} style={{ marginBottom: 8 }}>
              <input type="hidden" />
            </Form.Item>
            <div style={{ paddingLeft: 0 }}>
              {/* 已选产品标签 */}
              <div style={{ marginBottom: 8 }}>
                {productLabels.map((p) => (
                  <Tag
                    key={p.value}
                    closable
                    onClose={() => removeProduct(p.value)}
                    style={{ marginBottom: 4 }}
                  >
                    {p.label}
                  </Tag>
                ))}
                {productLabels.length === 0 && <span style={{ color: '#999' }}>请在下拉框中搜索并选择产品</span>}
              </div>
              {/* 搜索下拉 */}
              <Select
                showSearch
                value={undefined}
                placeholder="输入关键词搜索产品"
                filterOption={false}
                loading={searching}
                style={{ width: '100%' }}
                searchValue={searchValue}
                onSearch={(val) => doSearch(val)}
                onSelect={(val: number) => {
                  const found = searchResults.find((r) => r.value === val);
                  if (found) addProduct(found);
                }}
                onBlur={() => { setSearchValue(''); setSearchResults([]); }}
                options={searchResults.map((r) => ({ ...r }))}
                notFoundContent={searching ? '搜索中...' : (searchValue ? '未找到匹配产品' : '输入关键词开始搜索')}
              />
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <StandardPage
        title="优惠券管理"
        description="管理优惠券模板，支持创建满减券、启用/停用、发放到指定用户。"
        showAddButton
        onAdd={handleAdd}
        addButtonText="创建优惠券"
        showRefreshButton
        onRefresh={refresh}
        searchArea={
          <SearchPanel
            filters={filters}
            values={values}
            onChange={handleChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        }
        table={
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={pagination}
            onPageChange={onPageChange}
            scroll={{ x: 1100 }}
          />
        }
      />

      <AddEditModal
        title="创建优惠券"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onSubmit={handleAddSubmit}
        submitting={submitting}
        form={addForm}
        width={560}
      >
        <Form.Item name="name" label="优惠券名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="请输入优惠券名称" maxLength={64} />
        </Form.Item>
        <Form.Item name="discount_amount" label="优惠金额（元）" rules={[{ required: true, message: '请输入优惠金额' }]}>
          <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="请输入优惠金额" />
        </Form.Item>
        <Form.Item name="threshold_amount" label="满减门槛（元）" extra="0 表示无门槛" initialValue={0}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0 表示无门槛" />
        </Form.Item>
        <Form.Item name="total_stock" label="发放总量" rules={[{ required: true, message: '请输入发放总量' }]}>
          <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入发放总量" />
        </Form.Item>
        <Form.Item name="start_time" label="生效时间">
          <DatePicker showTime style={{ width: '100%' }} placeholder="不填则立即生效" />
        </Form.Item>
        <Form.Item name="end_time" label="截止时间">
          <DatePicker showTime style={{ width: '100%' }} placeholder="不填则永久有效" />
        </Form.Item>
        <ScopeFields form={addForm} productLabels={addProductLabels} setProductLabels={setAddProductLabels} />
        <Form.Item name="allow_rollback" label="取消退还" initialValue={true} valuePropName="checked">
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
      </AddEditModal>

      <AddEditModal
        title="编辑优惠券"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditRecord(null); }}
        onSubmit={handleEditSubmit}
        submitting={submitting}
        form={editForm}
        width={560}
      >
        <Form.Item name="name" label="优惠券名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="请输入优惠券名称" maxLength={64} />
        </Form.Item>
        <Form.Item name="discount_amount" label="优惠金额（元）" rules={[{ required: true, message: '请输入优惠金额' }]}>
          <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="请输入优惠金额" />
        </Form.Item>
        <Form.Item name="threshold_amount" label="满减门槛（元）" extra="0 表示无门槛">
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0 表示无门槛" />
        </Form.Item>
        <Form.Item name="total_stock" label="发放总量" rules={[{ required: true, message: '请输入发放总量' }]}>
          <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入发放总量" />
        </Form.Item>
        <Form.Item name="start_time" label="生效时间">
          <DatePicker showTime style={{ width: '100%' }} placeholder="不填则立即生效" />
        </Form.Item>
        <Form.Item name="end_time" label="截止时间">
          <DatePicker showTime style={{ width: '100%' }} placeholder="不填则永久有效" />
        </Form.Item>
        <ScopeFields form={editForm} productLabels={editProductLabels} setProductLabels={setEditProductLabels} />
        <Form.Item name="allow_rollback" label="取消退还" initialValue={true} valuePropName="checked">
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
      </AddEditModal>

      <ScrollableModal
        title={`发放优惠券 — ${sendCouponName}`}
        open={sendModalOpen}
        onCancel={() => setSendModalOpen(false)}
        width={500}
        destroyOnHidden
        footer={
          <Space>
            <Button onClick={() => setSendModalOpen(false)}>取消</Button>
            <Button type="primary" loading={sendSubmitting} onClick={handleSend}>发放</Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 8 }}>用户ID（每行一个，或以逗号分隔）</div>
        <Input.TextArea
          rows={6}
          placeholder="请输入用户ID，多个换行或用逗号分隔"
          value={sendUserIds}
          onChange={(e) => setSendUserIds(e.target.value)}
        />
      </ScrollableModal>
    </>
  );
};

export default CouponManagement;
