import { Modal } from 'antd';
import './ImageUpload.css';

export interface ImagePreviewModalProps {
  /** 是否可见 */
  visible: boolean;
  /** 图片URL */
  imageUrl: string;
  /** 关闭回调 */
  onClose: () => void;
  /** 弹窗标题 */
  title?: string;
}

/**
 * 图片预览弹窗组件
 */
const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  imageUrl,
  onClose,
  title = '图片预览',
}) => {
  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      className="image-preview-modal"
    >
      <div className="image-preview-container">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="预览"
            className="image-preview-img"
            onClick={(e) => {
              // 点击图片本身不关闭弹窗
              e.stopPropagation();
            }}
          />
        ) : (
          <div className="image-preview-empty">
            <p>暂无图片</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImagePreviewModal;
