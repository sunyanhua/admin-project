import { useState, useEffect } from 'react';
import { Button, Space, Radio, DatePicker, Avatar, Image, Input, InputNumber, Tag } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { SubmissionAuditStatus, SubmissionTypeLabels, SubmissionTypeColors } from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { submissionApi, Submission } from '@/api/services/submission';
import ScrollableModal from '@/components/templates/ScrollableModal';
import dayjs, { Dayjs } from 'dayjs';
import { safeDayjs } from '@/utils/format';

interface SubmissionAuditModalProps {
  visible: boolean;
  record: Submission | null;
  onClose: () => void;
  onSuccess: () => void;
}

const FILE_TYPE_LABELS: Record<number, string> = { 1: '图片', 2: '音频', 3: '视频' };

const SubmissionAuditModal: React.FC<SubmissionAuditModalProps> = ({
  visible, record, onClose, onSuccess,
}) => {
  const { success, error: showError } = useAppNotification();
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<number>(SubmissionAuditStatus.APPROVED);
  const [reason, setReason] = useState('');
  const [approvedAt, setApprovedAt] = useState<Dayjs | null>(null);
  const [rewardCoins, setRewardCoins] = useState<number | null>(null);

  const isApproved = record?.audit_status === SubmissionAuditStatus.APPROVED;
  // 已通过 → 状态锁定为通过，只能改播出日期
  const actionLocked = isApproved;

  useEffect(() => {
    if (!visible || !record) return;
    if (record.audit_status === SubmissionAuditStatus.APPROVED) {
      setAction(SubmissionAuditStatus.APPROVED);
      setApprovedAt(safeDayjs(record.approved_at) || null);
      setRewardCoins(record.reward_coins ?? 20);
    } else {
      setAction(SubmissionAuditStatus.APPROVED);
      setApprovedAt(null);
      setRewardCoins(20);
    }
    setReason(record.audit_reason || '');
  }, [visible, record]);

  if (!record) return null;

  const up = record.user_profile;
  const nickname = up?.nickname || record.nickname || record.user_id;
  const avatar = up?.avatar || record.avatar || '';

  const handleSubmit = async () => {
    if (action === SubmissionAuditStatus.REJECTED && !reason.trim()) {
      showError('请填写拒绝原因');
      return;
    }
    if (action === SubmissionAuditStatus.APPROVED && (rewardCoins == null || rewardCoins < 0)) {
      showError('请填写奖励金币');
      return;
    }
    try {
      setSubmitting(true);
      await submissionApi.audit(record.id, {
        action,
        reason: action === SubmissionAuditStatus.REJECTED ? reason : undefined,
        reward_coins: action === SubmissionAuditStatus.APPROVED ? (rewardCoins ?? 0) : undefined,
        approved_at: action === SubmissionAuditStatus.APPROVED && approvedAt
          ? approvedAt.format('YYYY-MM-DD')
          : undefined,
      });
      success('保存成功');
      onClose();
      onSuccess();
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollableModal
      title="审核投稿"
      open={visible}
      onCancel={onClose}
      width={640}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>保存</Button>
        </Space>
      }
    >
      {/* 投稿用户 */}
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>投稿用户</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
        <Avatar size={56} style={{ borderRadius: '50%', flexShrink: 0 }} src={getAvatarUrl(avatar)} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>{nickname}</span>
      </div>

      {/* 内容 */}
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>内容</div>
      <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>
        {record.type != null && (
          <Tag color={SubmissionTypeColors[record.type] || 'default'} style={{ marginBottom: 8 }}>
            {SubmissionTypeLabels[record.type] ?? record.type}
          </Tag>
        )}
        {record.content || <span style={{ color: '#999' }}>-</span>}
      </div>

      {/* 附件 */}
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>附件</div>
      <div style={{ marginBottom: 16 }}>
        {(record.attachments || []).length === 0 ? (
          <span style={{ color: '#999' }}>-</span>
        ) : (
          <Space size={8} wrap>
            {(record.attachments || []).map((att, idx) => {
              const ft = (att as any).file_type as number;
              if (ft === 1) {
                return <Image key={idx} src={att.url} preview={{ src: att.url }}
                  style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8' }} />;
              }
              return <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: 4, color: '#1677ff' }}>{FILE_TYPE_LABELS[ft] || '文件'}</a>;
            })}
          </Space>
        )}
      </div>

      {/* 审核操作 */}
      <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>审核操作</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>状态</div>
          <Radio.Group
            value={action}
            disabled={actionLocked}
            onChange={e => setAction(e.target.value)}
          >
            <Radio value={SubmissionAuditStatus.APPROVED}>通过</Radio>
            <Radio value={SubmissionAuditStatus.REJECTED}>拒绝</Radio>
          </Radio.Group>
        </div>

        {action === SubmissionAuditStatus.APPROVED && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>奖励金币（必填）</div>
              <InputNumber
                min={0}
                precision={0}
                value={rewardCoins}
                disabled={actionLocked}
                onChange={v => setRewardCoins(v)}
                style={{ width: 200 }}
                placeholder="请输入奖励金币数量"
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>播出日期（选填）</div>
              <DatePicker
                value={approvedAt}
                onChange={d => setApprovedAt(d)}
                format="YYYY/MM/DD"
                style={{ width: 200 }}
                placeholder="请选择播出日期"
              />
            </div>
          </>
        )}

        {action === SubmissionAuditStatus.REJECTED && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>拒绝原因（必填）</div>
            <Input.TextArea
              rows={3}
              maxLength={512}
              showCount
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="请输入拒绝原因"
            />
          </div>
        )}
      </div>
    </ScrollableModal>
  );
};

export default SubmissionAuditModal;
