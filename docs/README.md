# 文档库 (Documentation)

本目录存放管理后台项目的通用文档和规范。

## 📁 目录结构

```
docs/
├── README.md                      # 本文档
├── DOCUMENT_MANAGEMENT.md         # 文档管理制度（必读）
├── development-standards.md       # 开发标准和代码模板
├── deployment/                     # 部署文档
│   └── static-export-guide.md     # 纯静态导出部署指南
```

## 📖 必读文档

| 文档 | 说明 | 阅读时机 |
|------|------|----------|
| [DOCUMENT_MANAGEMENT.md](./DOCUMENT_MANAGEMENT.md) | 文档编写和存放规范 | 创建任何文档前 |
| [development-standards.md](./development-standards.md) | 开发规范：接口、搜索、日期、表格、表单 | 开发任何页面/组件前 |

## 📝 创建新文档

1. 确定文档类型（架构/接口/测试/部署）
2. 阅读 [DOCUMENT_MANAGEMENT.md](./DOCUMENT_MANAGEMENT.md) 了解规范
3. 按命名规范创建文件（如 `feature-design.md`）
4. 使用标准文件头模板
5. 提交前自查是否符合规范

## ⚠️ 注意事项

- **禁止**使用中文文件名或空格
- **禁止**存放敏感信息（密码、密钥等）
- 所有文档必须使用 Markdown 格式

---
**最后更新**: 2026-06-30
