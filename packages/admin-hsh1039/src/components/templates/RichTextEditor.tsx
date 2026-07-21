import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button } from 'antd';
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
  const [uploadCount, setUploadCount] = useState(0);
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

  const insertImagesAtIndex = useCallback((urls: string[], insertIndex: number) => {
    const editor = editorRef.current?.getEditor?.();
    if (!editor) return;
    let idx = insertIndex;
    for (const url of urls) {
      editor.insertEmbed(idx, 'image', url);
      idx += 1;
    }
    editor.setSelection(idx, 0);
    onChange?.(editor.root.innerHTML);
  }, [onChange]);

  const handleImageUpload = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    // 先捕获插入位置
    const editor = editorRef.current?.getEditor?.();
    editor?.focus();
    const range = editor?.getSelection?.(true);
    const insertIndex = range ? range.index : (editor?.getLength() ?? 1) - 1;

    setUploading(true);
    setUploadCount(fileList.length);

    // 并行上传所有文件
    const results = await Promise.allSettled(
      fileList.map(async (file) => {
        const res = await uploadApi.uploadImage(file) as any;
        let url = '';
        if (typeof res === 'string') url = res;
        else if (res?.url) url = res.url;
        else if (res?.data?.url) url = res.data.url;
        else if (res?.data?.data?.url) url = res.data.data.url;
        else if (res?.data) url = typeof res.data === 'string' ? res.data : String(res.data.data);
        return url;
      }),
    );

    const urls = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && !!r.value)
      .map((r) => r.value);

    const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value));
    if (failed.length > 0) {
      error(`${failed.length} 张图片上传失败`);
    }

    if (urls.length > 0) {
      insertImagesAtIndex(urls, insertIndex);
    }

    setUploading(false);
    setUploadCount(0);
  }, [error, onChange]);

  const triggerImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) handleImageUpload(files);
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
          <span style={{ color: '#1890ff', fontSize: 13, marginLeft: 8 }}>
            正在上传 {uploadCount} 张图片...
          </span>
        )}
      </div>
    </div>
  );
};
