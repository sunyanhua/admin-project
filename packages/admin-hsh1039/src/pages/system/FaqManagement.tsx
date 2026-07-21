import { useState, useCallback, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Switch, InputNumber, Space, Form, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { helpsApi, Help } from '@/api/services/helps';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import ScrollableModal from '@/components/templates/ScrollableModal';

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];

const FaqManagement = () => {
  const { success, error: showError } = useAppNotification();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHelp, setEditingHelp] = useState<Help | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<number>(0);
  const [statusEnabled, setStatusEnabled] = useState(true);
  const [form] = Form.useForm();

  // 加载默认分类（接口要求 category_id 必填，但 UI 不展示分类选择）
  useEffect(() => {
    helpsApi.getCategories({ page: 1, page_size: 1 }).then((res: any) => {
      const list = res?.list || [];
      if (list.length > 0) setDefaultCategoryId(list[0].id);
    }).catch(() => {});
  }, []);

  const fetchHelps = useCallback(async (params: any) => {
    return helpsApi.getHelps(params);
  }, []);

  const formatHelpResponse = useCallback((res: any) => ({
    list: res?.list || res?.data || [],
    count: res?.total ?? res?.count ?? 0,
  }), []);

  const {
    data,
    loading: listLoading,
    pagination,
    onPageChange,
    refresh,
    search,
  } = useListPage<Help>({
    fetchFn: fetchHelps,
    formatResponse: formatHelpResponse,
  });

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  // 状态切换
  const handleStatusToggle = async (record: Help, checked: boolean) => {
    try {
      await helpsApi.updateHelp(record.id, { status: checked ? 0 : 1 });
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '状态更新失败');
    }
  };

  // 权重修改
  const handleSortChange = async (record: Help, value: number | null) => {
    try {
      await helpsApi.updateHelp(record.id, { sort_order: value ?? undefined });
      success('权重更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '权重更新失败');
    }
  };

  const handleAdd = () => {
    setEditingHelp(null);
    setStatusEnabled(true);
    setModalVisible(true);
    setTimeout(() => form.resetFields(), 0);
  };

  const handleEdit = async (record: Help) => {
    setEditingHelp(record);
    setLoadingDetail(true);
    try {
      const res: any = await helpsApi.getHelpDetail(record.id);
      const detail = res?.data || res || {};
      const helpData = { ...record, ...detail };
      setEditingHelp(helpData);
      setStatusEnabled(helpData.status !== 1);
      setModalVisible(true);
      setTimeout(() => {
        form.setFieldsValue({
          title: helpData.title || '',
          content: helpData.content || '',
          sort_order: helpData.sort_order,
        });
      }, 0);
    } catch {
      setStatusEnabled(record.status !== 1);
      setModalVisible(true);
      setTimeout(() => {
        form.setFieldsValue({
          title: record.title || '',
          content: record.content || '',
          sort_order: record.sort_order,
        });
      }, 0);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: Record<string, any> = {
        title: values.title,
        category_id: editingHelp?.category_id ?? defaultCategoryId,
        content: values.content || undefined,
        status: statusEnabled ? 0 : 1,
        sort_order: values.sort_order ?? undefined,
      };

      if (editingHelp) {
        await helpsApi.updateHelp(editingHelp.id, payload);
        success('更新成功');
      } else {
        await helpsApi.createHelp(payload as any);
        success('添加成功');
      }
      setModalVisible(false);
      refresh();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<Help> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span style={{ wordBreak: 'break-word' }}>{text}</span>,
    },
    {
      title: '权重',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 120,
      render: (orderon: number | undefined, record: Help) => (
        <InputNumber
          min={0}
          value={orderon}
          style={{ width: 70 }}
          onBlur={(e) => {
            const val = e.target.value;
            const num = val === '' ? null : parseInt(val);
            if (num !== (record.sort_order ?? null)) {
              handleSortChange(record, num);
            }
          }}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: Help) => (
        <Switch
          checked={status === 0}
          onChange={(checked) => handleStatusToggle(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    ActionColumn({
      onEdit: (record) => handleEdit(record),
      onDelete: (record) => confirmDelete({
        name: record.title,
        deleteFn: () => helpsApi.deleteHelp(record.id),
        onSuccess: refresh,
      }),
      showView: false,
    }),
  ];

  return (
    <>
      <StandardPage
        title="帮助中心"
        description="管理帮助中心的常见问题与文章。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="添加文章"
        searchArea={
          <SearchPanel
            filters={filters}
            values={{}}
            onChange={() => {}}
            onSearch={handleSearch}
            onReset={() => search({})}
          />
        }
        table={
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={listLoading}
            pagination={pagination}
            onPageChange={onPageChange}
          />
        }
      />

      <ScrollableModal
        title={editingHelp ? '编辑文章' : '添加文章'}
        open={modalVisible}
        onCancel={() => { form.resetFields(); setModalVisible(false); }}
        width={800}
        destroyOnHidden
        footer={
          <Space>
            <Button onClick={() => { form.resetFields(); setModalVisible(false); }}>取消</Button>
            <Button type="primary" loading={loading} onClick={() => form.submit()}>
              {editingHelp ? '保存' : '创建'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="标题"
            name="title"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入文章标题" maxLength={128} showCount />
          </Form.Item>

          <Form.Item
            label="内容"
            name="content"
          >
            <RichTextEditor placeholder="请输入文章内容" />
          </Form.Item>

          <Form.Item label="权重" name="sort_order" extra="数字越大排序越靠前">
            <InputNumber min={0} precision={0} placeholder="请输入权重" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="状态">
            <Switch
              checked={statusEnabled}
              onChange={setStatusEnabled}
              checkedChildren="启用"
              unCheckedChildren="禁用"
            />
          </Form.Item>
        </Form>
      </ScrollableModal>
    </>
  );
};

export default FaqManagement;
