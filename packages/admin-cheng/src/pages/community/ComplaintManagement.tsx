import { useState, useCallback } from 'react';
import { Tag, Button, Space, Form, Input, Descriptions, Typography, App, List } from 'antd';
import { EyeOutlined, MessageOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useListPage } from '@/hooks/useListPage';
import { useAppNotification } from '@/hooks/useAppNotification';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import ScrollableModal from '@/components/templates/ScrollableModal';
import {
  xpayApi, AdminComplaintItem, AdminComplaintDetail, AdminComplaintMessageItem,
  PayComplaintStatus, PayComplaintDirection,
} from '@/api/services/xpay';
import { formatDateTime } from '@/utils/format';

const { Paragraph } = Typography;

const COMPLAINT_STATUS_META: Record<number, { label: string; color: string }> = {
  [PayComplaintStatus.PENDING]: { label: '待处理', color: 'orange' },
  [PayComplaintStatus.PROCESSING]: { label: '处理中', color: 'blue' },
  [PayComplaintStatus.REPLIED]: { label: '已回复', color: 'cyan' },
  [PayComplaintStatus.COMPLETED]: { label: '已结案', color: 'green' },
  [PayComplaintStatus.CLOSED]: { label: '已关闭', color: 'default' },
};

const COMPLAINT_STATUS_OPTIONS = [
  { label: '待处理', value: PayComplaintStatus.PENDING },
  { label: '处理中', value: PayComplaintStatus.PROCESSING },
  { label: '已回复', value: PayComplaintStatus.REPLIED },
  { label: '已结案', value: PayComplaintStatus.COMPLETED },
  { label: '已关闭', value: PayComplaintStatus.CLOSED },
];

/** 响应结构统一解析（拦截器可能返回 { list, total } 或原始数组） */
const formatResponse = (res: any) => {
  const list = Array.isArray(res) ? res : (res?.list || []);
  const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
  return { list, count: total };
};

/** 双行日期/时间列（值缺失不显示） */
const dateTimeCol = (title: string, dataIndex: string, key: string) => ({
  title,
  dataIndex,
  key,
  width: 120,
  render: (v: string) => {
    if (!v) return null;
    const t = formatDateTime(v);
    return <div style={{ fontSize: 12, lineHeight: 1.6 }}><div>{t.slice(0, 10)}</div><div>{t.slice(11)}</div></div>;
  },
});

/** 投诉详情弹窗：记录信息 + 消息留痕 + 原始报文；操作区提供回复/完成结案 */
const ComplaintDetailModal: React.FC<{
  open: boolean;
  detail: AdminComplaintDetail | null;
  loading: boolean;
  onReply: () => void;
  onComplete: () => void;
  onClose: () => void;
}> = ({ open, detail, loading, onReply, onComplete, onClose }) => {
  const canHandle = detail ? detail.status !== PayComplaintStatus.COMPLETED && detail.status !== PayComplaintStatus.CLOSED : false;
  return (
    <ScrollableModal
      title="投诉详情"
      open={open}
      onCancel={onClose}
      width={860}
      footer={
        canHandle ? (
          <Space>
            <Button icon={<MessageOutlined />} onClick={onReply}>回复用户</Button>
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={onComplete}>完成处理</Button>
          </Space>
        ) : null
      }
    >
      {detail ? (
        <>
          <Descriptions column={2} size="small" bordered labelStyle={{ width: 110 }}>
            <Descriptions.Item label="投诉单号">{detail.complaint_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {(() => {
                const m = COMPLAINT_STATUS_META[detail.status];
                return <Tag color={m?.color || 'default'}>{m?.label ?? detail.status}</Tag>;
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="投诉时间">{detail.complaint_time ? formatDateTime(detail.complaint_time) : '-'}</Descriptions.Item>
            <Descriptions.Item label="处理时限">{detail.deadline_at ? formatDateTime(detail.deadline_at) : '-'}</Descriptions.Item>
            <Descriptions.Item label="微信订单号" span={2}>{detail.wx_order_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="商户单号" span={2}>{detail.mch_order_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="投诉内容" span={2}>
              <span style={{ wordBreak: 'break-word' }}>{detail.complaint_detail || '-'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="原始报文" span={2}>
              <Paragraph copyable={{ text: detail.raw_payload || '' }} style={{ marginBottom: 0, maxHeight: 120, overflow: 'auto', fontSize: 12 }}>
                {detail.raw_payload || '-'}
              </Paragraph>
            </Descriptions.Item>
          </Descriptions>

          <div style={{ margin: '16px 0 8px', fontWeight: 600 }}>消息留痕</div>
          <List
            size="small"
            dataSource={detail.messages || []}
            locale={{ emptyText: '暂无消息记录' }}
            renderItem={(m: AdminComplaintMessageItem) => (
              <List.Item style={{ alignItems: 'flex-start' }}>
                <Space size={8} style={{ width: '100%', alignItems: 'flex-start' }}>
                  <Tag color={m.direction === PayComplaintDirection.MERCHANT ? 'blue' : 'default'} style={{ flexShrink: 0 }}>
                    {m.direction === PayComplaintDirection.MERCHANT ? '商家' : '用户'}
                  </Tag>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ wordBreak: 'break-word' }}>{m.content || '-'}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{m.created_at ? formatDateTime(m.created_at) : ''}</div>
                  </div>
                </Space>
              </List.Item>
            )}
          />
        </>
      ) : (
        <div style={{ color: '#999', padding: 24, textAlign: 'center' }}>{loading ? '加载中…' : '暂无详情'}</div>
      )}
    </ScrollableModal>
  );
};

/** 回复弹窗（内容必填 ≤2000 字，先调微信再本地留痕） */
const ReplyModal: React.FC<{
  open: boolean;
  submitting: boolean;
  onSubmit: (content: string) => void;
  onClose: () => void;
}> = ({ open, submitting, onSubmit, onClose }) => {
  const [form] = Form.useForm<{ content: string }>();
  return (
    <ScrollableModal
      title="回复投诉用户"
      open={open}
      onCancel={onClose}
      width={520}
      destroyOnHidden
      footer={
        <Button type="primary" loading={submitting} onClick={() => form.submit()}>
          确认回复
        </Button>
      }
    >
      <Form form={form} layout="vertical" onFinish={(v) => onSubmit(v.content.trim())}>
        <Form.Item
          label="回复内容"
          name="content"
          rules={[{ required: true, message: '请输入回复内容' }]}
        >
          <Input.TextArea rows={5} placeholder="回复内容将同步给用户" maxLength={2000} showCount />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

const ComplaintManagement = () => {
  const { success, error: showError } = useAppNotification();
  const { modal } = App.useApp();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<AdminComplaintDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyVisible, setReplyVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComplaints = useCallback(async (params: any) => {
    return xpayApi.getComplaints({
      page: params.page,
      size: params.page_size,
      status: params.status,
      keyword: params.keyword || undefined,
    });
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<AdminComplaintItem>({
    fetchFn: fetchComplaints,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => setSearchValues((p) => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  /** 打开详情：拉取完整投诉记录（消息留痕 + 原始报文） */
  const openDetail = async (record: AdminComplaintItem) => {
    setDetailVisible(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res: any = await xpayApi.getComplaint(record.id);
      const d: AdminComplaintDetail = Array.isArray(res) ? res[0] : res;
      if (d && typeof d === 'object') setDetail({ ...record, ...d });
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取投诉详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  /** 回复：调微信 response_complaint → 本地留痕并推进状态 */
  const handleReplySubmit = async (content: string) => {
    if (!detail) return;
    setSubmitting(true);
    try {
      await xpayApi.replyComplaint(detail.id, { content });
      success('回复已发送');
      setReplyVisible(false);
      openDetail(detail);
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '回复失败');
    } finally {
      setSubmitting(false);
    }
  };

  /** 完成处理：调微信 complete_complaint → 本地置已结案 */
  const handleComplete = () => {
    if (!detail) return;
    modal.confirm({
      title: '确认完成投诉处理？',
      content: '完成后投诉将标记为已结案，且不可再回复或重复结案。',
      okText: '确认结案',
      cancelText: '取消',
      onOk: async () => {
        try {
          await xpayApi.completeComplaint(detail.id);
          success('投诉已结案');
          openDetail(detail);
          refresh();
        } catch (err: any) {
          showError(err?.response?.data?.message || '完成处理失败');
          throw err;
        }
      },
    });
  };

  const filters: FilterConfig[] = [
    { name: 'status', placeholder: '全部状态', type: 'select', options: COMPLAINT_STATUS_OPTIONS },
    { name: 'keyword', placeholder: '投诉单号/详情/商户单号', type: 'input' },
  ];

  const columns: ColumnsType<AdminComplaintItem> = [
    {
      title: '投诉单号',
      dataIndex: 'complaint_id',
      key: 'complaint_id',
      width: 180,
      ellipsis: true,
      render: (v: string) => <span title={v}>{v || '-'}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: number) => {
        const m = COMPLAINT_STATUS_META[v];
        return <Tag color={m?.color || 'default'} title={m?.label ?? v}>{m?.label ?? v}</Tag>;
      },
    },
    {
      title: '投诉内容',
      dataIndex: 'complaint_detail',
      key: 'complaint_detail',
      width: 200,
      ellipsis: true,
      render: (v: string) => <span title={v || ''}>{v || '-'}</span>,
    },
    {
      title: '微信订单号',
      dataIndex: 'wx_order_id',
      key: 'wx_order_id',
      width: 180,
      ellipsis: true,
      render: (v: string) => <span title={v || ''}>{v || '-'}</span>,
    },
    dateTimeCol('投诉时间', 'complaint_time', 'complaint_time'),
    dateTimeCol('最后回复', 'last_reply_at', 'last_reply_at'),
    dateTimeCol('结案时间', 'completed_at', 'completed_at'),
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: any, record: AdminComplaintItem) => (
        <Space size={4} className="action-buttons">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>详情</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <StandardPage
        title="投诉管理"
        description="查看和处理用户提交的投诉信息，支持回复用户与完成结案。"
        table={
          <div>
            <div style={{ marginBottom: 12 }}>
              <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
            </div>
            <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
          </div>
        }
      />
      <ComplaintDetailModal
        open={detailVisible}
        detail={detail}
        loading={detailLoading}
        onReply={() => setReplyVisible(true)}
        onComplete={handleComplete}
        onClose={() => { setDetailVisible(false); setDetail(null); }}
      />
      <ReplyModal
        open={replyVisible}
        submitting={submitting}
        onSubmit={handleReplySubmit}
        onClose={() => setReplyVisible(false)}
      />
    </>
  );
};

export default ComplaintManagement;
