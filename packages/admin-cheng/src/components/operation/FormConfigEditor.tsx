import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';

// ==================== Types ====================

export type FieldType = 'text' | 'number' | 'datetime' | 'textarea' | 'editor' | 'select' | 'multi_select' | 'image' | 'video';

export interface FieldTypeOption {
  label: string;
  value: FieldType;
}

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
}

interface FormConfigEditorProps {
  value?: string;
  onChange?: (json: string) => void;
  /** 字段 id 手填（预热配置：小程序端按固定 id 读取），缺省自动生成 */
  manualId?: boolean;
  /** 新增字段默认必填，缺省 false */
  defaultRequired?: boolean;
  /** 字段类型选项，缺省报名信息类型列表 */
  fieldTypes?: FieldTypeOption[];
}

/** 报名信息默认类型列表 */
const FIELD_TYPE_OPTIONS: FieldTypeOption[] = [
  { label: '输入框', value: 'text' },
  { label: '多行输入框', value: 'textarea' },
  { label: '单选', value: 'select' },
  { label: '多选', value: 'multi_select' },
  { label: '图片上传', value: 'image' },
];

/** 预热配置类型列表：单行文本下加「数字」「日期时间」，多行文本下加「编辑器」，图片上传下加「视频上传」 */
export const WARM_UP_FIELD_TYPE_OPTIONS: FieldTypeOption[] = [
  { label: '单行文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '日期时间', value: 'datetime' },
  { label: '多行文本', value: 'textarea' },
  { label: '编辑器', value: 'editor' },
  { label: '单选', value: 'select' },
  { label: '多选', value: 'multi_select' },
  { label: '图片上传', value: 'image' },
  { label: '视频上传', value: 'video' },
];

function generateFieldId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ==================== Component ====================

/** 编辑器内部字段：uid 仅用于稳定渲染 key（手填 id 时 id 变化不能换 key，否则输入框失焦），不写入存储 */
interface EditorField extends FormField {
  uid: string;
}

const FormConfigEditor: React.FC<FormConfigEditorProps> = ({ value = '', onChange, manualId = false, defaultRequired = false, fieldTypes = FIELD_TYPE_OPTIONS }) => {
  const [fields, setFields] = useState<EditorField[]>([]);
  /** 自身 emit 产出的值：父层回显该值时跳过重建（重建会重新生成 uid 导致输入过程失焦） */
  const lastEmitted = useRef<string | undefined>(undefined);

  // 解析 JSON 字符串为字段数组
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value ?? '';
    if (!value) { setFields([]); return; }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        let hasNewId = false;
        const withIds: EditorField[] = parsed.map((f: any) => {
          if (!f.id) hasNewId = true;
          return {
            // 手填 id 模式不自动生成（小程序端按固定 id 读取，留空由管理员填写）
            id: f.id || (manualId ? '' : generateFieldId()),
            label: f.label || '',
            type: f.type || 'text',
            required: f.required === true,
            options: f.options || undefined,
            uid: generateFieldId(),
          };
        });
        setFields(withIds);
        // 旧数据补齐 id 后回写表单，确保提交时值也带 id（手填 id 模式不回写）
        if (hasNewId && !manualId) {
          const clean = withIds.filter((f) => f.label.trim()).map(f => ({
            id: f.id, label: f.label, type: f.type, required: f.required,
            options: f.options?.length ? f.options : undefined,
          }));
          onChange?.(clean.length > 0 ? JSON.stringify(clean) : '');
        }
      } else {
        setFields([]);
      }
    } catch {
      setFields([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = useCallback((newFields: EditorField[]) => {
    setFields(newFields);
    const clean = newFields.filter((f) => f.label.trim()).map(f => ({
      id: f.id, label: f.label, type: f.type, required: f.required,
      options: f.options?.length ? f.options : undefined,
    }));
    const next = clean.length > 0 ? JSON.stringify(clean) : '';
    lastEmitted.current = next;
    onChange?.(next);
  }, [onChange]);

  const addField = useCallback(() => {
    const f: EditorField = { id: manualId ? '' : generateFieldId(), label: '', type: 'text', required: defaultRequired, uid: generateFieldId() };
    emit([...fields, f]);
  }, [fields, emit, manualId, defaultRequired]);

  const updateField = useCallback((idx: number, patch: Partial<FormField>) => {
    const next = fields.map((f, i) => i === idx ? { ...f, ...patch } : f);
    emit(next);
  }, [fields, emit]);

  const removeField = useCallback((idx: number) => {
    emit(fields.filter((_, i) => i !== idx));
  }, [fields, emit]);

  const setOptions = useCallback((idx: number, val: string) => {
    const parts = val.split('|').map((s) => s.trim());
    updateField(idx, { options: parts });
  }, [updateField]);

  // ---- 拖动排序 ----
  const dragItemIdx = { current: -1 };
  const dragOverIdx = { current: -1 };

  return (
    <div>
      {fields.map((field, idx) => {
        const isSelect = field.type === 'select' || field.type === 'multi_select';
        return (
          <div
            key={field.uid}
            draggable
            onDragStart={() => { dragItemIdx.current = idx; }}
            onDragEnter={() => { dragOverIdx.current = idx; }}
            onDragEnd={() => {
              if (dragItemIdx.current === -1 || dragOverIdx.current === -1) return;
              const copy = [...fields];
              const [removed] = copy.splice(dragItemIdx.current, 1);
              copy.splice(dragOverIdx.current, 0, removed);
              emit(copy);
              dragItemIdx.current = -1;
              dragOverIdx.current = -1;
            }}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: '1px solid #e8e8e8', borderRadius: 4, padding: 10, marginBottom: 8,
              background: '#fafafa', position: 'relative', cursor: 'grab',
            }}
          >
            {/* 删除 + 拖拽手柄 */}
            <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }}>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeField(idx)} />
              <HolderOutlined style={{ color: '#999', cursor: 'grab' }} />
            </div>

            {/* 第一行：字段ID（手填模式）+ 字段名 + 类型 + 必填 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: isSelect ? 8 : 0, paddingRight: 48 }}>
              {manualId && (
                <Input
                  size="small"
                  placeholder="字段ID"
                  value={field.id}
                  style={{ width: 100 }}
                  onChange={(e) => updateField(idx, { id: e.target.value })}
                />
              )}
              <Input
                size="small"
                placeholder="字段名"
                value={field.label}
                style={{ width: 140 }}
                onChange={(e) => updateField(idx, { label: e.target.value })}
              />
              <Select
                size="small"
                value={field.type}
                style={{ width: 110 }}
                options={fieldTypes}
                onChange={(v) => updateField(idx, {
                  type: v as FieldType,
                  options: (v === 'select' || v === 'multi_select') ? (field.options || []) : undefined,
                })}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={field.required} style={{ margin: 0 }}
                  onChange={(e) => updateField(idx, { required: e.target.checked })} />
                必填
              </label>
            </div>

            {/* 选项（单选/多选，用 | 分割） */}
            {isSelect && (
              <div style={{ marginTop: 4 }}>
                <Input
                  size="small"
                  placeholder="选项，用 | 分割，如：A|B|C"
                  value={field.options?.join('|') || ''}
                  onChange={(e) => setOptions(idx, e.target.value)}
                />
              </div>
            )}
          </div>
        );
      })}

      <Button type="dashed" icon={<PlusOutlined />} onClick={addField} style={{ marginTop: 4 }}>
        添加字段
      </Button>
    </div>
  );
};

export default FormConfigEditor;
