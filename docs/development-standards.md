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

## 变更日志

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-04-10 | v1.0 | 初始版本 | Claude Code |
| 2026-04-17 | v1.1 | 新增列表接口规范、编辑弹窗规范 | Claude Code |
| 2026-04-18 | v1.2 | 新增富文本编辑器集成规范 | Claude Code |
| 2026-04-30 | v2.1 | 新增禁止自动执行构建规范 | Claude Code |
| 2026-07-13 | v3.0 | 统一消息提示标准（notification）、更新HTTP方法规范、关键词参数统一为keyword | Claude Code |

---

**适用范围**: `src/admin` 目录所有开发者
**制定日期**: 2026-04-10
**生效日期**: 2026-04-29
**维护责任人**: 管理后台技术负责人
