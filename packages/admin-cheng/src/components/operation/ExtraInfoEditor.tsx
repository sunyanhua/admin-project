import { useState, useCallback, useRef } from 'react';
import { Radio, Button, Tag, Space, Input, Select, Switch, Popconfirm, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, HolderOutlined } from '@ant-design/icons';
import ScrollableModal from '@/components/templates/ScrollableModal';

// ==================== Types ====================

type FieldType = 'text' | 'textarea' | 'select' | 'multi_select' | 'image';
type TextFormat = '' | 'mobile' | 'idcard' | 'positive_integer' | 'number';
type IdcardRestrict = '' | 'adult' | 'child' | 'male' | 'female';

export interface ExtraField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  format?: TextFormat;
  options?: string[];
  /** 预置字段不允许编辑 type/format/options */
  preset?: boolean;
  /** 身份证号附加限制：空=无要求, adult=成人, child=儿童, male=男性, female=女性 */
  idcardRestrict?: IdcardRestrict;
}

export interface ExtraInfoGroup {
  key: string;
  name: string;
  fields: ExtraField[];
}

export interface ExtraInfoData {
  /** 无特殊要求 | 全部项目统一设置 | 各项目单独设置 */
  mode: 'none' | 'unified' | 'individual';
  groups: ExtraInfoGroup[];
}

interface ExtraInfoEditorProps {
  value: ExtraInfoData;
  onChange: (data: ExtraInfoData) => void;
}

// ==================== 预置字段（type/format/options 固定） ====================

const PRESET_FIELDS: Record<string, Omit<ExtraField, 'key' | 'required'>> = {
  '姓名': { label: '姓名', type: 'text', format: '', preset: true },
  '手机号': { label: '手机号', type: 'text', format: 'mobile', preset: true },
  '性别': { label: '性别', type: 'select', options: ['男', '女'], preset: true },
  '年龄': { label: '年龄', type: 'text', format: 'positive_integer', preset: true },
  '工作单位': { label: '工作单位', type: 'text', format: '', preset: true },
  '身份证号': { label: '身份证号', type: 'text', format: 'idcard', preset: true, idcardRestrict: '' as IdcardRestrict },
};

const FIELD_TYPE_OPTIONS = [
  { label: '单行文本', value: 'text' as const },
  { label: '多行文本', value: 'textarea' as const },
  { label: '单选', value: 'select' as const },
  { label: '多选', value: 'multi_select' as const },
  { label: '图片上传', value: 'image' as const },
];

const TEXT_FORMAT_OPTIONS = [
  { label: '无要求', value: '' as const },
  { label: '手机号', value: 'mobile' as const },
  { label: '正整数', value: 'positive_integer' as const },
  { label: '数字', value: 'number' as const },
];

const IDCARD_RESTRICT_OPTIONS = [
  { label: '无要求', value: '' as const },
  { label: '必须为成人', value: 'adult' as const },
  { label: '必须为儿童', value: 'child' as const },
  { label: '必须为男性', value: 'male' as const },
  { label: '必须为女性', value: 'female' as const },
];

let fieldKeyCounter = 0;
function nextKey() { return `f_${Date.now()}_${fieldKeyCounter++}`; }
let groupKeyCounter = 0;
function nextGroupKey() { return `g_${Date.now()}_${groupKeyCounter++}`; }

// ==================== Component ====================

const ExtraInfoEditor: React.FC<ExtraInfoEditorProps> = ({ value, onChange }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ExtraInfoGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [fields, setFields] = useState<ExtraField[]>([]);
  const [presetSelectKey, setPresetSelectKey] = useState(0); // 用于重置 Select
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const startAdd = useCallback(() => {
    setEditingGroup(null);
    setGroupName(value.mode === 'unified' ? '信息模板' : '');
    setFields([
      { key: nextKey(), label: '姓名', type: 'text', required: true, format: '', preset: true },
      { key: nextKey(), label: '手机号', type: 'text', required: true, format: 'mobile', preset: true },
    ]);
    setPresetSelectKey((k) => k + 1);
    setModalVisible(true);
  }, [value.mode]);

  const startEdit = useCallback((group: ExtraInfoGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setFields(group.fields.map((f) => ({ ...f })));
    setPresetSelectKey((k) => k + 1);
    setModalVisible(true);
  }, []);

  const handleSaveGroup = useCallback(() => {
    if (!groupName.trim()) return;
    const groups = [...value.groups];
    const saved: ExtraInfoGroup = {
      key: editingGroup?.key || nextGroupKey(),
      name: groupName.trim(),
      fields: fields.filter((f) => f.label.trim()).map((f) => ({
        ...f,
        options: f.options?.filter(Boolean), // 保存时去除空选项
      })),
    };
    if (editingGroup) {
      const idx = groups.findIndex((g) => g.key === editingGroup.key);
      if (idx >= 0) groups[idx] = saved;
    } else {
      groups.push(saved);
    }
    onChange({ ...value, groups });
    setModalVisible(false);
  }, [groupName, fields, editingGroup, value, onChange]);

  const handleDeleteGroup = useCallback((key: string) => {
    onChange({ ...value, groups: value.groups.filter((g) => g.key !== key) });
  }, [value, onChange]);

  // ---- 字段操作 ----

  const addPresetField = useCallback((presetName: string) => {
    const preset = PRESET_FIELDS[presetName];
    if (!preset || fields.some((f) => f.label === presetName)) return;
    setFields((prev) => [...prev, { key: nextKey(), required: false, ...preset, options: preset.options ? [...preset.options] : undefined }]);
    setPresetSelectKey((k) => k + 1); // 重置 Select
  }, [fields]);

  const addCustomField = useCallback(() => {
    setFields((prev) => [...prev, { key: nextKey(), label: '', type: 'text', required: false, format: '' }]);
  }, []);

  const updateField = useCallback((key: string, patch: Partial<ExtraField>) => {
    setFields((prev) => prev.map((f) => f.key === key ? { ...f, ...patch } : f));
  }, []);

  const removeField = useCallback((key: string) => {
    setFields((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((f) => f.key !== key);
    });
  }, []);

  const setFieldOptions = useCallback((key: string, val: string) => {
    // 保留空串不 filter，避免输入 "A|" 时 "|" 立即消失
    const parts = val.split('|').map((s) => s.trim());
    setFields((prev) => prev.map((f) =>
      f.key === key ? { ...f, options: parts } : f,
    ));
  }, []);

  // ---- 拖动排序 ----
  const handleDragStart = useCallback((index: number) => { dragItem.current = index; }, []);
  const handleDragEnter = useCallback((index: number) => { dragOverItem.current = index; }, []);
  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...fields];
    const [removed] = copy.splice(dragItem.current, 1);
    copy.splice(dragOverItem.current, 0, removed);
    setFields(copy);
    dragItem.current = null;
    dragOverItem.current = null;
  }, [fields]);

  // ---- 渲染 ----
  return (
    <>
      {/* 不再渲染标题，由父组件 SectionBlock 统一提供 */}
      <Radio.Group
        value={value.mode}
        onChange={(e) => onChange({ ...value, mode: e.target.value })}
        style={{ marginBottom: 16 }}
      >
        <Radio.Button value="unified">全部项目统一</Radio.Button>
        <Radio.Button value="individual">各项目单独设置</Radio.Button>
      </Radio.Group>

      {(value.mode === 'unified' || value.mode === 'individual') && (
        <div style={{ marginBottom: 8 }}>
          {value.groups.map((g) => (
            <Tag key={g.key} color="blue" style={{ fontSize: 12, padding: '2px 8px', marginBottom: 6, marginRight: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>{g.name}（{g.fields.length}项）</span>
              <EditOutlined style={{ cursor: 'pointer', fontSize: 11 }} onClick={() => startEdit(g)} />
              <Popconfirm title="确定删除此信息模板？" onConfirm={() => handleDeleteGroup(g.key)}>
                <DeleteOutlined style={{ cursor: 'pointer', fontSize: 11, color: '#ff4d4f' }} />
              </Popconfirm>
            </Tag>
          ))}
          {/* 统一模式最多1个，单独模式无限制 */}
          {(value.mode === 'individual' || value.groups.length === 0) && (
            <div style={{ marginTop: 4 }}>
              <Button type="dashed" icon={<PlusOutlined />} onClick={startAdd}>
                添加信息模板
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ====== 编辑弹窗 ====== */}
      <ScrollableModal
        title={editingGroup ? '编辑信息模板' : '新建信息模板'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={750}
        destroyOnHidden
        footer={
          <Space>
            <Button onClick={() => setModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveGroup} disabled={!groupName.trim() || fields.filter((f) => f.label.trim()).length === 0}>
              {editingGroup ? '保存' : '添加'}
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 8px' }}>
          {/* 名称 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: '#666' }}>模板名称</div>
            <Input
              autoFocus
              placeholder={value.mode === 'unified' ? '如：信息模板' : '如：成人、儿童'}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              maxLength={32}
            />
          </div>

          {/* 包含字段 */}
          <div style={{ fontWeight: 600, marginBottom: 8 }}>包含字段</div>

          {fields.map((field, idx) => {
            const isPreset = !!field.preset;
            return (
              <div key={field.key} draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  border: '1px solid #e8e8e8', borderRadius: 4, padding: 10, marginBottom: 8,
                  background: '#fafafa', position: 'relative', cursor: 'grab',
                }}>
                {/* 排序手柄 + 删除（至少保留一项） */}
                <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', alignItems: 'center', gap: 2, zIndex: 1 }}>
                  {fields.length > 1 && (
                    <Button size="small" type="text" danger icon={<DeleteOutlined />}
                      onClick={() => removeField(field.key)} />
                  )}
                  <HolderOutlined style={{ color: '#999', cursor: 'grab' }} />
                </div>

                {/* 第一行：字段名 + 类型 + 必填 */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, paddingRight: 48 }}>
                  <Input
                    size="small"
                    placeholder="字段名"
                    value={field.label}
                    style={{ width: 120 }}
                    disabled={isPreset}
                    onChange={(e) => updateField(field.key, { label: e.target.value })}
                  />
                  <Select
                    size="small"
                    value={field.type}
                    style={{ width: 100 }}
                    options={FIELD_TYPE_OPTIONS}
                    disabled={isPreset}
                    onChange={(v) => updateField(field.key, { type: v, format: v === 'text' ? '' : undefined, options: undefined })}
                  />
                  {/* 单行文本 → 格式要求 */}
                  {field.type === 'text' && (
                    <Select
                      size="small"
                      value={field.format || ''}
                      style={{ width: 90 }}
                      options={TEXT_FORMAT_OPTIONS}
                      disabled={isPreset}
                      onChange={(v) => updateField(field.key, { format: v as TextFormat })}
                    />
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={field.required} style={{ margin: 0 }}
                      disabled={field.label === '身份证号' && !!(field.idcardRestrict)}
                      onChange={(e) => updateField(field.key, { required: e.target.checked })} />
                    必填
                  </label>
                  {/* 身份证号附加限制 */}
                  {field.label === '身份证号' && (
                    <Select
                      size="small"
                      value={field.idcardRestrict || ''}
                      style={{ width: 130 }}
                      options={IDCARD_RESTRICT_OPTIONS}
                      onChange={(v) => updateField(field.key, { idcardRestrict: v as IdcardRestrict, required: !!v || field.required })}
                    />
                  )}
                </div>

                {/* 选项（单选/多选，用 | 分割） */}
                {(field.type === 'select' || field.type === 'multi_select') && (
                  <div style={{ marginBottom: 4 }}>
                    <Input
                      size="small"
                      placeholder="选项，用 | 分割，如：A组|B组|C组"
                      value={field.options?.join('|') || ''}
                      disabled={isPreset}
                      onChange={(e) => setFieldOptions(field.key, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* 添加字段 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <Select
              key={presetSelectKey}
              size="small"
              placeholder="请选择预设字段"
              style={{ width: 140 }}
              options={Object.keys(PRESET_FIELDS)
                .filter((k) => !fields.some((f) => f.label === k))
                .map((k) => ({ label: k, value: k }))}
              value={undefined}
              onChange={(v) => v && addPresetField(v)}
            />
            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addCustomField}>
              自定义字段
            </Button>
          </div>
        </div>
      </ScrollableModal>
    </>
  );
};

export default ExtraInfoEditor;
