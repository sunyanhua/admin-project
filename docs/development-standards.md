---
title: 管理后台开发规范标准
created: 2026-04-10
updated: 2026-04-29
author: Claude Code
category: GUIDELINE
status: approved
---

# 管理后台开发规范标准

> 本文档是 CLAUDE.md 的**代码模板补充**，提供可复制的代码示例。核心规则请阅读 CLAUDE.md。

---

## 1. 列表页标准结构

### 1.1 标准列表页模板

```typescript
import { useState } from 'react';
import { Card, Button, Space } from 'antd';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel } from '@/components/templates/SearchPanel';
import { useListPage } from '@/hooks/useListPage';
import { yourApi, YourItem } from '@/api/services/your';

const YourListPage = () => {
  const { loading, data, pagination, search, handleTableChange } = useListPage({
    fetchData: async (params) => {
      const res = await yourApi.getList(params) as any;
      return {
        data: res?.data || [],
        total: res?.count || 0,
      };
    },
  });

  const columns = [
    { title: '名称', dataIndex: 'name' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: number) => (
        <Tag color={status === 1 ? 'success' : 'default'}>
          {status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>页面标题</Title>
      <p style={{ color: '#666', marginBottom: 24 }}>功能描述，用户可见的功能说明</p>

      <Card>
        <SearchPanel filters={filters} onSearch={search} />
        <Button type="primary" onClick={handleAdd} className="action-buttons">
          添加数据
        </Button>
        <StandardTable
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          rowKey="id"
        />
      </Card>
    </div>
  );
};
```

### 1.2 搜索筛选配置

```typescript
const filters: FilterConfig[] = [
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
  {
    name: 'status',
    placeholder: '全部状态',
    type: 'select',
    options: [
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 },
    ],
  },
];
```

---

## 2. 表格列配置模板

### 2.1 状态列（Tag渲染）

```typescript
import { YourStatus, YourStatusMap } from '@shared/constants/your.enums';

{
  title: '状态',
  dataIndex: 'status',
  render: (status: YourStatus) => {
    const colorMap: Record<YourStatus, string> = {
      [YourStatus.ENABLED]: 'success',
      [YourStatus.DISABLED]: 'default',
    };
    return <Tag color={colorMap[status]}>{YourStatusMap[status]}</Tag>;
  },
}
```

### 2.2 金额列

```typescript
{
  title: '金额',
  dataIndex: 'amount',
  align: 'right',
  render: (amount: number, record: any) => (
    <span style={{ color: record.type === 'income' ? '#52c41a' : '#ff4d4f' }}>
      {record.type === 'income' ? '+' : '-'}¥{amount.toFixed(2)}
    </span>
  ),
}
```

### 2.3 操作列

```typescript
{
  title: '操作',
  key: 'action',
  width: 180,
  fixed: 'right',
  render: (_, record) => (
    <Space size="small" className="action-buttons">
      <Button type="link" size="small" onClick={() => handleView(record)}>
        详情
      </Button>
      <Button type="link" size="small" onClick={() => handleEdit(record)}>
        编辑
      </Button>
      <Popconfirm
        title="确认删除"
        description="确定要删除这条记录吗？"
        onConfirm={() => handleDelete(record)}
      >
        <Button type="link" size="small" danger>
          删除
        </Button>
      </Popconfirm>
    </Space>
  ),
}
```

---

## 3. 编辑弹窗组件模板

### 3.1 独立组件模式

```typescript
// src/components/xxx/YourEditModal.tsx
import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space } from 'antd';
import { yourApi, YourItem } from '@/api/services/your';

export interface YourEditModalProps {
  visible: boolean;
  onClose: () => void;
  item: YourItem | null;
  onSuccess?: () => void;
}

const YourEditModal: React.FC<YourEditModalProps> = ({
  visible,
  onClose,
  item,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (item) {
        form.setFieldsValue({
          name: item.name,
          status: item.status,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, item, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      if (item) {
        await yourApi.update(item.id, values);
      } else {
        await yourApi.create(values);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showError(err.response?.data?.message || err.response?.data?.msg || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={item ? '编辑' : '添加'}
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="name" label="名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default YourEditModal;
```

### 3.2 Switch 状态组件

```typescript
<Form.Item
  label="状态"
  name="status"
  valuePropName="checked"
  getValueFromEvent={(checked: boolean) => checked ? 1 : 0}
  getValueProps={(value: number) => ({ checked: value === 1 })}
>
  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
</Form.Item>
```

### 3.3 密码强度验证

```typescript
const validatePassword = (_: any, value: string): Promise<void> => {
  if (!value) return Promise.reject(new Error('请输入密码'));

  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasNumber = /\d/.test(value);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(value);

  if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    return Promise.reject(new Error('密码必须包含大写字母、小写字母、数字、特殊符号'));
  }
  return Promise.resolve();
};
```

---

## 4. 删除操作模板

### 4.1 Popconfirm 单行删除

```typescript
<Popconfirm
  title="确认删除"
  description="确定要删除这条记录吗？删除后无法恢复。"
  onConfirm={() => handleDelete(record)}
  okText="确定"
  cancelText="取消"
>
  <Button type="link" danger size="small">删除</Button>
</Popconfirm>
```

### 4.2 Modal.confirm 批量删除

```typescript
const handleBatchDelete = () => {
  Modal.confirm({
    title: '确认批量删除',
    content: `确定要删除选中的 ${selectedRowKeys.length} 条记录吗？`,
    okText: '确定删除',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: async () => {
      await api.batchDelete(selectedRowKeys);
      notification.success({ message: '删除成功', placement: 'top' });
      fetchList();
    },
  });
};
```

---

## 5. 表单提交反馈（全局统一标准）

### 5.1 标准保存逻辑

```typescript
// ✅ 页面组件 → 使用 useAppNotification（底层为 notification，大气泡提示）
const { success, error: showError } = useAppNotification();

const handleSave = async (values: any) => {
  try {
    setSaving(true);
    await api.save(values);
    success('保存成功');
    onSuccess?.();
  } catch (err: any) {
    showError(err.response?.data?.message || err.response?.data?.msg || '保存失败');
  } finally {
    setSaving(false);
  }
};
```

```typescript
// ✅ Hook → 使用 App.useApp().notification
const { notification } = App.useApp();
notification.error({ message: '获取数据失败', placement: 'top' });
```

```typescript
// ✅ 纯工具函数（非组件）→ 使用 utils/message.ts 的 globalMessage
import { globalMessage } from '@/utils/message';
globalMessage.error('导出失败');
```

### 5.2 提示类型选择规范

| 场景 | 组件类型 | 用法 |
|------|---------|------|
| 页面/弹窗组件 | React 组件 | `useAppNotification()` → `success()` / `showError()` |
| 自定义 Hook | Hook | `App.useApp().notification` |
| 工具函数/拦截器 | 纯函数 | `utils/message.ts` 的 `globalMessage`（由 App.tsx 注入） |
| 删除确认 | `confirmDelete()` | 自动使用注入的 handler |

### 5.3 上传操作反馈

```typescript
const handleUpload = async (file: File) => {
  setUploading(true);
  try {
    const res = await uploadApi.uploadImage(file);
    const url = res?.url || res || '';
    // 使用返回的 url...
  } catch {
    showError('图片上传失败');
  } finally {
    setUploading(false);
  }
};
```

### 5.4 ⚠️ 严禁事项

- ❌ 禁止直接 `import { message } from 'antd'` 使用静态方法（产生 Context 警告）
- ❌ 禁止在 `catch` 块和拦截器中同时弹错误提示（会导致双弹窗）
- ❌ 禁止在拦截器 error 路径做 UI 提示（`api/index.ts` 已关闭）

---

## 6. 配置类页面模板（一次请求前端过滤）

### 6.1 数据读取

```typescript
const fetchSettings = async () => {
  try {
    setInitialLoading(true);
    // 单次请求获取所有数据
    const res = await configApi.getSettings({ start: 0, length: 100 }) as any;

    // 拦截器返回 data.data 格式: { start, length, count, data: [...] }
    const allSettings = res?.data || [];

    // 前端按 name 过滤
    const signReward = allSettings.find((r: RewardItem) => r.name === 'sign');
    const activityReward = allSettings.find((r: RewardItem) => r.name === 'activity');

    const values: Record<string, any> = {};
    if (signReward) {
      values.sign_points = signReward.points;
      values.sign_daily = signReward.daily_limit ?? 1;
    }
    if (activityReward) {
      values.activity_points = activityReward.points;
      values.activity_monthly = activityReward.monthly_limit;
    }

    // setTimeout 避免 useForm 实例未连接警告
    setTimeout(() => form.setFieldsValue(values), 0);
  } catch (err: any) {
    showError(err.response?.data?.msg || '加载配置失败');
  } finally {
    setInitialLoading(false);
  }
};
```

### 6.2 批量保存

```typescript
const handleSave = async (values: any) => {
  try {
    setSaving(true);
    await Promise.all([
      configApi.update({ name: 'sign', points: values.sign_points, daily_limit: 1 }),
      configApi.update({ name: 'activity', points: values.activity_points, monthly_limit: values.activity_monthly }),
    ]);
    success('保存成功');
    fetchSettings();
  } catch (err: any) {
    showError(err.response?.data?.msg || '保存失败');
  } finally {
    setSaving(false);
  }
};
```

---

## 7. 列表接口响应处理

### 7.1 标准响应格式

```typescript
// 响应格式: { start, length, count, data: [...] }
const fetchList = async (params?: any) => {
  try {
    setLoading(true);
    const res = await api.getList({ start: 0, length: 10, ...params }) as any;
    setData(res?.data || []);
    setPagination(prev => ({ ...prev, total: res?.count || 0 }));
  } finally {
    setLoading(false);
  }
};
```

### 7.2 useListPage Hook 使用

```typescript
const { loading, data, pagination, search, handleTableChange } = useListPage({
  fetchData: async (params) => {
    const res = await api.getList(params) as any;
    return {
      data: res?.data || [],
      total: res?.count || 0,
    };
  },
});
```

---

## 8. 日期格式化

```typescript
import { formatDateTime } from '@/utils/format';

{
  title: '创建时间',
  dataIndex: 'createdAt',
  render: (time: string) => formatDateTime(time),
}
```

---

## 9. 枚举使用示例

```typescript
import { AdminRule, AdminRuleMap } from '@shared/constants/admin.enums';

// 下拉选项
<Select>
  <Option value={AdminRule.VIEW_ONLY}>{AdminRuleMap[AdminRule.VIEW_ONLY]}</Option>
  <Option value={AdminRule.AUDITOR}>{AdminRuleMap[AdminRule.AUDITOR]}</Option>
  <Option value={AdminRule.EDITOR}>{AdminRuleMap[AdminRule.EDITOR]}</Option>
</Select>

// 状态判断
if (user.rule === AdminRule.FULL_PERMISSION) { ... }
```

---

## 10. 富文本编辑器集成

```typescript
const modules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['image'],
      ['clean'],
    ],
    handlers: {
      image: function(this: any) {
        const quill = this.quill;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const res = await uploadApi.uploadImage(file) as any;
            const url = res?.url || res?.data?.url || '';
            if (url) {
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', url);
            }
          } finally {
            setUploading(false);
          }
        };
        input.click();
      },
    },
  },
};
```

---

## 11. 常见错误对照

| 错误写法 | 正确写法 |
|---------|---------|
| `response?.data?.data?.list` | `response?.list` |
| `catch (error: any)` | `catch (err: any)` |
| `message.error(msg)` | `notification.error({ message: msg, placement: 'top' })` |
| `import { message } from 'antd'` | `const { notification } = App.useApp()` |
| `<Modal visible={visible}>` | `<Modal open={visible}>` |
| `destroyOnClose` | `destroyOnHidden` |

### 11.1 HTTP 方法规范

**规则**: 严格按照 hsh-swagger 接口文档定义的方法调用。

| 操作 | 新系统 (BizMall) 方法 |
|------|---------------------|
| 列表 | `GET` |
| 详情 | `GET` |
| 创建 | `POST` |
| 编辑 | `PUT` |
| 删除 | `DELETE` |
| 状态切换 | `PUT`（独立端点如 `/list-status`、`/visibility`） |

> **注意**: 新系统严格使用 RESTful 方法（PUT/DELETE），与旧系统（全部 POST）不同。

---

## 12. 图片缩略图处理

### 12.1 工具文件

```typescript
// src/utils/imageUtils.ts

/** 检查是否应添加缩略后缀：只有 vbegin CDN 的 URL 才处理 */
export const shouldAddThumbnail = (url: string): boolean => {
  if (!url) return false;
  return url.includes('vbegin');
};

/** 检查已有后缀，避免重复添加 */
export const hasThumbnailSuffix = (url: string): boolean => {
  return /\/\d+\.\d+$/.test(url);
};

/** 通用转换：url + /{size}.0 */
export const getThumbnailUrl = (url: string | undefined | null, size: number): string => {
  if (!url) return '';
  if (!shouldAddThumbnail(url)) return url;
  if (hasThumbnailSuffix(url)) return url;
  return `${url}/${size}.0`;
};

// 按场景命名的派生方法
export const getAvatarUrl    = (url: string | undefined | null) => getThumbnailUrl(url, 256);
export const getFullWidthUrl = (url: string | undefined | null) => getThumbnailUrl(url, 1024);
export const getMediumUrl    = (url: string | undefined | null) => getThumbnailUrl(url, 512);
export const getSmallUrl     = (url: string | undefined | null) => getThumbnailUrl(url, 256);
```

### 12.2 使用示例

```tsx
import { getAvatarUrl, getFullWidthUrl, getMediumUrl, getSmallUrl } from '@/utils/imageUtils';

// ==== 用户头像 ====
<Avatar src={getAvatarUrl(record.user_data?.avatar)} size={40} />

// ==== antd Image — src 用缩略图，preview 用原图 ====
<Image src={getMediumUrl(img)} preview={{ src: img }} width={80} height={80} />

// ==== img 标签 — 缩略图展示，onClick 传原图 ====
<img src={getFullWidthUrl(url)} alt=""
  onClick={() => setPreviewImage(url)}  // 原图预览
  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

// ==== 事件封面（详情弹窗） ====
<Image
  src={getFullWidthUrl(data.image)}
  preview={{ src: data.image }}
  style={{ borderRadius: 8, maxWidth: 200 }}
/>
```

### 12.3 尺寸选择速查

| 场景 | 方法 | 后缀 |
|------|------|------|
| 用户头像 | `getAvatarUrl(url)` | `/256.0` |
| 全屏宽大图（Banner、活动封面、活动内页详情图、动态内页图片、个人主页封面） | `getFullWidthUrl(url)` | `/1024.0` |
| 双列/列表展示（动态列表封面、个人主页动态列表、收藏列表等） | `getMediumUrl(url)` | `/512.0` |
| 方形小图（发现页活动Tab列表、话题封面、分类封面） | `getSmallUrl(url)` | `/256.0` |

### 12.4 不需要压缩的例外

- **编辑/表单页面**的图片预览：保持原图，确保编辑时看到图片保真
- **身份证、营业执照等证件照**：保持原图，人工审核需要高清
- **小程序码/二维码**：保持原图
- **静态资源**（`import logo from '@/styles/logo.png'`）：不处理
- **非 vbegin CDN 的外部图片**：`shouldAddThumbnail` 自动过滤

---

## 14. 接口调用规范

```typescript
// 数据读取 — 兼容多种响应格式
const list = response?.data?.list || response?.data || response?.list;

// 分页总数
const total = response?.data?.count || response?.count || 0;

// 错误提示
const errMsg = error.response?.data?.msg || error.response?.data?.error || '操作失败';

// 分页参数 — 必须传 start、length
await api.getList({ start: 0, length: 10, ...filters });
```

## 15. 搜索交互模式

```typescript
const filters: FilterConfig[] = [
  // 下拉选项 — 第一个为"全部"，值为空字符串 ''
  { name: 'status', placeholder: '全部状态', type: 'select', options: [
    { label: '全部', value: '' },
    { label: '启用', value: 0 },
    { label: '禁用', value: 1 },
  ]},
  // 关键词输入 — name 固定为 "word"
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
];

// 状态变量与 name 保持一致
const [values, setValues] = useState<Record<string, any>>({});

const handleChange = (name: string, value: any) => {
  setValues(prev => ({ ...prev, [name]: value }));
};
```

## 16. 表单验证补充

```typescript
// 使用 onFinish 处理提交
<Form onFinish={handleSubmit} initialValues={{ status: 0 }}>
  {/* ... */}
</Form>

// 密码验证：必须包含大写、小写、数字、特殊符号
const passwordRules = [
  { required: true, message: '请输入密码' },
  { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, message: '必须包含大小写字母、数字和特殊符号' },
];

// Modal 使用 destroyOnHidden（Ant Design v5+）
<Modal destroyOnHidden ... />
```

## 17. 操作按钮规范

```typescript
// 所有操作按钮添加 className
<Button className="action-buttons" ...>编辑</Button>

// 删除使用 confirmDelete
import { confirmDelete } from '@/components/templates/ConfirmDelete';
confirmDelete({
  name: record.title,
  deleteFn: () => api.delete(record.id),
  onSuccess: refresh,
});

// 操作后反馈
const { success, error: showError } = useAppNotification();
success('保存成功');
showError('保存失败');

// 添加按钮用完整描述性文字
// ❌ "添加"  →  ✅ "添加管理员"
```

## 18. 状态默认值

```typescript
// 新增数据 status 默认启用（通常为 0）
<Form initialValues={{ status: 0 }}>

// Switch 组件需配置值映射
<Form.Item name="status" valuePropName="checked"
  getValueFromEvent={(checked) => checked ? ENABLED : DISABLED}
  getValueProps={(value) => ({ checked: value === ENABLED })}>
  <Switch checkedChildren="启用" unCheckedChildren="禁用" />
</Form.Item>
```

## 19. 排序字段规范

```typescript
// 列表排序统一用 orderon，数值越小越靠前
// 列表内可内联编辑，支持清空（不传值）

// 添加时：显示排序字段，若为空则不传（不默认填 0）
<Form.Item name="orderon" label="排序">
  <InputNumber min={0} style={{ width: '100%' }} placeholder="" />
</Form.Item>

// 编辑时：不显示排序字段，仅通过列表内联编辑
// InputNumber 不设 placeholder，避免显示灰色"空"字

// 列定义
{
  title: '排序', dataIndex: 'orderon', key: 'orderon', width: 120,
  render: (orderon, record) => (
    <InputNumber min={0} value={orderon} style={{ width: 70 }}
      onBlur={(e) => handleOrderChange(record, e.target.value ? parseInt(e.target.value) : null)} />
  ),
}
```

---

## 20. 区域卡片样式（SectionBlock）

**色值表**：

| 区域类型 | 左边框色 | 示例场景 |
|---------|---------|---------|
| 信息配置 | `#1677ff`（蓝） | 报名期限、报名附加信息、规格项目 |
| 数据表格 | `#722ed1`（紫） | SKU 组合 |
| 状态操作 | `#fa8c16`（橙） | 是否上架 |

**代码模板**：

```tsx
{/* ====== 区域名称 ====== */}
<div style={{ background: '#fafafa', borderLeft: '3px solid #1677ff', borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1677ff' }}>区域名称</div>
  {/* 区域内容 */}
</div>
{/* 区域间分隔线 */}
<div style={{ height: 1, background: '#e8e8e8', margin: '0 0 16px 0' }} />
```

**禁止**：用 `<Divider />` 拼凑区域边界；多个区域无视觉分隔直接堆叠；区域内表格与配置区混在一起。

---

## 21. 弹窗模板（ScrollableModal）

所有带表单的弹窗必须使用 `ScrollableModal`，禁止直接用 `<Modal>`。

### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `header` | ReactNode | 可选，固定在滚动区上方的头部（Steps 等） |
| `footer` | ReactNode | 可选，固定在底部的按钮区，不传则不显示 |
| 其他 | 继承 ModalProps | `title`/`open`/`onCancel`/`width`/`destroyOnHidden` 等 |

### 简单弹窗

```tsx
import ScrollableModal from '@/components/templates/ScrollableModal';

<ScrollableModal title="添加管理员" open={visible} onCancel={onClose} width={600} destroyOnHidden
  footer={
    <Space>
      <Button onClick={onClose}>取消</Button>
      <Button type="primary" loading={loading} onClick={() => form.submit()}>创建</Button>
    </Space>
  }>
  <Form form={form} layout="vertical" onFinish={handleSubmit}>
    <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
      <Input />
    </Form.Item>
  </Form>
</ScrollableModal>
```

### 带 Steps 步骤条

```tsx
<ScrollableModal title="添加活动" open={visible} onCancel={onClose} width={900} destroyOnHidden
  header={<Steps current={0} items={[{title:'活动信息'},{title:'项目配置'},{title:'上架管理'}]} />}
  footer={<Space><Button onClick={onClose}>取消</Button><Button type="primary" onClick={handleNext}>下一步</Button></Space>}>
  {currentStep === 0 && <Step1Form />}
  {currentStep === 1 && <Step2Config />}
</ScrollableModal>
```

### 布局标准（CSS 固化，不可修改）

```
┌──────────────────────────────────────────────┐
│ Modal 标题栏（原生 header）                   │
├─ sm-header（可选）───────────────────────────┤  margin-bottom: 15px
├─────────────────── 上边线 ──────────────────┤
│ sm-body（flex:1, overflow-y:auto）           │  padding: 16px，唯一滚动区
├─────────────────── 下边线 ──────────────────┤
│ sm-footer（可选）                             │  padding: 12px 24px, text-align: right
└──────────────────────────────────────────────┘

.sm-container: max-height: 75vh
.ant-modal-body: padding: 10px 0
```

**禁止**：`import { Modal } from 'antd'` 做表单弹窗；按钮放 `<Form>` 内部做 `<Form.Item>`；覆盖 `.sm-*` CSS；手动 `styles={{ body: ... }}`。

---

## 99. 构建与部署规范

### 99.1 禁止自动执行构建

**规则**: 除非用户明确要求，否则不得自动执行 `npm run build` 或其他构建命令。

**原因**:
- 构建操作耗时且可能上传到生产服务器
- 用户需要确认构建结果和部署时机
- 避免意外触发生产环境变更

**执行条件**:
- 用户明确说"请构建"、"运行 build"等
- 用户请求生成 dist 文件用于部署
- 其他明确需要构建的场景

**例外**: 代码修改后的语法检查或类型检查可使用 `tsc --noEmit`（不生成文件）

---

## 13. 表格列排列标准

> **强制遵守**：所有列表页的列定义必须符合以下标准，确保全站视觉和交互统一。

### 13.1 发布者/用户列（"头像+昵称"）

```tsx
{
  title: '发布者',              // 标题按业务语义命名（发布者 / 用户 / 提交人 等）
  key: 'publisher',
  width: 140,                  // 固定宽度：标准 140，昵称较长时 160，含多行信息时 220
  render: (_: any, record) => (
    <Button
      type="link"
      style={{ padding: 0, height: 'auto' }}
      onClick={() => handleViewUserDetail(record)}
    >
      <Space size={4}>
        <Avatar
          src={getAvatarUrl(record.user_data?.avatar)}
          size={40}
          style={{ borderRadius: '50%', flexShrink: 0 }}
        />
        <span style={{ fontSize: 14 }}>
          {record.user_data?.nick || record.user_data?.userid || '-'}
        </span>
      </Space>
    </Button>
  ),
}
```

**强制要点**：
- 用 `Button type="link"` 做容器，点击跳转用户详情
- `Space size={4}` 紧凑排列头像与昵称
- 头像 `size={40}`、`borderRadius: '50%'`、`flexShrink: 0`——禁止压缩
- 昵称 `fontSize: 14`，无多余样式
- 头像必须使用 `getAvatarUrl()` 缩略图

### 13.2 标题列（主要文本列）

```tsx
{
  title: '标题',
  key: 'title',
  // ⚠️ 不设 width，不写 ellipsis：让它自动撑开 + 换行完整显示
  render: (_: any, record) => (
    <>
      {/* 分类标签：inline 跟随，不独占一行 */}
      {record.category_data?.title && (
        <Tag color="blue" style={{ verticalAlign: 'middle' }} title={record.category_data.title}>
          {record.category_data.title}
        </Tag>
      )}
      {/* 标题文本，允许换行 */}
      <span style={{ verticalAlign: 'middle', wordBreak: 'break-word' }}>
        {record.title}
      </span>
      {/* 二维码等辅助元素，与标题同行显示 */}
      {(record.status === 1 || record.status === 6) && (
        <SourceQrcodeModal basePage={`pages/p-find/detail?id=${record.id}`} />
      )}
    </>
  ),
}
```

**强制要点**：
- **不设固定宽度**，让标题自动换行完整显示——禁止设 `width` 和 `ellipsis: true`
- 分类标签、二维码等辅助元素用 `verticalAlign: 'middle'` 与标题同行
- 标题文本用 `wordBreak: 'break-word'` 保证长词可换行
- 如列内**内容可点击跳转**，必须使用 `Button type="link"` + `whiteSpace: 'normal'` + `wordBreak: 'break-word'` 替代纯文本

```tsx
// 示例：标题列内容可点击跳转
render: (_: any, record) => (
  <Button type="link" style={{ padding: 0, height: 'auto' }}
    onClick={() => handleView(record)}>
    <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'left' }}>
      {record.title}
    </span>
  </Button>
)
```

### 13.3 状态/Tag 列（彩色标签，不换行 + Tooltip）

```tsx
{
  title: '状态',
  dataIndex: 'status',
  key: 'status',
  width: 90,                     // 固定窄列宽 90 ~ 100，不给换行空间
  render: (status: number) => (
    <Tag
      color={STATUS_MAP[status]?.color}
      title={STATUS_MAP[status]?.text || '其他'}  // ← 关键：title 实现 hover 查看完整文字
    >
      {STATUS_MAP[status]?.text || '其他'}
    </Tag>
  ),
}
```

**强制要点**：
- 宽度固定为 **90 ~ 100**，不许换行
- `Tag.color` 控制颜色，**`Tag.title` 承载 tooltip**
- **`title` 值与显示文本必须一致**，写完整文案
- Tag 天然不换行，超出截断，hover 时 title 弹出完整内容
- 此规则适用于**所有彩色标签列**：状态、类型、是否已读、认证类型等

**❌ 禁止（缺少 title）**：
```tsx
// 错误：截断时无法看到完整文字
<Tag color={STATUS_MAP[status]?.color}>{STATUS_MAP[status]?.text}</Tag>
```

### 13.4 开关列（启用/禁用等布尔状态）

```tsx
{
  title: '状态',
  dataIndex: 'status',
  key: 'status',
  width: 100,
  render: (status: number, record) => (
    <Switch
      checked={status === ENABLED}
      onChange={(checked) => handleStatusToggle(record, checked)}
      checkedChildren="启用"
      unCheckedChildren="禁用"
    />
  ),
}
```

**要点**：仅用于 binary 开关类状态，不用于多值枚举；宽 100。

### 13.5 日期/时间列（双行展示）

```tsx
{
  title: '发布时间',
  dataIndex: 'insertat',
  key: 'insertat',
  width: 120,
  render: (t: string) => (
    <div style={{ lineHeight: 1.6 }}>
      <div>{formatDate(t)}</div>
      <div style={{ color: '#666', fontSize: 12 }}>
        {t ? formatDateTime(t).split(' ')[1] : '-'}
      </div>
    </div>
  ),
}
```

**强制要点**：
- 宽固定 **120**
- 第一行日期，第二行时间
- 时间行用 `color: '#666'` + `fontSize: 12` 弱化

### 13.6 数字列

```tsx
{
  title: '报名人数',
  dataIndex: 'current_participants',
  key: 'current_participants',
  width: 90,                    // 数字列宽 90 ~ 100
  render: (count?: number) => count ?? 0,
}
```

### 13.7 排序输入列

```tsx
{
  title: '排序',
  dataIndex: 'orderon',
  key: 'orderon',
  width: 120,
  render: (orderon: number | undefined, record) => (
    <InputNumber
      min={0}
      value={orderon}
      style={{ width: 70 }}
      onBlur={(e) => {
        const val = e.target.value;
        handleOrderChange(record, val ? parseInt(val) : null);
      }}
    />
  ),
}
```

### 13.8 封面/缩略图列

```tsx
import { getMediumUrl } from '@/utils/imageUtils';

{
  title: '封面',
  key: 'cover',
  width: 80,
  render: (_: any, record: any) => {
    const cover = getCoverImage(record.image);
    return cover ? (
      <Image
        width={60} height={60}
        src={getMediumUrl(cover)}          // 缩略图
        preview={{ src: cover }}          // 预览用原图
        style={{ borderRadius: 6, objectFit: 'cover' }}
      />
    ) : '-';
  },
}
```

### 13.9 列宽速查表

| 内容类型 | 推荐宽度 | 备注 |
|---------|---------|------|
| 封面/图标 | **80** | |
| 状态Tag | **90 ~ 100** | 必须含 title |
| 数字 | **90 ~ 100** | |
| 开关 | **100** | 仅 binary 状态 |
| 金额 | **100** | |
| 日期/时间 | **120** | 双行：日期+时间 |
| 排序输入 | **120** | InputNumber width: 70 |
| 发布者(头像+昵称) | **140 ~ 160** | 头像 + 昵称 + link 按钮 |
| 发布者(多行) | **220** | 含额外信息行 |
| 流水号 | **180** | |
| 标题（含标签+二维码） | **不设宽度** | minWidth: 100，自动换行，禁止 ellipsis |
| 操作列 | **50 ~ 200** | 视按钮数量和文字长度 |

> **核心原则**：标题列不设宽让它撑开；其余列设固定宽让排版可控；Tag 必须有 title。

---

## 变更日志

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-04-10 | v1.0 | 初始版本 | Claude Code |
| 2026-04-17 | v1.1 | 新增列表接口规范、编辑弹窗规范 | Claude Code |
| 2026-04-18 | v1.2 | 新增富文本编辑器集成规范 | Claude Code |
| 2026-04-30 | v2.1 | 新增禁止自动执行构建规范 | Claude Code |
| 2026-07-13 | v3.0 | 统一消息提示标准（notification）、更新HTTP方法规范、关键词参数统一为keyword | Claude Code |
| 2026-07-16 | v3.1 | 新增图片缩略图处理规范（§12），16个文件接入 imageUtils | Claude Code |
| 2026-07-16 | v3.2 | 新增表格列排列标准（§13），9种列类型+列宽速查表 | Claude Code |
| 2026-07-16 | v3.3 | 新增接口调用(§14)、搜索交互(§15)、表单验证(§16)、操作按钮(§17)、状态默认值(§18)、排序字段(§19)、区域卡片(§20)、弹窗模板(§21)；CLAUDE.md 328→130 行，项目 CLAUDE.md 232→86 行 | Claude Code |

---

**适用范围**: `src/admin` 目录所有开发者
**制定日期**: 2026-04-10
**生效日期**: 2026-04-29
**维护责任人**: 管理后台技术负责人
