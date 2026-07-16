# 管理后台开发准则 (Admin Development Guidelines)

## 核心定位
通用管理后台模板专家。基于 React + Ant Design 开发 PC 端管理系统，**PC端WEB为主，兼容手机端**。

---

## 文档结构

| 文档 | 定位 | 用途 |
|------|------|------|
| **CLAUDE.md**（本文件） | 核心规则（宪法） | 只记"不读就犯错"的硬约束，开发前必读 |
| **docs/development-standards.md** | 代码模板 + 模式参考 | 写代码时查阅，含接口、搜索、表单、排序等完整示例 |
| **docs/PROJECT_MANAGEMENT.md** | 项目管理指南 | **复制新项目时必须查阅** |

---

## 核心开发规范（必须遵守）

### 1. 枚举使用
- **禁止硬编码状态值**（如 `status === 1`），必须引用 `src/shared/constants` 中的枚举
- 示例：`RealNameAuthStatus.PENDING`、`BannerStatus.ENABLED`
- **status 字段统一标准**：`ENABLED = 0`（启用），`DISABLED = 1`（禁用），所有 status 枚举必须遵守

### 2. 页面信息
- 每个页面必须有标题（title）和功能介绍（description）
- 功能介绍用中文描述用户可见的功能，不含技术术语（如"JSON"、"API"、"数据库"等）
- 示例：❌ "管理平台用户标签，提交后所有标签以JSON数组格式存储" → ✅ "管理平台用户标签，用户可在个人资料中选择感兴趣的标签"

### 3. 模板组件（必须使用）
**新建页面必须使用模板组件，禁止重复造轮子**。

| 场景 | 模板 |
|------|------|
| 列表页 | `useListPage` + `StandardPage` + `StandardTable` + `SearchPanel` |
| 操作列 | `ActionColumn` |
| 添加/编辑 | `AddEditModal` |
| 详情 | `DetailModal` |
| 状态切换 | `StatusSwitch` |
| 删除确认 | `confirmDelete` |

位置：`src/hooks/`、`src/components/templates/`。例外：模板无法满足时在同目录下新建。

### 4. 图片缩略图（必须使用）
- **原则**：内联展示用缩略图，点击预览用原图。编辑/表单页面保持原图
- **工具**：`src/utils/imageUtils.ts`，只对含 `vbegin` 的 CDN URL 生效
- 代码模板见 `docs/development-standards.md` §12

| 场景 | 方法 |
|------|------|
| 用户头像 | `getAvatarUrl(url)` |
| 全屏大图（Banner/活动封面/详情图/动态图片/个人主页封面） | `getFullWidthUrl(url)` |
| 列表展示（动态封面/收藏列表等） | `getMediumUrl(url)` |
| 方形小图（话题封面/分类封面） | `getSmallUrl(url)` |

不需要压缩：编辑页预览、证件照、小程序码/二维码、静态 import、非 vbegin 图片。

### 5. 表格列排列标准（必须遵守）
代码模板见 `docs/development-standards.md` §13。

**核心规则**：
- **标题列**：不设 width、不写 ellipsis，自动换行，`wordBreak:'break-word'`
- **Tag 列**：宽 90~100，**必须有 `title` 属性**（hover 看完整文字）
- **Switch 列**：宽 100，仅 binary 状态
- **日期/时间列**：宽 120，双行（日期 / 时间）
- **头像+昵称列**：宽 140~160，`Button type="link"` + `Space size={4}` + `Avatar size={40}` + `getAvatarUrl()`
- **排序列**：宽 120，`InputNumber` 宽 70，不设 placeholder
- **封面列**：宽 80，`getMediumUrl()` + `preview={{ src: 原图 }}`

| 内容类型 | 宽度 | | 内容类型 | 宽度 |
|---------|------|-|---------|------|
| 封面/图标 | 80 | | 日期/时间 | 120 |
| 状态Tag | 90~100 | | 排序输入 | 120 |
| 数字/金额 | 90~100 | | 发布者 | 140~160 |
| 开关 | 100 | | 流水号 | 180 |
| 标题 | 不设宽，自动换行 | | 操作列 | 50~200 |

---

## 开发模式参考

以下模式遵循固定写法，代码模板见 `docs/development-standards.md`：

| 模式 | 查阅 |
|------|------|
| 接口调用（数据读取、分页、错误提示、`start`/`length` 参数） | §1、§7、§14 |
| 搜索交互（`search()` 传参、下拉在输入框前、placeholder 如"全部状态"、option **不含"全部"**、关键词 `name="keyword"`） | §15 |
| 日期格式（统一 `YYYY/MM/DD HH:mm:ss` + `formatDateTime()`） | §8 |
| 表格列表（StandardTable、ID列隐藏、状态列 Tag、按 orderon 升序） | §1、§2 |
| 表单验证（`onFinish`、密码四要素、`destroyOnHidden`） | §16 |
| 操作按钮（`className="action-buttons"`、`confirmDelete`、反馈提示） | §17 |
| 状态默认值（新增 status 默认启用 0、Switch 值映射、`initialValues`） | §18 |
| 排序字段（orderon、内联编辑、添加/编辑区别、不设 placeholder） | §19 |

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

## 文档管理

1. 创建前阅读 `docs/DOCUMENT_MANAGEMENT.md`
2. 按命名规范命名（小写英文字母、连字符分隔）
3. 过期文档移动到 `docs/archive/`

---

## 项目管理

复制新项目时，**必须**查阅 `docs/PROJECT_MANAGEMENT.md` 并按其中的指引执行。
