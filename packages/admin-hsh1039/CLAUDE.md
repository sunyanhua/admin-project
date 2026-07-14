# 1039俱乐部+ - 管理后台项目专属规则

## 项目定位

"1039俱乐部+"管理后台。本项目基于 React + Ant Design 构建，**PC端WEB为主，兼容手机端**。

---

## OldSun 自动同步注意事项

OldSun 自动同步会将外部代码同步到本仓库，可能覆盖本地未提交的修改。

- **修改前**：务必先 `git commit` 提交
- **同步前**：确认没有未提交的修改
- **同步后**：检查 `git diff` 确认没有文件被覆盖

---

## 项目当前状态

**最后更新**: 2026-07-13

### 已完成模块
- 系统管理：工作台、角色管理、管理账号、管理日志、修改密码、我的日志
- 运营管理：运营分类管理、活动分类管理、活动发布、轮播图管理、协议文档、FAQ管理
- 财务管理（待重构）

### 已完成接口迁移
- 登录/鉴权（JWT Bearer Token）
- 管理员 CRUD（`/admin/v1/users`）
- 角色管理（`/admin/v1/roles`）
- 权限分配（`/admin/v1/permissions` + `/admin/v1/roles/:id/permissions`）
- 分类管理（`/admin/v1/mall/categories`）
- 活动管理（`/admin/v1/mall/products`，is_virtual=true）
- 日志（`/admin/v1/logs/audit`、`/admin/v1/logs/my`）

### 待办
- 财务管理接口迁移
- 测试覆盖（Vitest + React Testing Library）
- 性能优化（代码分割、懒加载）
- 部署配置（Docker、CI/CD）

---

## 🔧 开发规范

> 通用规范见 `docs/development-standards.md`，本项目在此基础上补充以下规则。

### UI 消息提示（全站统一，强制遵守）

**一律使用 `useAppNotification` hook 或 `App.useApp().notification`，严禁直接 import `message` 或用静态方法。**

| 场景 | 用法 |
|------|------|
| 页面/弹窗组件 | `const { success, error: showError } = useAppNotification()` |
| 自定义 Hook | `const { notification } = App.useApp()` |
| 删除确认 | `confirmDelete()`（已使用注入 handler） |
| 拦截器/纯函数 | 不弹 UI 提示，只 reject（`api/index.ts`） |

**正确示例：**
```typescript
const { success, error: showError } = useAppNotification();
catch (err: any) {
  showError(err?.response?.data?.message || '请求失败');
}
```

**禁止行为：**
- ❌ `import { message } from 'antd'` → 使用 `App.useApp().notification`
- ❌ 拦截器弹窗 + 组件 catch 弹窗 → 拦截器已关闭 UI 提示，只由组件处理
- ❌ `catch (error: any)` 后调用 `error()` → 变量遮蔽，应重命名为 `showError`

### 筛选搜索参数

全系统关键词搜索参数统一为 **`keyword`**（非 `word`）。

### 弹窗模板（强制使用，禁止绕过）

**所有带表单的弹窗必须使用 `ScrollableModal` 组件，禁止直接用 `<Modal>`。**

样式全部由 `src/components/templates/ScrollableModal.css` 管理，**严禁在业务代码中内联覆盖**。

#### 简单弹窗（无 header/footer）

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

#### 带 header（如 Steps 步骤条）

```tsx
<ScrollableModal title="添加活动" open={visible} onCancel={onClose} width={900} destroyOnHidden
  header={<Steps current={0} items={[{title:'活动信息'},{title:'项目配置'},{title:'上架管理'}]} />}
  footer={
    <Space>
      <Button onClick={onClose}>取消</Button>
      <Button type="primary" onClick={handleNext}>下一步</Button>
    </Space>
  }>
  {currentStep === 0 && <Step1Form />}
  {currentStep === 1 && <Step2Config />}
</ScrollableModal>
```

#### ScrollableModal Props

| Prop | 类型 | 说明 |
|------|------|------|
| `header` | ReactNode | 可选，固定在滚动区上方的头部（Steps 等） |
| `footer` | ReactNode | 可选，固定在底部的按钮区，不传则不显示 |
| 其他 | 继承 ModalProps | `title`/`open`/`onCancel`/`width`/`destroyOnHidden` 等 |

#### 布局标准（CSS 固化，不可修改）

```
┌──────────────────────────────────────────────┐
│ Modal 标题栏（原生 header）                    │
├─ sm-header（可选）───────────────────────────┤  margin-bottom: 15px, padding: 0 24px
├─────────────────── 上边线 ───────────────────┤
│ sm-body（flex:1, overflow-y:auto）           │  padding: 16px, 唯一滚动区
├─────────────────── 下边线 ───────────────────┤
│ sm-footer（可选）                             │  padding: 12px 24px, text-align: right
└──────────────────────────────────────────────┘

.sm-container: max-height: 75vh, 弹窗不超视口
.ant-modal-body: padding: 10px 0
```

#### 禁止事项

- ❌ `import { Modal } from 'antd'` 用于表单弹窗 → 必须用 ScrollableModal
- ❌ 按钮放在 `<Form>` 内部作为 `<Form.Item>` → 必须放在 `footer` prop 中
- ❌ 覆盖 `.sm-*` 或 `.scrollable-modal` 的 CSS → 统一标准，一处修改全站生效
- 不需要手动设 `styles={{ body: ... }}`，模板已统一处理

---

## ⚠️ 接口文档（必读，严禁用错）

> **本项目的专属接口文档是以下两个文件，不允许使用任何其他接口文档！**

| 类型 | 绝对路径（供 AI 工具读取） | 说明 |
|------|--------------------------|------|
| OpenAPI JSON | `D:/GitHub/admin-project/docs/api/hsh-swagger.json` | 接口定义，**必须以此文件为准** |
| Markdown 文档 | `D:/GitHub/admin-project/docs/api/hsh-swagger.md` | 接口说明，便于理解业务逻辑 |

### 🚫 严禁假设接口格式

**接口的请求参数、响应字段、返回格式，一律以 `hsh-swagger.json` 中的 Schema 定义和实际调用返回的数据为准。禁止凭旧项目经验、旧文档、其他接口格式来猜测或假设。**

- ❌ 禁止假设字段名（如假设 token 字段叫 `access_token` 而不是 `token`）
- ❌ 禁止假设响应结构（如假设用户数据在 `user` 字段而不是 `admin` 字段）
- ❌ 禁止假设分页格式（如假设 `start`/`length` 而不是 `page`/`page_size`）
- ✅ 每次修改接口调用前，**必须先读取 swagger 中的 Schema 定义**，确认字段名和类型
- ✅ 接口调通后，**以实际返回的数据为准**，修正代码中的字段映射

### 🚫 严禁使用的文档

以下文件属于**旧系统（搭子计划）**，与本项目**完全不同**，绝对不能引用：

| 禁止文件 | 原因 |
|---------|------|
| `D:/GitHub/admin-project/docs/openapi.json` | 旧搭子计划接口，路径/参数/鉴权/响应格式均不兼容 |

### 🔑 新旧系统关键差异（对照参考）

| 差异点 | ❌ 旧系统（搭子计划） | ✅ 新系统（1039俱乐部+） |
|--------|---------------------|------------------------|
| URL 前缀 | `/admin/` | `/admin/v1/` |
| 登录路径 | `POST /admin/login` | `POST /admin/v1/login` |
| 登录参数 | `name`, `pass` (form-urlencoded) | `username`, `password` (JSON) |
| 鉴权方式 | Cookie Session | Bearer Token (JWT) |
| 响应格式 | `{ status, data, error }` | `{ code, message, data }` |
| 分页结构 | `data` 为数组, `count` 为总数 | `data.list` 为数组, `data.total` 为总数 |

### 接口地址

| 环境 | 域名 |
|------|------|
| 测试环境 | `https://hsh-test.vbegin.com.cn` |
| 正式环境 | `https://hsh.vbegin.com.cn` |
