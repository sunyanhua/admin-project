import { useState, useCallback, useEffect } from 'react';
import { Tag, Image, Space, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  RegisterAuditStatus, RegisterAuditStatusLabels, RegisterAuditStatusColors,
  RegisterPayStatus, RegisterPayStatusLabels, RegisterPayStatusColors,
} from '@shared/constants';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import type { Activity } from '@/api/services/activity-v1';

const AUDIT_STATUS_MAP: Record<number, { text: string; color: string }> = {
  [RegisterAuditStatus.PENDING]: { text: RegisterAuditStatusLabels[RegisterAuditStatus.PENDING], color: RegisterAuditStatusColors[RegisterAuditStatus.PENDING] },
  [RegisterAuditStatus.APPROVED]: { text: RegisterAuditStatusLabels[RegisterAuditStatus.APPROVED], color: RegisterAuditStatusColors[RegisterAuditStatus.APPROVED] },
  [RegisterAuditStatus.REJECTED]: { text: RegisterAuditStatusLabels[RegisterAuditStatus.REJECTED], color: RegisterAuditStatusColors[RegisterAuditStatus.REJECTED] },
};

const EventRegisterList = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [loadingActivities, setLoadingActivities] = useState(false);

  // 加载活动列表
  useEffect(() => {
    setLoadingActivities(true);
    activityApi.getList({ page: 1, size: 100 }).then((res: any) => {
      const list = Array.isArray(res) ? res : (res?.list || []);
      setActivities(list);
      if (list.length > 0 && !selectedActivityId) {
        setSelectedActivityId(list[0].id);
      }
    }).catch(() => setActivities([])).finally(() => setLoadingActivities(false));
  }, []);

  const fetchRegisters = useCallback(async (params: any) => {
    if (!selectedActivityId) return { list: [], total: 0 };
    return activityApi.getRegisters(selectedActivityId, { page: params.page, size: params.page_size });
  }, [selectedActivityId]);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const { data, loading, pagination, onPageChange, refresh } = useListPage<RegisterRecord>({
    fetchFn: fetchRegisters,
    formatResponse,
  });

  const columns: ColumnsType<RegisterRecord> = [
    {
      title: '活动',
      key: 'activity',
      width: 160,
      render: (_: any, r: RegisterRecord) => {
        const act = activities.find((a) => a.id === r.activity_id);
        return <span style={{ wordBreak: 'break-word' }}>{act?.title || r.activity_id}</span>;
      },
    },
    { title: '用户 ID', dataIndex: 'user_id', key: 'user_id', width: 160 },
    {
      title: '审核', dataIndex: 'audit_status', key: 'audit_status', width: 80,
      render: (v: number) => {
        const info = AUDIT_STATUS_MAP[v];
        return info ? <Tag color={info.color} title={info.text}>{info.text}</Tag> : <Tag>{v}</Tag>;
      },
    },
    {
      title: '支付', dataIndex: 'pay_status', key: 'pay_status', width: 80,
      render: (v: number) => {
        const map: any = {
          0: { text: RegisterPayStatusLabels[0], color: RegisterPayStatusColors[0] },
          1: { text: RegisterPayStatusLabels[1], color: RegisterPayStatusColors[1] },
          2: { text: RegisterPayStatusLabels[2], color: RegisterPayStatusColors[2] },
        };
        const info = map[v];
        return info ? <Tag color={info.color} title={info.text}>{info.text}</Tag> : <Tag>{v}</Tag>;
      },
    },
    dateTimeColumn<RegisterRecord>('created_at', '报名时间'),
    {
      title: '签到', dataIndex: 'checkin_at', key: 'checkin_at', width: 120,
      render: (v: string) => v || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '附件', dataIndex: 'attachments', key: 'attachments', width: 100,
      render: (items: RegisterRecord['attachments']) => {
        if (!items || items.length === 0) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Space size={4} wrap>
            {items.slice(0, 3).map((att, idx) => (
              <Image key={idx} src={att.url} preview={{ src: att.url }}
                style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <StandardPage
      title="活动报名"
      description="按活动查看用户报名记录，包含审核状态、支付状态和签到信息。"
      showRefreshButton
      onRefresh={refresh}
      searchArea={
        <Select
          placeholder="请选择活动"
          value={selectedActivityId || undefined}
          style={{ minWidth: 300 }}
          loading={loadingActivities}
          options={activities.map((a) => ({ label: a.title, value: a.id }))}
          onChange={(val) => setSelectedActivityId(val)}
          showSearch
          filterOption={(input, option) => (option?.label as string || '').includes(input)}
        />
      }
      table={
        selectedActivityId ? (
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={pagination}
            onPageChange={onPageChange}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: '#999', fontSize: 14 }}>
            请先选择一个活动，然后查看报名记录
          </div>
        )
      }
    />
  );
};

export default EventRegisterList;
