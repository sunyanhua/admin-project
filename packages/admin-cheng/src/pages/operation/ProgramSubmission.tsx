import React, { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag, Image, Avatar, InputNumber } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  SubmissionAuditStatus,
  SubmissionAuditStatusLabels,
  SubmissionAuditStatusColors,
  SubmissionTypeLabels,
  SubmissionTypeColors,
} from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { parseApiTime } from '@/utils/format';
import { submissionApi, Submission } from '@/api/services/submission';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import SubmissionAuditModal from '@/components/operation/SubmissionAuditModal';

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
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState<string>('');

  const fetchSubmissions = useCallback(async (params: any) => {
    return submissionApi.getList({
      page: params.page,
      size: params.page_size,
      status: params.status,
      keyword: params.keyword,
    });
  }, []);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
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

  const handleAudit = (record: Submission) => {
    setAuditRecord(record);
    setAuditModalVisible(true);
  };

  const columns: ColumnsType<Submission> = [
    {
      title: '发布者',
      key: 'user',
      width: 160,
      render: (_: any, r: Submission) => {
        const up = r.user_profile;
        const nickname = up?.nickname || r.nickname || r.user_id;
        const avatar = up?.avatar || r.avatar || '';
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }}
            onClick={() => {
              setUserDetailUserId(r.user_id);
              setUserDetailVisible(true);
            }}>
            <Space size={4}>
              <Avatar size={40} style={{ borderRadius: '50%', flexShrink: 0 }}
                src={getAvatarUrl(avatar)} />
              <span style={{ fontSize: 14 }}>{nickname}</span>
            </Space>
          </Button>
        );
      },
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      render: (text: string, r: Submission) => {
        const typeTag = r.type != null ? (
          <Tag color={SubmissionTypeColors[r.type] || 'default'} style={{ marginRight: 4 }}>
            {SubmissionTypeLabels[r.type] ?? r.type}
          </Tag>
        ) : null;
        if (!text) return typeTag || <span style={{ color: '#999' }}>-</span>;
        return (
          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {typeTag}
            {text.length > 120 ? `${text.slice(0, 120)}...` : text}
          </span>
        );
      },
    },
    {
      title: '附件', dataIndex: 'attachments', key: 'attachments', width: 100,
      render: (atts: Submission['attachments']) => {
        if (!atts || atts.length === 0) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Space size={4} wrap>
            {atts.slice(0, 3).map((att, idx) => (
              <Image key={idx} src={att.url} preview={{ src: att.url }}
                style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8' }} />
            ))}
          </Space>
        );
      },
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
      title: '播出日期', dataIndex: 'approved_at', key: 'approved_at', width: 120,
      render: (v: string) => {
        const d = parseApiTime(v);
        return d ? d.format('YYYY-MM-DD') : <span style={{ color: '#999' }}>-</span>;
      },
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
      width: 100,
      fixed: 'right' as const,
      render: (_: any, r: Submission) => (
        <Space size="small" className="action-buttons">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleAudit(r)}>审核</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <StandardPage
        title="广播投稿管理"
        description="审核和管理用户提交的广播节目投稿，支持设置播出日期。"
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

      <SubmissionAuditModal
        visible={auditModalVisible}
        record={auditRecord}
        onClose={() => { setAuditModalVisible(false); setAuditRecord(null); }}
        onSuccess={refresh}
      />

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />
    </>
  );
};

export default ProgramSubmission;
