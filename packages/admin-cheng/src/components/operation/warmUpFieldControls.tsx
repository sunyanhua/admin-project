import { useState } from 'react';
import { Button, DatePicker, Image, Input, InputNumber, Select, Space, Upload } from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import { useAppNotification } from '@/hooks/useAppNotification';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import ImageUpload from '@/components/common/ImageUpload';
import { uploadApi } from '@/api/services/upload';
import { getSmallUrl } from '@/utils/imageUtils';
import { parseApiTime, dayjsToApi, formatDateTime } from '@/utils/format';
import type { FormField } from './FormConfigEditor';

// ==================== 表单控件（按字段类型） ====================

/** 视频上传控件：上传到 /admin/v1/upload/video，值为视频 URL 字符串 */
const VideoUpload: React.FC<{ value?: string; onChange?: (url: string) => void }> = ({ value = '', onChange }) => {
  const { error: showError } = useAppNotification();
  const [uploading, setUploading] = useState(false);

  if (value) {
    return (
      <Space>
        <a href={value} target="_blank" rel="noopener noreferrer">查看视频</a>
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onChange?.('')}>删除</Button>
      </Space>
    );
  }
  return (
    <Upload
      accept="video/*"
      showUploadList={false}
      customRequest={async ({ file, onSuccess, onError }) => {
        try {
          setUploading(true);
          const res = await uploadApi.uploadVideo(file as File);
          onChange?.(res.file_url || '');
          onSuccess?.(res as any);
        } catch (err: any) {
          showError(err?.message || '视频上传失败');
          onError?.(err as Error);
        } finally {
          setUploading(false);
        }
      }}
    >
      <Button icon={<UploadOutlined />} loading={uploading}>上传视频</Button>
    </Upload>
  );
};

export interface WarmUpFieldControlProps {
  field: FormField;
  /** Form.Item 注入的表单值（必须转发给具体控件，否则字段处于非受控状态） */
  value?: any;
  /** Form.Item 注入的回调（必须转发，否则输入/上传不会更新表单值） */
  onChange?: (value: any) => void;
}

/** 预热字段类型 → 表单控件（「数据」类型不在表单渲染，由专属 TAB 管理） */
export const WarmUpFieldControl: React.FC<WarmUpFieldControlProps> = ({ field, value, onChange }) => {
  switch (field.type) {
    case 'text':
      return <Input placeholder={`请输入${field.label || ''}`} value={value} onChange={(e) => onChange?.(e.target.value)} />;
    case 'number':
      return <InputNumber style={{ width: '100%' }} placeholder={`请输入${field.label || ''}`} value={value} onChange={(v) => onChange?.(v)} />;
    case 'datetime':
      return <DatePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} value={value} onChange={(v) => onChange?.(v)} />;
    case 'textarea':
      return <Input.TextArea rows={4} placeholder={`请输入${field.label || ''}`} value={value} onChange={(e) => onChange?.(e.target.value)} />;
    case 'editor':
      return <RichTextEditor placeholder={`请输入${field.label || ''}`} showImageUpload={false} value={value} onChange={onChange} />;
    case 'select':
      return <Select placeholder="请选择" options={(field.options || []).map((o) => ({ label: o, value: o }))} value={value} onChange={onChange} />;
    case 'multi_select':
      return <Select mode="multiple" placeholder="请选择" options={(field.options || []).map((o) => ({ label: o, value: o }))} value={value} onChange={onChange} />;
    case 'image':
      // 普通图片上传：不强制裁切比例、不显示建议尺寸
      return <ImageUpload value={value} onChange={onChange} />;
    case 'video':
      return <VideoUpload value={value} onChange={onChange} />;
    default:
      return null;
  }
};

// ==================== 值展示（数据记录列表单元格） ====================

const stripHtml = (html: string) => String(html || '').replace(/<[^>]+>/g, '');

/** 预热字段值 → 列表单元格展示 */
export const WarmUpValueCell: React.FC<{ field: FormField; value: any }> = ({ field, value }) => {
  switch (field.type) {
    case 'image':
      return value
        ? <Image src={getSmallUrl(value)} alt={field.label || ''} preview={{ src: value }} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
        : <span style={{ color: '#999' }}>-</span>;
    case 'video':
      return value ? <a href={value} target="_blank" rel="noopener noreferrer">查看视频</a> : <span style={{ color: '#999' }}>-</span>;
    case 'multi_select':
      return Array.isArray(value) ? (value.join('、') || <span style={{ color: '#999' }}>-</span>) : (value || <span style={{ color: '#999' }}>-</span>);
    case 'editor': {
      if (!value) return <span style={{ color: '#999' }}>-</span>;
      const text = stripHtml(value);
      return <span title={text}>{text.slice(0, 60)}{text.length > 60 ? '…' : ''}</span>;
    }
    case 'datetime':
      return value ? formatDateTime(value) : <span style={{ color: '#999' }}>-</span>;
    default:
      return value == null || value === '' ? <span style={{ color: '#999' }}>-</span> : String(value);
  }
};

// ==================== 存储值 ⇄ 表单值 ====================

/** 存储值 → 表单值（日期时间字段转 dayjs，空值不写入） */
export const toFormValues = (fields: FormField[], values: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  fields.forEach((f) => {
    const v = values[f.id];
    if (v === undefined || v === null || v === '') return;
    result[f.id] = f.type === 'datetime' ? parseApiTime(v) : v;
  });
  return result;
};

/** 表单值 → 存储值（日期时间字段转 RFC3339 字符串，空值不写入） */
export const fromFormValues = (fields: FormField[], formValues: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  fields.forEach((f) => {
    const v = formValues[f.id];
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v) && v.length === 0) return;
    result[f.id] = f.type === 'datetime' ? dayjsToApi(v as Dayjs) : v;
  });
  return result;
};
