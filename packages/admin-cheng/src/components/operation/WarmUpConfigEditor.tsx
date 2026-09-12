import { useMemo, useCallback } from 'react';
import FormConfigEditor, { FormField } from './FormConfigEditor';

interface WarmUpConfigEditorProps {
  value?: string;
  onChange?: (json: string) => void;
}

/**
 * 活动预热配置编辑器。
 * 交互同 FormConfigEditor（添加字段进行配置），但存储格式不同：
 * 所有字段合为一个数组，存入外层 JSON 的 "config" 键，即 {"config": [...]}。
 */
const WarmUpConfigEditor: React.FC<WarmUpConfigEditorProps> = ({ value = '', onChange }) => {
  // 从外层 {"config": [...]} 中取出字段数组交给 FormConfigEditor（兼容历史纯数组格式）
  const innerValue = useMemo(() => {
    if (!value) return '';
    try {
      const parsed = JSON.parse(value);
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.config) ? parsed.config : []);
      return arr.length > 0 ? JSON.stringify(arr) : '';
    } catch {
      return '';
    }
  }, [value]);

  // FormConfigEditor 输出字段数组 JSON，包装为 {"config": [...]}
  const handleChange = useCallback((arrayJson: string) => {
    let fields: FormField[] = [];
    if (arrayJson) {
      try {
        const parsed = JSON.parse(arrayJson);
        if (Array.isArray(parsed)) fields = parsed;
      } catch { /* 忽略非法值，按空配置存储 */ }
    }
    onChange?.(JSON.stringify({ config: fields }));
  }, [onChange]);

  return <FormConfigEditor value={innerValue} onChange={handleChange} />;
};

export default WarmUpConfigEditor;
