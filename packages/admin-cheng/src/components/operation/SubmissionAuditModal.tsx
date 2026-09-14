import { useState, useEffect } from 'react';
import { Button, Space, Radio, Avatar, Image, Input, InputNumber } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { SubmissionAuditStatus } from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { submissionApi, Submission } from '@/api/services/submission';
import { userApi } from '@/api/services/user';
import ScrollableModal from '@/components/templates/ScrollableModal';

interface SubmissionAuditModalProps {
  visible: boolean;
  record: Submission | null;
  onClose: () => void;
  onSuccess: () => void;
  /**
   * 奖励积分对应的话题键（动态审核场景：活动预热ID）。
   * 传值时显示「奖励积分」输入，且审核通过后额外调用 topic-data 接口给用户加积分；
   * 缺省（如广播投稿页）不显示积分、不加积分。
   */
  pointsTopicKey?: string;
}

const FILE_TYPE_LABELS: Record<number, string> = { 1: '图片', 2: '音频', 3: '视频' };

const SubmissionAuditModal: React.FC<SubmissionAuditModalProps> = ({
  visible, record, onClose, onSuccess, pointsTopicKey,
}) => {
  const { success, error: showError } = useAppNotification();
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<number>(SubmissionAuditStatus.APPROVED);
  const [reason, setReason] = useState('');
  const [rewardCoins, setRewardCoins] = useState<number | null>(null);
  const [rewardPoints, setRewardPoints] = useState<number | null>(null);

  const isApproved = record?.audit_status === SubmissionAuditStatus.APPROVED;
  // 已通过 → 状态锁定为通过
  const actionLocked = isApproved;

  useEffect(() => {
    if (!visible || !record) return;
    if (record.audit_status === SubmissionAuditStatus.APPROVED) {
      setAction(SubmissionAuditStatus.APPROVED);
      setRewardCoins(record.reward_coins ?? record.type ?? 20);
    } else {
      setAction(SubmissionAuditStatus.APPROVED);
      // 奖励金币/奖励积分默认使用这条数据的 type 值，可修改
      setRewardCoins(record.type ?? 20);
    }
    setRewardPoints(record.type ?? 20);
    // 拒绝原因默认为「内容不合格」
    setReason(record.audit_reason || '内容不合格');
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
    if (action === SubmissionAuditStatus.APPROVED && pointsTopicKey && (rewardPoints == null || rewardPoints < 0)) {
      showError('请填写奖励积分');
      return;
    }
    try {
      setSubmitting(true);
      const statusChanged = action !== record.audit_status;
      if (statusChanged) {
        // 审核状态变更 → 走 audit 接口
        await submissionApi.audit(record.id, {
          action,
          reason: action === SubmissionAuditStatus.REJECTED ? reason : undefined,
          reward_coins: action === SubmissionAuditStatus.APPROVED ? (rewardCoins ?? 0) : undefined,
        });
      }
      // 审核通过后额外给用户加积分（动态审核场景：topic_key=活动预热ID，score_1=奖励积分，delta 增减）
      if (statusChanged && action === SubmissionAuditStatus.APPROVED && pointsTopicKey) {
        await userApi.adjustTopicDataScore(record.user_id, pointsTopicKey, {
          score_1: rewardPoints ?? 0,
          reason: '动态审核通过',
        });
      }
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
            {pointsTopicKey && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 4, color: '#666', fontSize: 13 }}>奖励积分（必填，审核通过后计入用户话题数据）</div>
                <InputNumber
                  min={0}
                  precision={0}
                  value={rewardPoints}
                  disabled={actionLocked}
                  onChange={v => setRewardPoints(v)}
                  style={{ width: 200 }}
                  placeholder="请输入奖励积分值"
                />
              </div>
            )}
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
