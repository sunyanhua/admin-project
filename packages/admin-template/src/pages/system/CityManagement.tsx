import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag, Typography, Modal, Form, Input, Switch } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { cityApi, City } from '../../api/services/city';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { confirmDelete } from '@/components/templates/ConfirmDelete';

const { Title } = Typography;

const filters: FilterConfig[] = [
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
];

const CityManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { success, error: showError } = useAppNotification();

  const fetchCities = useCallback(async (params: any) => {
    return cityApi.getCities(params);
  }, []);

  const formatCityResponse = useCallback((res: any) => ({
    list: res?.data || [],
    count: res?.count || 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<City>({
    fetchFn: fetchCities,
    formatResponse: formatCityResponse,
  });

  const handleAdd = () => {
    setEditingCity(null);
    setModalVisible(true);
    setTimeout(() => form.resetFields(), 0);
  };

  const handleEdit = (record: City) => {
    setEditingCity(record);
    setModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        adcode: record.adcode,
        title: record.title,
        arg_0: record.arg_0,
      });
    }, 0);
  };

  const handleDelete = (record: City) => {
    confirmDelete({
      name: record.title,
      deleteFn: () => cityApi.deleteCity(record.adcode),
      onSuccess: refresh,
    });
  };

  const handleStatusToggle = async (record: City, checked: boolean) => {
    try {
      await cityApi.updateStatus(record.adcode, checked ? 0 : 1);
      success('状态更新成功');
      refresh();
    } catch (err: any) {
      showError(err.response?.data?.msg || '状态更新失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingCity) {
        await cityApi.updateCity(editingCity.adcode, values);
        success('更新成功');
      } else {
        await cityApi.createCity(values);
        success('创建成功');
      }
      setModalVisible(false);
      refresh();
    } catch (err: any) {
      if (err.errorFields) return;
      showError(err.response?.data?.msg || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<City> = [
    {
      title: '行政区划码',
      dataIndex: 'adcode',
      key: 'adcode',
      width: 120,
    },
    {
      title: '城市名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: City) => (
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
    }),
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

  return (
    <>
      <StandardPage
        title="城市管理"
        description="管理系统城市数据，使用国家标准行政区划代码。"
        showRefreshButton={true}
        onRefresh={refresh}
        showAddButton
        onAdd={handleAdd}
        addButtonText="添加城市"
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
            rowKey="adcode"
            scroll={{ x: 1000 }}
          />
        }
      />

      <Modal
        title={editingCity ? '编辑城市' : '添加城市'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="行政区划码"
            name="adcode"
            rules={[{ required: true, message: '请输入行政区划码' }]}
          >
            <Input placeholder="6位行政区划代码，如：110000" disabled={!!editingCity} />
          </Form.Item>
          <Form.Item
            label="城市名称"
            name="title"
            rules={[{ required: true, message: '请输入城市名称' }]}
          >
            <Input placeholder="城市名称" />
          </Form.Item>
          <Form.Item
            label="备注"
            name="arg_0"
          >
            <Input.TextArea rows={2} placeholder="备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CityManagement;
