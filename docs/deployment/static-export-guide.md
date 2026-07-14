# 纯静态导出部署指南 (Static Export Guide)

本文档说明如何将管理后台以纯静态页面形式导出并部署到服务器。

## 1. 架构概述

本项目使用 **Vite + React + Hash Router** 架构，支持完全静态化部署：

- **无需 Node.js 运行时** - 纯 HTML/CSS/JS 文件
- **无需服务器 rewrite 配置** - Hash 路由模式支持直接刷新
- **支持任意部署路径** - 相对路径引用资源
- **环境配置分离** - 测试/正式环境独立构建

## 2. 环境配置

### 2.1 环境变量文件

| 文件 | 用途 | 提交仓库 |
|------|------|----------|
| `.env.development` | 本地开发配置 | ✅ 是 |
| `.env.test` | 测试环境配置 | ✅ 是 |
| `.env.production` | 正式环境配置 | ✅ 是 |
| `.env.local` | 本地覆盖配置 | ❌ 否（已 gitignore） |

### 2.2 环境变量说明

```bash
VITE_API_BASE_URL=https://dazi-test.vbegin.com.cn/  # API 服务器地址
VITE_USE_MOCK=false                                 # 是否使用 Mock 数据
VITE_APP_ENV=test                                   # 环境标识
VITE_APP_TITLE=管理后台(测试)                      # 页面标题
```

## 3. 构建命令

### 3.1 测试环境构建

```bash
cd packages/admin-template
npm run build:test
```

输出目录：`dist/`

### 3.2 正式环境构建

```bash
cd packages/admin-template
npm run build:prod
```

输出目录：`dist/`

### 3.3 本地开发（带 Mock）

```bash
cd packages/admin-template
npm run dev
```

## 4. 部署流程

### 4.1 构建产物结构

```
dist/
├── index.html              # 入口页面
├── assets/
│   ├── index-xxx.js        # 主 JS（含 HashRouter）
│   ├── vendor-xxx.js       # React 等第三方库
│   ├── antd-xxx.js         # Ant Design 组件库
│   ├── charts-xxx.js       # 图表库
│   ├── index-xxx.css       # 主样式
│   └── ...                 # 其他资源
└── vite.svg                # 静态资源
```

### 4.2 部署步骤

#### 方式一：Nginx 部署

```nginx
server {
    listen 80;
    server_name admin-test.example.com;
    root /var/www/admin-test;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理（如需要）
    location /api {
        proxy_pass https://dazi-test.vbegin.com.cn/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 方式二：CDN / 对象存储部署

1. 将 `dist/` 目录内容上传到 CDN 或对象存储
2. 配置入口页面为 `index.html`
3. 配置 404 页面指向 `index.html`（Hash 模式下可选）

```bash
# 示例：上传到 AWS S3
aws s3 sync dist/ s3://my-bucket/admin-test/ --acl public-read

# 示例：上传到阿里云 OSS
ossutil cp -r dist/ oss://my-bucket/admin-test/
```

#### 方式三：静态托管服务

| 服务商 | 部署方式 |
|--------|----------|
| Vercel | `vercel --prod` |
| Netlify | `netlify deploy --prod --dir=dist` |
| GitHub Pages | 推送到 `gh-pages` 分支 |
| Nginx / Apache | 复制 `dist/` 到 web 目录 |

## 5. 验证部署

### 5.1 检查清单

- [ ] 首页能正常加载
- [ ] 路由跳转正常（URL 含 `#`）
- [ ] API 请求地址正确（检查 Network）
- [ ] 登录后能跳转首页
- [ ] 刷新页面不 404
- [ ] 静态资源加载无 404

### 5.2 常见问题

#### Q: 页面刷新 404？
A: 确保使用 Hash Router（URL 含 `#`），或配置服务器 rewrite 规则。

#### Q: API 请求失败？
A: 检查浏览器 Network 面板，确认请求的 baseURL 是否正确。

#### Q: 静态资源 404？
A: 检查 `vite.config.ts` 中 `base: './'` 配置，确保使用相对路径。

#### Q: 页面空白？
A: 检查浏览器控制台是否有 JS 错误，可能是环境变量未正确注入。

## 6. 多环境管理

### 6.1 测试环境

```bash
# 构建
npm run build:test

# 部署到测试服务器
scp -r dist/* user@test-server:/var/www/admin-test/
```

访问地址：`https://admin-test.example.com/#/login`

### 6.2 正式环境

```bash
# 构建
npm run build:prod

# 部署到生产服务器
scp -r dist/* user@prod-server:/var/www/admin/
```

访问地址：`https://admin.example.com/#/login`

## 7. 自动化部署脚本

```bash
#!/bin/bash
# deploy.sh

ENV=${1:-test}

if [ "$ENV" = "prod" ]; then
  echo "Building for production..."
  npm run build:prod
  SERVER="prod-server"
  PATH="/var/www/admin/"
else
  echo "Building for test..."
  npm run build:test
  SERVER="test-server"
  PATH="/var/www/admin-test/"
fi

echo "Deploying to $SERVER..."
rsync -avz --delete dist/ user@$SERVER:$PATH

echo "Deployment complete!"
```

使用：
```bash
./deploy.sh test   # 部署测试环境
./deploy.sh prod   # 部署正式环境
```

## 8. 回滚策略

1. 保留最近 3 个版本的构建产物
2. 部署前备份当前版本
3. 发现问题立即回滚到上一版本

```bash
# 回滚示例
ssh user@server "mv /var/www/admin /var/www/admin-backup-$(date +%Y%m%d)"
ssh user@server "cp -r /var/www/admin-previous /var/www/admin"
```

---

**制定日期**: 2026-04-08  
**维护责任人**: 管理后台技术负责人
