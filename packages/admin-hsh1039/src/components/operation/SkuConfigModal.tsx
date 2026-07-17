import { useState, useRef, useEffect } from 'react';
import { Steps, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import SkuConfigWizard, { SkuConfigWizardHandle } from './SkuConfigWizard';

export interface SkuConfigModalProps {
  visible: boolean;
  productId: number;
  productTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
  ticketMode?: boolean;
  productMode?: boolean;
}

const SkuConfigModal: React.FC<SkuConfigModalProps> = ({
  visible, productId, productTitle, onClose, onSuccess, ticketMode, productMode,
}) => {
  const wizardRef = useRef<SkuConfigWizardHandle>(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // 弹窗打开时重置步数
  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  const handleNext = () => wizardRef.current?.goNext();
  const handlePrev = () => wizardRef.current?.goPrev();

  const handleFinish = async () => {
    setSaving(true);
    const ok = await wizardRef.current?.finish();
    setSaving(false);
    if (ok) {
      onClose();
      onSuccess?.();
    }
  };

  const steps = [{ title: '项目配置' }, { title: '上架管理' }];

  return (
    <ScrollableModal
      title={`活动配置 — ${productTitle}`}
      open={visible}
      onCancel={onClose}
      width={960}
      destroyOnHidden
      header={<Steps current={step} items={steps} />}
      footer={
        step === 0 ? (
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={handleNext}>下一步</Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button onClick={handlePrev}>上一步</Button>
            <Button type="primary" loading={saving} onClick={handleFinish}>完成</Button>
          </Space>
        )
      }
    >
      <SkuConfigWizard
        ref={wizardRef}
        productId={productId}
        onSaved={onSuccess}
        onStepChange={setStep}
        ticketMode={ticketMode}
        productMode={productMode}
      />
    </ScrollableModal>
  );
};

export default SkuConfigModal;
