# Admin Workspaces

管理后台多项目库。基于 React + Ant Design + TypeScript 的管理后台模板集合。

## 📁 项目结构

```
admin-workspaces/          # 工作区根目录
├── packages/
│   └── admin-template/    # 管理后台模板
│       ├── src/           # 源代码
│       ├── tests/         # 测试文件
│       ├── docs/          # 项目文档
│       └── ...
├── docs/                  # 通用文档（开发规范、文档管理）
├── package.json           # npm workspaces 配置
└── node_modules/          # 共享依赖
```

## 🚀 快速开始

### 启动模板项目
```bash
cd packages/admin-template
npm install
npm run dev    # 访问 http://localhost:3100
```

### 工作区命令
```bash
# 构建所有项目
npm run build

# 在所有 workspace 中运行命令
npm run dev --workspaces --if-present
```

## 📚 文档索引

### 根目录
| 文档 | 说明 |
|------|------|
| **CLAUDE.md** | 核心开发规范（通用规则） |
| **README.md** | 本文档 |

### 通用文档 (docs/)
| 文档 | 说明 |
|------|------|
| `development-standards.md` | 开发标准和代码模板 |
| `DOCUMENT_MANAGEMENT.md` | 文档管理制度 |

### 模板项目 (packages/admin-template/)
| 文档 | 说明 |
|------|------|
| `README.md` | 项目介绍 |
| `CLAUDE.md` | 项目专属规则 |
| `SITEMAP.md` | 页面结构和路由对照 |

## 🔧 技术栈

| 技术 | 说明 |
|------|------|
| React 18 | UI框架 |
| TypeScript 5 | 类型安全 |
| Ant Design 5 | UI组件库 |
| Vite 5 | 构建工具 |
| React Router 6 | 路由管理 |
| Axios | 网络请求 |

## 📦 添加新项目

复制 `packages/admin-template/` 文件夹，重命名为新项目名称，然后：

1. 修改 `package.json` 中的 `name` 字段
2. 修改 `.env.development` 中的 `VITE_PORT`
3. 更新 `docs/openapi.json` 为新项目的接口文档

## 🛠 开发规范

核心规范见根目录 **CLAUDE.md**，主要包括：
- 接口调用规范
- 搜索交互规范
- 枚举使用规范（禁止硬编码状态值）
- 模板组件使用（必须使用模板，禁止重复造轮子）
- 响应式设计（PC端WEB为主，兼容手机端）
