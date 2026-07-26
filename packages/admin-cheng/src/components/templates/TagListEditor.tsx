import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Card, Button, Space, Tag, Input, Typography, Empty } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { configApi } from '@/api/services/config';

const { Title } = Typography;

export interface TagItem {
  [key: string]: any;
}

export interface TagListEditorProps {
  title: string;
  description?: string;
  configName: string;
  placeholder?: string;
  maxLength?: number;
  /** 自定义标签渲染，返回 null 则使用默认渲染 */
  renderTag?: (item: TagItem, index: number, handlers: {
    onDelete: () => void;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    isDragging: boolean;
    isDragOver: boolean;
  }) => React.ReactNode;
  /** 添加前校验，返回 true 阻止添加 */
  validateAdd?: (value: string, items: TagItem[]) => boolean;
  /** 从 item 中提取显示文本 */
  getDisplayText: (item: TagItem) => string;
  /** 比较两个 item 是否为同一项（用于去重） */
  compareItems?: (a: TagItem, b: TagItem) => boolean;
  /** 将输入值转换为 item */
  inputToItem: (input: string) => TagItem;
  /** 自定义保存逻辑 */
  onSave?: (items: TagItem[]) => Promise<void>;
}

export const TagListEditor: React.FC<TagListEditorProps> = ({
  title,
  description,
  configName,
  placeholder = '输入内容',
  maxLength = 20,
  renderTag,
  validateAdd,
  getDisplayText,
  compareItems = (a, b) => getDisplayText(a) === getDisplayText(b),
  inputToItem,
  onSave,
}) => {
  const [items, setItems] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const isFirstRender = useRef(true);
  const fetchItemsRef = useRef<() => Promise<void>>();
  const { success, error, warning } = useAppNotification();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await configApi.getConfig(configName) as any;
      let data: TagItem[] = [];
      if (res?.data) {
        try {
          data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        } catch {
          data = [];
        }
      }
      if (!Array.isArray(data)) data = [];
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [configName]);

  fetchItemsRef.current = fetchItems;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchItemsRef.current?.();
    }
  }, []);

  const handleAdd = () => {
    const value = inputValue.trim();
    if (!value) {
      warning('请输入内容');
      return;
    }
    if (validateAdd?.(value, items)) {
      return;
    }
    if (items.some(item => getDisplayText(item) === value)) {
      warning('该项已存在');
      return;
    }
    setItems(prev => [...prev, inputToItem(value)]);
    setInputValue('');
  };

  const handleDelete = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setItems(prev => {
      const newItems = [...prev];
      const [draggedItem] = newItems.splice(dragIndex, 1);
      newItems.splice(targetIndex, 0, draggedItem);
      return newItems;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    if (items.length === 0) {
      warning('请至少添加一项');
      return;
    }

    setSaving(true);
    try {
      if (onSave) {
        await onSave(items);
      } else {
        const payload = {
          name: configName,
          mime: 'application/json',
          data: JSON.stringify(items),
        };
        await configApi.setConfig(configName, payload);
      }
      success('保存成功');
    } catch (err: any) {
      error(err.response?.data?.msg || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderDefaultTag = (item: TagItem, index: number) => (
    <Tag
      key={`${getDisplayText(item)}-${index}`}
      color="blue"
      draggable
      closable
      onClose={() => handleDelete(index)}
      onDragStart={() => handleDragStart(index)}
      onDragOver={(e) => handleDragOver(e, index)}
      onDrop={(e) => handleDrop(e, index)}
      onDragEnd={handleDragEnd}
      style={{
        fontSize: 14,
        padding: '4px 10px',
        cursor: 'grab',
        opacity: dragIndex === index ? 0.5 : 1,
        borderColor: dragOverIndex === index ? '#1890ff' : undefined,
      }}
    >
      {getDisplayText(item)}
    </Tag>
  );

  return (
    <div>
      <Title level={2}>{title}</Title>
      {description && (
        <p style={{ color: '#666', marginBottom: 24 }}>{description}</p>
      )}

      <Card loading={loading} style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <Input
              placeholder={placeholder}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onPressEnter={handleAdd}
              style={{ width: 200 }}
              maxLength={maxLength}
              showCount
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>添加</Button>
          </Space>

          <div>
            {items.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无内容，请添加" />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {items.map((item, index) =>
                  renderTag
                    ? renderTag(item, index, {
                        onDelete: () => handleDelete(index),
                        onDragStart: () => handleDragStart(index),
                        onDragOver: (e) => handleDragOver(e, index),
                        onDrop: (e) => handleDrop(e, index),
                        onDragEnd: handleDragEnd,
                        isDragging: dragIndex === index,
                        isDragOver: dragOverIndex === index,
                      })
                    : renderDefaultTag(item, index)
                )}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div style={{ color: '#666', fontSize: 13 }}>
              拖动可调整顺序，提交保存后生效。
            </div>
          )}
          <div>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存配置
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};
