# 项目管理指南

```
📋 项目列表
└── 端口分配约定

📋 项目复制指引
├── 触发指令格式
├── AI 自动执行步骤
│   ├── 步骤 1：复制文件夹
│   ├── 步骤 2：替换项目标识
│   ├── 步骤 3：分配端口
│   ├── 步骤 4：更新本文档
│   └── 步骤 5：验证复制结果
├── 复制失败处理
├── 项目信息替换清单
└── 注意事项

🚀 新项目启动流程
├── PM2 托管配置
├── 添加新项目到 PM2
├── PM2 管理命令
├── AI 自动托管（可选）
└── FTP 自动部署配置（可选）

🔧 项目辅助功能（手动配置）
└── 自动更新接口文档
```

---

## 📋 项目列表

| 项目名称 | 项目文件夹 | 使用端口 | 状态 |
|----------|-----------|----------|------|
| 搭子计划（模板） | `packages/admin-template` | 3100 | 🟢 模板 |
| 1039发现 | `packages/admin-hsh1039` | 3101 | 🟢 开发中 |
| 他俩能成 | `packages/admin-cheng` | 3102 | 🟢 开发中 |

### 端口分配约定

| 类型 | 端口 |
|------|------|
| 模板项目（固定） | **3100** |
| 业务项目范围 | **3101–3199** |
| 新项目端口 | `max(现有端口) + 1` |

---

## 📋 项目复制指引

当你说「复制新项目」时，AI 自动执行以下步骤：

### 触发指令格式

中英文逗号均兼容，以下格式任选其一：

```
复制新项目 [项目文件夹名]，[项目名称]
```

或指定从哪个项目复制：

```
从 [源项目文件夹] 复制新项目 [项目文件夹名]，[项目名称]
```

**示例：**
- `复制新项目 admin-hsh1039，1039发现`
- `从 admin-template 复制新项目 admin-hsh1039，1039发现`
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
  - `CLAUDE.md` 中的项目定位描述、管理后台地址（仅替换目录）
  - `README.md` 中的项目介绍
  - `docs/SITEMAP.md` 中的项目名称
  - `index.html` 的 `<title>` 标签
  - **所有三个 `.env.*` 文件必须设置 `VITE_PROJECT_ID=[去掉 admin- 前缀后的项目文件夹]`**，如 `admin-hsh1039` → `hsh1039`（多项目同域名部署时隔离 localStorage）
  - `src/pages/Dashboard.tsx`、`src/pages/Login.tsx`、`src/components/layout/MainLayout.tsx` 中的标题文字

> **⚠️ 多项目同域名部署：`VITE_PROJECT_ID` 是关键配置。** 用于隔离各项目的 localStorage（如登录态）。遗漏此项会导致多项目之间登录态互串。复制项目时**必须设置，不可跳过**。

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
- [ ] 所有 `.env.*` 文件中的 `VITE_PROJECT_ID` 已设置为项目文件夹名（去掉 `admin-` 前缀）
- [ ] `CLAUDE.md`、`README.md`、`SITEMAP.md`（含 `docs/SITEMAP.md`）、`index.html` 中的项目名称已替换
- [ ] `dist`、`dist-test` 等文件夹不存在于新项目中
- [ ] 确认根目录有 `node_modules`（依赖由 workspaces 统一管理）

### 复制失败处理

如果复制过程在中途失败（文本替换报错、环境变量未完整设置等）：

1. 直接删除 `packages/[新项目文件夹]/`
2. 修复导致失败的根因（如源文件编码问题、路径错误等）
3. 重新执行复制流程

**禁止**在"半成品"项目上继续修改——从头重来更可靠。

### 项目信息替换清单

复制新项目时，需要替换的关键词：

| 原关键词 | 替换为 | 涉及文件 |
|----------|--------|---------|
| `搭子计划` | `[新项目名称]` | `CLAUDE.md`、`README.md`、`docs/SITEMAP.md`、`index.html`、`src/pages/Dashboard.tsx`、`src/pages/Login.tsx`、`src/components/layout/MainLayout.tsx` |
| `admin-template`（或源项目目录） | `[新项目文件夹]` | `package.json`、所有 `.env.*`、`CLAUDE.md` |
| `3100` | `[新端口]` | `.env.development`、`vite.config.ts` |
| `VITE_PROJECT_ID=hsh1039`（源项目ID） | `VITE_PROJECT_ID=[去掉 admin- 前缀后的项目文件夹]`（如 `cheng`） | 所有 `.env.*` 文件 |

### 注意事项

1. **端口冲突** - 确保新端口未被其他项目占用
2. **接口文档** - `docs/api/hsh-swagger.json` 需要替换为新项目的接口文档（旧项目 `docs/openapi.json` 已废弃，1039发现不兼容）
3. **环境变量** - 检查 `.env.*` 文件中的 API 地址是否需要修改
4. **依赖安装** - 本项目使用 npm workspaces，依赖统一在根目录管理，**各子项目不需要也禁止安装 node_modules**。如果子项目中有 node_modules，请删除。
5. **VITE_PROJECT_ID** — 多项目部署在同一域名下时，VITE_PROJECT_ID 用于隔离各项目的 localStorage（登录态不互串）。复制项目时必须设置。值为项目文件夹去掉 `admin-` 前缀（如 `admin-hsh1039` → `hsh1039`）。详见步骤 2。
6. **编码问题** - 如果发现文件出现乱码（�字符），必须立即重新复制源项目并使用正确方法替换文本

---

## 🚀 新项目启动流程

### PM2 托管配置

项目通过 PM2 托管实现持久化运行。配置文件位于用户自定义路径（示例）：
```
<PM2_CONFIG_PATH>/ecosystem.config.js
```
> 以下路径为开发者本地配置，其他开发者需根据实际环境调整。

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
    DEV_CWD: "<项目根目录>\\packages\\[项目文件夹]",
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
- 正确：`<项目根目录>\\packages\\admin-hsh1039`（如 `D:\\GitHub\\admin-project\\packages\\admin-hsh1039`，替换为你的实际路径）
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
复制新项目 admin-hsh1039，1039发现，并启动PM2托管
```

### FTP 自动部署配置（可选）

复制项目时，你可以让我自动完成 FTP 部署配置。我会：

1. 在 `projects.json` 中以"后台管理项目-1039发现"为模板，在"后台管理项目"条目后方新增配置项
2. 替换以下字段，其余字段（`ftp_enabled`、`host`、`port`、`user`、`pass`、`deploy_dir`）保持不变：

| 字段 | 模板值 | 替换为 |
|------|--------|--------|
| 配置项 Key | `"后台管理项目-1039发现"` | `"后台管理项目-[新项目名称]"` |
| `path` | `"D:\\GitHub\\admin-project\\packages\\admin-hsh1039"` | `"<项目根目录>\\packages\\[新项目文件夹]"` |
| 测试环境 `remote_path` | `"/hsh1039/"` | `"/[新项目文件夹]/"` |
| 正式环境 `remote_path` | `"/hsh1039/"` | `"/[新项目文件夹]/"` |

<details>
<summary>模板配置结构（点击展开）</summary>

```jsonc
"后台管理项目-[新项目名称]": {
    "path": "D:\\GitHub\\admin-project\\packages\\[新项目文件夹]",
    "ftp_enabled": true,
    "ftp_targets": [
      {
        "name": "测试环境",
        "ftp_config": {
          "host": "10.192.8.11",
          "port": 2121,
          "user": "cn.com.vbegin.admin",
          "pass": "admin@ftp@vbegin",
          "deploy_dir": "dist-test",
          "remote_path": "/[新项目文件夹]/"
        }
      },
      {
        "name": "正式环境",
        "ftp_config": {
          "host": "10.86.11.248",
          "port": 2121,
          "user": "cn.com.vbegin.admin",
          "pass": "admin@ftp@vbegin",
          "deploy_dir": "dist",
          "remote_path": "/[新项目文件夹]/"
        }
      }
    ]
  }
```
</details>

> **⚠️ 路径反斜杠**：`path` 字段必须使用双反斜杠 `\\` 或正斜杠 `/`，禁止单反斜杠。

3. 执行 `pm2 reload ftp-patrol` 使配置生效

只需在指令中说明：
```
复制新项目 admin-hsh1039，1039发现，并配置FTP自动部署
```

或同时启用 PM2 和 FTP：
```
复制新项目 admin-hsh1039，1039发现，并启动PM2托管和FTP自动部署
```

---

## 🔧 项目辅助功能（手动配置）

以下功能需要手动编辑配置文件后才能启用，AI 不会自动处理。

### 自动更新接口文档

| 项目 | 说明 |
|------|------|
| 配置文件 | API 任务配置文件（本地路径，待开发者补充文件名） |
| 操作 | 在 JSON 数组中追加新项目条目 |

> 配置文件路径为开发者本地环境，请根据实际情况配置。

---

*最后更新：2026-07-26*
