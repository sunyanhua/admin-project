import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Button, Input, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';

// ==================== Types ====================

export type FieldType = 'text' | 'number' | 'datetime' | 'textarea' | 'editor' | 'select' | 'multi_select' | 'image' | 'video' | 'data';

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
  /** 类型「数据」的嵌套字段集合（不含「数据」类型，其余与第一层一致） */
  config?: FormField[];
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

/** 预热配置类型列表：单行文本下加「数字」「日期时间」，多行文本下加「编辑器」，图片上传下加「视频上传」，末尾加「数据」 */
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
  { label: '数据', value: 'data' },
];

function generateFieldId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ==================== 存储结构 ⇄ 编辑器字段 ====================

/** 编辑器内部字段：uid 仅用于稳定渲染 key（手填 id 时 id 变化不能换 key，否则输入框失焦），不写入存储 */
interface EditorField extends FormField {
  uid: string;
  config?: EditorField[];
}

/** 存储字段解析为编辑器字段（递归处理「数据」类型的嵌套集合） */
const parseField = (f: any, manualId: boolean): EditorField => {
  const type: FieldType = f.type || 'text';
  return {
    id: f.id || (manualId ? '' : generateFieldId()),
    label: f.label || '',
    type,
    required: f.required === true,
    options: f.options || undefined,
    config: type === 'data' && Array.isArray(f.config)
      ? f.config.map((c: any) => parseField(c, manualId))
      : undefined,
    uid: generateFieldId(),
  };
};

/** 编辑器字段转存储结构（剔除 uid，递归处理嵌套集合） */
const toStoredField = (f: EditorField): FormField => ({
  id: f.id,
  label: f.label,
  type: f.type,
  required: f.required,
  options: f.options?.length ? f.options : undefined,
  config: f.type === 'data' ? (f.config ?? []).filter((c) => c.label.trim()).map(toStoredField) : undefined,
});

// ==================== 字段行（第一层与嵌套共用） ====================

interface FieldRowEditorProps {
  field: EditorField;
  idx: number;
  typeOptions: FieldTypeOption[];
  manualId: boolean;
  dragItemIdx: { current: number };
  dragOverIdx: { current: number };
  onReorder: (from: number, to: number) => void;
  onChange: (patch: Partial<EditorField>) => void;
  onRemove: () => void;
  /** 类型「数据」的嵌套字段集合编辑区 */
  nested?: ReactNode;
}

const FieldRowEditor: React.FC<FieldRowEditorProps> = ({ field, idx, typeOptions, manualId, dragItemIdx, dragOverIdx, onReorder, onChange, onRemove, nested }) => {
  const isSelect = field.type === 'select' || field.type === 'multi_select';
  return (
    <div
      draggable
      onDragStart={() => { dragItemIdx.current = idx; }}
      onDragEnter={() => { dragOverIdx.current = idx; }}
      onDragEnd={() => {
        if (dragItemIdx.current === -1 || dragOverIdx.current === -1) return;
        onReorder(dragItemIdx.current, dragOverIdx.current);
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
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onRemove} />
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
            onChange={(e) => onChange({ id: e.target.value })}
          />
        )}
        <Input
          size="small"
          placeholder="字段名"
          value={field.label}
          style={{ width: 140 }}
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <Select
          size="small"
          value={field.type}
          style={{ width: 110 }}
          options={typeOptions}
          onChange={(v) => onChange({
            type: v as FieldType,
            options: (v === 'select' || v === 'multi_select') ? (field.options || []) : undefined,
            config: v === 'data' ? (field.config ?? []) : undefined,
          })}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={field.required} style={{ margin: 0 }}
            onChange={(e) => onChange({ required: e.target.checked })} />
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
            onChange={(e) => onChange({ options: e.target.value.split('|').map((s) => s.trim()) })}
          />
        </div>
      )}

      {nested}
    </div>
  );
};

// ==================== Component ====================

const FormConfigEditor: React.FC<FormConfigEditorProps> = ({ value = '', onChange, manualId = false, defaultRequired = false, fieldTypes = FIELD_TYPE_OPTIONS }) => {
  const [fields, setFields] = useState<EditorField[]>([]);
  /** 自身 emit 产出的值：父层回显该值时跳过重建（重建会重新生成 uid 导致输入过程失焦） */
  const lastEmitted = useRef<string | undefined>(undefined);
  /** 嵌套字段类型：不含「数据」（不允许再嵌套） */
  const nestedTypeOptions = useMemo(() => fieldTypes.filter((t) => t.value !== 'data'), [fieldTypes]);

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
          return parseField(f, manualId);
        });
        setFields(withIds);
        // 旧数据补齐 id 后回写表单，确保提交时值也带 id（手填 id 模式不回写）
        if (hasNewId && !manualId) {
          const clean = withIds.filter((f) => f.label.trim()).map(toStoredField);
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
    const clean = newFields.filter((f) => f.label.trim()).map(toStoredField);
    const next = clean.length > 0 ? JSON.stringify(clean) : '';
    lastEmitted.current = next;
    onChange?.(next);
  }, [onChange]);

  const addField = useCallback(() => {
    const f: EditorField = { id: manualId ? '' : generateFieldId(), label: '', type: 'text', required: defaultRequired, uid: generateFieldId() };
    emit([...fields, f]);
  }, [fields, emit, manualId, defaultRequired]);

  const updateField = useCallback((idx: number, patch: Partial<EditorField>) => {
    const next = fields.map((f, i) => i === idx ? { ...f, ...patch } : f);
    emit(next);
  }, [fields, emit]);

  const removeField = useCallback((idx: number) => {
    emit(fields.filter((_, i) => i !== idx));
  }, [fields, emit]);

  // ---- 嵌套字段集合（类型「数据」，与第一层处理一致但不含「数据」类型） ----

  const addNestedField = useCallback((idx: number) => {
    const f: EditorField = { id: manualId ? '' : generateFieldId(), label: '', type: 'text', required: defaultRequired, uid: generateFieldId() };
    const parent = fields[idx];
    updateField(idx, { config: [...(parent.config ?? []), f] });
  }, [fields, updateField, manualId, defaultRequired]);

  const updateNestedField = useCallback((idx: number, nIdx: number, patch: Partial<EditorField>) => {
    const parent = fields[idx];
    const config = (parent.config ?? []).map((nf, i) => i === nIdx ? { ...nf, ...patch } : nf);
    updateField(idx, { config });
  }, [fields, updateField]);

  const removeNestedField = useCallback((idx: number, nIdx: number) => {
    const parent = fields[idx];
    updateField(idx, { config: (parent.config ?? []).filter((_, i) => i !== nIdx) });
  }, [fields, updateField]);

  // ---- 拖动排序 ----
  const dragItemIdx = { current: -1 };
  const dragOverIdx = { current: -1 };
  const nestedDragItemIdx = { current: -1 };
  const nestedDragOverIdx = { current: -1 };

  const reorderFields = useCallback((from: number, to: number) => {
    const copy = [...fields];
    const [removed] = copy.splice(from, 1);
    copy.splice(to, 0, removed);
    emit(copy);
  }, [fields, emit]);

  const reorderNestedFields = useCallback((idx: number, from: number, to: number) => {
    const parent = fields[idx];
    const config = [...(parent.config ?? [])];
    const [removed] = config.splice(from, 1);
    config.splice(to, 0, removed);
    updateField(idx, { config });
  }, [fields, updateField]);

  return (
    <div>
      {fields.map((field, idx) => (
        <FieldRowEditor
          key={field.uid}
          field={field}
          idx={idx}
          typeOptions={fieldTypes}
          manualId={manualId}
          dragItemIdx={dragItemIdx}
          dragOverIdx={dragOverIdx}
          onReorder={reorderFields}
          onChange={(patch) => updateField(idx, patch)}
          onRemove={() => removeField(idx)}
          nested={
            field.type === 'data' ? (
              <div style={{ marginTop: 8, marginLeft: 20, borderLeft: '2px dashed #d9d9d9', paddingLeft: 12 }}>
                {(field.config ?? []).map((nf, nIdx) => (
                  <FieldRowEditor
                    key={nf.uid}
                    field={nf}
                    idx={nIdx}
                    typeOptions={nestedTypeOptions}
                    manualId={manualId}
                    dragItemIdx={nestedDragItemIdx}
                    dragOverIdx={nestedDragOverIdx}
                    onReorder={(from, to) => reorderNestedFields(idx, from, to)}
                    onChange={(patch) => updateNestedField(idx, nIdx, patch)}
                    onRemove={() => removeNestedField(idx, nIdx)}
                  />
                ))}
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => addNestedField(idx)} style={{ marginTop: 4, marginBottom: 8 }}>
                  添加字段
                </Button>
              </div>
            ) : undefined
          }
        />
      ))}

      <Button type="dashed" icon={<PlusOutlined />} onClick={addField} style={{ marginTop: 4 }}>
        添加字段
      </Button>
    </div>
  );
};

export default FormConfigEditor;
