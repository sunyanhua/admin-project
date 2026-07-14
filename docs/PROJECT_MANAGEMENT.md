# 项目管理指南

## 📋 项目列表

| 项目名称 | 项目文件夹 | 使用端口 | 状态 |
|----------|-----------|----------|------|
| 搭子计划（模板） | `packages/admin-template` | 3100 | 🟢 模板 |
| 1039俱乐部+ | `packages/admin-hsh1039` | 3101 | 🟢 开发中 |

---

## 📋 项目复制指引

当你说「复制新项目」时，AI 自动执行以下步骤：

### 触发指令格式

```
复制新项目 [项目文件夹名]，[项目名称]
```

或指定从哪个项目复制：

```
从 [源项目文件夹] 复制新项目 [项目文件夹名]，[项目名称]
```

**示例：**
- `复制新项目 admin-hsh1039，1039俱乐部+`
- `从 admin-template 复制新项目 admin-hsh1039，1039俱乐部+`
- `从 admin-hsh1039 复制新项目 admin-xxx，新项目名称`

### AI 自动执行步骤

**步骤 1：复制文件夹**
- 如果指定了源项目，从 `packages/[源项目]` 复制
- 如果未指定，默认从 `packages/admin-template` 复制
- 创建新文件夹 `packages/[项目文件夹名]/`
- 复制所有内容（排除 `node_modules`、`dist`、`dist-test`、`.git`、`.claudeignore` 等）

**⚠️ 重要：必须创建或更新 `.claudeignore` 文件**
在复制源项目的根目录下创建/追加 `.claudeignore`，内容如下：
```
# 复制项目时排除
node_modules
dist
dist-test
*.log
.DS_Store
```

**步骤 2：替换项目标识**
- 将新文件夹中所有 `搭子计划` 相关文字替换为新项目名称
- **必须替换的文件清单**（缺一不可）：
  - `package.json` 的 name 字段
  - `.env.development` 的 `VITE_PORT` 和 `VITE_APP_TITLE`
  - `.env.production` 的 `VITE_APP_TITLE`
  - `.env.test` 的 `VITE_APP_TITLE`
  - `CLAUDE.md` 中的项目定位描述
  - `README.md` 中的项目介绍
  - `SITEMAP.md` 中的项目名称
  - `index.html` 的 `<title>` 标签
	  - **所有三个 `.env.*` 文件必须设置 `VITE_PROJECT_ID=[项目文件夹]`**（多项目同域名部署时隔离 localStorage）
  - `src/pages/Dashboard.tsx`、`src/pages/Login.tsx`、`src/components/layout/MainLayout.tsx` 中的标题文字

**⚠️ 文本替换注意事项**
- 禁止使用 Bash 命令中的 PowerShell 管道进行替换（会导致路径转义错误和编码问题）
- **必须使用 Python 或 Node.js 进行文本替换**，确保：
  - 路径中的反斜杠正确保留（如 `D:\\GitHub\\...`）
  - UTF-8 编码不丢失
- 示例（Python）：
  ```python
  with open('file_path', 'r', encoding='utf-8') as f:
      content = f.read()
  content = content.replace('搭子计划', '新项目名称')
  with open('file_path', 'w', encoding='utf-8') as f:
      f.write(content)
  ```

**步骤 3：分配端口**
- 检查现有项目的端口使用情况
- 从最大端口号依次递增分配（如 3100, 3101, 3102...）
- 更新 `.env.development` 中的 `VITE_PORT`
- 更新 `vite.config.ts` 中的 `env.VITE_PORT || 3100`

**步骤 4：更新本文档**
- 在项目列表中新增一行
- 记录项目名称、文件夹、端口

**步骤 5：验证复制结果**
复制完成后，必须验证以下内容：
- [ ] 项目文件夹存在且包含所有必要文件
- [ ] 所有 `.env.*` 文件中的项目名称和端口已正确更新
- [ ] 所有 `.env.*` 文件中的 `VITE_PROJECT_ID` 已设置为项目文件夹名
- [ ] `CLAUDE.md`、`README.md`、`SITEMAP.md`、`index.html` 中的项目名称已替换
- [ ] `dist`、`dist-test` 等文件夹不存在于新项目中
- [ ] 确认根目录有 `node_modules`（依赖由 workspaces 统一管理）

### 项目信息替换清单

复制新项目时，需要替换的关键词：

| 原关键词 | 替换为 |
|----------|--------|
| `搭子计划` | `[新项目名称]` |
| `admin-template` | `[新项目文件夹]` |
| `3100`（如需） | `[新端口]` |
| `VITE_PROJECT_ID=[源项目ID]` | `VITE_PROJECT_ID=[新项目文件夹]` |

### 注意事项

1. **端口冲突** - 确保新端口未被其他项目占用
2. **接口文档** - `docs/openapi.json` 需要手动替换为新项目的接口文档
3. **环境变量** - 检查 `.env.*` 文件中的 API 地址是否需要修改
4. **依赖安装** - 本项目使用 npm workspaces，依赖统一在根目录管理，**各子项目不需要也禁止安装 node_modules**。如果子项目中有 node_modules，请删除。
5. **VITE_PROJECT_ID** — 多项目部署在同一域名下时，VITE_PROJECT_ID 用于隔离各项目的 localStorage（登录态不互串）。复制项目时必须设置。详见步骤 2。
6. **编码问题** - 如果发现文件出现乱码（�字符），必须立即重新复制源项目并使用正确方法替换文本

---

## 🚀 新项目启动流程

### PM2 托管配置

项目通过 PM2 托管实现持久化运行。配置文件位于：
```
D:\OneDrive\重要文件\AI_Sync\PM2\ecosystem.config.js
```

### 添加新项目到 PM2

**⚠️ 关键规则：必须添加到 `companyOnlyApps` 数组中，不是 `baseApps`！**

在新项目文件夹复制完成后，需要手动添加配置：

```javascript
{
  name: "server-[项目文件夹]",
  script: "../Project/npm_launcher.js",
  interpreter: "node",
  windows_hide: true,
  env: {
    NODE_ENV: "development",
    DEV_CWD: "D:\\GitHub\\admin-project\\packages\\[项目文件夹]",
    NPM_SCRIPT: "dev",
    BROWSER: "none",
    PORT: [端口号],
    VITE_PORT: [端口号],
    STRICT_PORT: true
  }
}
```

**⚠️ DEV_CWD 路径格式要求：**
- 必须使用 **双反斜杠** `\\` 或 **正斜杠** `/`
- 正确：`D:\\GitHub\\admin-project\\packages\\admin-hsh1039`
- 错误：`D:\GitHub\admin-project\packages\admin-hsh1039`（单反斜杠会导致 `\a` 被当作转义字符）

**⚠️ 手动编辑 ecosystem.config.js 时的检查项：**
1. 确认新配置在 `companyOnlyApps` 数组内，不是 `baseApps`
2. 确认 `DEV_CWD` 路径使用双反斜杠
3. 检查 JSON 语法是否正确（无多余逗号、`}`、`{`）

### PM2 管理命令

```bash
# 查看所有托管服务
pm2 list

# 启动指定项目
pm2 start ecosystem.config.js --only server-[项目文件夹]

# 重启指定项目
pm2 restart server-[项目文件夹]

# 停止指定项目
pm2 stop server-[项目文件夹]

# 保存当前 PM2 配置（重启后自动恢复）
pm2 save
```

### AI 自动托管（可选）

复制项目时，你可以让我自动完成 PM2 配置。我会：
1. 生成新的 PM2 配置项
2. 追加到 `ecosystem.config.js`
3. 执行 `pm2 start` 启动托管
4. 执行 `pm2 save` 保存配置（确保重启后自动恢复）

只需在指令中说明：
```
复制新项目 admin-hsh1039，1039俱乐部+，并启动PM2托管
```

---

## 🔧 项目辅助功能（手动配置）

以下功能需要手动编辑配置文件后才能启用，AI 不会自动处理：

| 功能 | 配置文件 |
|------|---------|
| 自动更新接口文档 | `D:\OneDrive\重要文件\AI_Sync\Project\api_tasks.json` |
| 项目测试 FTP 自动更新 | `D:\OneDrive\重要文件\AI_Sync\Project\projects.json` |

> 添加新项目后，请手动更新上述两个配置文件，将新项目信息写入对应的 JSON 数组中。

---

*最后更新：2026-07-10*
