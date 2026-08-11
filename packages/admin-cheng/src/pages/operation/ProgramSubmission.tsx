import React, { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag, Image, Avatar, InputNumber, Modal, Input } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  SubmissionAuditStatus,
  SubmissionAuditStatusLabels,
  SubmissionAuditStatusColors,
} from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { submissionApi, Submission } from '@/api/services/submission';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';

const { TextArea } = Input;

const STATUS_OPTIONS = [
  { label: '待审核', value: SubmissionAuditStatus.PENDING },
  { label: '通过', value: SubmissionAuditStatus.APPROVED },
  { label: '拒绝', value: SubmissionAuditStatus.REJECTED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'keyword', placeholder: '搜索投稿内容', type: 'input' },
];

const ProgramSubmission = () => {
  const { success, error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [auditRecord, setAuditRecord] = useState<Submission | null>(null);
  const [auditApproved, setAuditApproved] = useState(false);
  const [auditReason, setAuditReason] = useState('');
  const [auditRewardCoins, setAuditRewardCoins] = useState<number | null>(null);
  const [auditDeleteFiles, setAuditDeleteFiles] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchSubmissions = useCallback(async (params: any) => {
    return submissionApi.getList({
      page: params.page,
      size: params.page_size,
      status: params.status,
      keyword: params.keyword,
    });
  }, []);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.items || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Submission>({
    fetchFn: fetchSubmissions,
    formatResponse,
  });

  const handleSearchChange = (name: string, value: any) => {
    setSearchValues(p => ({ ...p, [name]: value }));
  };
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleSortChange = async (record: Submission, value: number | null) => {
    if (value == null) return;
    try {
      await submissionApi.updateSortOrder(record.id, { sort_order: value });
      success('排序更新成功');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '排序更新失败');
    }
  };

  const handleAudit = (record: Submission, approved: boolean) => {
    setAuditRecord(record);
    setAuditApproved(approved);
    setAuditReason('');
    setAuditRewardCoins(null);
    setAuditDeleteFiles(false);
    setAuditModalVisible(true);
  };

  const confirmAudit = async () => {
    if (!auditRecord) return;
    try {
      setAuditLoading(true);
      await submissionApi.audit(auditRecord.id, {
        action: auditApproved ? SubmissionAuditStatus.APPROVED : SubmissionAuditStatus.REJECTED,
        reason: auditReason || undefined,
        reward_coins: auditApproved && auditRewardCoins != null ? auditRewardCoins : undefined,
        delete_files: auditDeleteFiles || undefined,
      });
      success(auditApproved ? '审核通过' : '已拒绝');
      setAuditModalVisible(false);
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '审核操作失败');
    } finally {
      setAuditLoading(false);
    }
  };

  const columns: ColumnsType<Submission> = [
    {
      title: '发布者',
      key: 'user',
      width: 160,
      render: (_: any, r: Submission) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }}>
          <Space size={4}>
            <Avatar size={40} style={{ borderRadius: '50%', flexShrink: 0 }}
              src={getAvatarUrl(r.avatar)} />
            <span style={{ fontSize: 14 }}>{r.nickname || r.user_id}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (text: string) => {
        if (!text) return <span style={{ color: '#999' }}>-</span>;
        return (
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {text.length > 120 ? `${text.slice(0, 120)}...` : text}
          </span>
        );
      },
    },
    {
      title: '附件', dataIndex: 'attachments', key: 'attachments', width: 100,
      render: (urls: string[]) => {
        if (!urls || urls.length === 0) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Space size={4} wrap>
            {urls.slice(0, 3).map((url, idx) => (
              <Image key={idx} src={url} preview={{ src: url }}
                style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8' }} />
            ))}
          </Space>
        );
      },
    },
    {
      title: '公开', dataIndex: 'is_public', key: 'is_public', width: 80,
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? '是' : '否'}</Tag>,
    },
    {
      title: '审核', dataIndex: 'audit_status', key: 'audit_status', width: 80,
      render: (v: number) => (
        <Tag color={SubmissionAuditStatusColors[v] || 'default'} title={SubmissionAuditStatusLabels[v]}>
          {SubmissionAuditStatusLabels[v] ?? v}
        </Tag>
      ),
    },
    {
      title: '金币', dataIndex: 'reward_coins', key: 'reward_coins', width: 80,
      render: (v: number) => v ?? 0,
    },
    {
      title: '权重',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 120,
      render: (v: number | undefined, r: Submission) => (
        <InputNumber
          min={0}
          value={v ?? 0}
          style={{ width: 70 }}
          disabled={r.audit_status !== SubmissionAuditStatus.APPROVED}
          onBlur={(e) => {
            const val = e.target.value;
            const num = val === '' ? undefined : parseInt(val);
            if (num !== (r.sort_order ?? undefined)) {
              handleSortChange(r, num ?? 0);
            }
          }}
        />
      ),
    },
    dateTimeColumn<Submission>('created_at', '投稿时间'),
    {
      title: '操作',
      key: 'action',
      width: 140,
      fixed: 'right' as const,
      render: (_: any, r: Submission) => {
        const isPending = r.audit_status === SubmissionAuditStatus.PENDING;
        return (
          <Space size="small" className="action-buttons">
            {isPending && (
              <>
                <Button type="link" size="small" icon={<CheckOutlined />}
                  onClick={() => handleAudit(r, true)}>通过</Button>
                <Button type="link" size="small" danger icon={<CloseOutlined />}
                  onClick={() => handleAudit(r, false)}>拒绝</Button>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <StandardPage
        title="广播投稿管理"
        description="审核和管理用户提交的广播节目投稿，支持审核通过并发放金币奖励。"
        showRefreshButton
        onRefresh={refresh}
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
        title={auditApproved ? '审核通过' : '审核拒绝'}
        open={auditModalVisible}
        onCancel={() => setAuditModalVisible(false)}
        onOk={confirmAudit}
        confirmLoading={auditLoading}
        okText="确认"
        cancelText="取消"
        maskClosable={false}
        width={480}
      >
        <p style={{ marginBottom: 16 }}>
          {auditApproved
            ? `确认通过"${auditRecord?.nickname || auditRecord?.user_id}"的投稿？`
            : `确认拒绝"${auditRecord?.nickname || auditRecord?.user_id}"的投稿？`}
        </p>

        {auditApproved && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>金币奖励（选填）</div>
            <InputNumber min={0} precision={0} style={{ width: '100%' }}
              placeholder="通过时可发放金币奖励"
              value={auditRewardCoins}
              onChange={(v) => setAuditRewardCoins(v)} />
          </div>
        )}

        {!auditApproved && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>拒绝原因</div>
            <TextArea rows={3} maxLength={512} showCount
              value={auditReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAuditReason(e.target.value)}
              placeholder="请输入拒绝原因" />
          </div>
        )}
      </Modal>
    </>
  );
};

export default ProgramSubmission;
