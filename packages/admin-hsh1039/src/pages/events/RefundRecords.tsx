import { useState, useCallback } from 'react';
import { Tag, Modal, Descriptions } from 'antd';
import { statusTagColumn, userColumn } from '@/components/templates/ColumnHelpers';
import type { ColumnsType } from 'antd/es/table';
import { refundApi } from '@/api/services/order';
import { userApi } from '@/api/services/user';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { DetailModal } from '@/components/templates/DetailModal';
import UserDetailSections from '@/components/user/UserDetailSections';
import { formatDateTime, formatDate } from '@/utils/format';

// 退款状态
const REFUND_STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '处理中', color: 'blue' },
  1: { text: '已取消', color: 'default' },
  2: { text: '退款成功', color: 'green' },
  3: { text: '退款失败', color: 'red' },
};

const STATUS_OPTIONS = Object.entries(REFUND_STATUS_MAP).map(([value, { text }]) => ({
  label: text,
  value: Number(value),
}));

const formatAmount = (amount?: number) => {
  if (amount === undefined || amount === null) return '-';
  return `¥${(amount / 100).toFixed(2)}`;
};

interface RefundRecord {
  id: number;
  refund_no: string;
  order_no: string;
  order_id: number;
  amount: number;
  status: number;
  reason?: string;
  created_at?: string;
  completed_at?: string;
  user?: {
    id: number;
    nickname?: string;
    avatar_url?: string;
    phone_masked?: string;
  };
  // 兼容旧格式
  user_data?: {
    userid?: string;
    avatar?: string;
    nick?: string;
  };
}

const RefundRecords = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const { success, error: showError } = useAppNotification();

  const fetchRefunds = useCallback(async (params: any) => {
    return refundApi.getRefunds(params);
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<RefundRecord>({
    fetchFn: fetchRefunds,
    formatResponse,
  });

  const handleViewDetail = async (record: RefundRecord) => {
    setDetailData(record);
    setDetailLoading(false);
  };

  const handleViewUserDetail = async (record: RefundRecord) => {
    const uid = record.user?.id || record.user_data?.userid;
    if (!uid) return;
    try {
      const res: any = await userApi.getUserDetail(typeof uid === 'string' ? uid : String(uid));
      setUserDetailData(res?.data || res);
      setUserDetailVisible(true);
    } catch { /* ignore */ }
  };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  ];

  const columns: ColumnsType<RefundRecord> = [
    userColumn<RefundRecord>('用户', 'avatar', 'nick', 160, handleViewUserDetail),
    {
      title: '退款单号',
      dataIndex: 'refund_no',
      key: 'refund_no',
      width: 200,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '关联订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 200,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '退款金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (v: number) => <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{formatAmount(v)}</span>,
    },
    statusTagColumn<RefundRecord>('status', REFUND_STATUS_MAP, '状态', 90),
    {
      title: '申请时间',
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

  return (
    <>
      <StandardPage
        title="退款管理"
        description="管理退款记录，查看退款详情、状态及关联订单信息。"
        showRefreshButton
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
            scroll={{ x: 1100 }}
          />
        }
      />

      <Modal
        title="退款详情"
        open={!!detailData}
        onCancel={() => setDetailData(null)}
        footer={null}
        width={640}
        confirmLoading={detailLoading}
      >
        {detailData && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="退款单号" span={2}>{detailData.refund_no || '-'}</Descriptions.Item>
            <Descriptions.Item label="关联订单号">{detailData.order_no || '-'}</Descriptions.Item>
            <Descriptions.Item label="退款金额">
              <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{formatAmount(detailData.amount)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="退款状态">
              <Tag color={REFUND_STATUS_MAP[detailData.status]?.color}>{REFUND_STATUS_MAP[detailData.status]?.text || '其他'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="退款原因" span={2}>{detailData.reason || '-'}</Descriptions.Item>
            <Descriptions.Item label="申请时间">{detailData.created_at ? formatDateTime(detailData.created_at) : '-'}</Descriptions.Item>
            <Descriptions.Item label="完成时间">{detailData.completed_at ? formatDateTime(detailData.completed_at) : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

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

export default RefundRecords;
