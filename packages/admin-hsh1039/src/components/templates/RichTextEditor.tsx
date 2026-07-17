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
  const editorRef = useRef<any>(null);
  const [uploading, setUploading] = useState(false);
  const { error } = useAppNotification();

  // ReactQuill 的 value/defaultValue 内部走 clipboard.convert() 会把 HTML 当纯文本。
  // 改为 defaultValue="" 初始化空编辑器，挂载后用 innerHTML 注入真实内容。
  const loadValueRef = useRef(value);
  loadValueRef.current = value;
  useEffect(() => {
    let attempts = 0;
    const timer = setInterval(() => {
      const editor = editorRef.current?.getEditor?.();
      if (editor?.root) {
        editor.root.innerHTML = loadValueRef.current || '';
        clearInterval(timer);
      } else if (++attempts > 50) {
        clearInterval(timer);
      }
    }, 20);
    return () => clearInterval(timer);
  }, []); // 仅首次挂载时注入

  const handleChange = useCallback((html: string) => {
    onChange?.(html);
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
        const quill = editorRef.current;
        if (quill) {
          const editor = quill.getEditor?.();
          if (editor) {
            editor.focus();
            const range = editor.getSelection(true);
            const insertIndex = range ? range.index : editor.getLength() - 1;
            editor.insertEmbed(insertIndex, 'image', url);
            editor.setSelection(insertIndex + 1, 0);
            onChange?.(editor.root.innerHTML);
          }
        }
      } else {
        error('图片上传成功但未返回URL');
      }
    } catch (error: any) {
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
        ref={editorRef}
        theme="snow"
        defaultValue=""
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
