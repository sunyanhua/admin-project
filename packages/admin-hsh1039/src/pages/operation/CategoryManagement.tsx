import { useState, useCallback, useEffect } from 'react';
import { categoryApi } from '@/api/services/category';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import CategoryEditModal from '@/components/operation/CategoryEditModal';
import type { ColumnsType } from 'antd/es/table';

interface MallCategory {
  id: number;
  name: string;
  children?: MallCategory[];
}

const CategoryManagement = () => {
  const [data, setData] = useState<MallCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MallCategory | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await categoryApi.getMallCategories();
      const nodes: MallCategory[] = Array.isArray(res) ? res : (res?.list || []);
      // 只显示顶级分类（parent_id 为 null 的节点），剥离 children 字段
      const topLevel: MallCategory[] = nodes
        .filter((n: any) => n.parent_id == null)
        .map(({ children, ...rest }: any) => rest);
      setData(topLevel);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns: ColumnsType<MallCategory> = [
    { title: '分类ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '分类名称', dataIndex: 'name', key: 'name' },
    ActionColumn({
      onEdit: (r) => { setSelectedCategory(r); setEditMode('edit'); setEditModalVisible(true); },
      onDelete: (r) => confirmDelete({ name: r.name.trim(), deleteFn: () => categoryApi.deleteMallCategory(r.id), onSuccess: fetchData }),
      showView: false,
    }),
  ];

  return (
    <>
      <StandardPage title="运营分类管理" description="管理系统商品/活动的分类树，支持多级分类。"
        showRefreshButton onRefresh={fetchData} showAddButton
        onAdd={() => { setSelectedCategory(null); setEditMode('create'); setEditModalVisible(true); }}
        addButtonText="添加分类"
        table={<StandardTable columns={columns} dataSource={data} loading={loading} pagination={false} rowKey="id" />}
      />
      <CategoryEditModal visible={editModalVisible} mode={editMode} category={selectedCategory}
        onClose={() => { setEditModalVisible(false); setSelectedCategory(null); }} onSuccess={fetchData} />
    </>
  );
};

export default CategoryManagement;
