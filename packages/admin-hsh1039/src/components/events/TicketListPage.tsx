import { useState, useCallback } from 'react';
import { Button, Space, Tag, Avatar, Descriptions, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ticketApi } from '@/api/services/ticket';
import { userApi } from '@/api/services/user';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { DetailModal } from '@/components/templates/DetailModal';
import UserDetailSections from '@/components/user/UserDetailSections';
import { formatDateTime, formatDate } from '@/utils/format';
import { getAvatarUrl } from '@/utils/imageUtils';

interface TicketConfig {
  title: string;
  description: string;
  defaultRootCategoryId?: number;
}

interface TicketRecord {
  id: number;
  code: string;
  is_verified: boolean;
  is_transferred: boolean;
  is_refunded: boolean;
  verified_at?: string;
  created_at?: string;
  holder?: {
    id: string;
    nickname?: string;
    avatar_url?: string;
  };
  product?: {
    id: number;
    title?: string;
    cover?: string;
  };
  sku?: {
    name?: string;
    spec_text?: string;
  };
  order_item?: {
    id: number;
    order_no?: string;
    parent_order_no?: string;
  };
  booking_slot?: {
    id: number;
    start_time?: string;
    end_time?: string;
  };
}

const TicketListPage: React.FC<{ config: TicketConfig }> = ({ config }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailData, setDetailData] = useState<TicketRecord | null>(null);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const { success, error: showError } = useAppNotification();

  const fetchTickets = useCallback(async (params: any) => {
    const apiParams: Record<string, any> = { ...params };
    if (config.defaultRootCategoryId) {
      apiParams.root_category_id = config.defaultRootCategoryId;
    }
    return ticketApi.getTickets(apiParams);
  }, [config.defaultRootCategoryId]);

  const formatResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<TicketRecord>({
    fetchFn: fetchTickets,
    formatResponse,
  });

  const handleViewUserDetail = async (record: TicketRecord) => {
    const rawId = record.holder?.id;
    if (!rawId) return;
    const uid = Number(rawId);
    if (isNaN(uid)) return;
    try {
      const res: any = await userApi.getUserDetail(uid);
      setUserDetailData(res?.data || res);
      setUserDetailVisible(true);
    } catch { /* ignore */ }
  };

  const handleViewDetail = (record: TicketRecord) => {
    setDetailData(record);
  };

  const filters: FilterConfig[] = [
    {
      name: 'is_verified',
      placeholder: '核销状态',
      type: 'select',
      options: [
        { label: '未核销', value: false },
        { label: '已核销', value: true },
      ],
    },
    {
      name: 'is_transferred',
      placeholder: '转赠状态',
      type: 'select',
      options: [
        { label: '未转赠', value: false },
        { label: '已转赠', value: true },
      ],
    },
    { name: 'keyword', placeholder: '票夹码/持有人搜索', type: 'input' },
  ];

  const columns: ColumnsType<TicketRecord> = [
    {
      title: '持有人',
      key: 'holder',
      width: 160,
      render: (_: any, record: TicketRecord) => {
        const h = record.holder;
        const avatar = h?.avatar_url;
        const nick = h?.nickname || '-';
        const uid = h?.id;
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewUserDetail(record)} disabled={!uid}>
            <Space size={4}>
              <Avatar src={getAvatarUrl(avatar)} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>{nick}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '票夹码',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '活动/门票',
      key: 'product',
      render: (_: any, record: TicketRecord) => {
        const p = record.product;
        const s = record.sku;
        return (
          <div style={{ lineHeight: 1.6 }}>
            <div style={{ wordBreak: 'break-word' }}>{p?.title || '-'}</div>
            {s?.spec_text && <div style={{ color: '#999', fontSize: 12, wordBreak: 'break-word' }}>{s.spec_text}</div>}
          </div>
        );
      },
    },
    {
      title: '核销',
      dataIndex: 'is_verified',
      key: 'is_verified',
      width: 80,
      render: (v: boolean) => v ? <Tag color="green">已核销</Tag> : <Tag color="default">未核销</Tag>,
    },
    {
      title: '转赠',
      dataIndex: 'is_transferred',
      key: 'is_transferred',
      width: 80,
      render: (v: boolean) => v ? <Tag color="blue">已转赠</Tag> : <Tag>未转赠</Tag>,
    },
    {
      title: '退款',
      dataIndex: 'is_refunded',
      key: 'is_refunded',
      width: 80,
      render: (v: boolean) => v ? <Tag color="red">已退款</Tag> : <Tag>未退款</Tag>,
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
  ];

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => {
    const params: Record<string, any> = { ...vals };
    // keyword → code
    if (params.keyword) {
      params.code = params.keyword;
      delete params.keyword;
    }
    search(params);
  };

  const handleReset = () => {
    setValues({});
    search({});
  };

  return (
    <>
      <StandardPage
        title={config.title}
        description={config.description}
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
            scroll={{ x: 920 }}
          />
        }
      />

      <Modal
        title="票夹详情"
        open={!!detailData}
        onCancel={() => setDetailData(null)}
        footer={null}
        width={640}
      >
        {detailData && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="票夹码" span={2}>{detailData.code || '-'}</Descriptions.Item>
            <Descriptions.Item label="活动/门票">{detailData.product?.title || '-'}</Descriptions.Item>
            <Descriptions.Item label="规格">{detailData.sku?.spec_text || detailData.sku?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="持有人">{detailData.holder?.nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="核销状态">
              <Tag color={detailData.is_verified ? 'green' : 'default'}>{detailData.is_verified ? '已核销' : '未核销'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="转赠状态">
              <Tag color={detailData.is_transferred ? 'blue' : 'default'}>{detailData.is_transferred ? '已转赠' : '未转赠'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="退款状态">
              <Tag color={detailData.is_refunded ? 'red' : 'default'}>{detailData.is_refunded ? '已退款' : '未退款'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="关联订单">{detailData.order_item?.order_no || detailData.order_item?.parent_order_no || '-'}</Descriptions.Item>
            <Descriptions.Item label="核销时间">{detailData.verified_at ? formatDateTime(detailData.verified_at) : '-'}</Descriptions.Item>
            {detailData.booking_slot && (
              <>
                <Descriptions.Item label="预约开始">{detailData.booking_slot.start_time ? formatDateTime(detailData.booking_slot.start_time) : '-'}</Descriptions.Item>
                <Descriptions.Item label="预约结束">{detailData.booking_slot.end_time ? formatDateTime(detailData.booking_slot.end_time) : '-'}</Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="创建时间">{detailData.created_at ? formatDateTime(detailData.created_at) : '-'}</Descriptions.Item>
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

export default TicketListPage;
