# 模板组件 (Templates)

本目录包含管理后台页面的可复用模板组件，基于已验证的最佳实践模式构建。

## 组件列表

| 组件 | 文件 | 说明 |
|------|------|------|
| `StandardPage` | StandardPage.tsx | 标准页面框架 |
| `StandardTable` | StandardTable.tsx | 标准表格组件 |
| `ActionColumn` | ActionColumn.tsx | 操作列配置 |
| `SearchPanel` | SearchPanel.tsx | 统一搜索面板 |
| `AddEditModal` | AddEditModal.tsx | 添加/编辑弹窗 |
| `DetailModal` | DetailModal.tsx | 详情弹窗 |
| `StatusSwitch` | StatusSwitch.tsx | 状态切换组件 |
| `confirmDelete` | ConfirmDelete.tsx | 删除确认函数 |
| `RichTextEditor` | RichTextEditor.tsx | 富文本编辑器 |
| `TabbedConfigPage` | TabbedConfigPage.tsx | 多标签配置管理页面 |
| `TagListEditor` | TagListEditor.tsx | 可拖拽标签列表编辑器 |

## 使用示例

### 1. 标准列表页

```tsx
import { useState, useCallback } from 'react';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { confirmDelete } from '@/components/templates/ConfirmDelete';

// 筛选配置
const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
];

const MyPage = () => {
  const [values, setValues] = useState<Record<string, any>>({});

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage({
    fetchFn: myApi.getList,
  });

  const columns = [
    { title: '名称', dataIndex: 'name' },
    { title: '状态', dataIndex: 'status' },
    ActionColumn({
      onEdit: handleEdit,
      onDelete: (record) => confirmDelete({
        name: record.name,
        deleteFn: () => myApi.delete(record.id),
        onSuccess: refresh,
      }),
    }),
  ];

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <StandardPage
      title="管理页面"
      description="页面描述"
      searchArea={
        <SearchPanel
          filters={filters}
          values={values}
          onChange={handleChange}
          onSearch={() => search(values)}
          onReset={() => { setValues({}); search({}); }}
        />
      }
      table={
        <StandardTable
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={pagination}
          onPageChange={onPageChange}
        />
      }
      showAddButton
      onAdd={() => openAddModal()}
      addButtonText="添加管理员"
    />
  );
};
```

### 2. 添加/编辑弹窗

```tsx
import { AddEditModal } from '@/components/templates/AddEditModal';

const MyModal = () => {
  const { visible, open, close, isEditing, submitting, submit, form } = useModalForm({
    submitFn: (values) => isEditing ? myApi.update(values) : myApi.create(values),
    onSuccess: refresh,
  });

  return (
    <AddEditModal
      title="项目"
      open={visible}
      onCancel={close}
      onSubmit={submit}
      submitting={submitting}
      entity={editingEntity}
      form={form}
    >
      <Form.Item label="名称" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
    </AddEditModal>
  );
};
```

### 3. 详情弹窗

```tsx
import { DetailModal } from '@/components/templates/DetailModal';

<DetailModal
  title="动态详情"
  open={!!detailModalData}
  onClose={() => setDetailModalData(null)}
  entity={detailModalData}
  className="feed-detail-modal"
  footer={null}
  render={(entity) => ({
    sections: [
      {
        items: [
          { label: '发布人', value: entity.user_data?.nick || '-' },
          {
            label: '审核状态',
            value: <Tag color={entity.status === 1 ? 'green' : 'orange'}>{STATUS_MAP[entity.status]}</Tag>,
          },
          { label: '浏览数', value: entity.viewTotal ?? 0 },
          { label: '点赞数', value: entity.likesTotal ?? 0 },
          { label: '评论数', value: entity.commentsTotal ?? 0 },
          { label: '收藏数', value: entity.favoriteTotal ?? 0 },
          { label: '发布时间', value: formatDateTime(entity.insertat), span: 2 },
          ...(entity.image ? [{ label: '图片集', value: <ImageList images={entity.image} />, span: 2 as const }] : []),
          ...(entity.intro ? [{ label: '内容', value: entity.intro, span: 2 as const }] : []),
        ],
      },
    ],
  })}
/>
```

**DetailModal 接口：**

```tsx
interface DetailItem {
  label: string;           // 标签文本
  value?: ReactNode;       // 字段值
  span?: number;           // 占列数，默认1，设为2可跨整行
  render?: (value, record) => ReactNode;  // 自定义渲染函数
}

interface DetailSection {
  title?: ReactNode;       // 区块标题
  items: DetailItem[];     // 字段列表
}

interface DetailModalProps {
  title?: string;          // 弹窗标题
  open: boolean;            // 是否显示
  onClose: () => void;      // 关闭回调
  entity?: any;             // 详情数据
  sections?: DetailSection[];  // 静态sections配置
  render?: (entity) => { sections: DetailSection[] } | null;  // 动态sections渲染函数
  width?: number;           // 弹窗宽度
  className?: string;       // CSS类名（用于控制列宽）
  footer?: ReactNode;       // 自定义底部
  confirmLoading?: boolean; // 加载状态
}
```

**列宽样式：**

详情弹窗需要配合CSS文件实现均匀列宽：

```tsx
// feed-detail-modal.css
.ant-modal.feed-detail-modal .ant-descriptions-item-label {
  width: 20% !important;
}
.ant-modal.feed-detail-modal .ant-descriptions-item-content {
  width: 30% !important;
}
```

### 4. 状态切换

```tsx
import { StatusSwitch } from '@/components/templates/StatusSwitch';

const columns = [
  { title: '状态', dataIndex: 'status' },
  {
    title: '状态',
    render: (_, record) => (
      <StatusSwitch
        checked={record.status === 0}
        onChange={(checked) => handleStatusChange(record, checked)}
      />
    ),
  },
];
```

## Hooks

### useListPage

封装列表页的通用状态和逻辑：

```tsx
const {
  data,           // 数据列表
  loading,        // 加载状态
  pagination,     // 分页信息 { current, pageSize, total }
  onPageChange,   // 分页变化回调
  search,        // 搜索函数
  reset,         // 重置函数
  refresh,       // 刷新函数
  updateItem,     // 更新单条数据
  removeItem,     // 删除单条数据
} = useListPage({
  fetchFn: api.getList,
  defaultPageSize: 10,
});
```

### useModalForm

封装弹窗表单的通用状态和逻辑：

```tsx
const {
  visible,        // 弹窗可见性
  open,           // 打开弹窗（传入 entity 为编辑模式）
  close,          // 关闭弹窗
  isEditing,     // 是否为编辑模式
  submitting,     // 提交中状态
  submit,         // 提交表单
  form,           // 表单实例
} = useModalForm({
  submitFn: api.create,
  onSuccess: refresh,
});
```

### RichTextEditor 富文本编辑器

封装 ReactQuill 富文本编辑器，支持图片上传：

```tsx
import { RichTextEditor } from '@/components/templates/RichTextEditor';

<RichTextEditor
  value={content}
  onChange={setContent}
  placeholder="请输入内容..."
  disabled={false}
/>
```

### TabbedConfigPage 多标签配置管理

适用于协议文档、隐私政策等多标签配置内容的编辑管理：

```tsx
import { TabbedConfigPage } from '@/components/templates/TabbedConfigPage';

const tabs = [
  { key: 'user', label: '用户协议', configName: 'agreement_user' },
  { key: 'privacy', label: '隐私政策', configName: 'agreement_privacy' },
];

<TabbedConfigPage
  title="协议文档管理"
  description="管理平台的用户协议、隐私政策等文档内容。"
  tabs={tabs}
/>
```

**TabConfig 接口：**

```tsx
interface TabConfig {
  key: string;           // 标签唯一标识
  label: string;        // 标签显示名称
  configName: string;   // 配置项名称（用于 API 读取/保存）
  content?: string;      // 初始内容（可选）
}
```

**自定义保存逻辑：**

如需自定义保存逻辑，可传入 `onSave` 函数：

```tsx
<TabbedConfigPage
  title="协议文档管理"
  description="管理平台的用户协议、隐私政策等文档内容。"
  tabs={tabs}
  onSave={async (key, content) => {
    // 自定义保存逻辑
    await customApi.save(key, content);
  }}
/>
```

**渲染额外内容：**

可通过 `renderExtra` 在编辑器下方渲染额外内容：

```tsx
<TabbedConfigPage
  title="协议文档管理"
  description="管理平台的用户协议、隐私政策等文档内容。"
  tabs={tabs}
  renderExtra={(key) => (
    <div>当前标签: {key}</div>
  )}
/>
```

### TagListEditor 可拖拽标签列表编辑器

适用于标签管理、关键词管理等需要增删和排序的场景：

```tsx
import { TagListEditor } from '@/components/templates/TagListEditor';

<TagListEditor
  title="用户标签管理"
  description="管理平台用户标签，用户可在个人资料中选择感兴趣的标签。"
  configName="usertags"
  placeholder="输入标签名称"
  maxLength={20}
  getDisplayText={(item) => item.name}
  inputToItem={(name) => ({ name })}
/>
```

**自定义标签渲染：**

```tsx
import { Tag } from 'antd';

<TagListEditor
  title="热门搜索词管理"
  description="管理平台热门搜索关键词。"
  configName="hotkeywords"
  getDisplayText={(item) => item.keyword}
  inputToItem={(keyword) => ({ keyword, searchCount: 0, status: 1 })}
  renderTag={(item, index, { onDelete, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDragOver }) => (
    <Tag
      key={`${item.keyword}-${index}`}
      draggable
      closable
      onClose={onDelete}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        opacity: isDragging ? 0.5 : 1,
        borderColor: isDragOver ? '#1890ff' : undefined,
      }}
      color={item.status === 1 ? 'processing' : 'default'}
    >
      {item.keyword} ({item.searchCount})
    </Tag>
  )}
/>
```

**接口：**

```tsx
interface TagListEditorProps {
  title: string;                    // 页面标题
  description?: string;             // 页面描述
  configName: string;               // 配置项名称
  placeholder?: string;            // 输入框占位符
  maxLength?: number;              // 输入最大长度
  renderTag?: (item, index, handlers) => React.ReactNode;  // 自定义标签渲染
  validateAdd?: (value, items) => boolean;  // 添加前校验
  getDisplayText: (item) => string;       // 获取显示文本
  compareItems?: (a, b) => boolean;       // 比较两个item是否相同
  inputToItem: (input) => object;         // 输入转item
  onSave?: (items) => Promise<void>;      // 自定义保存逻辑
}

// renderTag handlers 参数：
interface TagHandlers {
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}
```
