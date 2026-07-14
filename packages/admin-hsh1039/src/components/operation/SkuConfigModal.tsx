import { useState, useRef, useEffect } from 'react';
import { Steps, Button, Space } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import SkuConfigPanel, { SkuConfigPanelHandle } from './SkuConfigPanel';
import { productApi } from '../../api/services/product';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Switch } from 'antd';

export interface SkuConfigModalProps {
  visible: boolean;
  productId: number;
  productTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const steps = [
  { title: '项目配置' },
  { title: '上架管理' },
];

const SkuConfigModal: React.FC<SkuConfigModalProps> = ({
  visible, productId, productTitle, onClose, onSuccess,
}) => {
  const [current, setCurrent] = useState(0);
  const panelRef = useRef<SkuConfigPanelHandle>(null);
  const [isListed, setIsListed] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useAppNotification();

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setCurrent(0);
      setIsListed(false);
      productApi.getProductDetail(productId).then((detail: any) => {
        if (detail?.is_listed !== undefined) {
          setIsListed(detail.is_listed);
        }
      }).catch(() => {});
    }
  }, [visible, productId]);

  // Step 1 → Step 2: save specs + SKUs
  const handleNext = async () => {
    const ok = await panelRef.current?.save();
    if (ok) setCurrent(1);
  };

  // Step 2 → finish: save listing status
  const handleFinish = async () => {
    try {
      setSaving(true);
      await productApi.updateListStatus(productId, isListed);
      success('上架状态已保存');
      onClose();
      onSuccess?.();
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存上架状态失败');
    } finally {
      setSaving(false);
    }
  };

  const footerContent = current === 0 ? (
    <Space>
      <Button onClick={onClose}>取消</Button>
      <Button type="primary" onClick={handleNext}>保存配置并下一步</Button>
    </Space>
  ) : (
    <Space>
      <Button onClick={onClose}>取消</Button>
      <Button type="primary" loading={saving} onClick={handleFinish}>完成</Button>
    </Space>
  );

  return (
    <ScrollableModal
      title={`活动配置 — ${productTitle}`}
      open={visible}
      onCancel={onClose}
      width={900}
      destroyOnHidden
      header={<Steps current={current} items={steps} />}
      footer={footerContent}
    >
      {current === 0 && visible && (
        <SkuConfigPanel
          ref={panelRef}
          productId={productId}
          onSaved={() => {}}
        />
      )}

      {current === 1 && (
        <div style={{ padding: '0 8px' }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>是否上架</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Switch
              checked={isListed}
              checkedChildren="上架"
              unCheckedChildren="下架"
              onChange={(checked) => setIsListed(checked)}
            />
            <span style={{ color: '#666', fontSize: 13 }}>
              {isListed ? '活动已上架，用户可看到并购买' : '活动已下架，用户无法看到'}
            </span>
          </div>
          <div style={{ color: '#999', fontSize: 12, marginTop: 16 }}>
            提示：上架后，已配置的 SKU 项目将对用户可见。如需修改 SKU 配置，请先下架。
          </div>
        </div>
      )}
    </ScrollableModal>
  );
};

export default SkuConfigModal;
