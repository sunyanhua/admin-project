import { useState, useRef, useEffect } from 'react';
import { Steps, Button, Space, Form, Input, Select, Switch, InputNumber } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { productApi } from '../../api/services/product';
import { useAppNotification } from '@/hooks/useAppNotification';
import CropperImageUpload from '@/components/common/CropperImageUpload';
import MultiImageUpload from '@/components/common/MultiImageUpload';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import SkuConfigWizard, { SkuConfigWizardHandle } from './SkuConfigWizard';

interface CategoryOption { id: number; name: string; }

interface TicketDetailDesc {
  detail?: string; hasagreement?: boolean; agreement?: string;
}

const steps = [
  { title: '门票信息' },
  { title: '项目配置' },
  { title: '上架管理' },
];

export interface TicketWizardModalProps {
  visible: boolean;
  categoryOptions: CategoryOption[];
  onClose: () => void;
  onSuccess?: () => void;
}

const TicketWizardModal: React.FC<TicketWizardModalProps> = ({
  visible, categoryOptions, onClose, onSuccess,
}) => {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState<number>(0);
  const [productTitle, setProductTitle] = useState('');
  const [hasAgreement, setHasAgreement] = useState(false);
  const [form] = Form.useForm();
  const wizardRef = useRef<SkuConfigWizardHandle>(null);
  const { success, error: showError } = useAppNotification();

  useEffect(() => {
    if (visible) {
      setCurrent(0);
      setProductId(0);
      setProductTitle('');
      setHasAgreement(false);
      form.resetFields();
    }
  }, [visible, form]);

  // Step 1: 创建门票
  const handleStep1 = async () => {
    if (productId > 0) { setCurrent(1); return; }
    try {
      const values = await form.validateFields();
      setLoading(true);

      const detailDesc: TicketDetailDesc = {
        detail: values.detail || undefined,
        hasagreement: values.hasagreement || false,
      };
      if (values.hasagreement && values.agreement) {
        detailDesc.agreement = values.agreement;
      }

      const res: any = await productApi.createProduct({
        title: values.title,
        sub_title: values.sub_title || undefined,
        category_id: values.category_id,
        cover_image: values.cover_image || undefined,
        carousel_images: values.carousel_images?.length > 0 ? values.carousel_images : undefined,
        detail_desc: JSON.stringify(detailDesc),
        is_virtual: true,
        is_listed: false,
        is_visible: values.is_visible ?? true,
        sort_order: values.sort_order ?? 0,
      });

      const newId = res?.id || 0;
      if (!newId) {
        showError('门票创建失败：未获取到门票ID');
        return;
      }

      setProductId(newId);
      setProductTitle(values.title || '');
      success('门票信息已保存');
      setCurrent(1);
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || err?.message || '门票创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleWizardNext = () => wizardRef.current?.goNext();
  const handleWizardPrev = () => wizardRef.current?.goPrev();

  const handleWizardFinish = async () => {
    setSaving(true);
    const ok = await wizardRef.current?.finish();
    setSaving(false);
    if (ok) {
      onClose();
      onSuccess?.();
    }
  };

  const handleCancel = () => {
    if (productId > 0) onSuccess?.();
    onClose();
  };

  // ====== Step 1 内容 ======
  const step1Content = (
    <Form form={form} layout="vertical" initialValues={{ is_visible: true, sort_order: 0 }}>
      <Form.Item label="门票名称" name="title"
        rules={[{ required: true, message: '请输入门票名称' }, { max: 128, message: '最多128个字符' }]}>
        <Input placeholder="请输入门票名称" />
      </Form.Item>
      <Form.Item label="门票简介" name="sub_title" rules={[{ max: 256, message: '最多256个字符' }]}>
        <Input placeholder="请输入门票简介（选填）" />
      </Form.Item>
      <Form.Item label="所属分类" name="category_id" rules={[{ required: true, message: '请选择分类' }]}>
        <Select placeholder="请选择分类" options={categoryOptions.map((c) => ({ label: c.name, value: c.id }))} />
      </Form.Item>
      <Form.Item label="门票封面" name="cover_image" rules={[{ required: true, message: '请上传门票封面' }]}>
        <CropperImageUpload aspect={1} sizeHint="建议尺寸：400 × 400 像素" />
      </Form.Item>
      <Form.Item label="门票图片" name="carousel_images">
        <MultiImageUpload cropAspect={800 / 400} cropSizeHint="建议尺寸：800 × 400 像素" />
      </Form.Item>
      <Form.Item label="门票介绍" name="detail" rules={[{ required: true, message: '请输入门票介绍' }]}>
        <RichTextEditor placeholder="请输入门票详细介绍" />
      </Form.Item>
      <Form.Item label="是否有购买协议" name="hasagreement" valuePropName="checked">
        <Switch checkedChildren="是" unCheckedChildren="否" onChange={(c) => setHasAgreement(c)} />
      </Form.Item>
      {hasAgreement && (
        <Form.Item label="购买协议内容" name="agreement">
          <RichTextEditor placeholder="请输入购买协议内容" />
        </Form.Item>
      )}
      <Form.Item label="显示/隐藏" name="is_visible" valuePropName="checked">
        <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
      </Form.Item>
      <Form.Item label="权重" name="sort_order" rules={[{ required: true, message: '请输入权重' }, { type: 'integer', message: '请输入整数' }]} extra="权重越大排序越靠前，默认为0">
        <InputNumber min={0} precision={0} style={{ width: '100%' }} />
      </Form.Item>
    </Form>
  );

  return (
    <ScrollableModal
      title="添加门票"
      open={visible}
      onCancel={handleCancel}
      width={960}
      destroyOnHidden
      header={<Steps current={current} items={steps} />}
      footer={
        <Space>
          <Button onClick={handleCancel}>{current === 2 ? '关闭' : '取消'}</Button>
          {current === 0 && <Button type="primary" loading={loading} onClick={handleStep1}>下一步</Button>}
          {current === 1 && <Button onClick={() => setCurrent(0)}>上一步</Button>}
          {current === 1 && <Button type="primary" onClick={handleWizardNext}>下一步</Button>}
          {current === 2 && <Button onClick={handleWizardPrev}>上一步</Button>}
          {current === 2 && <Button type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={handleWizardFinish}>完成</Button>}
        </Space>
      }
    >
      {current === 0 && step1Content}
      {(current === 1 || current === 2) && (
        <SkuConfigWizard
          ref={wizardRef}
          productId={productId}
          stepLabels={['项目配置', '上架管理']}
          onStepChange={(s) => setCurrent(s + 1)}
          ticketMode
        />
      )}
    </ScrollableModal>
  );
};

export default TicketWizardModal;
