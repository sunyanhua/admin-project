import { useState, useEffect } from 'react';
import { Upload, Button, Space } from 'antd';
import { UploadOutlined, ScissorOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import ImgCrop from 'antd-img-crop';
import { uploadApi } from '@/api/services/upload';
import { useAppNotification } from '@/hooks/useAppNotification';
import ImagePreviewModal from './ImagePreviewModal';

export interface CropperImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  disabled?: boolean;
  /** 裁切比例，默认 640/480 */
  aspect?: number;
  /** 建议尺寸文案 */
  sizeHint?: string;
}

const CropperImageUpload: React.FC<CropperImageUploadProps> = ({
  value = '',
  onChange,
  disabled = false,
  aspect = 640 / 480,
  sizeHint = '建议尺寸：640 × 480 像素',
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [url, setUrl] = useState<string>(value);
  const { success, error: showError } = useAppNotification();

  // 同步外部 value 变化（表单回填/重置时）
  useEffect(() => {
    setUrl(value || '');
  }, [value]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res: any = await uploadApi.uploadImage(file);
      const uploadedUrl = res?.url || res || '';
      setUrl(uploadedUrl);
      onChange?.(uploadedUrl);
      success('图片上传成功');
    } catch {
      showError('图片上传失败');
    } finally {
      setUploading(false);
    }
    return false; // 阻止默认上传
  };

  const handleDelete = () => {
    setUrl('');
    onChange?.('');
  };

  const uploadButton = (
    <div style={{
      width: 200, height: 150,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      border: '1px dashed #d9d9d9', borderRadius: 4,
      cursor: 'pointer', background: '#fafafa',
    }}>
      <UploadOutlined style={{ fontSize: 32 }} />
      <div style={{ marginTop: 8 }}>点击上传并裁剪</div>
    </div>
  );

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
                <ImgCrop aspect={aspect} quality={0.9} zoomSlider rotationSlider showReset
                  modalTitle="裁剪图片" modalOk="确定" modalCancel="取消">
                  <Upload showUploadList={false} beforeUpload={handleUpload}>
                    <Button size="small" icon={<ScissorOutlined />} loading={uploading}>重新裁剪上传</Button>
                  </Upload>
                </ImgCrop>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={handleDelete}>删除</Button>
              </>
            )}
          </Space>
        </div>
      ) : (
        !disabled && (
          <ImgCrop aspect={aspect} quality={0.9} zoomSlider rotationSlider showReset
            modalTitle="裁剪图片" modalOk="确定" modalCancel="取消">
            <Upload showUploadList={false} beforeUpload={handleUpload}>
              {uploadButton}
            </Upload>
          </ImgCrop>
        )
      )}
      <ImagePreviewModal visible={previewVisible} imageUrl={url} onClose={() => setPreviewVisible(false)} />
    </div>
  );
};

export default CropperImageUpload;
