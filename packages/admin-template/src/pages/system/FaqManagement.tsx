import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Typography, Switch, Modal, Form, Input, InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import request from '@/api';

const STATUS_OPTIONS = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '状态筛选', type: 'select', options: STATUS_OPTIONS },
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
];

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '禁用', color: 'red' },
  1: { text: '启用', color: 'green' },
};

interface Faq {
  id: number;
  modu: string;
  title: string;
  contents: string;
  status: number;
  orderon: number;
  inserton: string;
}

const FaqManagement = () => {
  const { success, error } = useAppNotification();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [form] = Form.useForm();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});

  const fetchFaqs = useCallback(async (params: any) => {
    return request.get('/admin/cms/article', { params: { ...params, modu: 'faq' } });
  }, []);

  const formatFaqResponse = useCallback((res: any) => ({
    list: res?.data?.list || res?.data || [],
    count: res?.count || res?.data?.count || 0,
  }), []);

  const {
    data,
    loading,
    pagination,
    onPageChange,
    refresh,
    search,
  } = useListPage<Faq>({
    fetchFn: fetchFaqs,
    formatResponse: formatFaqResponse,
  });

  const handleSearchChange = (name: string, value: any) => {
    setSearchValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  const handleReset = () => {
    setSearchValues({});
    search({});
  };

  const handleStatusToggle = async (record: Faq, checked: boolean) => {
    try {
      await request.post('/admin/cms/article/status', { id: record.id, status: checked ? 0 : 1 });
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '状态更新失败');
    }
  };

  const handleOrderChange = async (record: Faq, value: number | null | undefined) => {
    try {
      await request.post('/admin/cms/article/orderon', { id: record.id, orderon: value ?? undefined });
      success('排序更新成功');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '排序更新失败');
    }
  };

  const handleAdd = () => {
    setEditingFaq(null);
    setModalVisible(true);
    setTimeout(() => {
      form.resetFields();
      form.setFieldsValue({ status: 0 });
    }, 0);
  };

  const handleEdit = (record: Faq) => {
    setEditingFaq(record);
    setModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        title: record.title,
        contents: record.contents,
        status: record.status,
        orderon: record.orderon ?? undefined,
      });
    }, 0);
  };

  const handleDelete = (record: Faq) => {
    confirmDelete({
      name: record.title,
      deleteFn: () => request.post('/admin/cms/article/delete', { id: record.id }),
      onSuccess: refresh,
    });
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData: Record<string, any> = {
        modu: 'faq',
        title: values.title,
        contents: values.contents,
        status: values.status ? 1 : 0,
      };
      if (values.orderon !== undefined && values.orderon !== null && values.orderon !== '') {
        submitData.orderon = values.orderon;
      }

      if (editingFaq) {
        await request.post(`/admin/cms/article/${editingFaq.id}`, submitData);
        success('更新成功');
      } else {
        await request.post('/admin/cms/article', submitData);
        success('添加成功');
      }
      setModalVisible(false);
      refresh();
    } catch (err: any) {
      if (err.errorFields) return;
      error(err.response?.data?.msg || '操作失败');
    }
  };

  const columns: ColumnsType<Faq> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'orderon',
      key: 'orderon',
      width: 120,
      render: (orderon: number, record: Faq) => (
        <InputNumber
          min={0}
          max={9999}
          value={orderon}
          placeholder="未设置"
          style={{ width: 90 }}
          onBlur={(e) => {
            const val = e.target.value ? parseInt(e.target.value) : null;
            handleOrderChange(record, val);
          }}
          onPressEnter={(e) => {
            const val = (e.target as HTMLInputElement).value ? parseInt((e.target as HTMLInputElement).value) : null;
            handleOrderChange(record, val);
          }}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: Faq) => (
        <Switch
          checked={status === 0}
          onChange={(checked) => handleStatusToggle(record, checked)}
          checkedChildren="启用"
          unCheckedChildren="禁用"
        />
      ),
    },
    ActionColumn({
      onEdit: handleEdit,
      onDelete: handleDelete,
      showView: false,
    }),
  ];

  return (
    <>
      <StandardPage
        title="FAQ管理"
        description="管理常见问题解答内容。"
        showRefreshButton={true}
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="添加FAQ"
        searchArea={
          <SearchPanel
            filters={filters}
            values={searchValues}
            onChange={handleSearchChange}
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
          />
        }
      />

      <Modal
        title={editingFaq ? '编辑FAQ' : '添加FAQ'}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={800}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: 0 }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入FAQ标题" maxLength={200} showCount />
          </Form.Item>

          <Form.Item
            name="contents"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <RichTextEditor placeholder="请输入FAQ内容" />
          </Form.Item>

          {!editingFaq && (
            <Form.Item
              name="orderon"
              label="排序"
              extra="数字越小排序越靠前，留空则按创建时间排序"
            >
              <InputNumber min={0} max={9999} placeholder="请输入排序序号" style={{ width: '100%' }} />
            </Form.Item>
          )}

          <Form.Item
            name="status"
            label="状态"
            valuePropName="checked"
            getValueFromEvent={(checked) => (checked ? 0 : 1)}
            getValueProps={(value) => ({ checked: value === 0 })}
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default FaqManagement;
