import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { uploadApi } from '@/api/services/upload';
import '@/styles/rich-text-editor.css';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
}

const modules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['clean'],
    ],
  },
};

const formats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'color', 'background', 'align', 'image',
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder,
  readOnly = false,
  disabled = false,
}) => {
  const quillRef = useRef<ReactQuill | null>(null);
  const skipNextOnChangeRef = useRef(false);
  const lastExternalValueRef = useRef(value);
  const [uploading, setUploading] = useState(false);
  const { error } = useAppNotification();

  // 外部 value 变化时（表单调入回填/重置），强制同步到 Quill 编辑器
  useEffect(() => {
    if (value !== lastExternalValueRef.current) {
      lastExternalValueRef.current = value;
      const editor = quillRef.current?.getEditor?.();
      if (editor) {
        try {
          if (value) {
            const delta = editor.clipboard.convert(value);
            editor.setContents(delta, 'silent');
          } else {
            editor.setText('');
          }
        } catch { /* Quill 转换失败时忽略 */ }
      }
    }
  }, [value]);

  const handleChange = useCallback((content: string) => {
    if (skipNextOnChangeRef.current) {
      skipNextOnChangeRef.current = false;
      return;
    }
    lastExternalValueRef.current = content;
    onChange?.(content);
  }, [onChange]);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const res = await uploadApi.uploadImage(file) as any;
      let url = '';
      if (typeof res === 'string') url = res;
      else if (res?.url) url = res.url;
      else if (res?.data?.url) url = res.data.url;
      else if (res?.data?.data?.url) url = res.data.data.url;
      else if (res?.data) url = typeof res.data === 'string' ? res.data : String(res.data.data);

      if (url) {
        const quill = quillRef.current;
        if (quill) {
          const editor = quill.getEditor?.();
          if (editor) {
            editor.focus();
            const range = editor.getSelection(true);
            const insertIndex = range ? range.index : editor.getLength() - 1;
            skipNextOnChangeRef.current = true;
            editor.insertEmbed(insertIndex, 'image', url);
            editor.setSelection(insertIndex + 1, 0);
            skipNextOnChangeRef.current = false;
            onChange?.(editor.root.innerHTML);
          }
        }
      } else {
        error('图片上传成功但未返回URL');
      }
    } catch (error: any) {
      skipNextOnChangeRef.current = false;
      error(error.response?.data?.msg || '图片上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  }, [onChange]);

  const triggerImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleImageUpload(file);
    };
    input.click();
  }, [handleImageUpload]);

  return (
    <div className="rich-text-editor">
      <ReactQuill
        ref={(el) => { quillRef.current = el; }}
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={readOnly || disabled}
      />
      <div style={{ marginTop: 8 }}>
        <Button
          size="small"
          icon={<UploadOutlined />}
          onClick={triggerImageUpload}
          disabled={disabled}
        >
          上传图片
        </Button>
        {uploading && (
          <span style={{ color: '#1890ff', fontSize: 13, marginLeft: 8 }}>图片上传中...</span>
        )}
      </div>
    </div>
  );
};
