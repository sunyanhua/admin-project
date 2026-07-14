import { useState, useRef, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Upload, Button, Progress, Space, Tooltip } from 'antd';
import { UploadOutlined, EyeOutlined, ReloadOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons';
import { uploadApi } from '@/api/services/upload';
import ImagePreviewModal from './ImagePreviewModal';
import './ImageUpload.css';

export interface ImageUploadProps {
  /** 当前图片URL（用于编辑时预览） */
  value?: string;
  /** 上传成功回调，返回图片URL */
  onChange?: (url: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 允许上传的文件类型，默认 image/* */
  accept?: string;
  /** 最大文件大小(MB)，默认 5 */
  maxSize?: number;
  /** 自定义上传提示文本 */
  uploadText?: string;
  /** 重新上传提示文本 */
  reuploadText?: string;
  /** 占位提示 */
  placeholder?: string;
}

/**
 * 统一图片上传组件
 * 功能：
 * 1. 上传过程显示进度条
 * 2. 上传完成后可预览图片
 * 3. 支持重新上传
 * 4. 编辑时可预览现有图片
 */
const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  disabled = false,
  accept = 'image/*',
  maxSize = 5,
  uploadText = '上传图片',
  reuploadText = '重新上传',
  placeholder = '暂无图片',
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const uploadRef = useRef<any>(null);
  const { success, error } = useAppNotification();

  /**
   * 验证文件
   */
  const validateFile = useCallback((file: File): boolean => {
    // 检查文件类型
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      error('只能上传图片文件');
      return false;
    }

    // 检查文件大小
    const isLtMax = file.size / 1024 / 1024 < maxSize;
    if (!isLtMax) {
      error(`图片大小不能超过${maxSize}MB`);
      return false;
    }

    return true;
  }, [maxSize]);

  /**
   * 执行上传
   */
  const handleUpload = useCallback(async (file: File) => {
    if (!validateFile(file)) {
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      const response = await uploadApi.uploadImage(file, (percent) => {
        setProgress(percent);
      });

      // 处理响应 - AdminUpload 对象包含 url 字段
      // 可能的返回结构: { url: string } 或 { data: { url: string } } 或直接返回 url 字符串
      let url: string | null = null;
      const res = response as any;

      if (res) {
        if (typeof res === 'string') {
          // 直接返回 URL 字符串
          url = res;
        } else if (res.url && typeof res.url === 'string') {
          // 返回 AdminUpload 对象: { url, id, size, submit }
          url = res.url;
        } else if (res.data?.url && typeof res.data.url === 'string') {
          // 嵌套结构
          url = res.data.url;
        }
      }

      if (url) {
        onChange?.(url);
        success('图片上传成功');
      } else {
        console.error('[ImageUpload] 响应格式不正确:', response);
        error('上传成功但未返回图片URL');
      }
    } catch (error: any) {
      error(`上传失败: ${error.message || '未知错误'}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [validateFile, onChange]);

  /**
   * 删除图片
   */
  const handleDelete = useCallback(() => {
    onChange?.('');
  }, [onChange]);

  /**
   * 预览图片
   */
  const handlePreview = useCallback(() => {
    if (value) {
      setPreviewVisible(true);
    }
  }, [value]);

  /**
   * 触发上传点击
   */
  const triggerUpload = useCallback(() => {
    uploadRef.current?.querySelector('input')?.click();
  }, []);

  // 上传配置
  const uploadProps = {
    accept,
    showUploadList: false,
    disabled: uploading || disabled,
    beforeUpload: (file: File) => {
      handleUpload(file);
      return false; // 阻止自动上传
    },
  };

  return (
    <div className="image-upload-wrapper">
      {/* 有图片时显示预览和重传 */}
      {value ? (
        <div className="image-upload-preview-container">
          {/* 图片预览区域 */}
          <div className="image-upload-preview" onClick={handlePreview}>
            <img src={value} alt="预览" className="image-upload-preview-img" />
            {/* 悬停遮罩 */}
            <div className="image-upload-preview-overlay">
              <EyeOutlined className="preview-icon" />
              <span className="preview-text">点击预览</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="image-upload-actions">
            <Space size="small" wrap>
              <div ref={uploadRef}>
                <Upload {...uploadProps}>
                  <Button
                    type="default"
                    size="small"
                    icon={uploading ? <LoadingOutlined /> : <ReloadOutlined />}
                    disabled={uploading || disabled}
                  >
                    {uploading ? `上传中 ${progress}%` : reuploadText}
                  </Button>
                </Upload>
              </div>
              <Tooltip title="删除图片">
                <Button
                  type="default"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                  disabled={disabled}
                >
                  删除
                </Button>
              </Tooltip>
            </Space>
          </div>
        </div>
      ) : (
        /* 无图片时显示上传区域 */
        <div ref={uploadRef}>
          <Upload.Dragger
            {...uploadProps}
            className="image-upload-dragger"
          >
            {uploading ? (
              <div className="image-upload-progress">
                <LoadingOutlined style={{ fontSize: 24, marginBottom: 8 }} />
                <Progress percent={progress} size="small" style={{ width: '80%' }} />
                <p className="upload-hint">正在上传...{progress}%</p>
              </div>
            ) : (
              <div className="image-upload-placeholder">
                <UploadOutlined style={{ fontSize: 32, color: '#999', marginBottom: 8 }} />
                <p className="upload-text">{uploadText}</p>
                <p className="upload-hint">
                  点击或拖拽图片到此处上传
                  <br />
                  支持 {accept.replace('image/', '').replace('*', '所有图片')} 格式，最大 {maxSize}MB
                </p>
              </div>
            )}
          </Upload.Dragger>
        </div>
      )}

      {/* 图片预览弹窗 */}
      <ImagePreviewModal
        visible={previewVisible}
        imageUrl={value || ''}
        onClose={() => setPreviewVisible(false)}
      />
    </div>
  );
};

export default ImageUpload;
