# admin-cheng 生产部署要点（他俩能成）

> 正式/测试环境部署的硬约束与 2026-09-02 首次正式发布事故教训。构建命令、产物结构、上传红线。

**最后更新**: 2026-09-02

## 1. 构建

| 命令 | 输出 | 说明 |
|------|------|------|
| `npm run build:test` | `dist-test/` | 测试环境 |
| `npm run build:prod` | `dist/` | 正式环境 |

仅用户明确要求时才执行构建。

**产物结构**（`scripts/build.js` 保证）：

```
dist/
├── index.html     # IIS 默认文档入口（必须存在！）
├── admin.html     # index.html 的兼容副本（保留既有访问路径）
└── assets/        # 静态资源
```

## 2. 服务器红线（2026-09-02 事故教训）

- **服务器 `/cheng` 目录有自己的 `web.config`**，构建产物**从不包含** web.config，今后也不得引入（曾误加 `public/web.config` 后被 revert）。
- 上传时**不得覆盖或删除服务器上的 web.config**；使用镜像同步类上传工具时，需先将 web.config 排除。
- **事故经过**：首次正式构建时产物只有 `admin.html`（旧逻辑将 index.html 改名），IIS 默认文档只认 `index.html`，目录访问 `/cheng/` 返回 403（`/cheng/admin.html` 正常 200）。修复：构建改为保留 `index.html` 并复制 `admin.html`（提交 `b2fd1a3`），与测试服务器现状（两文件并存）一致。

## 3. 上传与验证

1. 上传 `dist/` 全部内容到服务器 `/cheng` 目录（`index.html`、`admin.html`、`assets/`）
2. 确认服务器原有 `web.config` 仍在、内容未变
3. 验证入口：
   ```bash
   curl -sI https://admin.vbegin.com.cn/cheng/        # 应 200
   curl -sI https://admin.vbegin.com.cn/cheng/admin.html  # 应 200
   ```
4. 登录后台抽查受影响功能

## 4. Linksy AI 接口当前状态（临时直连）

- 当前为**直连模式**：前端携带密钥请求 `linksy.liteweb.cn`（密钥在 gitignore 的 `.env.*.local`，构建时注入），线上 CORS 白名单已配置。
- **恢复网关模式**：`git revert 21075a7` 重新构建，并按 [linksy-ai-gateway.md](./linksy-ai-gateway.md) 在测试/正式网关配置 `location /linksy-api/` 转发（密钥改由网关注入，前端不再携带）。
