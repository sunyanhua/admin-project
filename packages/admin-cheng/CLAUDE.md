# 他俩能成 - 管理后台项目专属规则

## 项目定位

"他俩能成"管理后台。基于 React + Ant Design 构建，**PC端WEB为主，兼容手机端**。

管理后台地址：
| 环境 | 域名 |
|------|------|
| 测试环境 | `https://admin-test.vbegin.com.cn/cheng` |
| 正式环境 | `https://admin.vbegin.com.cn/cheng` |

---

## OldSun 自动同步注意事项

OldSun 自动同步会将外部代码同步到本仓库，可能覆盖本地未提交的修改。

- **修改前**：务必先 `git commit` 提交
- **同步前**：确认没有未提交的修改
- **同步后**：检查 `git diff` 确认没有文件被覆盖

> 项目进度（已完成模块、接口清单、待办）见 `docs/PROGRESS.md`。站点地图见 `docs/SITEMAP.md`。

---

## 🔧 开发规范

### UI 消息提示（强制遵守，最高优先级）

**禁止 `import { message } from 'antd'`。** 全站必须用 `useAppNotification` hook。这是反 Ant Design 官方文档习惯的硬约束——用错了不会报错，但消息静默不显示。

| 场景 | 用法 |
|------|------|
| 页面/弹窗组件 | `const { success, error: showError } = useAppNotification()` |
| 自定义 Hook | `const { notification } = App.useApp()` |
| 拦截器/纯函数 | 不弹 UI 提示，只 reject |

**禁止**：`catch (error: any)` 变量遮蔽（别名用 `err` 或 `showError`）。

### 区域卡片样式（SectionBlock）

配置页面功能区域使用统一卡片样式。色值表 + 代码模板见 `../../docs/development-standards.md`。

### 弹窗模板

所有带表单的弹窗必须用 `ScrollableModal`，**禁止 `import { Modal } from 'antd'` 做表单弹窗**。Props 表 + 代码模板见 `../../docs/development-standards.md`。

**弹窗必须 `maskClosable={false}`**：点击蒙层不关闭弹窗，只能通过关闭按钮关闭。模板组件 `ScrollableModal` 已内置，其他直接使用 `<Modal>` 的组件必须显式添加该属性。

### 筛选搜索参数

全系统关键词搜索参数统一为 **`keyword`**（非 `word`）。

---

## ⚠️ 接口文档（必读，严禁用错）

接口定义和响应格式以 `../../docs/api/cheng-swagger.json` 为准，禁止凭旧项目经验猜测字段名。禁止使用 `docs/openapi.json`（旧系统搭子计划，完全不兼容）。

### 新旧系统关键差异

| 差异点 | ❌ 旧系统（搭子计划） | ✅ 新系统（他俩能成） |
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
| 测试环境 | `https://tlnc-test.vbegin.com.cn` |
| 正式环境 | `https://tlnc.vbegin.com.cn` |
