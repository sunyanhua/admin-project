import { useState, useCallback } from 'react';
import { Tag, Modal, Descriptions, Button, Space, Avatar } from 'antd';
import { statusTagColumn } from '@/components/templates/ColumnHelpers';
import type { ColumnsType } from 'antd/es/table';
import { invoiceApi } from '@/api/services/invoice';
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
import { getAvatarUrl } from '@/utils/imageUtils';

// 发票状态
const INVOICE_STATUS_MAP: Record<number, { text: string; color: string }> = {
  0: { text: '待开具', color: 'orange' },
  1: { text: '已开具', color: 'green' },
  2: { text: '开票失败', color: 'red' },
  3: { text: '已冲红', color: 'default' },
};

// 发票类型
const INVOICE_TYPE_MAP: Record<string, string> = {
  personal: '个人',
  company: '企业',
};

const STATUS_OPTIONS = Object.entries(INVOICE_STATUS_MAP).map(([value, { text }]) => ({
  label: text,
  value: Number(value),
}));

const formatAmount = (amount?: number) => {
  if (amount === undefined || amount === null) return '-';
  return `¥${(amount / 100).toFixed(2)}`;
};

interface InvoiceRecord {
  id: number;
  invoice_no: string;
  order_no: string;
  order_id: number;
  type: string;
  title: string;
  tax_no?: string;
  amount: number;
  status: number;
  email?: string;
  remark?: string;
  created_at?: string;
  issued_at?: string;
  user?: {
    id: number;
    nickname?: string;
    avatar_url?: string;
  };
}

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
];

const InvoiceManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const { success, error: showError } = useAppNotification();

  const fetchInvoices = useCallback(async (params: any) => {
    return invoiceApi.getInvoices(params);
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<InvoiceRecord>({
    fetchFn: fetchInvoices,
    formatResponse,
  });

  const handleViewDetail = async (record: InvoiceRecord) => {
    setDetailData(record);
    setDetailLoading(false);
  };

  const handleViewUserDetail = async (record: InvoiceRecord) => {
    const uid = record.user?.id;
    if (!uid) return;
    try {
      const res: any = await userApi.getUserDetail(uid);
      setUserDetailData(res?.data || res);
      setUserDetailVisible(true);
    } catch { /* ignore */ }
  };

  const columns: ColumnsType<InvoiceRecord> = [
    {
      title: '用户',
      key: 'user',
      width: 160,
      render: (_: any, record: InvoiceRecord) => {
        const u = record.user;
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewUserDetail(record)} disabled={!u?.id}>
            <Space size={4}>
              <Avatar src={getAvatarUrl(u?.avatar_url)} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>{u?.nickname || '-'}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '发票号',
      dataIndex: 'invoice_no',
      key: 'invoice_no',
      width: 180,
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
      title: '抬头',
      dataIndex: 'title',
      key: 'title',
      render: (v: string, record: InvoiceRecord) => (
        <div style={{ wordBreak: 'break-word' }}>
          <div>{v || '-'}</div>
          {record.type === 'company' && record.tax_no && <div style={{ color: '#999', fontSize: 12 }}>税号：{record.tax_no}</div>}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (v: string) => INVOICE_TYPE_MAP[v] || v || '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (v: number) => formatAmount(v),
    },
    statusTagColumn<InvoiceRecord>('status', INVOICE_STATUS_MAP, '状态', 90),
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
        title="发票管理"
        description="管理用户发票申请记录，查看发票开具状态。"
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
            scroll={{ x: 1200 }}
          />
        }
      />

      <Modal
        title="发票详情"
        open={!!detailData}
        onCancel={() => setDetailData(null)}
        footer={null}
        width={640}
        confirmLoading={detailLoading}
        maskClosable={false}
      >
        {detailData && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="发票号" span={2}>{detailData.invoice_no || '-'}</Descriptions.Item>
            <Descriptions.Item label="关联订单号">{detailData.order_no || '-'}</Descriptions.Item>
            <Descriptions.Item label="金额">{formatAmount(detailData.amount)}</Descriptions.Item>
            <Descriptions.Item label="类型">{INVOICE_TYPE_MAP[detailData.type] || detailData.type || '-'}</Descriptions.Item>
            <Descriptions.Item label="抬头">{detailData.title || '-'}</Descriptions.Item>
            {detailData.type === 'company' && <Descriptions.Item label="税号">{detailData.tax_no || '-'}</Descriptions.Item>}
            <Descriptions.Item label="状态">
              <Tag color={INVOICE_STATUS_MAP[detailData.status]?.color}>{INVOICE_STATUS_MAP[detailData.status]?.text || '其他'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">{detailData.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="申请时间">{detailData.created_at ? formatDateTime(detailData.created_at) : '-'}</Descriptions.Item>
            <Descriptions.Item label="开具时间">{detailData.issued_at ? formatDateTime(detailData.issued_at) : '-'}</Descriptions.Item>
            {detailData.remark && <Descriptions.Item label="备注" span={2}>{detailData.remark}</Descriptions.Item>}
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

export default InvoiceManagement;
