# 管理后台模板

## 📊 项目状态
**当前版本**: v1.0.0 (模板版本)
**开发状态**: 🟢 活跃开发中
**最后更新**: 2026-06-30

## 🎯 项目概述
通用管理后台模板，基于 **React 18 + TypeScript + Ant Design** 构建。**采用PC端WEB为主的设计，同时兼容手机端访问**。

### 核心特性
- ✅ **现代化技术栈**: React 18 + Vite + TypeScript
- ✅ **专业UI**: Ant Design v5+ 企业级组件库
- ✅ **完整架构**: 路由、状态管理、API层、权限控制
- ✅ **开发规范**: 严格的代码规范和协作流程
- ✅ **Mock支持**: 前后端并行开发支持
- ✅ **模板组件**: 复用 Hook 和组件，快速新建页面

## 🚀 快速开始

### 1. 环境准备
```bash
# 进入项目目录
cd packages/admin-template

# 安装依赖
npm install

# 启动开发服务器 (默认端口3100)
npm run dev
```

### 2. 构建项目
```bash
# 开发环境构建
npm run build

# 测试环境构建
npm run build:test

# 生产环境构建
npm run build:prod
```

### 3. 运行测试
```bash
# 单元测试
npm run test

# 测试覆盖率
npm run test:coverage

# E2E测试
npm run test:e2e
```

## 🛠 技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | UI框架 |
| TypeScript | 5.x | 类型安全 |
| Ant Design | 5.x | UI组件库 |
| React Router | 6.20.0 | 路由管理 |
| Vite | 5.x | 构建工具 |
| Axios | 1.6.0 | 网络请求 |
| Context API | - | 状态管理 |

## 📚 文档索引

### 核心文档
1. **[CLAUDE.md](./CLAUDE.md)** - 项目专属开发规范
2. **[SITEMAP.md](./SITEMAP.md)** - 页面结构、路由、接口对照

### 规范文档
3. **docs/development-standards.md** - 代码模板（可复制代码示例）
4. **docs/DOCUMENT_MANAGEMENT.md** - 文档管理制度

### 测试文档
5. **tests/README.md** - 测试指南
6. **tests/e2e/README.md** - E2E测试指南

## 📁 项目结构
```
admin-template/
├── src/
│   ├── api/              # API服务层 (axios封装)
│   ├── components/       # 可复用组件
│   │   ├── templates/   # 模板组件（必须使用）
│   │   └── common/       # 通用组件
│   ├── contexts/         # React Context状态管理
│   ├── hooks/            # 复用Hook
│   ├── pages/           # 页面组件
│   ├── router/          # 路由配置
│   ├── shared/          # 共享模块
│   │   └── constants/   # 业务枚举定义 (必须引用)
│   └── utils/           # 工具函数
├── tests/               # 测试文件
├── docs/                # 项目文档
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .env.development
```

## 🔧 开发规范摘要
1. **组件命名**: 大驼峰 (`UserManagement.tsx`)
2. **状态管理**: 简单状态用 `useState`，复杂跨页面用 Context API
3. **网络请求**: 使用封装的 `axios` 实例，禁止直接使用 `fetch`
4. **枚举引用**: 必须从 `@shared/constants` 导入，**禁止硬编码数字状态值**
5. **样式处理**: Ant Design优先，组件私有样式使用 `.css` 文件
6. **响应式设计**: **PC端WEB为主**，使用Ant Design栅格系统，确保在主流笔记本(≥1280px)和桌面显示器下完美显示，同时兼容平板(≥768px)和手机端(≥375px)基础访问

## 🤝 团队协作

### 新成员上手
1. 阅读根目录 **CLAUDE.md** 了解核心开发规范
2. 查看 **SITEMAP.md** 了解页面结构
3. 遵循开发规范进行页面/组件开发

### 前后端协作
- **当前模式**: 并行开发 + Mock数据
- **枚举同步**: 使用 `src/shared/constants/` 统一管理
- **联调流程**: Mock开发 → API实现 → 集成测试

## 🔄 更新日志
### 2026-06-30 v1.0.0
- ✅ 改造为多项目库结构
- ✅ 建立 npm workspaces monorepo
- ✅ 整理开发规范和文档
