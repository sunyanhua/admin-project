import { useState, useCallback } from 'react';
import { Tag, Space, Spin, Form, Input, Select, Modal } from 'antd';
import { useListPage } from '@/hooks/useListPage';
import { useAppNotification } from '@/hooks/useAppNotification';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { StatusSwitch } from '@/components/templates/StatusSwitch';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { wxaApi } from '@/api/services/wxa';
import { AdminUserStatus } from '@/api/types/status';
import { formatDateTime, formatDate } from '@/utils/format';

const filters: FilterConfig[] = [
  { name: 'keyword', placeholder: '应用名称搜索', type: 'input' },
];

const APP_TYPE_OPTIONS = [
  { label: '小程序', value: 'miniapp' },
  { label: '公众号', value: 'official_account' },
];

const WxaAppManagement: React.FC = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form] = Form.useForm();

  const { success, error: showError } = useAppNotification();

  const fetchApps = useCallback(async (params: any) => {
    return wxaApi.getApps({
      page: params.page,
      size: params.page_size || params.size,
      keyword: params.keyword,
    });
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<any>({
    fetchFn: fetchApps,
    formatResponse,
  });

  const handleStatusToggle = async (record: any, checked: boolean) => {
    try {
      await wxaApi.updateStatus(record.id, checked ? AdminUserStatus.ACTIVE : AdminUserStatus.DISABLED);
      success(checked ? '小程序配置已启用' : '小程序配置已停用');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '操作失败');
    }
  };

  const handleCreate = () => {
    setEditingRecord(null);
    setModalOpen(true);
    setTimeout(() => form.resetFields(), 0);
  };

  const handleEdit = async (record: any) => {
    setEditingRecord(record);
    setLoadingDetail(true);
    try {
      const res: any = await wxaApi.getAppDetail(record.id);
      const detail = res?.data || res || {};
      const merged = { ...record, ...detail };
      setEditingRecord(merged);
      setModalOpen(true);
      setTimeout(() => {
        form.setFieldsValue({
          app_id: merged.app_id || '',
          app_name: merged.app_name || '',
          app_secret: '',
          app_type: merged.app_type || 'miniapp',
        });
      }, 0);
    } catch {
      showError('加载小程序配置详情失败，使用列表数据编辑');
      setModalOpen(true);
      setTimeout(() => {
        form.setFieldsValue({
          app_id: record.app_id || '',
          app_name: record.app_name || '',
          app_secret: '',
          app_type: record.app_type || 'miniapp',
        });
      }, 0);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = (record: any) => {
    confirmDelete({
      name: record.app_name,
      deleteFn: () => wxaApi.deleteApp(record.id),
      onSuccess: refresh,
    });
  };

  const handleExpireToken = (record: any) => {
    Modal.confirm({
      title: '确认过期 Token',
      content: `确定要立即使 "${record.app_name}" 的 AccessToken 过期吗？过期后需要重新获取。`,
      okText: '确认过期',
      okType: 'danger',
      onOk: async () => {
        try {
          await wxaApi.expireToken(record.id);
          success('AccessToken 已过期');
          refresh();
        } catch (err: any) {
          showError(err?.response?.data?.message || '操作失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const isEditing = !!editingRecord?.id;
      if (isEditing) {
        const updateData: any = {
          id: editingRecord.id,
          app_name: values.app_name,
          app_type: values.app_type,
        };
        if (values.app_secret) {
          updateData.app_secret = values.app_secret;
        }
        await wxaApi.updateApp(editingRecord.id, updateData);
        success('小程序配置已更新');
      } else {
        await wxaApi.createApp({
          app_id: values.app_id,
          app_name: values.app_name,
          app_secret: values.app_secret,
          app_type: values.app_type,
        });
        success('小程序配置已创建');
      }

      form.resetFields();
      setModalOpen(false);
      setEditingRecord(null);
      refresh();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'AppID',
      dataIndex: 'app_id',
      key: 'app_id',
      render: (v: string) => <span style={{ wordBreak: 'break-word' }}>{v || '-'}</span>,
    },
    {
      title: '应用名称',
      dataIndex: 'app_name',
      key: 'app_name',
      render: (v: string) => <span style={{ wordBreak: 'break-word' }}>{v || '-'}</span>,
    },
    {
      title: '类型',
      dataIndex: 'app_type',
      key: 'app_type',
      width: 90,
      render: (v: string) => (
        <Tag color={v === 'miniapp' ? 'blue' : 'green'}>{v === 'miniapp' ? '小程序' : v === 'official_account' ? '公众号' : v || '-'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_: any, record: any) => (
        <StatusSwitch checked={record.status === AdminUserStatus.ACTIVE} onChange={(checked: boolean) => handleStatusToggle(record, checked)} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (t: string) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>{formatDate(t)}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{t ? formatDateTime(t).split(' ')[1] : '-'}</div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: any) => (
        <Space className="action-buttons">
          <a onClick={() => handleEdit(record)}>编辑</a>
          <a onClick={() => handleExpireToken(record)} style={{ color: '#faad14' }}>过期Token</a>
          <a onClick={() => handleDelete(record)} style={{ color: '#ff4d4f' }}>删除</a>
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

  return (
    <>
      <StandardPage
        title="小程序配置管理"
        description="管理微信小程序和公众号的应用配置，包括 AppID、密钥、AccessToken 管理。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        addButtonText="新增配置"
        onAdd={handleCreate}
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
            scroll={{ x: 800 }}
          />
        }
      />

      <ScrollableModal
        title={editingRecord?.id ? '编辑小程序配置' : '新增小程序配置'}
        open={modalOpen}
        onCancel={() => { form.resetFields(); setModalOpen(false); setEditingRecord(null); }}
        onOk={handleSubmit}
        okText={editingRecord?.id ? '保存' : '创建'}
        confirmLoading={submitting}
        width={600}
      >
        <Spin spinning={loadingDetail}>
          <Form form={form} layout="vertical">
            <Form.Item
              name="app_id"
              label="AppID"
              rules={[{ required: true, message: '请输入 AppID' }]}
            >
              <Input placeholder="微信公众平台分配的应用 ID" disabled={!!editingRecord?.id} />
            </Form.Item>
            <Form.Item
              name="app_name"
              label="应用名称"
              rules={[{ required: true, message: '请输入应用名称' }]}
            >
              <Input placeholder="应用的显示名称" />
            </Form.Item>
            <Form.Item
              name="app_secret"
              label="AppSecret"
              rules={editingRecord?.id ? [] : [{ required: true, message: '请输入 AppSecret' }]}
            >
              <Input.Password placeholder={editingRecord?.id ? '留空则不修改' : '微信公众平台分配的应用密钥'} />
            </Form.Item>
            <Form.Item
              name="app_type"
              label="应用类型"
              rules={[{ required: true, message: '请选择应用类型' }]}
            >
              <Select placeholder="请选择应用类型" options={APP_TYPE_OPTIONS} />
            </Form.Item>
          </Form>
        </Spin>
      </ScrollableModal>
    </>
  );
};

export default WxaAppManagement;
