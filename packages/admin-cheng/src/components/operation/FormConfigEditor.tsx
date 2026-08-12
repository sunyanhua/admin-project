import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';

// ==================== Types ====================

type FieldType = 'text' | 'textarea' | 'select' | 'multi_select' | 'image';

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
}

const FIELD_TYPE_OPTIONS = [
  { label: '输入框', value: 'text' as const },
  { label: '多行输入框', value: 'textarea' as const },
  { label: '单选', value: 'select' as const },
  { label: '多选', value: 'multi_select' as const },
  { label: '图片上传', value: 'image' as const },
];

function generateFieldId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ==================== Component ====================

const FormConfigEditor: React.FC<FormConfigEditorProps> = ({ value = '', onChange }) => {
  const [fields, setFields] = useState<FormField[]>([]);

  // 解析 JSON 字符串为字段数组
  useEffect(() => {
    if (!value) { setFields([]); return; }
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        let hasNewId = false;
        const withIds = parsed.map((f: any) => {
          if (!f.id) hasNewId = true;
          return {
            id: f.id || generateFieldId(),
            label: f.label || '',
            type: f.type || 'text',
            required: f.required === true,
            options: f.options || undefined,
          };
        });
        setFields(withIds);
        // 旧数据补齐 id 后回写表单，确保提交时值也带 id
        if (hasNewId) {
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

  const emit = useCallback((newFields: FormField[]) => {
    setFields(newFields);
    const clean = newFields.filter((f) => f.label.trim()).map(f => ({
      id: f.id, label: f.label, type: f.type, required: f.required,
      options: f.options?.length ? f.options : undefined,
    }));
    onChange?.(clean.length > 0 ? JSON.stringify(clean) : '');
  }, [onChange]);

  const addField = useCallback(() => {
    const f: FormField = { id: generateFieldId(), label: '', type: 'text', required: false };
    emit([...fields, f]);
  }, [fields, emit]);

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
            key={field.id}
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

            {/* 第一行：字段名 + 类型 + 必填 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: isSelect ? 8 : 0, paddingRight: 48 }}>
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
                options={FIELD_TYPE_OPTIONS}
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
