import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Image, Avatar, Radio } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { ApplicationReviewStatus, ApplicationReviewStatusLabels, RegisterGenderLabels } from '@shared/constants';
import { getAvatarUrl } from '@/utils/imageUtils';
import { zoneApi, Application, DBAttachment } from '@/api/services/zone';
import type { FormField } from '@/components/operation/FormConfigEditor';
import ScrollableModal from '@/components/templates/ScrollableModal';

const FILE_TYPE_LABELS: Record<number, string> = { 1: '图片', 2: '音频', 3: '视频' };

export interface ZoneApplicationReviewModalProps {
  visible: boolean;
  zoneId: string;
  application: Application | null;
  readonly?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ZoneApplicationReviewModal: React.FC<ZoneApplicationReviewModalProps> = ({
  visible, zoneId, application, readonly = false, onClose, onSuccess,
}) => {
  const { success, error: showError } = useAppNotification();
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<number>(ApplicationReviewStatus.APPROVED);
  const [rejectReason, setRejectReason] = useState('');
  const [formConfig, setFormConfig] = useState<FormField[]>([]);

  // 加载专区 form_config
  useEffect(() => {
    if (!visible || !zoneId) return;
    zoneApi.getDetail(zoneId).then((res: any) => {
      const zoneData = res as any;
      const raw = zoneData?.form_config;
      if (raw) {
        try {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setFormConfig(Array.isArray(parsed) ? parsed : []);
        } catch { setFormConfig([]); }
      } else {
        setFormConfig([]);
      }
    }).catch(() => setFormConfig([]));
  }, [visible, zoneId]);

  useEffect(() => {
    if (visible) {
      setAction(ApplicationReviewStatus.APPROVED);
      setRejectReason('');
    }
  }, [visible]);

  const isPending = application?.status === ApplicationReviewStatus.PENDING;
  const profile = application?.user_profile;
  const matchProfile = application?.user_match_profile as any;

  // 解析 form_data
  let formDataMap: Record<string, any> = {};
  if (application?.form_data) {
    try { formDataMap = JSON.parse(application.form_data); } catch { /* ignore */ }
  }

  // 按 tags 分组附件
  const attachmentsByField: Record<string, DBAttachment[]> = {};
  for (const att of application?.attachments || []) {
    const tag = (att as any).tags || '';
    if (!attachmentsByField[tag]) attachmentsByField[tag] = [];
    attachmentsByField[tag].push(att);
  }

  // 找 form_config 中未匹配的数据（form_data 有但 form_config 没定义 id 的，或附件不属于任何字段的）
  const unmatchedAttachments = attachmentsByField[''] || [];
  // 所有 form_config 字段之外的其他 form_data 键
  const configIds = new Set(formConfig.map(f => f.id));
  const unmatchedData: Record<string, any> = {};
  for (const [key, val] of Object.entries(formDataMap)) {
    if (!configIds.has(key) && key.trim()) unmatchedData[key] = val;
  }

  const handleSubmit = async () => {
    if (!application) return;
    if (action === ApplicationReviewStatus.REJECTED && !rejectReason.trim()) {
      showError('请填写拒绝原因');
      return;
    }
    try {
      setSubmitting(true);
      await zoneApi.reviewApplication(zoneId, application.id, {
        status: action,
        review_remark: action === ApplicationReviewStatus.REJECTED ? rejectReason : '',
      });
      success(action === ApplicationReviewStatus.APPROVED ? '已通过' : '已拒绝');
      onClose();
      onSuccess();
    } catch (err: any) {
      showError(err?.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAttachment = (att: DBAttachment) => {
    const ft = (att as any).file_type as number;
    const url = att.url;
    if (ft === 1) {
      return <Image key={att.url} src={url} preview={{ src: url }}
        style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8' }} />;
    }
    // 音频或视频
    const label = FILE_TYPE_LABELS[ft] || '文件';
    return (
      <a key={att.url} href={url} target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-block', padding: '4px 12px', border: '1px solid #d9d9d9', borderRadius: 4, color: '#1677ff' }}>
        {label}
      </a>
    );
  };

  if (!application) return null;

  return (
    <ScrollableModal
      title="审核专区申请"
      open={visible}
      onCancel={onClose}
      width={640}
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
      {/* === 用户信息 === */}
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>申请用户</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
        <Avatar size={56} style={{ borderRadius: '50%', flexShrink: 0 }}
          src={getAvatarUrl(profile?.avatar || '')} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{profile?.nickname || application.user_id}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
            {matchProfile?.real_name && <span>姓名：{matchProfile.real_name}　</span>}
            {profile?.gender != null && <span>性别：{RegisterGenderLabels[profile.gender] ?? profile.gender}　</span>}
            {(((application.user_data as any)?.phone || matchProfile?.phone)) && <span>手机号：{(application.user_data as any)?.phone || matchProfile?.phone}</span>}
          </div>
        </div>
      </div>

      {/* === 表单字段内容 === */}
      {formConfig.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>申请内容</div>
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
                            <Space size={4} wrap>{atts.map(att => renderAttachment(att as DBAttachment))}</Space>
                          )}
                        </>
                      ) : <span style={{ color: '#999' }}>-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* === 暂存数据（form_config 无对应定义的字段） === */}
      {Object.keys(unmatchedData).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>其它信息</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {Object.entries(unmatchedData).map(([key, val]) => (
                <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px', fontSize: 13, color: '#666', width: 120, verticalAlign: 'top', fontWeight: 500 }}>
                    {key}：
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 13, wordBreak: 'break-word' }}>{String(val ?? '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 无主附件 */}
      {unmatchedAttachments.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>附件</div>
          <Space size={4} wrap>{unmatchedAttachments.map(att => renderAttachment(att as DBAttachment))}</Space>
        </div>
      )}

      {/* === 审核操作 / 审核结果 === */}
      {isPending && !readonly ? (
        <div style={{ paddingTop: 8, marginTop: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>审核</div>
          <Radio.Group
            value={action}
            onChange={e => setAction(e.target.value)}
            style={{ marginBottom: 12 }}
          >
            <Radio value={ApplicationReviewStatus.APPROVED}>通过</Radio>
            <Radio value={ApplicationReviewStatus.REJECTED}>拒绝</Radio>
          </Radio.Group>

          {action === ApplicationReviewStatus.REJECTED && (
            <Form.Item label="拒绝原因" required style={{ marginBottom: 0 }}>
              <Input
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因"
                maxLength={512}
              />
            </Form.Item>
          )}
        </div>
      ) : (
        <div style={{ paddingTop: 8, marginTop: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>审核状态</div>
          <div style={{ fontSize: 14 }}>
            状态：{ApplicationReviewStatusLabels[application.status] || application.status}
          </div>
          {application.status === ApplicationReviewStatus.REJECTED && application.review_remark && (
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              拒绝原因：{application.review_remark}
            </div>
          )}
        </div>
      )}
    </ScrollableModal>
  );
};

export default ZoneApplicationReviewModal;
