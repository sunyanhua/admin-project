import { useState, useEffect } from 'react';
import { Upload, Button, Image } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { uploadApi } from '@/api/services/upload';
import { useAppNotification } from '@/hooks/useAppNotification';
import ImagePreviewModal from './ImagePreviewModal';
import ImageEditModal from './ImageEditModal';

export interface MultiImageUploadProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  disabled?: boolean;
  /** 最大图片张数，默认 9 */
  maxCount?: number;
  /** 最大文件大小(MB)，默认 5 */
  maxSize?: number;
  /** 裁切比例（宽/高），不传则不限比例 */
  cropAspect?: number;
  /** 裁切尺寸提示 */
  cropSizeHint?: string;
  /** AI 调整的目标尺寸（像素），不传则按 cropAspect 折算（宽 1024 基准） */
  aiTargetSize?: { width: number; height: number };
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  value = [],
  onChange,
  disabled = false,
  maxCount = 9,
  maxSize = 5,
  cropAspect,
  cropSizeHint,
  aiTargetSize,
}) => {
  const [urls, setUrls] = useState<string[]>(value);
  const [uploading, setUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { error: showError } = useAppNotification();

  // AI 目标尺寸：优先用传入值，否则按裁切比例折算（宽 1024 基准，限 64-10000）
  const aiSize = aiTargetSize ?? (cropAspect ? {
    width: 1024,
    height: Math.min(10000, Math.max(64, Math.round(1024 / cropAspect))),
  } : { width: 1024, height: 1024 });

  // 同步外部 value 变化（表单回填/重置时）
  // 用 JSON.stringify 比较避免 Form 每次渲染传新引用导致的死循环
  const valueKey = JSON.stringify(value);
  useEffect(() => {
    setUrls(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res: any = await uploadApi.uploadImage(file);
      const uploadedUrl = res?.file_url || res?.url || res || '';
      setUrls((prev) => {
        if (prev.length >= maxCount) return prev;
        const next = [...prev, uploadedUrl];
        onChange?.(next);
        return next;
      });
    } catch {
      showError('图片上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const handleRemove = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    setUrls(next);
    onChange?.(next);
  };

  const canUpload = !disabled && urls.length < maxCount;

  // 点上传 → 直接调起文件选择 → 选完打开处理弹窗（裁切 / AI 二选一）
  const handlePickFile = (file: File) => {
    setPendingFile(file);
    setEditModalOpen(true);
    return false; // 阻止默认上传
  };

  const uploadButton = (
    <div style={{
      width: 100, height: 100,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      border: '1px dashed #d9d9d9', borderRadius: 4,
      cursor: 'pointer', background: '#fafafa',
    }}>
      <PlusOutlined style={{ fontSize: 24 }} />
      <div style={{ marginTop: 4, fontSize: 12 }}>上传</div>
    </div>
  );

  const uploadArea = (
    <Upload showUploadList={false} beforeUpload={handleUpload} accept=".jpg,.jpeg,.png,.gif,.webp,.bmp" multiple={!cropAspect}>
      {uploadButton}
    </Upload>
  );

  return (
    <div>
      {cropSizeHint && <div style={{ color: '#999', marginBottom: 8, fontSize: 12 }}>{cropSizeHint}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {urls.map((url, idx) => (
          <div key={idx} style={{
            width: 100, height: 100, position: 'relative',
            borderRadius: 4, overflow: 'hidden', border: '1px solid #d9d9d9',
          }}>
            <Image src={url} width={100} height={100} style={{ objectFit: 'cover' }}
              preview={{ visible: false }}
              onClick={() => { setPreviewUrl(url); setPreviewVisible(true); }} />
            {!disabled && (
              <div style={{
                position: 'absolute', top: 0, right: 0,
                background: 'rgba(0,0,0,0.5)', borderRadius: '0 4px 0 4px',
              }}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />}
                  onClick={() => handleRemove(idx)} style={{ color: '#fff' }} />
              </div>
            )}
          </div>
        ))}
        {canUpload && cropAspect ? (
          <Upload showUploadList={false} beforeUpload={handlePickFile} accept=".jpg,.jpeg,.png,.gif,.webp,.bmp" multiple={false}>
            {uploadButton}
          </Upload>
        ) : (canUpload && uploadArea)}
      </div>
      <ImagePreviewModal visible={previewVisible} imageUrl={previewUrl} onClose={() => setPreviewVisible(false)} />
      <ImageEditModal
        open={editModalOpen}
        file={pendingFile}
        aspect={cropAspect}
        targetWidth={aiSize.width}
        targetHeight={aiSize.height}
        onClose={() => setEditModalOpen(false)}
        onDone={(newUrl) => {
          setUrls((prev) => {
            if (prev.length >= maxCount) return prev;
            const next = [...prev, newUrl];
            onChange?.(next);
            return next;
          });
        }}
      />
    </div>
  );
};

export default MultiImageUpload;
