import { useState, useCallback, useEffect } from 'react';
import { Switch, InputNumber, Button, Space } from 'antd';
import { EditOutlined, DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { productApi, Product } from '@/api/services/product';
import { categoryApi } from '@/api/services/category';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import EventEditModal from '@/components/operation/EventEditModal';
import SkuConfigModal from '@/components/operation/SkuConfigModal';
import EventWizardModal from '@/components/operation/EventWizardModal';

interface CategoryOption {
  id: number;
  name: string;
}

const EventManagement = () => {
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Product | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [values, setValues] = useState<Record<string, any>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [configProduct, setConfigProduct] = useState<Product | null>(null);
  const [wizardVisible, setWizardVisible] = useState(false);
  const { success, error: showError } = useAppNotification();

  // 点击编辑时从接口拉取完整详情
  const handleEdit = async (record: Product) => {
    setEditMode('edit');
    setLoadingDetail(true);
    try {
      const detail: any = await productApi.getProductDetail(record.id);
      setSelectedEvent(detail || record);
    } catch {
      setSelectedEvent(record); // 降级用列表数据
    } finally {
      setLoadingDetail(false);
      setEditModalVisible(true); // 数据就绪后才打开弹窗
    }
  };

  // 加载活动分类（id=1 的子节点）
  useEffect(() => {
    categoryApi.getMallCategories().then((res: any) => {
      const nodes: any[] = Array.isArray(res) ? res : (res?.list || []);
      const root = nodes.find((n: any) => n.id === 1);
      setCategoryOptions(root?.children || []);
    }).catch(() => setCategoryOptions([]));
  }, []);

  const fetchEvents = useCallback(async (params: any) => {
    return productApi.getProducts({ ...params, is_virtual: true });
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total || 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Product>({
    fetchFn: fetchEvents,
    formatResponse: formatResponse,
  });

  const handleListStatusChange = async (record: Product, checked: boolean) => {
    await productApi.updateListStatus(record.id, checked);
    success(`${checked ? '上架' : '下架'}成功`);
    refresh();
  };

  const handleVisibilityChange = async (record: Product, checked: boolean) => {
    await productApi.updateVisibility(record.id, checked);
    success(`${checked ? '显示' : '隐藏'}成功`);
    refresh();
  };

  const handleSortOrderChange = async (record: Product, value: number | null) => {
    if (value == null) return;
    await productApi.updateSortOrder(record.id, value);
    success('权重更新成功');
    refresh();
  };

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return '-';
    return categoryOptions.find((c) => c.id === categoryId)?.name || '-';
  };

  const filters: FilterConfig[] = [
    {
      name: 'category_id',
      placeholder: '全部类型',
      type: 'select',
      options: categoryOptions.map((c) => ({ label: c.name, value: c.id })),
    },
    { name: 'keyword', placeholder: '搜索活动名称', type: 'input' },
  ];

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };
  const handleSearch = (vals: Record<string, any>) => { search(vals); };
  const handleReset = () => { setValues({}); search({}); };

  const columns: ColumnsType<Product> = [
    { title: '活动名称', dataIndex: 'title', key: 'title' },
    {
      title: '所属分类', dataIndex: 'category_id', key: 'category_id',
      render: (v?: number) => getCategoryName(v),
    },
    {
      title: '上架/下架', dataIndex: 'is_listed', key: 'is_listed', width: 110,
      render: (v: boolean, r: Product) => (
        <Switch checked={v === true} checkedChildren="上架" unCheckedChildren="下架"
          onChange={(c) => handleListStatusChange(r, c)} />
      ),
    },
    {
      title: '显示/隐藏', dataIndex: 'is_visible', key: 'is_visible', width: 110,
      render: (v: boolean, r: Product) => (
        <Switch checked={v !== false} checkedChildren="显示" unCheckedChildren="隐藏"
          onChange={(c) => handleVisibilityChange(r, c)} />
      ),
    },
    {
      title: '权重', dataIndex: 'sort_order', key: 'sort_order', width: 120,
      render: (v: number | undefined, r: Product) => (
        <InputNumber value={v ?? undefined} min={0} precision={0} style={{ width: 100 }}
          onChange={(val) => handleSortOrderChange(r, val)} />
      ),
    },
    {
      title: '操作', key: 'action', width: 240, fixed: 'right' as const,
      render: (_: any, r: Product) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<SettingOutlined />}
            onClick={() => {
              if (r.is_listed === true) {
                showError('请先下架商品，再进行配置管理');
                return;
              }
              setConfigProduct(r);
              setConfigModalVisible(true);
            }}>
            配置
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => handleEdit(r)}>编辑</Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />}
            onClick={() => confirmDelete({ name: r.title, deleteFn: () => productApi.deleteProduct(r.id), onSuccess: refresh })}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <StandardPage
        title="活动发布"
        description="管理平台活动，支持上下架、显隐控制。"
        showRefreshButton onRefresh={refresh}
        searchArea={<SearchPanel filters={filters} values={values} onChange={handleChange} onSearch={handleSearch} onReset={handleReset} />}
        showAddButton
        onAdd={() => setWizardVisible(true)}
        addButtonText="添加活动"
        table={<StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />}
      />
      <EventEditModal visible={editModalVisible} mode={editMode} event={selectedEvent}
        categoryOptions={categoryOptions} loadingDetail={loadingDetail}
        onClose={() => { setEditModalVisible(false); setSelectedEvent(null); }} onSuccess={refresh} />

      <SkuConfigModal visible={configModalVisible}
        productId={configProduct?.id || 0} productTitle={configProduct?.title || ''}
        onClose={() => { setConfigModalVisible(false); setConfigProduct(null); }} onSuccess={refresh} />

      <EventWizardModal visible={wizardVisible} categoryOptions={categoryOptions}
        onClose={() => setWizardVisible(false)} onSuccess={refresh} />
    </>
  );
};

export default EventManagement;
