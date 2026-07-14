import { useState, useCallback, useEffect } from 'react';
import { Switch, InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { categoryApi } from '@/api/services/category';
import { useAppNotification } from '@/hooks/useAppNotification';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import EventCategoryEditModal from '@/components/operation/EventCategoryEditModal';

interface MallCategory {
  id: number;
  name: string;
  is_listed?: boolean;
  is_visible?: boolean;
  sort_order?: number;
  children?: MallCategory[];
}

function flattenTree(nodes: MallCategory[], depth = 0): MallCategory[] {
  const result: MallCategory[] = [];
  const prefix = '　'.repeat(depth);
  nodes.forEach((node) => {
    result.push({ ...node, name: prefix + node.name });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  });
  return result;
}

const EventCategoryManagement = () => {
  const [data, setData] = useState<MallCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MallCategory | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const { success, error: showError } = useAppNotification();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await categoryApi.getMallCategories();
      const nodes: MallCategory[] = Array.isArray(res) ? res : (res?.list || []);
      // 只取父类为1的（即 id=1 节点的直接子节点）
      const root = nodes.find((n) => n.id === 1);
      const filtered = root?.children || [];
      setData(flattenTree(filtered));
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleListStatusChange = async (record: MallCategory, checked: boolean) => {
    await categoryApi.updateMallCategoryListStatus(record.id, checked);
    success(`${checked ? '上架' : '下架'}成功`);
    fetchData();
  };

  const handleVisibilityChange = async (record: MallCategory, checked: boolean) => {
    await categoryApi.updateMallCategoryVisibility(record.id, checked);
    success(`${checked ? '显示' : '隐藏'}成功`);
    fetchData();
  };

  const handleSortOrderChange = async (record: MallCategory, value: number | null) => {
    if (value == null) return;
    await categoryApi.updateMallCategorySortOrder(record.id, value);
    success('权重更新成功');
    fetchData();
  };

  const columns: ColumnsType<MallCategory> = [
    { title: '分类名称', dataIndex: 'name', key: 'name', render: (n: string) => n.trim() },
    {
      title: '上架/下架',
      dataIndex: 'is_listed',
      key: 'is_listed',
      width: 110,
      render: (v: boolean, r: MallCategory) => (
        <Switch checked={v !== false} checkedChildren="上架" unCheckedChildren="下架"
          onChange={(c) => handleListStatusChange(r, c)} />
      ),
    },
    {
      title: '显示/隐藏',
      dataIndex: 'is_visible',
      key: 'is_visible',
      width: 110,
      render: (v: boolean, r: MallCategory) => (
        <Switch checked={v !== false} checkedChildren="显示" unCheckedChildren="隐藏"
          onChange={(c) => handleVisibilityChange(r, c)} />
      ),
    },
    {
      title: '权重',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 120,
      render: (v: number | undefined, r: MallCategory) => (
        <InputNumber value={v ?? undefined} min={0} precision={0} style={{ width: 100 }}
          onChange={(val) => handleSortOrderChange(r, val)} />
      ),
    },
    ActionColumn({
      onEdit: (r) => { setSelectedCategory(r); setEditMode('edit'); setEditModalVisible(true); },
      onDelete: (r) => confirmDelete({
        name: r.name.trim(), deleteFn: () => categoryApi.deleteMallCategory(r.id), onSuccess: fetchData,
      }),
      showView: false,
    }),
  ];

  return (
    <>
      <StandardPage title="活动分类管理" description="管理活动分类，支持上下架、显隐控制及权重排序。"
        showRefreshButton onRefresh={fetchData} showAddButton
        onAdd={() => { setSelectedCategory(null); setEditMode('create'); setEditModalVisible(true); }}
        addButtonText="添加分类"
        table={<StandardTable columns={columns} dataSource={data} loading={loading} pagination={false} rowKey="id" />}
      />
      <EventCategoryEditModal visible={editModalVisible} mode={editMode} category={selectedCategory}
        onClose={() => { setEditModalVisible(false); setSelectedCategory(null); }} onSuccess={fetchData} />
    </>
  );
};

export default EventCategoryManagement;
