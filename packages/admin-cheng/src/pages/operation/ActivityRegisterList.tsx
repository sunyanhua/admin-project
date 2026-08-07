import { useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag, Image } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  RegisterAuditStatus,
  RegisterAuditStatusLabels,
  RegisterAuditStatusColors,
  RegisterPayStatus,
  RegisterPayStatusLabels,
  RegisterPayStatusColors,
} from '@shared/constants';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';

const AUDIT_STATUS_MAP: Record<number, { text: string; color: string }> = {
  [RegisterAuditStatus.PENDING]: { text: RegisterAuditStatusLabels[RegisterAuditStatus.PENDING], color: RegisterAuditStatusColors[RegisterAuditStatus.PENDING] },
  [RegisterAuditStatus.APPROVED]: { text: RegisterAuditStatusLabels[RegisterAuditStatus.APPROVED], color: RegisterAuditStatusColors[RegisterAuditStatus.APPROVED] },
  [RegisterAuditStatus.REJECTED]: { text: RegisterAuditStatusLabels[RegisterAuditStatus.REJECTED], color: RegisterAuditStatusColors[RegisterAuditStatus.REJECTED] },
};

const ActivityRegisterList = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const activityTitle = (location.state as any)?.title || '活动';

  const fetchRegisters = useCallback(async (params: any) => {
    if (!id) return { list: [], total: 0 };
    return activityApi.getRegisters(id, { page: params.page, size: params.page_size });
  }, [id]);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const {
    data,
    loading,
    pagination,
    onPageChange,
    refresh,
  } = useListPage<RegisterRecord>({
    fetchFn: fetchRegisters,
    formatResponse,
  });

  const columns: ColumnsType<RegisterRecord> = [
    {
      title: '用户 ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 160,
    },
    {
      title: '审核状态',
      dataIndex: 'audit_status',
      key: 'audit_status',
      width: 90,
      render: (v: number) => {
        const info = AUDIT_STATUS_MAP[v];
        return info ? <Tag color={info.color} title={info.text}>{info.text}</Tag> : <Tag>{v}</Tag>;
      },
    },
    {
      title: '支付状态',
      dataIndex: 'pay_status',
      key: 'pay_status',
      width: 90,
      render: (v: number) => {
        const info: any = { 0: { text: RegisterPayStatusLabels[0], color: RegisterPayStatusColors[0] }, 1: { text: RegisterPayStatusLabels[1], color: RegisterPayStatusColors[1] }, 2: { text: RegisterPayStatusLabels[2], color: RegisterPayStatusColors[2] } }[v];
        return info ? <Tag color={info.color} title={info.text}>{info.text}</Tag> : <Tag>{v}</Tag>;
      },
    },
    dateTimeColumn<RegisterRecord>('created_at', '报名时间'),
    {
      title: '签到时间',
      dataIndex: 'checkin_at',
      key: 'checkin_at',
      width: 120,
      render: (v: string) => v || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '附件',
      dataIndex: 'attachments',
      key: 'attachments',
      width: 120,
      render: (urls: string[]) => {
        if (!urls || urls.length === 0) return <span style={{ color: '#999' }}>-</span>;
        return (
          <Space size={4} wrap>
            {urls.slice(0, 3).map((url, idx) => (
              <Image key={idx} src={url} preview={{ src: url }}
                style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8' }}
              />
            ))}
            {urls.length > 3 && <span style={{ color: '#999', fontSize: 12 }}>+{urls.length - 3}</span>}
          </Space>
        );
      },
    },
  ];

  return (
    <StandardPage
      title={`报名记录 - ${activityTitle}`}
      description="查看该活动的用户报名记录，包含审核状态、支付状态和签到信息。"
      extraActions={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回活动列表
        </Button>
      }
      showRefreshButton
      onRefresh={refresh}
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
  );
};

export default ActivityRegisterList;
