import { useState, useCallback, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, InputNumber, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { helpCategoryApi, helpEntryApi, HelpCategory, HelpEntry } from '@/api/services/helps-v1';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { statusSwitchColumn } from '@/components/templates/ColumnHelpers';
import HelpCategoryEditModal from '@/components/system/HelpCategoryEditModal';
import HelpEntryEditModal from '@/components/system/HelpEntryEditModal';

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '停用', value: 1 },
];

const FaqManagement = () => {
  const { success, error: showError } = useAppNotification();

  // 分类状态
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoryEditMode, setCategoryEditMode] = useState<'create' | 'edit'>('create');
  const [editingCategory, setEditingCategory] = useState<HelpCategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);

  // 条目状态
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [entryEditMode, setEntryEditMode] = useState<'create' | 'edit'>('create');
  const [editingEntry, setEditingEntry] = useState<HelpEntry | null>(null);
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  // 加载全部分类（一级分类）
  const loadCategories = useCallback(async () => {
    try {
      const res: any = await helpCategoryApi.getList({ page: 1, size: 100 });
      const list: HelpCategory[] = Array.isArray(res) ? res : (res?.list || []);
      setCategories(list);
      const opts = list.map((c) => ({ label: c.name, value: c.id }));
      setCategoryOptions(opts);
    } catch {
      setCategories([]);
      setCategoryOptions([]);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  // 条目列表
  const fetchEntries = useCallback(async (params: any) => {
    return helpEntryApi.getList({
      page: params.page,
      size: params.page_size,
      status: params.status,
      keyword: params.keyword,
      category_root_id: selectedCategoryId,
    });
  }, [selectedCategoryId]);

  const formatEntryResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const { data, loading, pagination, onPageChange, refresh: refreshEntries, search } = useListPage<HelpEntry>({
    fetchFn: fetchEntries,
    formatResponse: formatEntryResponse,
  });

  const handleSearchChange = (name: string, value: any) => {
    setSearchValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => { search(vals); };
  const handleReset = () => { setSearchValues({}); search({}); };

  // 状态切换
  const handleEntryStatusToggle = async (record: HelpEntry, checked: boolean) => {
    try {
      await helpEntryApi.toggleStatus(record.id, checked ? 0 : 1);
      success('状态更新成功');
      refreshEntries();
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  const handleEntrySortChange = async (record: HelpEntry, value: number | null) => {
    if (value == null) return;
    try {
      await helpEntryApi.update(record.id, { sort_order: value });
      success('权重更新成功');
      refreshEntries();
    } catch (err: any) {
      showError(err?.response?.data?.message || '权重更新失败');
    }
  };

  // 分类操作
  const handleAddCategory = (parentId?: string) => {
    setCategoryEditMode('create');
    setEditingCategory(null);
    setCategoryModalVisible(true);
  };

  const handleEditCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    setCategoryEditMode('edit');
    setEditingCategory(cat);
    setCategoryModalVisible(true);
  };

  const handleDeleteCategory = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    confirmDelete({
      name: cat.name,
      deleteFn: () => helpCategoryApi.delete(catId),
      onSuccess: () => { refreshEntries(); loadCategories(); },
    });
  };

  // 条目操作
  const handleAddEntry = () => {
    setEntryEditMode('create');
    setEditingEntry(null);
    setEntryModalVisible(true);
  };

  const handleEditEntry = (record: HelpEntry) => {
    setEntryEditMode('edit');
    setEditingEntry(record);
    setEntryModalVisible(true);
  };

  const entriesFilter: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
    { name: 'keyword', placeholder: '搜索问题/答案', type: 'input' },
  ];

  const getCategoryName = (id: string) => {
    const c = categories.find((x) => x.id === id);
    return c ? c.name : '';
  };

  const entryColumns: ColumnsType<HelpEntry> = [
    {
      title: '问题',
      dataIndex: 'question',
      key: 'question',
      render: (text: string) => <span style={{ wordBreak: 'break-word' }}>{text}</span>,
    },
    {
      title: '分类',
      dataIndex: 'category_id',
      key: 'category_id',
      width: 100,
      render: (v: string) => <Tag title={getCategoryName(v)}>{getCategoryName(v) || '-'}</Tag>,
    },
    statusSwitchColumn<HelpEntry>('status', 0, 1, handleEntryStatusToggle, '启用', '停用', 100),
    {
      title: '权重',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 120,
      render: (v: number | undefined, r: HelpEntry) => (
        <InputNumber
          min={0}
          value={v ?? 0}
          style={{ width: 70 }}
          onBlur={(e) => {
            const val = e.target.value;
            const num = val === '' ? undefined : parseInt(val);
            if (num !== (r.sort_order ?? undefined)) {
              handleEntrySortChange(r, num ?? 0);
            }
          }}
        />
      ),
    },
    ActionColumn({
      onEdit: (record) => handleEditEntry(record),
      onDelete: (record) => confirmDelete({
        name: record.question,
        deleteFn: () => helpEntryApi.delete(record.id),
        onSuccess: refreshEntries,
      }),
      showView: false,
    }),
  ];

  return (
    <>
      <StandardPage
        title="FAQ 管理"
        description="管理帮助分类和常见问题条目，支持多级分类和富文本答案。"
        showRefreshButton
        onRefresh={() => { refreshEntries(); loadCategories(); }}
        table={
          <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 16, minHeight: 400 }}>
            {/* 左侧分类列表 */}
            <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>分类</span>
                <Button type="link" size="small" icon={<PlusOutlined />}
                  onClick={() => handleAddCategory()} />
              </div>
              {categories.length > 0 ? (
                <>
                  <div
                    onClick={() => { setSelectedCategoryId(undefined); setTimeout(() => refreshEntries(), 0); }}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '8px 14px', cursor: 'pointer',
                      borderBottom: '1px solid #f0f0f0',
                      background: !selectedCategoryId ? '#e6f4ff' : '#fff',
                      color: !selectedCategoryId ? '#1677ff' : undefined,
                      fontWeight: !selectedCategoryId ? 600 : undefined,
                      transition: 'background 0.15s',
                    }}
                  >
                    <span>全部分类</span>
                  </div>
                  {categories.map((cat, idx) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => { setSelectedCategoryId(cat.id); setTimeout(() => refreshEntries(), 0); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 14px',
                        cursor: 'pointer',
                        borderBottom: idx < categories.length - 1 ? '1px solid #f0f0f0' : 'none',
                        background: isSelected ? '#e6f4ff' : '#fff',
                        color: isSelected ? '#1677ff' : undefined,
                        fontWeight: isSelected ? 600 : undefined,
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cat.name}
                      </span>
                      <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <Button type="link" size="small" icon={<EditOutlined style={{ fontSize: 12 }} />}
                          onClick={(e) => { e.stopPropagation(); handleEditCategory(cat.id); }} />
                        <Button type="link" size="small" danger icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} />
                      </span>
                    </div>
                  );
                })}
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: 20, fontSize: 13 }}>暂无分类</div>
              )}
            </div>

            {/* 右侧条目列表 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <SearchPanel
                  filters={entriesFilter}
                  values={searchValues}
                  onChange={handleSearchChange}
                  onSearch={handleSearch}
                  onReset={handleReset}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddEntry}>添加条目</Button>
              </div>
              <StandardTable
                columns={entryColumns}
                dataSource={data}
                loading={loading}
                pagination={pagination}
                onPageChange={onPageChange}
              />
            </div>
          </div>
        }
      />

      <HelpCategoryEditModal
        visible={categoryModalVisible}
        mode={categoryEditMode}
        category={editingCategory}
        onClose={() => setCategoryModalVisible(false)}
        onSuccess={() => { refreshEntries(); loadCategories(); }}
      />

      <HelpEntryEditModal
        visible={entryModalVisible}
        mode={entryEditMode}
        entry={editingEntry}
        categoryOptions={categoryOptions}
        onClose={() => setEntryModalVisible(false)}
        onSuccess={refreshEntries}
      />
    </>
  );
};

export default FaqManagement;
