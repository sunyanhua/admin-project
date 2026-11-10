import { useState } from 'react';
import dayjs from 'dayjs';
import { Button, Form, InputNumber, Alert } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import { userApi } from '@/api/services/user';
import { RegisterAuditStatus } from '@shared/constants';
import { dayjsToApi } from '@/utils/format';

/** 扣分完成标记键（写入 onsite_config，服务端透明存储——与 groups/routine 同模式） */
export const DEDUCT_DONE_KEY = 'deduct_done_at';

export interface OnsiteDeductScoreModalProps {
  open: boolean;
  activityId: string;
  activityTitle: string;
  onClose: () => void;
}

/** 扣分默认值 */
const DEFAULT_DEDUCT = 10;

/**
 * 未签到用户批量扣靠谱值弹窗：
 * 输入扣分分数（默认 10）→ 确认后拉取本场全部未签到用户，逐条 PATCH 靠谱值（delta 取负）；
 * 展示值下一次周算后生效（后端语义）。
 */
const OnsiteDeductScoreModal: React.FC<OnsiteDeductScoreModalProps> = ({ open, activityId, activityTitle, onClose }) => {
  const { success, error: showError } = useAppNotification();
  const [form] = Form.useForm<{ score: number }>();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');

  /** 拉取本场全部未签到用户（audit 通过 + checked_in=false） */
  const fetchUnchecked = async (): Promise<RegisterRecord[]> => {
    const all: RegisterRecord[] = [];
    let page = 1;
    while (true) {
      const res: any = await activityApi.getRegisters(activityId, {
        page, size: 100,
        audit_status: RegisterAuditStatus.APPROVED,
        checked_in: false,
      });
      const list: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
      if (!list.length) break;
      all.push(...list);
      if (list.length < 100) break;
      page++;
    }
    return all;
  };

  /** 标记活动已完成扣分：重新拉取详情后原对象透传写入 onsite_config.deduct_done_at（避免覆盖并行修改） */
  const markDeductDone = async () => {
    try {
      const res: any = await activityApi.getDetail(activityId);
      let obj: Record<string, any> = {};
      try {
        const parsed = JSON.parse(res?.onsite_config || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = parsed;
      } catch { /* 原值非法则从空对象开始 */ }
      obj[DEDUCT_DONE_KEY] = dayjsToApi(dayjs());
      await activityApi.update(activityId, { onsite_config: JSON.stringify(obj) });
    } catch { /* 标记失败静默——不阻断扣分结果反馈 */ }
  };

  const handleSubmit = async (values: { score: number }) => {
    const score = values.score ?? DEFAULT_DEDUCT;
    if (!(score >= 1)) {
      showError('请输入不小于 1 的扣分值');
      return;
    }
    setSubmitting(true);
    setProgress('');
    try {
      const unchecked = await fetchUnchecked();
      const targets = unchecked.filter((r) => !!r.user_id);
      if (!targets.length) {
        showError('本场暂无未签到用户，无需扣分');
        return;
      }
      const reason = `现场活动「${activityTitle || ''}」未签到扣分`;
      let ok = 0;
      let fail = 0;
      for (let i = 0; i < targets.length; i++) {
        const r = targets[i];
        setProgress(`正在处理 ${i + 1}/${targets.length}`);
        try {
          await userApi.adjustReliabilityScore(r.user_id, -score, reason);
          ok++;
        } catch {
          fail++;
        }
      }
      setProgress('');
      // 扣分执行完成后将活动标记为「已完成扣分」（防止重复扣分）
      await markDeductDone();
      success(`扣分完成：成功 ${ok} 人，失败 ${fail} 人（展示值下次周算后生效）`);
      onClose();
    } catch (err: any) {
      showError(err?.response?.data?.message || '扣分执行失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollableModal
      title="扣除未签到用户靠谱值"
      open={open}
      onCancel={onClose}
      width={480}
      destroyOnHidden
      footer={
        <Button type="primary" danger loading={submitting} onClick={() => form.submit()}>
          确认扣分
        </Button>
      }
    >
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="将扣除本场所有未签到用户的靠谱值，请确认后执行。"
      />
      <Form
        form={form}
        layout="vertical"
        initialValues={{ score: DEFAULT_DEDUCT }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="扣除分数"
          name="score"
          rules={[{ required: true, message: '请输入扣除分数' }]}
          extra="按用户逐条执行；展示值下一次周算后生效"
        >
          <InputNumber min={1} max={10000} precision={0} style={{ width: 200 }} />
        </Form.Item>
      </Form>
      {progress && <div style={{ color: '#1677ff', fontSize: 13 }}>{progress}</div>}
    </ScrollableModal>
  );
};

export default OnsiteDeductScoreModal;
