import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Input, Space, Spin, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { RichTextEditor } from '@/components/templates/RichTextEditor';
import { useAppNotification } from '@/hooks/useAppNotification';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { settingsApi, SettingType, SettingItem } from '@/api/services/settings';
import {
  parseStoredValue,
  serializeTemplates,
  generateTemplateId,
  PROMISE_SETTING_KEY,
  PROMISE_SETTING_GROUP,
  type PromiseTemplate,
} from './promiseTemplate.utils';

const { Text } = Typography;

export interface PromiseTemplateModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 把 HTML 内容预览为纯文本（剥离标签 + 压缩空白），避免按字符切片切断 HTML 标签。
 * 空内容显示「(空白内容)」。
 */
const previewText = (html: string, maxLength = 200): string => {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return '(空白内容)';
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
};

/**
 * 承诺书模版管理弹窗
 *
 * 业务流程：
 * 1. 打开时拉取 setting 接口中 key=activity_promise 的最新值
 * 2. 用户在本地增删改模版，状态保存在组件内
 * 3. 点击「保存」把整个数组 JSON 化后写回 setting 接口
 *    - 已存在记录 → PATCH 更新 value
 *    - 不存在     → POST 创建（type=JSON, group=activity）
 */
const PromiseTemplateModal: React.FC<PromiseTemplateModalProps> = ({ open, onClose }) => {
  const { success, error: showError } = useAppNotification();
  const [templates, setTemplates] = useState<PromiseTemplate[]>([]);
  const [settingId, setSettingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // 当前正在编辑的模板 id（null 表示无）
  const [editingId, setEditingId] = useState<string | null>(null);
  // 编辑中的标题（受控，避免每次输入都触发列表 re-render）
  const [editingTitle, setEditingTitle] = useState('');
  const [editingContent, setEditingContent] = useState('');

  /** 拉取已保存的模板列表 */
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      // 拦截器已解包 PagedResponse → { list, total, pagination }
      const res: any = await settingsApi.getSettings({ keyword: PROMISE_SETTING_KEY, size: 100 });
      const list: SettingItem[] = res?.list ?? [];
      const item = list.find((s) => s.key === PROMISE_SETTING_KEY);
      if (item) {
        setSettingId(item.id);
        setTemplates(parseStoredValue(item.value));
      } else {
        setSettingId('');
        setTemplates([]);
      }
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setEditingId(null);
    }
  }, [open, fetchTemplates]);

  /** 开始编辑某条模板 */
  const handleStartEdit = (tpl: PromiseTemplate) => {
    setEditingId(tpl.id);
    setEditingTitle(tpl.title);
    setEditingContent(tpl.content);
  };

  /** 取消编辑 */
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
    setEditingContent('');
  };

  /** 添加新模板 */
  const handleAdd = () => {
    const newTpl: PromiseTemplate = {
      id: generateTemplateId(),
      title: '',
      content: '',
    };
    setTemplates((prev) => [...prev, newTpl]);
    setEditingId(newTpl.id);
    setEditingTitle('');
    setEditingContent('');
  };

  /**
   * 校验单条模板的合法性，返回错误消息（null 表示通过）。
   * 规则：title 与 content 都必须非空（与 utils 中 isValidTemplate 保持一致）。
   */
  const validateTemplate = (t: PromiseTemplate): string | null => {
    if (!t.title.trim()) return `模版「${t.id}」标题不能为空`;
    if (!t.content.trim()) return `模版「${t.title}」内容不能为空`;
    return null;
  };

  /** 保存当前正在编辑的项 */
  const handleSaveEdit = () => {
    if (!editingId) return;
    const title = editingTitle.trim();
    if (!title) {
      showError('请输入模版标题');
      return;
    }
    if (!editingContent.trim()) {
      showError('请输入模版内容');
      return;
    }
    setTemplates((prev) =>
      prev.map((t) => (t.id === editingId ? { ...t, title, content: editingContent } : t)),
    );
    setEditingId(null);
    setEditingTitle('');
    setEditingContent('');
  };

  /** 删除一条模板（带二次确认） */
  const handleDelete = (tpl: PromiseTemplate) => {
    confirmDelete({
      name: tpl.title || '该模版',
      deleteFn: async () => {
        setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
        if (editingId === tpl.id) handleCancelEdit();
      },
      onSuccess: () => undefined,
    });
  };

  /** 把整个模板列表写回 setting 接口 */
  const handleSaveAll = async () => {
    if (templates.length === 0) {
      showError('请至少添加一条模版');
      return;
    }

    // 把编辑中的项同步到列表，得到最终待保存的列表
    const trimmedTitle = editingTitle.trim();
    if (editingId && !trimmedTitle) {
      showError('请输入模版标题');
      return;
    }
    if (editingId && !editingContent.trim()) {
      showError('请输入模版内容');
      return;
    }
    const finalTemplates: PromiseTemplate[] = editingId
      ? templates.map((t) =>
          t.id === editingId ? { ...t, title: trimmedTitle, content: editingContent } : t,
        )
      : templates;

    // 校验全部模板
    for (const t of finalTemplates) {
      const err = validateTemplate(t);
      if (err) {
        showError(err);
        return;
      }
    }

    // 同步本地 state，保证 UI 与即将写入服务端的数据一致
    setTemplates(finalTemplates);
    if (editingId) {
      setEditingId(null);
      setEditingTitle('');
      setEditingContent('');
    }

    setSaving(true);
    try {
      const value = serializeTemplates(finalTemplates);

      if (settingId) {
        await settingsApi.updateSetting(settingId, { value });
      } else {
        const createRes: any = await settingsApi.createSetting({
          key: PROMISE_SETTING_KEY,
          type: SettingType.JSON,
          value,
          group_name: PROMISE_SETTING_GROUP,
        });
        if (createRes?.id) setSettingId(createRes.id);
      }
      success('保存成功');
      onClose();
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const editingTpl = editingId ? templates.find((t) => t.id === editingId) : null;

  return (
    <ScrollableModal
      title="承诺书模版管理"
      open={open}
      onCancel={onClose}
      width={760}
      destroyOnHidden
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={editingId !== null}>
            添加模版
          </Button>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSaveAll}>
              保存配置
            </Button>
          </Space>
        </Space>
      }
    >
      <Spin spinning={loading}>
        {templates.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无模版，请添加" />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {templates.map((tpl, idx) => {
              const isEditing = editingId === tpl.id;
              return (
                <div
                  key={tpl.id}
                  style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: 6,
                    background: isEditing ? '#fffbe6' : '#fafafa',
                    overflow: 'hidden',
                  }}
                >
                  {/* 头部：标题 + 操作 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderBottom: isEditing ? '1px solid #e8e8e8' : 'none',
                      background: '#f5f5f5',
                    }}
                  >
                    <Space size={6}>
                      <Text strong style={{ fontSize: 14 }}>
                        {tpl.title || `模版 ${idx + 1}`}
                      </Text>
                      {isEditing && <Text type="warning" style={{ fontSize: 12 }}>编辑中</Text>}
                    </Space>
                    <Space size={4}>
                      {!isEditing && (
                        <Button
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleStartEdit(tpl)}
                        >
                          编辑
                        </Button>
                      )}
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(tpl)}
                        disabled={isEditing}
                      >
                        删除
                      </Button>
                    </Space>
                  </div>

                  {/* 只读预览 / 编辑表单 */}
                  {isEditing ? (
                    <div style={{ padding: 14 }}>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>模版标题</div>
                        <Input
                          placeholder="如：线下聚会承诺书"
                          value={editingTitle}
                          maxLength={64}
                          onChange={(e) => setEditingTitle(e.target.value)}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>模版内容</div>
                        <RichTextEditor
                          value={editingContent}
                          placeholder="请输入承诺书正文"
                          onChange={setEditingContent}
                        />
                      </div>
                      <Space style={{ marginTop: 12 }}>
                        <Button onClick={handleCancelEdit}>取消</Button>
                        <Button type="primary" onClick={handleSaveEdit}>
                          保存此项
                        </Button>
                      </Space>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '10px 14px',
                        fontSize: 13,
                        color: tpl.content ? '#555' : '#bbb',
                        maxHeight: 120,
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {previewText(tpl.content)}
                    </div>
                  )}
                </div>
              );
            })}
          </Space>
        )}

        {editingTpl === undefined && editingId !== null && (
          <div style={{ color: '#999', fontSize: 13, marginTop: 8 }}>
            该模版已被删除，编辑已取消。
          </div>
        )}
      </Spin>
    </ScrollableModal>
  );
};

export default PromiseTemplateModal;