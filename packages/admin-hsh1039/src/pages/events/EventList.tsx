import { useState, useCallback, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag, Typography, Modal, Form, Input, Avatar, InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { eventApi } from '@/api/services/event';
import { userApi } from '@/api/services/user';
import { categoryApi } from '@/api/services/category';
import { EventStatus } from '@shared/constants/event.enums';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { DetailModal } from '@/components/templates/DetailModal';
import SourceQrcodeModal from '@/components/wechat/SourceQrcodeModal';
import UserDetailSections from '../../components/user/UserDetailSections';
import EventDetailModal from '../../components/events/EventDetailModal';
import { formatDate } from '@/utils/format';

const { Title } = Typography;

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  1: { text: '进行中', color: 'blue' },
  2: { text: '未通过', color: 'red' },
  3: { text: '已锁定', color: 'default' },
  4: { text: '已取消', color: 'default' },
  5: { text: '已退款取消', color: 'orange' },
  6: { text: '已完成', color: 'green' },
};

const STATUS_OPTIONS = [
  { label: '进行中', value: 1 },
  { label: '未通过', value: 2 },
  { label: '已锁定', value: 3 },
  { label: '已取消', value: 4 },
  { label: '已退款取消', value: 5 },
  { label: '已完成', value: 6 },
];

interface Event {
  id: number;
  title: string;
  userid?: string;
  user_data?: {
    userid?: string;
    avatar?: string;
    nick?: string;
  };
  category: number;
  category_data?: {
    title?: string;
  };
  status: number;
  orderon?: number;
  start_time?: string;
  end_time?: string;
  reg_expiry?: string;
  address?: string;
  max_participants?: number;
  current_participants?: number;
  fee_type?: number;
  fee_amount?: number;
  image?: string;
  insertat?: string;
}

const EventList = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailModalData, setDetailModalData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockStatus, setLockStatus] = useState<number>(0);
  const [lockReason, setLockReason] = useState<string>('');
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getCategories({ tags: 1, length: 1000 } as any) as any;
        const list = res?.data?.list || res?.data || [];
        setCategoryOptions(list.map((item: any) => ({
          label: item.title,
          value: item.id,
        })));
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
    { name: 'category', placeholder: '全部类型', type: 'select', options: categoryOptions },
    { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
  ];
  const [form] = Form.useForm();
  const { success, error } = useAppNotification();

  const fetchEvents = useCallback(async (params: any) => {
    return eventApi.getEvents(params);
  }, []);

  const formatEventResponse = useCallback((res: any) => ({
    list: res?.data?.list || res?.data || [],
    count: res?.count ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Event>({
    fetchFn: fetchEvents,
    formatResponse: formatEventResponse,
  });

  const handleViewDetail = async (record: Event) => {
    setDetailModalData(null);
    setDetailLoading(true);
    try {
      const res = await eventApi.getEventDetail(record.id) as any;
      setDetailModalData(res?.data || res || {});
    } catch (err: any) {
      error(err.response?.data?.msg || '获取详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewUserDetail = async (record: Event) => {
    const userid = record.user_data?.userid || record.userid;
    if (!userid) {
      console.warn('No userid found for user detail:', record);
      return;
    }
    setUserDetailLoading(true);
    try {
      const res = await userApi.getUserDetail(userid) as any;
      setUserDetailData(res?.data || res);
      setUserDetailVisible(true);
    } catch (err: any) {
      console.error('Failed to fetch user detail:', err);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const handleLock = (id: number) => {
    const event = detailModalData;
    if (!event) return;
    if (event.status === EventStatus.APPROVED) {
      setLockStatus(3);
      setLockReason('');
      setLockModalVisible(true);
    } else if (event.status === 3) {
      Modal.confirm({
        title: '确认操作',
        content: '确定要解锁活动么？',
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          try {
            await eventApi.updateEventStatus(id, EventStatus.APPROVED);
            success('活动已解锁');
            setDetailModalData(null);
            refresh();
          } catch (err: any) {
            error(err.response?.data?.msg || '操作失败');
          }
        },
      });
    }
  };

  const handleUpdateStatus = async (id: number, status: number, statusReason?: string) => {
    try {
      setLockLoading(true);
      await eventApi.updateEventStatus(id, status, statusReason);
      success(status === 3 ? '活动已锁定' : '活动已解锁');
      setLockModalVisible(false);
      setDetailModalData(null);
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    } finally {
      setLockLoading(false);
    }
  };

  const handleLockSubmit = async () => {
    if (!detailModalData) return;
    try {
      setLockLoading(true);
      const vals = await form.validateFields();
      const inboxIntro = `您发布的活动【${detailModalData.title}】已被锁定，请点击查看详情！`;
      await eventApi.updateEventStatus(detailModalData.id, 3, vals.status_reason, true, '活动锁定通知', inboxIntro);
      success('活动已锁定');
      setLockModalVisible(false);
      setDetailModalData(null);
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    } finally {
      setLockLoading(false);
    }
  };

  const handleApprove = (id: number) => {
    Modal.confirm({
      title: '确认操作',
      content: '确定要通过审核么？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await eventApi.updateEventStatus(id, EventStatus.APPROVED);
          success('操作成功');
          setDetailModalData(null);
          refresh();
        } catch (err: any) {
          error(err.response?.data?.msg || '操作失败');
        }
      },
    });
  };

  const handleOrderChange = async (record: Event, value: number | null | undefined) => {
    try {
      const orderon = value === null || value === undefined ? undefined : Number(value);
      await eventApi.updateEventOrder(record.id, orderon);
      success('排序更新成功');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '排序更新失败');
    }
  };

  const columns: ColumnsType<Event> = [
    {
      title: '标题',
      key: 'title',
      ellipsis: true,
      minWidth: 100,
      render: (_: any, record: Event) => (
        <Space size={1}>
          {record.category_data?.title && <Tag color="blue">{record.category_data.title}</Tag>}
          <span>{record.title}</span>
          {(record.status === 1 || record.status === 6) && <SourceQrcodeModal basePage={`pages/p-find/detail?id=${record.id}`} />}
        </Space>
      ),
    },
    {
      title: '发布者',
      key: 'publisher',
      width: 140,
      render: (_: any, record: Event) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewUserDetail(record)}>
          <Space size={4}>
            <Avatar src={record.user_data?.avatar} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{record.user_data?.nick || record.user_data?.userid || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '时间/地点',
      key: 'timeLocation',
      width: 120,
      render: (_: any, record: Event) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>{record.start_time ? formatDate(record.start_time) : '-'}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{record.address || '-'}</div>
        </div>
      ),
    },
    {
      title: '报名人数',
      dataIndex: 'current_participants',
      key: 'current_participants',
      width: 90,
      render: (count?: number) => count ?? 0,
    },
    {
      title: '费用',
      dataIndex: 'fee_type',
      key: 'fee',
      width: 100,
      render: (feeType: number, record: Event) => {
        if (feeType === 0) return '免费';
        if (feeType === 1) return 'AA制';
        if (feeType === 2) return `¥${((record.fee_amount ?? 0) / 100).toFixed(2)}`;
        return '-';
      },
    },
    {
      title: '排序',
      dataIndex: 'orderon',
      key: 'orderon',
      width: 100,
      render: (orderon: number | undefined, record: Event) => (
        <InputNumber
          min={0}
          value={orderon}
          style={{ width: 70 }}
          onChange={(value) => {
            if (value === null) {
              handleOrderChange(record, undefined);
            }
          }}
          onBlur={(e) => {
            const val = e.target.value;
            const num = val === '' ? undefined : parseInt(val);
            if (num !== (record.orderon ?? undefined)) {
              handleOrderChange(record, num);
            }
          }}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => (
        <Tag color={STATUS_MAP[status]?.color}>
          {STATUS_MAP[status]?.text || '-'}
        </Tag>
      ),
    },
    ActionColumn({
      onView: handleViewDetail,
      showView: true,
      showEdit: false,
      showDelete: false,
      width: 80,
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

  const d = detailModalData;

  return (
    <>
      <StandardPage
        title="活动发布管理"
        description="管理平台发布的活动信息。"
        showRefreshButton={true}
        onRefresh={refresh}
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
            scroll={{ x: 1000 }}
          />
        }
      />

      <EventDetailModal
        eventId={detailModalData?.id}
        open={!!detailModalData}
        onClose={() => setDetailModalData(null)}
        showLockButton={true}
        onLock={handleLock}
        detailData={detailModalData}
        onApprove={handleApprove}
        onUpdate={(updated) => setDetailModalData(updated)}
        onRefresh={refresh}
      />

      {/* 锁定原因弹窗 */}
      <Modal
        title="锁定活动"
        open={lockModalVisible}
        onCancel={() => setLockModalVisible(false)}
        onOk={handleLockSubmit}
        confirmLoading={lockLoading}
        okText="确定锁定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="status_reason"
            label="锁定原因"
            rules={[{ required: true, message: '请填写锁定原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入锁定原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 用户详情弹窗 */}
      <DetailModal
        title="用户详情"
        open={userDetailVisible}
        onClose={() => setUserDetailVisible(false)}
        entity={userDetailData}
        className="user-detail-modal"
        footer={null}
      >
        {(d: any) => UserDetailSections({ user: d })}
      </DetailModal>
    </>
  );
};

export default EventList;
