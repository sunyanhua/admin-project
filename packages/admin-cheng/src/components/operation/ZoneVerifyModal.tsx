import ScrollableModal from '@/components/templates/ScrollableModal';
import ZoneVerifyList from '@/components/operation/ZoneVerifyList';

interface ZoneVerifyModalProps {
  visible: boolean;
  zoneId: string;
  zoneName: string;
  onClose: () => void;
}

/** 专区申请审核弹窗（列表内容在 ZoneVerifyList，专区管理后台页面直接内嵌同一组件） */
const ZoneVerifyModal: React.FC<ZoneVerifyModalProps> = ({ visible, zoneId, zoneName, onClose }) => {
  return (
    <ScrollableModal
      title={`用户认证 - ${zoneName}`}
      open={visible}
      onCancel={onClose}
      width={1100}
      footer={false}
    >
      <ZoneVerifyList zoneId={zoneId} zoneName={zoneName} active={visible} />
    </ScrollableModal>
  );
};

export default ZoneVerifyModal;
