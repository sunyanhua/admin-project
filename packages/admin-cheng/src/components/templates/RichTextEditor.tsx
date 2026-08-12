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
  /** 是否显示图片上传按钮，默认 true */
  showImageUpload?: boolean;
  /** 外层容器 className，用于自定义高度等样式 */
  className?: string;
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
  showImageUpload = true,
  className,
}) => {
  const editorRef = useRef<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const { error } = useAppNotification();

  // 跟踪编辑来源：true = 编辑器内部输入，false = 外部 value prop 变化
  const internalEditRef = useRef(false);
  const prevValueRef = useRef(value);
  const valueRef = useRef(value);
  valueRef.current = value;

  // 首次挂载注入内容（用 valueRef 拿到最新值）
  useEffect(() => {
    let attempts = 0;
    const timer = setInterval(() => {
      const editor = editorRef.current?.getEditor?.();
      if (editor?.root) {
        editor.root.innerHTML = valueRef.current || '';
        clearInterval(timer);
      } else if (++attempts > 50) {
        clearInterval(timer);
      }
    }, 20);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // value prop 变化时同步编辑器
  useEffect(() => {
    if (internalEditRef.current) {
      internalEditRef.current = false;
      prevValueRef.current = value;
      return;
    }
    if (value === prevValueRef.current) return;
    prevValueRef.current = value;
    const editor = editorRef.current?.getEditor?.();
    if (editor?.root) {
      editor.root.innerHTML = value || '';
    }
  }, [value]);

  const handleChange = useCallback((html: string) => {
    internalEditRef.current = true;
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
        // 拦截器已解包 code===0 → data，所以 res 是 UploadFileResult: { file_id, file_url }
        let url = '';
        if (typeof res === 'string') url = res;
        else if (res?.file_url) url = res.file_url;
        else if (res?.url) url = res.url;
        else if (res?.media_url) url = res.media_url;
        else if (res?.data?.file_url) url = res.data.file_url;
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
    <div className={`rich-text-editor${className ? ` ${className}` : ''}`}>
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
      {showImageUpload && (
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
      )}
    </div>
  );
};
