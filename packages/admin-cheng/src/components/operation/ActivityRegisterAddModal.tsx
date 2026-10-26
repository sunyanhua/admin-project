import { useState } from 'react';
import { Button, Form, Input, Radio, Space, Switch } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { activityApi, RegisterRecord } from '@/api/services/activity-v1';
import { RegisterAuditStatus, RegisterGender } from '@shared/constants';
import { PresignStatus } from '@/api/types/status';

interface ActivityRegisterAddModalProps {
  open: boolean;
  activityId: string;
  onClose: () => void;
  onSuccess: () => void;
}

/** 添加报名表单值 */
interface AddFormValues {
  real_name: string;
  gender: 1 | 2;
  phone: string;
  unit?: string;
  auto_register: boolean;
}

/**
 * 添加报名弹窗：填写姓名/性别/手机号/单位后，先加入导入报名名单；
 * 勾选「直接入选并分配编号」时继续执行免报名入选，并按该性别最大序号 +1 自动分配现场编号。
 */
const ActivityRegisterAddModal: React.FC<ActivityRegisterAddModalProps> = ({ open, activityId, onClose, onSuccess }) => {
  const [form] = Form.useForm<AddFormValues>();
  const { success, error: showError } = useAppNotification();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: AddFormValues) => {
    if (!activityId) return;
    setSubmitting(true);
    try {
      const unit = values.unit?.trim();
      // ① 加入导入报名名单（同活动同手机号重复导入由后端静默跳过）
      await activityApi.importPresigns(activityId, [{
        phone: values.phone,
        real_name: values.real_name.trim(),
        gender: values.gender,
        presign_data: unit ? JSON.stringify({ 工作单位: unit }) : undefined,
      }]);
      // ② 反查该手机号的预报名行（重复添加时复用已有未报名行）
      const listRes: any = await activityApi.getPresigns(activityId, { keyword: values.phone, size: 20 });
      const list: any[] = Array.isArray(listRes) ? listRes : (listRes?.list || []);
      const row = list.find((p) => p.phone === values.phone && (p.status ?? PresignStatus.NOT_REGISTERED) === PresignStatus.NOT_REGISTERED);

      if (values.auto_register) {
        if (!row?.id) {
          showError('未找到该手机号可入选的预报名记录（可能已报名），请到导入报名列表查看');
          return;
        }
        // ③ 免报名入选（生成报名记录并直接审核通过）
        const regRes: any = await activityApi.registerPresign(activityId, row.id);
        const registerId = regRes?.id;
        // ④ 自动排序：按该性别当前最大序号 +1 分配现场编号
        let num = 0;
        if (registerId) {
          const regs: RegisterRecord[] = [];
          let page = 1;
          while (true) {
            const res: any = await activityApi.getRegisters(activityId, { page, size: 100, audit_status: RegisterAuditStatus.APPROVED });
            const l: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
            if (!l.length) break;
            regs.push(...l);
            if (l.length < 100) break;
            page++;
          }
          const genderOf = (r: RegisterRecord) => r.user_profile?.gender ?? r.gender;
          const maxG = Math.max(0, ...regs.filter((r) => genderOf(r) === values.gender).map((r) => r.onsite_number ?? 0));
          num = maxG + 1;
          await activityApi.updateOnsiteNumber(activityId, registerId, num);
        }
        success(num ? `已添加并入选，现场编号 ${num}` : '已添加并入选');
      } else {
        success('已添加到导入报名名单');
      }
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err?.response?.data?.message || '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollableModal
      title="添加报名"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      width={480}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={() => { form.resetFields(); onClose(); }}>取消</Button>
          <Button type="primary" htmlType="submit" form="register-add-form" loading={submitting}>确定</Button>
        </Space>
      }
    >
      <Form
        id="register-add-form"
        form={form}
        layout="vertical"
        initialValues={{ auto_register: true }}
        onFinish={handleSubmit}
      >
        <Form.Item name="real_name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="请输入姓名" maxLength={64} />
        </Form.Item>
        <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
          <Radio.Group>
            <Radio value={RegisterGender.MALE}>男</Radio>
            <Radio value={RegisterGender.FEMALE}>女</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          name="phone"
          label="手机号"
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1\d{10}$/, message: '请输入正确的 11 位手机号' },
          ]}
        >
          <Input placeholder="请输入手机号" maxLength={11} />
        </Form.Item>
        <Form.Item name="unit" label="单位（非必填）">
          <Input placeholder="请输入单位名称" maxLength={64} />
        </Form.Item>
        <Form.Item name="auto_register" label="是否直接入选并分配编号" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default ActivityRegisterAddModal;
