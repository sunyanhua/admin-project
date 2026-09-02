import { useState, useEffect } from 'react';
import { Button, Space, Upload } from 'antd';
import { UploadOutlined, DeleteOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import ImagePreviewModal from './ImagePreviewModal';
import ImageEditModal from './ImageEditModal';

export interface CropperImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  disabled?: boolean;
  /** 裁切比例，默认 640/480 */
  aspect?: number;
  /** 建议尺寸文案 */
  sizeHint?: string;
  /** AI 调整的目标尺寸（像素），不传则按 aspect 折算（宽 1024 基准） */
  aiTargetSize?: { width: number; height: number };
}

const ACCEPT = '.jpg,.jpeg,.png,.gif,.webp,.bmp';

const CropperImageUpload: React.FC<CropperImageUploadProps> = ({
  value = '',
  onChange,
  disabled = false,
  aspect = 640 / 480,
  sizeHint = '建议尺寸：640 × 480 像素',
  aiTargetSize,
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string>(value);

  // 同步外部 value 变化（表单回填/重置时）
  useEffect(() => {
    setUrl(value || '');
  }, [value]);

  // AI 目标尺寸：优先用传入值，否则按裁切比例折算（宽 1024 基准，限 64-10000）
  const aiSize = aiTargetSize ?? {
    width: 1024,
    height: Math.min(10000, Math.max(64, Math.round(1024 / aspect))),
  };

  // 点上传 → 直接调起文件选择 → 选完打开处理弹窗（裁切 / AI 二选一）
  const handlePickFile = (file: File) => {
    setPendingFile(file);
    setEditModalOpen(true);
    return false; // 阻止默认上传
  };

  const handleDelete = () => {
    setUrl('');
    onChange?.('');
  };

  const handleDone = (newUrl: string) => {
    setUrl(newUrl);
    onChange?.(newUrl);
  };

  return (
    <div>
      <div style={{ color: '#999', marginBottom: 8, fontSize: 12 }}>{sizeHint}</div>
      {url ? (
        <div>
          <div style={{
            width: 200, height: 150,
            borderRadius: 4, overflow: 'hidden',
            border: '1px solid #d9d9d9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#f0f0f0',
          }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <Space style={{ marginTop: 8 }}>
            <Button size="small" icon={<EyeOutlined />} onClick={() => setPreviewVisible(true)}>预览</Button>
            {!disabled && (
              <>
                <Upload showUploadList={false} beforeUpload={handlePickFile} accept={ACCEPT}>
                  <Button size="small" icon={<EditOutlined />}>重新上传</Button>
                </Upload>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={handleDelete}>删除</Button>
              </>
            )}
          </Space>
        </div>
      ) : (
        !disabled && (
          <Upload showUploadList={false} beforeUpload={handlePickFile} accept={ACCEPT}>
            <div style={{
              width: 200, height: 150,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '1px dashed #d9d9d9', borderRadius: 4,
              cursor: 'pointer', background: '#fafafa',
            }}>
              <UploadOutlined style={{ fontSize: 32 }} />
              <div style={{ marginTop: 8 }}>点击上传图片</div>
            </div>
          </Upload>
        )
      )}
      <ImagePreviewModal visible={previewVisible} imageUrl={url} onClose={() => setPreviewVisible(false)} />
      <ImageEditModal
        open={editModalOpen}
        file={pendingFile}
        aspect={aspect}
        targetWidth={aiSize.width}
        targetHeight={aiSize.height}
        onClose={() => setEditModalOpen(false)}
        onDone={handleDone}
      />
    </div>
  );
};

export default CropperImageUpload;
