import { useState, useCallback } from 'react';
import { Tag, Image, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  RegisterAuditStatus, RegisterAuditStatusLabels, RegisterAuditStatusColors,
  RegisterPayStatus, RegisterPayStatusLabels, RegisterPayStatusColors,
} from '@shared/constants';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import ScrollableModal from '@/components/templates/ScrollableModal';

const AUDIT_STATUS_MAP: Record<number, { text: string; color: string }> = {
  [RegisterAuditStatus.PENDING]: { text: RegisterAuditStatusLabels[RegisterAuditStatus.PENDING], color: RegisterAuditStatusColors[RegisterAuditStatus.PENDING] },
  [RegisterAuditStatus.APPROVED]: { text: RegisterAuditStatusLabels[RegisterAuditStatus.APPROVED], color: RegisterAuditStatusColors[RegisterAuditStatus.APPROVED] },
  [RegisterAuditStatus.REJECTED]: { text: RegisterAuditStatusLabels[RegisterAuditStatus.REJECTED], color: RegisterAuditStatusColors[RegisterAuditStatus.REJECTED] },
};

interface ActivityRegisterModalProps {
  visible: boolean;
  activityId: string;
  activityTitle: string;
  onClose: () => void;
}

const ActivityRegisterModal: React.FC<ActivityRegisterModalProps> = ({ visible, activityId, activityTitle, onClose }) => {
  const fetchRegisters = useCallback(async (params: any) => {
    if (!activityId) return { list: [], total: 0 };
    return activityApi.getRegisters(activityId, { page: params.page, size: params.page_size });
  }, [activityId]);

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
  ];

  return (
    <ScrollableModal
      title={`报名名单 - ${activityTitle}`}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={false}
    >
      <StandardTable
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={pagination}
        onPageChange={onPageChange}
      />
    </ScrollableModal>
  );
};

export default ActivityRegisterModal;
