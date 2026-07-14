import { useState, useCallback } from 'react';
import { Button, Space, Tag, Typography, Modal, Descriptions, Avatar, Input, Image } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import request from '@/api';
import { userApi } from '@/api/services/user';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { DetailModal } from '@/components/templates/DetailModal';
import UserDetailSections from '../../components/user/UserDetailSections';
import EventDetailModal from '../../components/events/EventDetailModal';
import { formatDateTime } from '@/utils/format';

const { Title } = Typography;

// 结算状态枚举
enum SettlementStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
}

const SettlementStatusMap: Record<number, { text: string; color: string }> = {
  [SettlementStatus.PENDING]: { text: '待审核', color: 'orange' },
  [SettlementStatus.APPROVED]: { text: '已通过', color: 'green' },
  [SettlementStatus.REJECTED]: { text: '已拒绝', color: 'red' },
};

const STATUS_OPTIONS = [
  { label: '待审核', value: SettlementStatus.PENDING },
  { label: '已通过', value: SettlementStatus.APPROVED },
  { label: '已拒绝', value: SettlementStatus.REJECTED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
];

interface Settlement {
  id: number;
  userid: string;
  eventid: number;
  feedid: number;
  user_data?: {
    userid?: string;
    avatar?: string;
    nick?: string;
  };
  event_data?: {
    id?: number;
    title?: string;
  };
  orders_total: number;
  orders_paycost: number;
  orders_payfree: number;
  orders_payable: number;
  noshow_total: number;
  noshow_amount: number;
  wallet_amount: number;
  platform_amount: number;
  status: number;
  status_reason?: string;
  insertat: string;
}

const formatAmount = (amount?: number) => {
  if (amount === undefined || amount === null) return '¥0.00';
  return `¥${(amount / 100).toFixed(2)}`;
};

const SettlementAudit = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailModalData, setDetailModalData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [eventDetailVisible, setEventDetailVisible] = useState(false);
  const [currentEventId, setCurrentEventId] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSettlements = useCallback(async (params: any) => {
    return request.get('/admin/v6/event/settlement', { params });
  }, []);

  const formatSettlementResponse = useCallback((res: any) => ({
    list: res?.data?.list || res?.data || [],
    count: res?.count ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Settlement>({
    fetchFn: fetchSettlements,
    formatResponse: formatSettlementResponse,
  });
  const { success, error } = useAppNotification();

  const handleViewDetail = async (record: Settlement) => {
    setDetailModalData(null);
    setDetailLoading(true);
    try {
      const res = await request.get(`/admin/v6/event/settlement/${record.id}`);
      setDetailModalData(res?.data || res || {});
    } catch (error: any) {
      setDetailModalData(record);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewUserDetail = async (record: Settlement) => {
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

  const handleViewEventDetail = (record: Settlement) => {
    const eventId = record.event_data?.id || record.eventid;
    if (!eventId) {
      console.warn('No eventid found for event detail:', record);
      return;
    }
    setCurrentEventId(eventId);
    setEventDetailVisible(true);
  };

  const handleApprove = (record: Settlement) => {
    Modal.confirm({
      title: '确认操作',
      content: `确定要通过结算审核吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        setActionLoading(true);
        try {
          await request.post('/admin/v6/event/settlement/status', { id: record.id, status: 1, inbox: true, inbox_title: '活动完成结算审核结果通知', inbox_intro: '您申请的活动完成结算已通过审核，请点击查看详情！' });
          success('操作成功');
          setDetailModalData(null);
          refresh();
        } catch (err: any) {
          error(err.response?.data?.msg || '操作失败');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleReject = (record: Settlement) => {
    Modal.confirm({
      title: '拒绝审核',
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>请输入拒绝原因：</p>
          <Input.TextArea
            id="reject-reason"
            rows={2}
            placeholder="请输入拒绝原因"
          />
        </div>
      ),
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        const reason = (document.getElementById('reject-reason') as HTMLTextAreaElement)?.value;
        if (!reason) {
          error('请填写拒绝原因');
          return false;
        }
        setActionLoading(true);
        try {
          await request.post('/admin/v6/event/settlement/status', {
            id: record.id,
            status: 2,
            status_reason: reason,
            inbox: true,
            inbox_title: '活动完成结算审核结果通知',
            inbox_intro: '您申请的活动完成申请未通过审核，请点击查看详情！',
          });
          success('操作成功');
          setDetailModalData(null);
          refresh();
        } catch (err: any) {
          error(err.response?.data?.msg || '操作失败');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const columns: ColumnsType<Settlement> = [
    {
      title: '活动标题',
      key: 'event',
      width: 180,
      ellipsis: true,
      render: (_: any, record: Settlement) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewEventDetail(record)}>
          {record.event_data?.title || record.eventid || '-'}
        </Button>
      ),
    },
    {
      title: '发布者',
      key: 'publisher',
      width: 140,
      render: (_: any, record: Settlement) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewUserDetail(record)}>
          <Space size={4}>
            <Avatar src={record.user_data?.avatar} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{record.user_data?.nick || record.user_data?.userid || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '报名人数',
      dataIndex: 'orders_total',
      key: 'orders_total',
      width: 90,
      render: (v?: number) => v ?? 0,
    },
    {
      title: '结算金额',
      dataIndex: 'orders_paycost',
      key: 'orders_paycost',
      width: 100,
      render: (v?: number) => formatAmount(v),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => (
        <Tag color={SettlementStatusMap[status]?.color}>
          {SettlementStatusMap[status]?.text || '其他'}
        </Tag>
      ),
    },
    ActionColumn({
      onView: handleViewDetail,
      showView: true,
      viewText: '查看',
      showEdit: false,
      showDelete: false,
      width: 60,
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

  const renderDetailFooter = () => {
    if (!detailModalData) return null;
    if (detailModalData.status !== SettlementStatus.PENDING) return null;
    return (
      <div style={{ textAlign: 'left' }}>
        <Space>
          <Button type="primary" onClick={() => handleApprove(detailModalData)} loading={actionLoading}>
            通过
          </Button>
          <Button danger onClick={() => handleReject(detailModalData)} loading={actionLoading}>
            拒绝
          </Button>
        </Space>
      </div>
    );
  };

  return (
    <>
      <StandardPage
        title="活动结算审核"
        description="管理活动结算审核信息。"
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
            scroll={{ x: 1000 }}
          />
        }
      />

      <Modal
        title="结算详情"
        open={!!detailModalData}
        onCancel={() => setDetailModalData(null)}
        footer={renderDetailFooter()}
        width={700}
        confirmLoading={detailLoading}
      >
        {d && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="活动" span={2}>
                {d.event_data?.title || d.eventid || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="发布者" span={2}>
                <Space>
                  <Avatar src={d.user_data?.avatar} size="small" />
                  <span>{d.user_data?.nick || d.user_data?.userid || '-'}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="报名人数">{d.orders_total ?? 0}</Descriptions.Item>
              <Descriptions.Item label="缺席人数">{d.noshow_total ?? 0}</Descriptions.Item>
              <Descriptions.Item label="应收总额">{formatAmount(d.orders_paycost)}</Descriptions.Item>
              <Descriptions.Item label="实收总额">{formatAmount(d.orders_payable)}</Descriptions.Item>
              <Descriptions.Item label="减免总额">{formatAmount(d.orders_payfree)}</Descriptions.Item>
              <Descriptions.Item label="鸽子费总额">{formatAmount(d.noshow_amount)}</Descriptions.Item>
              <Descriptions.Item label="结算金额">{formatAmount(d.wallet_amount)}</Descriptions.Item>
              <Descriptions.Item label="平台抽成">{formatAmount(d.platform_amount)}</Descriptions.Item>
              <Descriptions.Item label="申请时间" span={2}>
                {d.insertat ? formatDateTime(d.insertat) : '-'}
              </Descriptions.Item>
              {d.feed_data?.image && (
                <Descriptions.Item label="动态图片" span={2}>
                  <Space size={8} wrap>
                    {d.feed_data.image.split('|').filter(Boolean).map((img: string, idx: number) => (
                      <Image key={idx} width={80} height={80} src={img} style={{ borderRadius: 6, objectFit: 'cover' }} />
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
              {d.feed_data?.intro && (
                <Descriptions.Item label="动态内容" span={2}>
                  {d.feed_data.intro}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="状态" span={2}>
                <Tag color={SettlementStatusMap[d.status]?.color}>
                  {SettlementStatusMap[d.status]?.text || '其他'}
                </Tag>
              </Descriptions.Item>
              {d.status === SettlementStatus.REJECTED && d.status_reason && (
                <Descriptions.Item label="拒绝原因" span={2}>{d.status_reason}</Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
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

      {/* 活动详情弹窗 */}
      <EventDetailModal
        eventId={currentEventId}
        open={eventDetailVisible}
        onClose={() => setEventDetailVisible(false)}
        showEditButton={false}
      />
    </>
  );
};

export default SettlementAudit;
