import { useCallback } from 'react';
import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { userApi } from '@/api/services/user';
import { formatDateTime } from '@/utils/format';

/** 靠谱值来源 */
export enum ReliabilitySource {
  BACKFILL = 0, // 历史数据回填
  REGISTER_MATCH_PROFILE = 1, // 注册脱单
  REAL_VERIFY = 2, // 实名认证
  EDUCATION_VERIFY = 3, // 学历认证
  ORG_VERIFY = 4, // 单位认证（专区认证通过）
  ACTIVITY_CHECKIN = 5, // 现场签到
  ACTIVITY_REGISTER = 6, // 活动报名（仅 C 端普通报名/预报名）
  ADMIN_ADJUST = 7, // 管理后台调整
}

export const RELIABILITY_SOURCE_LABELS: Record<number, string> = {
  [ReliabilitySource.BACKFILL]: '历史数据回填',
  [ReliabilitySource.REGISTER_MATCH_PROFILE]: '注册脱单',
  [ReliabilitySource.REAL_VERIFY]: '实名认证',
  [ReliabilitySource.EDUCATION_VERIFY]: '学历认证',
  [ReliabilitySource.ORG_VERIFY]: '单位认证',
  [ReliabilitySource.ACTIVITY_CHECKIN]: '现场签到',
  [ReliabilitySource.ACTIVITY_REGISTER]: '活动报名',
  [ReliabilitySource.ADMIN_ADJUST]: '后台调整',
};

/** 靠谱值流水条目 */
export interface ReliabilityLogItem {
  id: string;
  source_type: number;
  delta: number;
  score_after: number;
  reason: string;
  related_id: string;
  operator_id: string;
  created_at: string;
}

/** 响应结构统一解析（拦截器可能返回 { list, total } 或原始数组） */
const formatResponse = (res: any) => {
  const list = Array.isArray(res) ? res : (res?.list || []);
  const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
  return { list, count: total };
};

export interface ReliabilityLogModalProps {
  open: boolean;
  userId: string;
  onClose: () => void;
}

/** 用户靠谱值流水弹窗（分页，created_at 倒序） */
const ReliabilityLogModal: React.FC<ReliabilityLogModalProps> = ({ open, userId, onClose }) => {
  const fetchLogs = useCallback(async (params: any) => {
    if (!userId) return { list: [], total: 0 };
    return userApi.getReliabilityLogs(userId, { page: params.page, size: params.page_size });
  }, [userId]);

  const { data, loading, pagination, onPageChange } = useListPage<ReliabilityLogItem>({
    fetchFn: fetchLogs,
    formatResponse,
  });

  const columns: ColumnsType<ReliabilityLogItem> = [
    {
      title: '来源',
      dataIndex: 'source_type',
      key: 'source_type',
      width: 100,
      render: (v: number) => <Tag title={RELIABILITY_SOURCE_LABELS[v] ?? v}>{RELIABILITY_SOURCE_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '变化',
      dataIndex: 'delta',
      key: 'delta',
      width: 90,
      render: (v: number) => {
        const text = v > 0 ? `+${v}` : String(v ?? 0);
        const color = v > 0 ? '#3f8600' : v < 0 ? '#cf1322' : '#666';
        return <span style={{ color, fontWeight: 600 }}>{text}</span>;
      },
    },
    {
      title: '变化后',
      dataIndex: 'score_after',
      key: 'score_after',
      width: 90,
      render: (v: number) => v ?? '-',
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      render: (v: string) => <span style={{ wordBreak: 'break-word' }}>{v || '-'}</span>,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (v: string) => {
        if (!v) return null;
        const t = formatDateTime(v);
        return <div style={{ fontSize: 12, lineHeight: 1.6 }}><div>{t.slice(0, 10)}</div><div>{t.slice(11)}</div></div>;
      },
    },
  ];

  return (
    <ScrollableModal title="靠谱值流水" open={open} onCancel={onClose} width={900} footer={null}>
      <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
    </ScrollableModal>
  );
};

export default ReliabilityLogModal;
