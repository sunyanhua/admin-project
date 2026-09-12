import { useMemo, useCallback } from 'react';
import FormConfigEditor, { FormField, WARM_UP_FIELD_TYPE_OPTIONS } from './FormConfigEditor';

interface WarmUpConfigEditorProps {
  value?: string;
  onChange?: (json: string) => void;
}

/**
 * 活动预热配置编辑器。
 * 交互同 FormConfigEditor（添加字段进行配置），但存储格式与行为不同：
 * - 所有字段合为一个数组，存入外层 JSON 的 "config" 键，即 {"config": [...]}
 * - 字段 id 手填（小程序端按固定 id 读取），新增字段默认必填
 * - 类型含「编辑器」「视频上传」「数据」；「数据」类型可嵌套一层字段集合（存入该字段的 config，嵌套层无「数据」类型）
 * - 编辑字段定义时只替换 config 键，保留 values/data 等其他键（与预热管理弹窗的赋值互不覆盖）
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

  // FormConfigEditor 输出字段数组 JSON，只替换外层 config 键，
  // 保留原对象的其余键（values 赋值/data 记录等），避免覆盖预热管理已填内容
  const handleChange = useCallback((arrayJson: string) => {
    let fields: FormField[] = [];
    if (arrayJson) {
      try {
        const parsed = JSON.parse(arrayJson);
        if (Array.isArray(parsed)) fields = parsed;
      } catch { /* 忽略非法值，按空配置存储 */ }
    }
    let rest: Record<string, any> = {};
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) rest = parsed;
    } catch { /* 原值非法则丢弃其余键 */ }
    onChange?.(JSON.stringify({ ...rest, config: fields }));
  }, [onChange, value]);

  return <FormConfigEditor value={innerValue} onChange={handleChange} manualId defaultRequired fieldTypes={WARM_UP_FIELD_TYPE_OPTIONS} />;
};

export default WarmUpConfigEditor;
