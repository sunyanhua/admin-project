import { useState, useCallback } from 'react';
import { Tag, Switch, InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { logisticsApi, LogisticsCompany } from '@/api/services/logistics';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import LogisticsEditModal from '@/components/operation/LogisticsEditModal';

const LogisticsManagement = () => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<LogisticsCompany | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const { success } = useAppNotification();

  const fetchCompanies = useCallback(async () => {
    return logisticsApi.getCompanies();
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: Array.isArray(res) ? res : (res?.list || []),
    count: Array.isArray(res) ? res.length : (res?.total || 0),
  }), []);

  const { data, loading, pagination, onPageChange, refresh } = useListPage<LogisticsCompany>({
    fetchFn: fetchCompanies,
    formatResponse,
  });

  const handleStatusChange = async (record: LogisticsCompany, checked: boolean) => {
    await logisticsApi.updateCompany(record.id, { status: checked ? 0 : 1 });
    success(checked ? '已启用' : '已禁用');
    refresh();
  };

  const handleSortOrderChange = async (record: LogisticsCompany, value: number | null) => {
    if (value == null) return;
    await logisticsApi.updateCompany(record.id, { sort_order: value });
    success('排序更新成功');
    refresh();
  };

  const columns: ColumnsType<LogisticsCompany> = [
    {
      title: '物流名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '标识',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code: string) => <Tag color="blue" title={code}>{code}</Tag>,
    },
    {
      title: '官网',
      dataIndex: 'website',
      key: 'website',
      width: 180,
      ellipsis: true,
      render: (v: string) => v ? <a href={v} target="_blank" rel="noopener noreferrer">{v}</a> : '-',
    },
    {
      title: '排序',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 120,
      render: (v: number | undefined, r: LogisticsCompany) => (
        <InputNumber value={v ?? undefined} min={0} precision={0} style={{ width: 70 }}
          onChange={(val) => handleSortOrderChange(r, val)} />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: number, r: LogisticsCompany) => (
        <Switch checked={v === 0} checkedChildren="启用" unCheckedChildren="禁用"
          onChange={(c) => handleStatusChange(r, c)} />
      ),
    },
    ActionColumn({
      onEdit: (record) => {
        setSelectedCompany(record);
        setEditMode('edit');
        setEditModalVisible(true);
      },
      onDelete: (record) => confirmDelete({
        name: record.name,
        deleteFn: () => logisticsApi.deleteCompany(record.id),
        onSuccess: refresh,
      }),
      showView: false,
      width: 200,
    }),
  ];

  const handleAdd = () => {
    setSelectedCompany(null);
    setEditMode('create');
    setEditModalVisible(true);
  };

  return (
    <>
      <StandardPage
        title="物流管理"
        description="管理平台物流公司信息，支持增删改查及排序。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="添加物流公司"
        table={
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={pagination}
            onPageChange={onPageChange}
          />
        }
      />

      <LogisticsEditModal
        visible={editModalVisible}
        mode={editMode}
        company={selectedCompany}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedCompany(null);
        }}
        onSuccess={refresh}
      />
    </>
  );
};

export default LogisticsManagement;
