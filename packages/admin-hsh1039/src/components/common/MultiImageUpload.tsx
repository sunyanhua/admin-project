import { useState, useEffect } from 'react';
import { Upload, Button, Image } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { uploadApi } from '@/api/services/upload';
import { useAppNotification } from '@/hooks/useAppNotification';
import ImagePreviewModal from './ImagePreviewModal';

export interface MultiImageUploadProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  disabled?: boolean;
  /** 最大图片张数，默认 9 */
  maxCount?: number;
  /** 最大文件大小(MB)，默认 5 */
  maxSize?: number;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({
  value = [],
  onChange,
  disabled = false,
  maxCount = 9,
  maxSize = 5,
}) => {
  const [urls, setUrls] = useState<string[]>(value);
  const [uploading, setUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const { error: showError } = useAppNotification();

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
      const uploadedUrl = res?.url || res || '';
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

  return (
    <div>
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
        {canUpload && (
          <Upload showUploadList={false} beforeUpload={handleUpload} accept="image/*" multiple>
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
          </Upload>
        )}
      </div>
      <ImagePreviewModal visible={previewVisible} imageUrl={previewUrl} onClose={() => setPreviewVisible(false)} />
    </div>
  );
};

export default MultiImageUpload;
