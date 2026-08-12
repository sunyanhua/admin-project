import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Radio } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import {
  RegisterAuditStatus, ActivityType,
} from '@shared/constants';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import type { FormField } from '@/components/operation/FormConfigEditor';
import ScrollableModal from '@/components/templates/ScrollableModal';

interface ActivityRegisterDetailModalProps {
  visible: boolean;
  record: RegisterRecord | null;
  formConfig: FormField[];
  activityType: number;
  readonly?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FILE_TYPE_LABELS: Record<number, string> = { 1: '图片', 2: '音频', 3: '视频' };

const ActivityRegisterDetailModal: React.FC<ActivityRegisterDetailModalProps> = ({
  visible, record, formConfig, activityType, readonly = false, onClose, onSuccess,
}) => {
  const { success, error: showError } = useAppNotification();
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<number>(RegisterAuditStatus.APPROVED);
  const [rejectReason, setRejectReason] = useState('');

  const isFreeReview = activityType === ActivityType.FREE_REVIEW;

  useEffect(() => {
    if (visible) {
      setAction(RegisterAuditStatus.APPROVED);
      setRejectReason('');
    }
  }, [visible]);

  if (!record) return null;

  const isPending = record.audit_status === RegisterAuditStatus.PENDING;

  let formDataMap: Record<string, any> = {};
  try { formDataMap = JSON.parse(record.form_data || '{}'); } catch { /* ignore */ }

  const attachmentsByField: Record<string, any[]> = {};
  for (const att of (record.attachments || [])) {
    const tag = (att as any).tags || '';
    if (!attachmentsByField[tag]) attachmentsByField[tag] = [];
    attachmentsByField[tag].push(att);
  }

  const handleSubmit = async () => {
    if (action === RegisterAuditStatus.REJECTED && !rejectReason.trim()) {
      showError('请填写拒绝原因');
      return;
    }
    try {
      setSubmitting(true);
      await activityApi.auditRegister(record.activity_id, record.id, {
        approved: action === RegisterAuditStatus.APPROVED,
        reason: action === RegisterAuditStatus.REJECTED ? rejectReason : undefined,
      });
      success(action === RegisterAuditStatus.APPROVED ? '已通过' : '已拒绝');
      onClose();
      onSuccess();
    } catch (err: any) {
      showError(err?.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollableModal
      title="报名信息"
      open={visible}
      onCancel={onClose}
      width={560}
      destroyOnHidden
      footer={readonly ? (
        <Button onClick={onClose}>关闭</Button>
      ) : (
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>提交</Button>
        </Space>
      )}
    >
      {/* 报名信息 */}
      {formConfig.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {formConfig.map(field => {
              const val = formDataMap[field.id];
              const atts = attachmentsByField[field.id] || [];
              const hasContent = val != null || atts.length > 0;
              return (
                <tr key={field.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px', fontSize: 13, color: '#666', width: 120, verticalAlign: 'top', fontWeight: 500 }}>
                    {field.label}：
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 13 }}>
                    {hasContent ? (
                      <>
                        {val != null && <div style={{ wordBreak: 'break-word', marginBottom: atts.length > 0 ? 8 : 0 }}>{String(val)}</div>}
                        {atts.length > 0 && (
                          <Space size={4} wrap>
                            {atts.map((att: any, idx: number) => {
                              const ft = att.file_type as number;
                              if (ft === 1) {
                                return <img key={idx} src={att.url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8' }} />;
                              }
                              return <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer"
                                style={{ display: 'inline-block', padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: 4, color: '#1677ff' }}>{FILE_TYPE_LABELS[ft] || '文件'}</a>;
                            })}
                          </Space>
                        )}
                      </>
                    ) : <span style={{ color: '#999' }}>-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>暂无报名信息</div>
      )}

      {/* 审核操作（仅免费审核且待审核且非只读） */}
      {isFreeReview && isPending && !readonly && (
        <div style={{ paddingTop: 16, marginTop: 8, borderTop: formConfig.length > 0 ? '1px solid #e8e8e8' : 'none' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>审核</div>
          <Radio.Group value={action} onChange={e => setAction(e.target.value)} style={{ marginBottom: 12 }}>
            <Radio value={RegisterAuditStatus.APPROVED}>通过</Radio>
            <Radio value={RegisterAuditStatus.REJECTED}>拒绝</Radio>
          </Radio.Group>
          {action === RegisterAuditStatus.REJECTED && (
            <Form.Item label="拒绝原因" required style={{ marginBottom: 0 }}>
              <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因" maxLength={512} />
            </Form.Item>
          )}
        </div>
      )}
    </ScrollableModal>
  );
};

export default ActivityRegisterDetailModal;
