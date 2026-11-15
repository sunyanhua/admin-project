import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Space, Spin, Tag, Radio, Input, Checkbox, InputNumber, Image, App } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { getAvatarUrl, getMediumUrl } from '@/utils/imageUtils';
import { formatDateTime, formatCents } from '@/utils/format';
import { congratulationApi, AdminCongratulationDetail } from '@/api/services/congratulation';
import { CongratulationStatus, CongratulationStatusLabels, CongratulationStatusColors } from '@shared/constants';

interface CongratulationDetailModalProps {
  visible: boolean;
  congratulationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

/** 审核状态：1=通过 2=未通过（与列表枚举不同，仅本表单内部语义） */
type AuditAction = 1 | 2;

/** 官方随份子默认金额（元，2026-11-15 用户定） */
const DEFAULT_GIFT_YUAN = 520;

const { TextArea } = Input;

/**
 * 报喜详情弹窗：查看报喜照片/结婚证/双方资料；「已提交」状态可执行审核
 * （通过时可一并提交官方随份子标记与金额，提交后不可变更）。
 */
const CongratulationDetailModal: React.FC<CongratulationDetailModalProps> = ({ visible, congratulationId, onClose, onSuccess }) => {
  const { success, error: showError } = useAppNotification();
  const { modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<AdminCongratulationDetail | null>(null);
  const [action, setAction] = useState<AuditAction>(1);
  const [reason, setReason] = useState('');
  const [officialGift, setOfficialGift] = useState(false);
  const [giftYuan, setGiftYuan] = useState<number | null>(DEFAULT_GIFT_YUAN);
  /** 独立设置随份子（仅已通过状态；2026-11-15 用户定） */
  const [newGiftChecked, setNewGiftChecked] = useState(false);
  const [newGiftYuan, setNewGiftYuan] = useState<number | null>(DEFAULT_GIFT_YUAN);
  /** 当前打开中的报喜 ID：异步完成后校验，防止关闭后旧请求的回调误关新弹窗 */
  const activeIdRef = useRef('');
  /** 请求序号：晚到的旧详情响应不得覆盖新记录（跨记录竞态防护） */
  const reqTokenRef = useRef(0);

  const loadDetail = useCallback((id: string) => {
    const token = ++reqTokenRef.current;
    setLoading(true);
    setDetail(null);
    congratulationApi.getDetail(id)
      .then((res: any) => {
        if (token === reqTokenRef.current && activeIdRef.current === id) setDetail(res);
      })
      .catch((err: any) => showError(err?.response?.data?.message || '获取报喜详情失败'))
      .finally(() => {
        if (token === reqTokenRef.current) setLoading(false);
      });
  }, [showError]);

  useEffect(() => {
    if (!visible || !congratulationId) {
      // 关闭即清空详情与活动标记，避免残留旧记录数据
      activeIdRef.current = '';
      setDetail(null);
      setLoading(false);
      return;
    }
    activeIdRef.current = congratulationId;
    setAction(1);
    setReason('');
    setOfficialGift(false);
    setGiftYuan(DEFAULT_GIFT_YUAN);
    setNewGiftChecked(false);
    setNewGiftYuan(DEFAULT_GIFT_YUAN);
    setSubmitting(false);
    loadDetail(congratulationId);
  }, [visible, congratulationId, loadDetail]);

  const handleAudit = async () => {
    if (!detail) return;
    if (action === 2 && !reason.trim()) {
      showError('未通过时必须填写原因');
      return;
    }
    if (action === 1 && officialGift && (giftYuan == null || giftYuan <= 0)) {
      showError('勾选官方随份子时请填写大于 0 的金额');
      return;
    }
    setSubmitting(true);
    try {
      await congratulationApi.audit(detail.id, {
        approved: action === 1,
        reason: action === 2 ? reason.trim() : undefined,
        is_official_gift: action === 1 ? officialGift : undefined,
        gift_amount: action === 1 && officialGift && giftYuan != null ? Math.round(giftYuan * 100) : undefined,
      });
      // 弹窗已关闭/切到其它记录时不触发旧记录的回调
      if (activeIdRef.current !== detail.id) return;
      success(action === 1 ? '已通过' : '已退回');
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err?.response?.data?.message || '审核失败');
    } finally {
      setSubmitting(false);
    }
  };

  /** 仅「已提交」状态可审核；已审核完成（通过/未通过）不可重新提交审核（2026-11-15 用户定） */
  const canAudit = detail != null && detail.status === CongratulationStatus.SUBMITTED;

  /** 独立设置官方随份子（仅已通过状态；不可逆写入先弹确认，与提现审核同先例） */
  const handleSetGift = () => {
    if (!detail) return;
    if (!newGiftChecked) {
      showError('请勾选官方随份子');
      return;
    }
    if (newGiftYuan == null || newGiftYuan <= 0) {
      showError('请填写大于 0 的金额');
      return;
    }
    if (detail.status !== CongratulationStatus.APPROVED || detail.is_official_gift) {
      showError('该报喜当前不可设置官方随份子');
      loadDetail(detail.id);
      return;
    }
    const id = detail.id;
    const yuan = newGiftYuan;
    modal.confirm({
      title: '确认设置官方随份子？',
      content: `设置金额 ￥${yuan.toFixed(2)} 元，提交后不可变更。`,
      okText: '确认设置',
      cancelText: '取消',
      onOk: async () => {
        try {
          await congratulationApi.setGift(id, { is_official_gift: true, gift_amount: Math.round(yuan * 100) });
          if (activeIdRef.current !== id) return;
          success('官方随份子已设置');
          onSuccess();
          onClose();
        } catch (err: any) {
          showError(err?.response?.data?.message || '设置失败');
          loadDetail(id); // 失败后重拉详情，避免本地状态与服务端（如他人已设置）不一致
          throw err; // 保持确认弹窗打开语义由 antd 处理
        }
      },
    });
  };

  return (
    <ScrollableModal
      title="报喜详情"
      open={visible}
      onCancel={onClose}
      width={680}
      destroyOnHidden
      footer={canAudit ? (
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={handleAudit}>提交审核</Button>
        </Space>
      ) : (
        <Button onClick={onClose}>关闭</Button>
      )}
    >
      <Spin spinning={loading}>
        {detail && (
          <div>
            {/* 基础信息 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', marginBottom: 12 }}>
              <span>
                <Tag color={CongratulationStatusColors[detail.status] || 'default'}>
                  {CongratulationStatusLabels[detail.status] ?? detail.status}
                </Tag>
              </span>
              <span style={{ fontSize: 13, color: '#666' }}>提交人：{detail.submitter_nickname || '-'}</span>
              <span style={{ fontSize: 13, color: '#666' }}>提交时间：{detail.created_at ? formatDateTime(detail.created_at) : '-'}</span>
              <span style={{ fontSize: 13, color: '#666' }}>
                官方随份子：{detail.is_official_gift ? `已随￥${formatCents(detail.gift_amount ?? 0)}` : '未设置'}
              </span>
              {detail.audited_at && <span style={{ fontSize: 13, color: '#666' }}>审核时间：{formatDateTime(detail.audited_at)}</span>}
              {detail.audit_reason && <span style={{ fontSize: 13, color: '#666' }}>审核意见：{detail.audit_reason}</span>}
            </div>

            {/* 双方信息 */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              {(['male', 'female'] as const).map((key) => {
                const side = detail[key];
                const nickname = key === 'male' ? detail.male_nickname : detail.female_nickname;
                const avatar = key === 'male' ? detail.male_avatar : detail.female_avatar;
                const mp = side?.match_profile || {};
                const profile = side?.profile || {};
                return (
                  <div key={key} style={{ flex: 1, border: '1px solid #f0f0f0', borderRadius: 8, padding: 12, display: 'flex', gap: 10, alignItems: 'center', background: '#fafafa' }}>
                    <img src={getAvatarUrl(avatar)} alt={nickname} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{key === 'male' ? '♂ ' : '♀ '}{nickname || '-'}</div>
                      <div style={{ color: '#666' }}>姓名：{mp.real_name || '-'}</div>
                      <div style={{ color: '#666' }}>年龄：{profile.age ?? '-'}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 喜讯 */}
            {detail.message && (
              <div style={{ fontSize: 13, marginBottom: 12 }}>
                <span style={{ color: '#666' }}>喜讯：</span>{detail.message}
              </div>
            )}

            {/* 报喜照片 */}
            {!!detail.photos?.length && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>报喜照片</div>
                <Space size={8} wrap>
                  {detail.photos.map((p, i) => (
                    <Image key={i} src={getMediumUrl(p.url)} preview={{ src: p.url }} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6 }} />
                  ))}
                </Space>
              </div>
            )}

            {/* 结婚证（仅管理后台可见） */}
            {!!detail.marriage_certificate?.length && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>结婚证</div>
                <Space size={8} wrap>
                  {detail.marriage_certificate.map((p, i) => (
                    <Image key={i} src={getMediumUrl(p.url)} preview={{ src: p.url }} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6 }} />
                  ))}
                </Space>
              </div>
            )}

            {/* 审核操作（仅「已提交」状态；已审核完成不可重新提交审核） */}
            {canAudit && (
              <div data-testid="audit-section" style={{ borderTop: '1px solid #e8e8e8', paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>审核</div>
                <Radio.Group value={action} onChange={(e) => setAction(e.target.value)} style={{ marginBottom: 12 }}>
                  <Radio value={1}>通过</Radio>
                  <Radio value={2}>未通过</Radio>
                </Radio.Group>
                {action === 2 && (
                  <TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="未通过原因（必填）" maxLength={1000} style={{ marginBottom: 12 }} />
                )}
                {action === 1 && (
                  <div style={{ marginBottom: 12 }}>
                    <Checkbox
                      checked={officialGift || !!detail.is_official_gift}
                      disabled={!!detail.is_official_gift}
                      onChange={(e) => setOfficialGift(e.target.checked)}
                    >
                      官方随份子
                    </Checkbox>
                    {(officialGift || detail.is_official_gift) && (
                      <span style={{ marginLeft: 12 }}>
                        {detail.is_official_gift ? (
                          <span style={{ fontSize: 12, color: '#999' }}>
                            已设置 ￥{formatCents(detail.gift_amount ?? 0)}，一经提交不可变更
                          </span>
                        ) : (
                          <>
                            金额
                            <InputNumber min={0.01} precision={2} value={giftYuan ?? undefined} onChange={(v) => setGiftYuan(v ?? null)}
                              placeholder="元" aria-label="金额（元）" style={{ width: 120, marginLeft: 6 }} />
                            <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>提交后不可变更</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 独立设置官方随份子（仅已通过状态；2026-11-15 用户定：审核后补设置入口） */}
            {detail.status === CongratulationStatus.APPROVED && (
              <div data-testid="gift-setting-section" style={{ borderTop: '1px solid #e8e8e8', paddingTop: 12, marginTop: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>官方随份子</div>
                {detail.is_official_gift ? (
                  <span style={{ fontSize: 13, color: '#666' }}>
                    已设置 ￥{formatCents(detail.gift_amount ?? 0)}，一经提交不可变更
                  </span>
                ) : (
                  <div>
                    <Checkbox
                      checked={newGiftChecked}
                      onChange={(e) => setNewGiftChecked(e.target.checked)}
                    >
                      官方随份子
                    </Checkbox>
                    {newGiftChecked && (
                      <span style={{ marginLeft: 12 }}>
                        金额
                        <InputNumber min={0.01} precision={2} value={newGiftYuan ?? undefined} onChange={(v) => setNewGiftYuan(v ?? null)}
                          placeholder="元" aria-label="金额（元）" style={{ width: 120, marginLeft: 6 }} />
                        <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>提交后不可变更</span>
                      </span>
                    )}
                    <div style={{ marginTop: 12 }}>
                      <Button type="primary" onClick={handleSetGift}>设置随份子</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Spin>
    </ScrollableModal>
  );
};

export default CongratulationDetailModal;
