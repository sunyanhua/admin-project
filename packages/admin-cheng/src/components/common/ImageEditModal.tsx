import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Space, Spin, Alert, Slider } from 'antd';
import { RobotOutlined, ScissorOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { linksyResizeImage } from '@/api/services/linksy';
import { uploadApi } from '@/api/services/upload';
import { useAppNotification } from '@/hooks/useAppNotification';
import { getCroppedImg } from '@/utils/cropImage';

export interface ImageEditModalProps {
  open: boolean;
  /** 源图片文件（由表单处的上传触发，文件选择完成后传入） */
  file: File | null;
  /** 裁切比例（宽/高），如 600/300 */
  aspect?: number;
  /** AI 调整目标宽度（像素，64-10000） */
  targetWidth: number;
  /** AI 调整目标高度（像素，64-10000） */
  targetHeight: number;
  onClose: () => void;
  /** 处理完成并保存成功后回调，返回本项目存储的新图片 URL */
  onDone: (url: string) => void;
}

type Stage = 'source' | 'crop' | 'ai';

const STATUS_TEXT: Record<string, string> = {
  received: '排队中',
  drawing: 'AI 绘制中',
};

/**
 * 图片编辑弹窗：文件已在上传入口选好，此处直接展示源图并提供
 * 「手动裁切」/「AI 调整尺寸」两种处理方式，完成后自动上传到本项目存储并回调 onDone。
 */
const ImageEditModal: React.FC<ImageEditModalProps> = ({
  open,
  file,
  aspect = 640 / 480,
  targetWidth,
  targetHeight,
  onClose,
  onDone,
}) => {
  const { success, error: showError } = useAppNotification();
  const [stage, setStage] = useState<Stage>('source');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);

  // ---- 裁切状态 ----
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedAreaRef = useRef<Area | null>(null);
  const [cropping, setCropping] = useState(false);

  // ---- AI 状态 ----
  const [generating, setGenerating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [polledCount, setPolledCount] = useState(0);

  const aliveRef = useRef(true);

  // 打开时以传入的文件为源图（本地 objectURL，避免跨域污染画布）
  useEffect(() => {
    if (!open) return;
    aliveRef.current = true;
    setStage('source');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setStatusText('');
    setPolledCount(0);
    let objectUrl = '';
    if (file) {
      objectUrl = URL.createObjectURL(file);
      setSourceUrl(objectUrl);
      setSourceFile(file);
    } else {
      setSourceUrl('');
      setSourceFile(null);
    }
    return () => {
      aliveRef.current = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, file]);

  /** 上传到本项目存储 */
  const uploadToStorage = async (blob: Blob, fileName: string): Promise<string> => {
    const uploadFile = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
    const res: any = await uploadApi.uploadImage(uploadFile);
    const url = res?.file_url || res?.url || '';
    if (!url) throw new Error('图片生成成功但上传失败');
    return url;
  };

  /** 裁切完成 → 上传保存 */
  const handleCropConfirm = async () => {
    const area = croppedAreaRef.current;
    if (!area) return;
    setCropping(true);
    try {
      const blob = await getCroppedImg(sourceUrl, area, 0.9);
      const url = await uploadToStorage(blob, `crop-${Date.now()}.jpg`);
      if (aliveRef.current) {
        onDone(url);
        onClose();
        success('图片裁切完成并已保存');
      }
    } catch (err: any) {
      if (aliveRef.current) showError(err?.message || '裁切失败，请重试');
    } finally {
      if (aliveRef.current) setCropping(false);
    }
  };

  /** AI 调整 → 上传保存 */
  const handleAiGenerate = async () => {
    if (!sourceFile) {
      showError('请先上传源图片');
      return;
    }
    setGenerating(true);
    setStatusText('提交任务中');
    setPolledCount(0);
    try {
      const resultBlob = await linksyResizeImage(
        sourceFile,
        targetWidth,
        targetHeight,
        ({ status, polled }) => {
          if (aliveRef.current) {
            setStatusText(STATUS_TEXT[status] || '处理中');
            setPolledCount(polled);
          }
        },
      );
      setStatusText('上传保存中');
      const url = await uploadToStorage(resultBlob, `ai-resize-${Date.now()}.png`);
      if (aliveRef.current) {
        onDone(url);
        onClose();
        success('AI 调整完成，图片已保存');
      }
    } catch (err: any) {
      if (aliveRef.current) showError(err?.message || 'AI 调整失败，请重试');
    } finally {
      if (aliveRef.current) {
        setGenerating(false);
        setStatusText('');
      }
    }
  };

  const handleCancel = () => {
    aliveRef.current = false;
    onClose();
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    croppedAreaRef.current = croppedAreaPixels;
  }, []);

  return (
    <Modal
      title={stage === 'source' ? '选择图片处理方式' : stage === 'crop' ? '手动裁切' : 'AI 调整图片尺寸'}
      open={open}
      onCancel={handleCancel}
      maskClosable={false}
      width={620}
      footer={
        stage === 'source' ? (
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            <Button icon={<ScissorOutlined />} disabled={!sourceFile}
              onClick={() => setStage('crop')}>
              手动裁切
            </Button>
            <Button type="primary" icon={<RobotOutlined />} disabled={!sourceFile}
              onClick={() => setStage('ai')}>
              AI 调整尺寸
            </Button>
          </Space>
        ) : stage === 'crop' ? (
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setStage('source')} disabled={cropping}>返回</Button>
            <Button type="primary" icon={<ScissorOutlined />} loading={cropping} onClick={handleCropConfirm}>
              确定裁切
            </Button>
          </Space>
        ) : (
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setStage('source')} disabled={generating}>返回</Button>
            <Button type="primary" icon={<RobotOutlined />} loading={generating}
              disabled={!sourceFile} onClick={handleAiGenerate}>
              {generating ? `${statusText}（${polledCount * 5}s）` : '开始生成'}
            </Button>
          </Space>
        )
      }
    >
      {stage === 'source' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
            已选择图片，请选择处理方式：<b>手动裁切</b>（比例 {Math.round(aspect * 100) / 100}:1）或
            <b>AI 调整</b>（{targetWidth} × {targetHeight} 像素）
          </div>
          {sourceUrl ? (
            <img src={sourceUrl} alt="源图"
              style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 4, border: '1px solid #eee' }} />
          ) : (
            <div style={{
              height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px dashed #d9d9d9', borderRadius: 4, color: '#999',
            }}>
              请先上传图片
            </div>
          )}
        </div>
      )}

      {stage === 'crop' && sourceUrl && (
        <div>
          <div style={{ position: 'relative', width: '100%', height: 360, background: '#000', borderRadius: 4 }}>
            <Cropper
              image={sourceUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <span style={{ color: '#666', fontSize: 13 }}>缩放</span>
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(v) => setZoom(v)}
              style={{ flex: 1 }}
            />
          </div>
        </div>
      )}

      {stage === 'ai' && (
        <div>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`AI 将按 ${targetWidth} × ${targetHeight} 的比例全幅重排画面（内容与风格保持一致），约需 30-90 秒。`}
          />
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            {sourceUrl && (
              <img src={sourceUrl} alt="源图"
                style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 4, border: '1px solid #eee' }} />
            )}
          </div>
          {generating && (
            <div style={{ textAlign: 'center' }}>
              <Spin />
              <div style={{ color: '#666', marginTop: 8, fontSize: 13 }}>
                {statusText}（单次出图约 30-90 秒，请耐心等待）
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ImageEditModal;
