# 管理后台开发准则 (Admin Development Guidelines)

## 核心定位
通用管理后台模板专家。基于 React + Ant Design 开发 PC 端管理系统，**PC端WEB为主，兼容手机端**。

---

## 文档结构

| 文档 | 定位 | 用途 |
|------|------|------|
| **CLAUDE.md** | 核心规则（宪法） | 开发前必读，简洁要点式，禁止违反 |
| **docs/development-standards.md** | 代码模板（案例库） | 遇到问题时查阅，提供可复制代码示例 |
| **docs/PROJECT_MANAGEMENT.md** | 项目管理指南 | **复制新项目时必须查阅** |

---

## 核心开发规范（必须遵守）

### 1. 接口调用
- **数据读取**：`response?.data?.list || response?.data || response?.list`
- **分页总数**：`response?.data?.count || response?.count || 0`
- **错误提示**：`error.response?.data?.msg || error.response?.data?.error || '操作失败'`
- **必须传参**：`start`、`length` 分页参数

### 2. 搜索交互
- 筛选参数通过 `search()` 函数传递
- **下拉选项**：第一个选项为"全部"，值为空字符串 `''`
- **输入框命名**：关键词输入框 `name="word"`，状态变量与 name 保持一致

### 3. 页面信息
- 每个页面必须有标题（title）和功能介绍（description）
- 功能介绍用中文描述用户可见的功能，不含技术术语（如"JSON"、"API"、"数据库"等）
- 示例：❌ "管理平台用户标签，提交后所有标签以JSON数组格式存储" → ✅ "管理平台用户标签，用户可在个人资料中选择感兴趣的标签"

### 4. 日期格式
- 统一使用 `YYYY/MM/DD HH:mm:ss`
- 可用 `formatDateTime()` 工具函数

### 5. 表格列表
- 使用 `StandardTable` 组件，自动处理空状态
- ID列：隐藏
- 状态列：用 Tag 渲染，颜色映射枚举
- 操作列使用 `ActionColumn` 组件
- **排序**：列表默认按 `orderon` 字段升序（数值越小越靠前）

### 6. 表单验证
- 使用 `onFinish` 处理提交
- 密码验证：必须包含大写、小写、数字、特殊符号
- Modal 使用 `destroyOnClose` 属性

### 7. 操作按钮
- 所有操作按钮添加 `className="action-buttons"`
- 删除操作使用 `confirmDelete` 函数
- 操作后显示 `message.success` 或 `message.error` 反馈
- 添加按钮使用完整描述性文字，如"添加管理员"而非"添加"

### 8. 枚举使用
- 禁止硬编码状态值（如 `status === 1`）
- 必须引用 `src/shared/constants` 中的枚举
- 如：`RealNameAuthStatus.PENDING`、`BannerStatus.ENABLED`
- **status 字段统一标准**：`ENABLED = 0`（启用），`DISABLED = 1`（禁用），所有 status 枚举必须遵守此标准

### 9. 状态默认值
- 新增数据如包含 `status` 字段，默认值为 **启用状态**（通常为 `0`）
- Switch 组件需配置 `getValueFromEvent` / `getValueProps` 映射
- 表单使用 `initialValues` 统一设置默认值

### 10. 排序字段
- 列表排序统一使用 `orderon` 字段
- 排序规则：**数值越小越靠前**
- 列表内可内联编辑排序，支持清空（不传值）
- 添加时：显示排序字段，若为空则不传（或传空），不默认填 0
- 编辑时：**不显示**排序字段，排序仅通过列表内联编辑
- InputNumber 不设置 placeholder，避免显示灰色"空"字

### 11. 模板组件（必须使用）
**新建页面必须使用模板组件，禁止重复造轮子**。

| 场景 | 必须使用的模板 |
|------|--------------|
| 列表页 | `useListPage` hook + `StandardPage` + `StandardTable` + `SearchPanel` |
| 操作列 | `ActionColumn` 组件 |
| 添加/编辑弹窗 | `AddEditModal` 模板 |
| 详情弹窗 | `DetailModal` 模板 |
| 状态切换 | `StatusSwitch` 组件 |
| 删除确认 | `confirmDelete` 函数 |
| 搜索面板 | `SearchPanel` 组件（统一下拉/输入/按钮布局和交互） |

**模板位置**：
- Hooks: `src/hooks/useListPage.ts`、`src/hooks/useModalForm.ts`
- 组件: `src/components/templates/`
- 使用文档: `src/components/templates/README.md`

**例外情况**：如果模板无法满足特殊业务需求，可在 `src/components/templates/` 目录下创建新的专用模板组件。

---

## 技术栈

| 技术 | 规范 |
|------|------|
| 框架 | React (Functional Components + Hooks) |
| UI库 | Ant Design v5+，使用标准组件 |
| 状态 | `useState`，跨页共用才用 Context |
| 网络 | 用 `axios` 封装实例，严禁 `fetch` |
| 枚举 | 统一在 `src/shared/constants` |

---

## 禁止行为

- ❌ Web 端使用 `wx.` 等小程序 API
- ❌ 修改 `src/shared`（除非获得授权）
- ❌ 硬编码状态值
- ❌ 根目录创建 `.md` 文档（放 `docs/`）
- ❌ 根目录创建测试文件（放 `tests/`）
- ❌ 敏感信息写入代码注释

---

## 文档创建规则

1. 创建前阅读 `docs/DOCUMENT_MANAGEMENT.md`
2. 按命名规范命名（小写英文字母、连字符分隔）
3. 过期文档移动到 `docs/archive/`

### 垃圾文件识别（立即清理）
- 临时文件：`*~`、`*_副本.md`、`*.tmp`、`*_backup.md`
- 过期草稿：`draft-*.md` 超1个月未更新
- 敏感泄露：含密码、密钥的注释

---

## 项目管理

复制新项目时，**必须**查阅 `docs/PROJECT_MANAGEMENT.md` 并按其中的指引执行。

触发指令示例：
- `复制新项目 admin-hsh1039，1039俱乐部+`
- `从 admin-hsh1039 复制新项目 admin-xxx，新项目名称`
