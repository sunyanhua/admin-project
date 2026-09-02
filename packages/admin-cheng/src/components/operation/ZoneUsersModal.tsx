import ScrollableModal from '@/components/templates/ScrollableModal';
import ZoneUsersList from '@/components/operation/ZoneUsersList';

interface ZoneUsersModalProps {
  visible: boolean;
  zoneId: string;
  zoneName: string;
  onClose: () => void;
}

/** 专区用户弹窗（列表内容在 ZoneUsersList，专区管理后台页面直接内嵌同一组件） */
const ZoneUsersModal: React.FC<ZoneUsersModalProps> = ({ visible, zoneId, zoneName, onClose }) => {
  return (
    <ScrollableModal
      title={`专区用户 - ${zoneName}`}
      open={visible}
      onCancel={onClose}
      width={1050}
      footer={false}
    >
      <ZoneUsersList zoneId={zoneId} zoneName={zoneName} active={visible} />
    </ScrollableModal>
  );
};

export default ZoneUsersModal;
