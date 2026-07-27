import React from 'react';
import { Descriptions, Tag, Spin, Image, Typography } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import type { AdminUserDetailResponse } from '@/api/types/user';
import { UserGender, ProfileAuditStatus, MatchProfileAuditStatus } from '@/api/types/status';
import { getAvatarUrl } from '@/utils/imageUtils';
import { formatDateTime } from '@/utils/format';

const { Text } = Typography;

interface Props {
  open: boolean;
  loading: boolean;
  data: AdminUserDetailResponse | null;
  onClose: () => void;
}

const GENDER_LABEL: Record<number, string> = { 1: '男', 2: '女' };

const PROFILE_AUDIT_MAP: Record<number, { color: string; text: string }> = {
  [ProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
  [ProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
  [ProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
};

const MATCH_AUDIT_MAP: Record<number, { color: string; text: string }> = {
  [MatchProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
  [MatchProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
  [MatchProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
  [MatchProfileAuditStatus.REVOKED]: { color: 'default', text: '已撤销' },
};

const UserDetailModal: React.FC<Props> = ({ open, loading, data, onClose }) => {
  if (!data) return null;

  return (
    <ScrollableModal title="用户详情" open={open} onCancel={onClose} footer={null} width={720}>
      <Spin spinning={loading}>
        <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="头像" span={2}>
            <Image width={80} src={getAvatarUrl(data.avatar)} />
          </Descriptions.Item>
          <Descriptions.Item label="昵称">{data.nickname || '-'}</Descriptions.Item>
          <Descriptions.Item label="真实姓名">{data.real_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="性别">{GENDER_LABEL[data.gender] || '未设置'}</Descriptions.Item>
          <Descriptions.Item label="出生日期">{data.birth_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{data.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="星座生肖">{(data.zodiac || '-') + ' / ' + (data.cn_zodiac || '-')}</Descriptions.Item>
          <Descriptions.Item label="资料审核">
            <Tag color={PROFILE_AUDIT_MAP[data.profile_audit_status]?.color || 'default'}>
              {PROFILE_AUDIT_MAP[data.profile_audit_status]?.text || '未知'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="注册时间">{formatDateTime(data.created_at)}</Descriptions.Item>
          <Descriptions.Item label="最后活跃">{formatDateTime(data.last_active_at)}</Descriptions.Item>
        </Descriptions>

        {data.match_profile && (
          <>
            <Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>脱单档案</Text>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="匹配码">{data.match_profile.match_code || '-'}</Descriptions.Item>
              <Descriptions.Item label="婚姻状况">{data.match_profile.marital_status != null ? data.match_profile.marital_status : '-'}</Descriptions.Item>
              <Descriptions.Item label="学历">{data.match_profile.education != null ? data.match_profile.education : '-'}</Descriptions.Item>
              <Descriptions.Item label="职业">{data.match_profile.profession || '-'}</Descriptions.Item>
              <Descriptions.Item label="收入范围">{data.match_profile.income_range != null ? data.match_profile.income_range : '-'}</Descriptions.Item>
              <Descriptions.Item label="身高">{data.match_profile.height != null ? `${data.match_profile.height}cm` : '-'}</Descriptions.Item>
              <Descriptions.Item label="体重">{data.match_profile.weight != null ? `${data.match_profile.weight}kg` : '-'}</Descriptions.Item>
              <Descriptions.Item label="现居城市">{data.match_profile.current_city || '-'}</Descriptions.Item>
              <Descriptions.Item label="家乡">{data.match_profile.hometown || '-'}</Descriptions.Item>
              <Descriptions.Item label="爱好标签" span={2}>
                {data.match_profile.hobby_tags?.length > 0
                  ? data.match_profile.hobby_tags.map((t: string) => <Tag key={t}>{t}</Tag>)
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="自我介绍" span={2}>{data.match_profile.self_intro || '-'}</Descriptions.Item>
              <Descriptions.Item label="择偶要求" span={2}>{data.match_profile.partner_demand || '-'}</Descriptions.Item>
              <Descriptions.Item label="审核状态">
                <Tag color={MATCH_AUDIT_MAP[data.match_profile.audit_status]?.color || 'default'}>
                  {MATCH_AUDIT_MAP[data.match_profile.audit_status]?.text || '未知'}
                </Tag>
              </Descriptions.Item>
              {data.match_profile.audit_reason && (
                <Descriptions.Item label="审核意见">{data.match_profile.audit_reason}</Descriptions.Item>
              )}
              {data.match_profile.audited_at && (
                <Descriptions.Item label="审核时间">{formatDateTime(data.match_profile.audited_at)}</Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Spin>
    </ScrollableModal>
  );
};

export default UserDetailModal;
