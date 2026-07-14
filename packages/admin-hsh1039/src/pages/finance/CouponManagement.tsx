import { useState, useCallback } from 'react';
import { Button, Modal, Form, InputNumber, DatePicker, Input, Select, Switch, Table, Descriptions, Typography, App } from 'antd';
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import request from '@/api';
import { eventApi } from '@/api/services/event';
import { useListPage } from '@/hooks/useListPage';
import { useAppNotification } from '@/hooks/useAppNotification';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { AddEditModal } from '@/components/templates/AddEditModal';
import { exportToExcel } from '@/utils/exportUtils';
import dayjs from 'dayjs';

// 优惠券批次状态枚举
enum CouponBatchStatus {
  NORMAL = 0,
  DISABLED = 1,
}

const CouponBatchStatusMap: Record<number, { text: string; color: string }> = {
  [CouponBatchStatus.NORMAL]: { text: '正常', color: 'green' },
  [CouponBatchStatus.DISABLED]: { text: '已作废', color: 'red' },
};

const STATUS_OPTIONS = [
  { label: '正常', value: CouponBatchStatus.NORMAL },
  { label: '已作废', value: CouponBatchStatus.DISABLED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
];

interface CouponBatch {
  id: number;
  title: string;
  free: number;
  minimum: number;
  total: number;
  eventid?: number;
  usable?: string;
  expiry?: string;
  insertat: string;
  status: number;
  status_reason?: string;
  status_update?: string;
  used_total: number;
}

interface CouponItem {
  id: number;
  code: string;
  free: number;
  minimum: number;
  batchid: number;
  eventid?: number;
  userid?: string;
  orderid?: number;
  usable?: string;
  expiry?: string;
  insertat: string;
  status: number;
  status_reason?: string;
  status_update?: string;
  user_data?: {
    avatar?: string;
    nick?: string;
    name?: string;
  };
  event_data?: {
    id?: number;
    title?: string;
  };
  order_data?: {
    insertat?: string;
    payable?: number;
    status?: number;
  };
}

const CouponManagement = () => {
  const { message } = App.useApp();
  const [values, setValues] = useState<Record<string, any>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [eventLoading, setEventLoading] = useState(false);
  const [events, setEvents] = useState<{ id: number; title: string }[]>([]);
  const { success, error } = useAppNotification();

  // 查看优惠券弹窗状态
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewData, setViewData] = useState<CouponItem[]>([]);
  const [viewPagination, setViewPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [viewBatchTitle, setViewBatchTitle] = useState('');
  const [viewBatchRecord, setViewBatchRecord] = useState<CouponBatch | null>(null);

  // 加载可选活动列表（只显示进行中的活动）
  const loadEvents = async () => {
    setEventLoading(true);
    try {
      const res = await eventApi.getEvents({ start: 0, length: 500, status: 1 }) as any;
      const list = res?.data?.list || res?.data || [];
      setEvents(list.map((item: any) => ({
        id: item.id,
        title: item.title || item.event_data?.title || `活动${item.id}`,
      })));
    } catch {
      setEvents([]);
    } finally {
      setEventLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    loadEvents();
    setAddModalOpen(true);
  };

  const fetchCouponBatches = useCallback(async (params: any) => {
    return request.get('/admin/v6/coupon/batch', { params });
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: res?.data?.list || res?.data || [],
    count: res?.data?.count || res?.count || 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<CouponBatch>({
    fetchFn: fetchCouponBatches,
    formatResponse,
  });

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

  const handleAdd = () => {
    handleOpenAddModal();
  };

  const handleSubmit = async (vals: any) => {
    try {
      setSubmitting(true);

      const params: any = {
        title: vals.title,
        free: Math.round(vals.free * 100), // 元转分
        minimum: vals.minimum ? Math.round(vals.minimum * 100) : 0, // 元转分
        total: vals.total,
      };

      if (vals.eventid) {
        params.eventid = vals.eventid;
      }

      if (vals.usable) {
        params.usable = dayjs(vals.usable).format('YYYY-MM-DD HH:mm:ss');
      }

      if (vals.expiry) {
        params.expiry = dayjs(vals.expiry).format('YYYY-MM-DD HH:mm:ss');
      }

      await request.post('/admin/v6/coupon/batch', params);
      success('创建成功');
      setAddModalOpen(false);
      form.resetFields();
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || err.response?.data?.error || '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (record: CouponBatch, newStatus: boolean) => {
    try {
      await request.post('/admin/v6/coupon/batch/disable', {
        id: record.id,
        status_reason: newStatus ? '' : '管理员作废',
      });
      success(newStatus ? '启用成功' : '作废成功');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    }
  };

  const handleExport = async (record: CouponBatch) => {
    try {
      Modal.confirm({
        title: '确认导出',
        content: `确定要导出批次"${record.title}"的所有优惠券码吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            const res = await request.get('/admin/v6/coupon', {
              params: {
                batchid: record.id,
                start: 0,
                length: 999999,
              },
            });

            const coupons = res?.data?.list || res?.data || [];
            if (coupons.length === 0) {
              message.warning('该批次没有优惠券数据');
              return;
            }

            const exportData = coupons.map((c: any) => ({ code: c.code }));
            exportToExcel(exportData, [{ title: '券码', dataIndex: 'code' }], `优惠券_${record.title}`);
          } catch (err: any) {
            error(err.response?.data?.msg || '导出失败');
          }
        },
      });
    } catch (err: any) {
      error(err.response?.data?.msg || '导出失败');
    }
  };

  // 查看本批次优惠券列表
  const handleView = async (record: CouponBatch, page = 1, pageSize = 10) => {
    setViewBatchTitle(record.title);
    setViewBatchRecord(record);
    setViewModalOpen(true);
    setViewLoading(true);
    setViewPagination((prev) => ({ ...prev, current: page, pageSize }));

    try {
      const res: any = await request.get('/admin/v6/coupon', {
        params: {
          batchid: record.id,
          start: (page - 1) * pageSize,
          length: pageSize,
        },
      });

      const list = res?.data?.list || res?.data || [];
      const count = res?.data?.count || res?.count || 0;
      setViewData(list);
      setViewPagination((prev) => ({ ...prev, total: count }));
    } catch (err: any) {
      error(err.response?.data?.msg || '加载失败');
      setViewData([]);
    } finally {
      setViewLoading(false);
    }
  };

  const handleViewPageChange = (page: number, pageSize: number) => {
    if (viewBatchRecord) {
      handleView(viewBatchRecord, page, pageSize);
    }
  };

  const formatDiscount = (record: CouponBatch) => {
    const free = (record.free / 100).toFixed(2);
    if (record.minimum > 0) {
      return `满${(record.minimum / 100).toFixed(2)}减${free}`;
    }
    return `减${free}`;
  };

  const formatExpiry = (record: CouponBatch) => {
    if (!record.usable && !record.expiry) {
      return '永久有效';
    }
    const usable = record.usable ? dayjs(record.usable).format('YYYY/MM/DD') : '立即生效';
    const expiry = record.expiry ? dayjs(record.expiry).format('YYYY/MM/DD') : '永久';
    return `${usable} 至 ${expiry}`;
  };

  const columns: ColumnsType<CouponBatch> = [
    {
      title: '批次名称',
      dataIndex: 'title',
      key: 'title',
      width: 150,
      ellipsis: true,
    },
    {
      title: '优惠',
      key: 'discount',
      width: 120,
      render: (_: any, record: CouponBatch) => formatDiscount(record),
    },
    {
      title: '已用/总数',
      key: 'usage',
      width: 100,
      render: (_: any, record: CouponBatch) => (
        <span>{record.used_total}/{record.total}</span>
      ),
    },
    {
      title: '有效期',
      key: 'expiry',
      width: 200,
      render: (_: any, record: CouponBatch) => formatExpiry(record),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: number, record: CouponBatch) => (
        <Switch
          checked={status === CouponBatchStatus.NORMAL}
          checkedChildren="正常"
          unCheckedChildren="作废"
          disabled={status === CouponBatchStatus.DISABLED}
          onChange={(checked) => {
            Modal.confirm({
              title: `确认作废`,
              content: <span style={{ color: '#ff4b4b' }}>本批次的全部优惠券将无法使用，此操作不可恢复，确认么？</span>,
              okText: '确认',
              cancelText: '取消',
              okButtonProps: { danger: true },
              onOk: () => handleStatusChange(record, false),
            });
          }}
        />
      ),
    },
    ActionColumn({
      showView: false,
      showEdit: false,
      showDelete: false,
      render: (record: CouponBatch) => {
        return (
          <>
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            >
              查看
            </Button>
            {record.status !== CouponBatchStatus.DISABLED && (
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleExport(record)}
              >
                导出
              </Button>
            )}
          </>
        );
      },
      width: 120,
    }),
  ];

  return (
    <>
      <StandardPage
        title="优惠券管理"
        description="管理优惠券批次，支持批量创建、导出优惠券码和查看批次下的优惠券使用明细。"
        showAddButton={true}
        onAdd={handleAdd}
        addButtonText="添加优惠券批次"
        showRefreshButton={true}
        onRefresh={refresh}
        searchArea={
          <SearchPanel
            filters={filters}
            values={values}
            onChange={handleChange}
            onSearch={handleSearch}
            onReset={handleReset}
            showSearchButton={false}
            showResetButton={false}
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

      <AddEditModal
        title="优惠券批次"
        open={addModalOpen}
        onCancel={() => {
          setAddModalOpen(false);
          form.resetFields();
        }}
        onSubmit={handleSubmit}
        submitting={submitting}
        form={form}
        width={500}
      >
        <Form.Item
          name="title"
          label="批次名称"
          rules={[{ required: true, message: '请输入批次名称' }]}
        >
          <Input placeholder="请输入批次名称" />
        </Form.Item>

        <Form.Item
          name="free"
          label="优惠金额"
          rules={[{ required: true, message: '请输入优惠金额' }]}
          extra="单位：元"
        >
          <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="请输入优惠金额" />
        </Form.Item>

        <Form.Item
          name="minimum"
          label="满减要求"
          extra="填0表示不限金额，单位：元"
        >
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入满减门槛，0表示不限" />
        </Form.Item>

        <Form.Item
          name="total"
          label="券码总量"
          rules={[{ required: true, message: '请输入券码总量' }]}
        >
          <InputNumber min={1} max={1000} style={{ width: '100%' }} placeholder="请输入券码总量" />
        </Form.Item>

        <Form.Item
          name="eventid"
          label="关联活动"
          extra="可选，不选则表示通用券"
        >
          <Select
            style={{ width: '100%' }}
            placeholder="请选择活动（可选）"
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            loading={eventLoading}
            options={events.map(item => ({
              value: item.id,
              label: item.title,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="usable"
          label="生效时间"
          extra="可选，不填则立即生效"
        >
          <DatePicker showTime style={{ width: '100%' }} placeholder="可选" />
        </Form.Item>

        <Form.Item
          name="expiry"
          label="失效时间"
          extra="可选，不填则表示永久有效"
        >
          <DatePicker showTime style={{ width: '100%' }} placeholder="可选" />
        </Form.Item>
      </AddEditModal>

      <Modal
        title={viewBatchTitle}
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>批次信息</div>
        {viewBatchRecord && (
          <Descriptions column={3} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="批次名称" span={3}>{viewBatchRecord.title}</Descriptions.Item>
            <Descriptions.Item label="优惠说明">{formatDiscount(viewBatchRecord)}</Descriptions.Item>
            <Descriptions.Item label="有效期" span={2}>{formatExpiry(viewBatchRecord)}</Descriptions.Item>
            <Descriptions.Item label="券码总数">{viewBatchRecord.total}</Descriptions.Item>
            <Descriptions.Item label="已用数量">{viewBatchRecord.used_total}</Descriptions.Item>
          </Descriptions>
        )}
        <div style={{ fontWeight: 600, margin: '16px 0 8px' }}>券码查看</div>
        <Table<CouponItem>
          columns={[
            { title: '券码', dataIndex: 'code', key: 'code', width: 75 },
            {
              title: '使用人',
              key: 'user',
              width: 100,
              render: (_: any, record: CouponItem) => {
                const { user_data } = record;
                if (!user_data) return <span style={{ color: '#999' }}>-</span>;
                return (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {user_data.avatar ? (
                      <img src={user_data.avatar} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : null}
                    {user_data.nick || user_data.name || '-'}
                  </span>
                );
              },
            },
            {
              title: '使用活动',
              key: 'event',
              width: 215,
              render: (_: any, record: CouponItem) => record.event_data?.title || <span style={{ color: '#999' }}>-</span>,
            },
            {
              title: '使用时间',
              key: 'use_time',
              width: 150,
              render: (_: any, record: CouponItem) => {
                const t = record.order_data?.insertat;
                return t ? dayjs(t).format('YYYY/MM/DD HH:mm:ss') : <span style={{ color: '#999' }}>-</span>;
              },
            },
            {
              title: '支付金额',
              key: 'payable',
              width: 90,
              render: (_: any, record: CouponItem) => {
                const { order_data } = record;
                if (!order_data) return <span style={{ color: '#999' }}>-</span>;
                // OrderStatus.COMPLETED = 2 表示报名已成功
                if (order_data.status === 2 && order_data.payable !== undefined) {
                  return `¥${(order_data.payable / 100).toFixed(2)}`;
                }
                return '未支付';
              },
            },
          ]}
          dataSource={viewData}
          loading={viewLoading}
          rowKey="id"
          pagination={{
            current: viewPagination.current,
            pageSize: viewPagination.pageSize,
            total: viewPagination.total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handleViewPageChange,
          }}
          scroll={{ x: 650 }}
        />
      </Modal>
    </>
  );
};

export default CouponManagement;
