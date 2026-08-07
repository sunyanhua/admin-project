import { useState, useEffect } from 'react';
import { Button, Space, Form, Input, Image, Descriptions, Tag } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import { ApplicationReviewStatus, ApplicationReviewStatusLabels, ApplicationReviewStatusColors } from '@shared/constants';
import { zoneApi, Application } from '@/api/services/zone';
import ScrollableModal from '@/components/templates/ScrollableModal';

const { TextArea } = Input;

export interface ZoneApplicationReviewModalProps {
  visible: boolean;
  zoneId: string;
  application: Application | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ZoneApplicationReviewModal: React.FC<ZoneApplicationReviewModalProps> = ({
  visible, zoneId, application, onClose, onSuccess,
}) => {
  const { success, error: showError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      setTimeout(() => form.resetFields(), 0);
    }
  }, [visible, form]);

  const isPending = application?.status === ApplicationReviewStatus.PENDING;
  const isApproved = application?.status === ApplicationReviewStatus.APPROVED;

  const handleReview = async (status: number) => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await zoneApi.reviewApplication(zoneId, application!.id, {
        status,
        review_remark: values.review_remark || '',
      });
      success(status === ApplicationReviewStatus.APPROVED ? '已通过' : '已拒绝');
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    try {
      setLoading(true);
      await zoneApi.revokeApplication(zoneId, application!.id);
      success('已撤销');
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err?.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  if (!application) return null;

  let formDataParsed: Record<string, any> = {};
  try { formDataParsed = JSON.parse(application.form_data || '{}'); } catch { /* ignore */ }

  const statusLabel = ApplicationReviewStatusLabels[application.status] || '未知';
  const statusColor = ApplicationReviewStatusColors[application.status] || 'default';

  return (
    <ScrollableModal
      title="审核专区申请"
      open={visible}
      onCancel={onClose}
      width={640}
      destroyOnHidden
      footer={isPending ? (
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button danger loading={loading} onClick={() => handleReview(ApplicationReviewStatus.REJECTED)}>
            拒绝
          </Button>
          <Button type="primary" loading={loading} onClick={() => handleReview(ApplicationReviewStatus.APPROVED)}>
            通过
          </Button>
        </Space>
      ) : isApproved ? (
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button danger loading={loading} onClick={handleRevoke}>
            撤销审核
          </Button>
        </Space>
      ) : (
        <Space>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      )}
    >
      <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
        <Descriptions.Item label="用户 ID">{application.user_id}</Descriptions.Item>
        <Descriptions.Item label="申请时间">{application.created_at || '-'}</Descriptions.Item>
        <Descriptions.Item label="审核状态">
          <Tag color={statusColor}>{statusLabel}</Tag>
        </Descriptions.Item>
        {application.reviewed_at && (
          <Descriptions.Item label="审核时间">{application.reviewed_at}</Descriptions.Item>
        )}
        {application.review_remark && (
          <Descriptions.Item label="审核备注">{application.review_remark}</Descriptions.Item>
        )}
      </Descriptions>

      {/* 表单数据 */}
      {Object.keys(formDataParsed).length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>申请内容</div>
          <div style={{ background: '#fafafa', borderRadius: 4, padding: 12 }}>
            {Object.entries(formDataParsed).map(([key, val]) => (
              <div key={key} style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                <span style={{ color: '#666', minWidth: 80 }}>{key}：</span>
                <span>{String(val ?? '-')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 附件 */}
      {application.attachments && application.attachments.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>附件</div>
          <Space size={8} wrap>
            {application.attachments.map((url, idx) => (
              <Image key={idx} src={url} preview={{ src: url }}
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #e8e8e8' }}
              />
            ))}
          </Space>
        </div>
      )}

      {/* 审核备注 — 仅待审核时显示 */}
      {isPending && (
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            label="审核备注"
            name="review_remark"
          >
            <TextArea placeholder="可选，填写审核意见" rows={3} maxLength={512} showCount />
          </Form.Item>
        </Form>
      )}
    </ScrollableModal>
  );
};

export default ZoneApplicationReviewModal;
