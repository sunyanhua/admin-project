# Playwright 自动化测试

本目录包含"1039俱乐部+"管理后台的端到端自动化测试脚本，使用 Playwright 测试框架。

## 测试覆盖的核心功能

1. **登录功能** - 管理员登录流程测试
2. **用户管理** - 用户列表、搜索、封禁/解封操作
3. **活动审核** - 活动列表、筛选、单个/批量审核操作
4. **实名认证审核** - 实名认证申请列表、搜索、审核操作

## 安装与设置

### 1. 安装 Playwright 依赖

```bash
npm install --save-dev @playwright/test
```

### 2. 安装浏览器（第一次运行需要）

```bash
npx playwright install
```

### 3. 环境变量配置

创建 `.env` 文件或在运行测试前设置环境变量：

```bash
# 开发环境URL（Vite默认）
BASE_URL=http://localhost:5173

# 测试账号（使用默认管理员账号）
TEST_USERNAME=admin
TEST_PASSWORD=admin123
```

## 运行测试

### 运行所有测试

```bash
npx playwright test
```

### 运行特定测试文件

```bash
npx playwright test tests/e2e/specs/login.spec.ts
```

### 带UI模式运行测试（调试）

```bash
npx playwright test --ui
```

### 在指定浏览器中运行

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 生成测试报告

```bash
npx playwright test --reporter=html
```

报告将生成到 `playwright-report` 目录。

## 测试结构

```
tests/e2e/
├── pages/                    # 页面对象模型
│   ├── login.page.ts        # 登录页面
│   ├── user-management.page.ts
│   ├── activity-audit.page.ts
│   └── realname-auth.page.ts
├── specs/                   # 测试用例
│   ├── login.spec.ts
│   ├── user-management.spec.ts
│   ├── activity-audit.spec.ts
│   └── realname-auth.spec.ts
├── fixtures.ts              # 测试fixture和共享状态
└── README.md               # 本文档
```

## 页面对象模型（Page Object Model）

我们使用页面对象模式封装页面交互逻辑，提高测试代码的可维护性：

- **LoginPage**: 登录页面交互
- **UserManagementPage**: 用户管理页面交互
- **ActivityAuditPage**: 活动审核页面交互
- **RealNameAuthPage**: 实名认证审核页面交互

## 测试数据

测试使用应用中的模拟数据（mock data）。在真实环境中运行测试前，请确保：

1. 应用已启动并运行在 `BASE_URL` 指定的地址
2. 测试账号（admin/admin123）可用
3. 有足够的测试数据用于验证功能

## CI/CD 集成

Playwright 测试可以轻松集成到 CI/CD 流程中。示例 GitHub Actions 配置：

```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npx playwright test
      env:
        BASE_URL: ${{ secrets.BASE_URL }}
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

## 注意事项

1. **响应式测试**: 测试考虑了PC端和移动端的响应式布局
2. **状态管理**: 测试间保持独立，每个测试前都会重新登录
3. **异步操作**: 适当使用 `waitForTimeout` 等待异步操作完成
4. **选择器策略**: 优先使用语义化选择器（role、text、label等）

## 故障排除

### 测试失败常见原因

1. **应用未运行**: 确保开发服务器已启动
2. **网络问题**: 检查 `BASE_URL` 是否正确
3. **选择器变更**: 如果UI更改，可能需要更新页面对象中的选择器
4. **数据问题**: 测试依赖的模拟数据可能已变更

### 调试技巧

1. 使用 `--ui` 模式可视化运行测试
2. 使用 `--debug` 参数进入调试模式
3. 添加 `await page.pause()` 暂停测试执行
4. 使用 `playwright codegen` 生成测试代码

## 维护指南

当UI变更时：

1. 更新对应的页面对象模型
2. 验证选择器是否仍然有效
3. 运行相关测试确保功能正常
4. 更新测试数据（如果需要）

## 贡献

欢迎贡献测试用例！请遵循现有代码风格和模式。