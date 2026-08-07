import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Space, Collapse } from 'antd';
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { RichTextEditor } from '@/components/templates/RichTextEditor';

// ==================== Types ====================

export interface AgreementItem {
  name: string;
  content: string;
}

interface AgreementEditorProps {
  value?: string;
  onChange?: (json: string) => void;
}

// ==================== Component ====================

const AgreementEditor: React.FC<AgreementEditorProps> = ({ value = '', onChange }) => {
  const [items, setItems] = useState<AgreementItem[]>([]);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  // 解析 JSON → 文档列表
  useEffect(() => {
    if (!value) { setItems([]); return; }
    try {
      const parsed = JSON.parse(value);
      setItems(Array.isArray(parsed) ? parsed.map((a: any) => ({
        name: a.name || '',
        content: a.content || '',
      })) : []);
    } catch {
      setItems([]);
    }
  }, [value]);

  const emit = useCallback((newItems: AgreementItem[]) => {
    setItems(newItems);
    const clean = newItems.filter((a) => a.name.trim() || a.content.trim());
    onChange?.(clean.length > 0 ? JSON.stringify(clean) : '');
  }, [onChange]);

  const addItem = useCallback(() => {
    const newItem: AgreementItem = { name: '', content: '' };
    const newItems = [...items, newItem];
    emit(newItems);
    setActiveKeys([String(newItems.length - 1)]);
  }, [items, emit]);

  const updateItem = useCallback((idx: number, patch: Partial<AgreementItem>) => {
    emit(items.map((a, i) => i === idx ? { ...a, ...patch } : a));
  }, [items, emit]);

  const removeItem = useCallback((idx: number) => {
    emit(items.filter((_, i) => i !== idx));
  }, [items, emit]);

  // 拖动排序
  const dragIdx = { current: -1 };
  const dragOverIdx = { current: -1 };

  if (items.length === 0) {
    return (
      <div>
        <div style={{ color: '#999', fontSize: 13, marginBottom: 8 }}>暂未添加文档</div>
        <Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>
          添加文档
        </Button>
      </div>
    );
  }

  return (
    <div>
      {items.map((item, idx) => (
        <div
          key={idx}
          draggable
          onDragStart={() => { dragIdx.current = idx; }}
          onDragEnter={() => { dragOverIdx.current = idx; }}
          onDragEnd={() => {
            if (dragIdx.current === -1 || dragOverIdx.current === -1) return;
            const copy = [...items];
            const [removed] = copy.splice(dragIdx.current, 1);
            copy.splice(dragOverIdx.current, 0, removed);
            emit(copy);
            dragIdx.current = -1;
            dragOverIdx.current = -1;
          }}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: '1px solid #e8e8e8', borderRadius: 6, marginBottom: 12,
            background: '#fafafa', overflow: 'hidden',
          }}
        >
          {/* 拖拽手柄 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', background: '#f5f5f5', borderBottom: activeKeys.includes(String(idx)) ? '1px solid #e8e8e8' : 'none',
          }}>
            <Space size={4}>
              <HolderOutlined style={{ color: '#999', cursor: 'grab' }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                {item.name ? item.name : `文档 ${idx + 1}`}
              </span>
            </Space>
            <Space size={4}>
              <Button
                size="small"
                type="link"
                style={{ fontSize: 12, padding: 0 }}
                onClick={() => {
                  const key = String(idx);
                  setActiveKeys((prev) =>
                    prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
                  );
                }}
              >
                {activeKeys.includes(String(idx)) ? '收起' : '展开'}
              </Button>
              <Button size="small" type="text" danger icon={<DeleteOutlined />}
                onClick={() => removeItem(idx)} />
            </Space>
          </div>

          {/* 可折叠编辑区 */}
          {activeKeys.includes(String(idx)) && (
            <div style={{ padding: 12 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>文档名称</div>
                <Input
                  placeholder="如：用户服务协议、隐私政策"
                  value={item.name}
                  maxLength={64}
                  onChange={(e) => updateItem(idx, { name: e.target.value })}
                />
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>文档内容</div>
                <RichTextEditor
                  value={item.content}
                  placeholder="请输入文档内容"
                  showImageUpload
                  onChange={(html) => updateItem(idx, { content: html })}
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button type="dashed" icon={<PlusOutlined />} onClick={addItem} style={{ marginTop: 4 }}>
        添加文档
      </Button>
    </div>
  );
};

export default AgreementEditor;
