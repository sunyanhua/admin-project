# Linksy AI 图片改尺寸 — 网关代理部署说明

> 管理后台 AI 图片调整功能通过网关同域代理转发到 Linksy 接口，**密钥只存在网关配置中，不暴露给浏览器**。

**最后更新**: 2026-09-02

## 前端行为

前端（`packages/admin-cheng/src/api/services/linksy.ts`）统一请求同域路径：

```
POST /linksy-api/open/v1/image-resize        （multipart：image + target_width + target_height）
GET  /linksy-api/open/v1/image-resize/{id}   （轮询，返回 JSON 状态或图片字节）
```

请求**不携带** `X-API-Key`，由网关在转发时注入。目标环境需在管理后台域名（admin-test.vbegin.com.cn / admin.vbegin.com.cn）上配置以下转发。

## nginx 配置样例（测试/正式环境各配一份，密钥用各自环境的）

```nginx
location /linksy-api/ {
    proxy_pass https://linksy.liteweb.cn/;   # 尾部斜杠会剥掉 /linksy-api 前缀
    proxy_set_header Host linksy.liteweb.cn;
    proxy_set_header X-API-Key "<该环境的Linksy密钥>";   # 密钥仅存于此，勿写入任何代码/文档
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 90s;                   # 单次轮询响应较快，90s 足够
    client_max_body_size 16m;                 # Linksy 限制图片 ≤15MB
}
```

配置后验证（在网关所在服务器上）：

```bash
curl -X POST https://<管理后台域名>/linksy-api/open/v1/image-resize \
  -F "image=@test.png" -F "target_width=1024" -F "target_height=512"
# 应返回 {"job_id":"...","status":"received"}，无需手动携带密钥
```

## 本地开发

开发环境不走线上网关：vite 代理 `/linksy-api` → `http://127.0.0.1:8081`（Linksy 本地调试服务），
本地密钥配置在 `.env.development` 中，仅供 vite 代理注入请求头，不打包进前端产物。

## 注意事项

- 测试与正式环境**必须使用各自的密钥**（Linksy 按密钥区分调用方、额度与启停独立）
- 更换/停用密钥时只需改网关配置，前端无需改动
- 若 Linksy 密钥泄露，联系对方停用重发，并同步更新网关配置
