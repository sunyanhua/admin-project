import { useRef } from 'react';
import { Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import SkuConfigPanel, { SkuConfigPanelHandle } from './SkuConfigPanel';

export interface SkuConfigModalProps {
  visible: boolean;
  productId: number;
  productTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const SkuConfigModal: React.FC<SkuConfigModalProps> = ({
  visible, productId, productTitle, onClose, onSuccess,
}) => {
  const panelRef = useRef<SkuConfigPanelHandle>(null);

  return (
    <ScrollableModal
      title={`活动配置 — ${productTitle}`}
      open={visible}
      onCancel={onClose}
      width={900}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={false} onClick={() => panelRef.current?.save()}>
            保存配置
          </Button>
        </Space>
      }
    >
      {visible && (
        <SkuConfigPanel
          ref={panelRef}
          productId={productId}
          onSaved={() => { onClose(); onSuccess?.(); }}
        />
      )}
    </ScrollableModal>
  );
};

export default SkuConfigModal;
