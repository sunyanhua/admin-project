# 管理后台测试目录 (Admin Tests)

本目录存放"1039俱乐部+"管理后台的所有测试文件，包括单元测试和 E2E 测试。

## 📁 目录结构

```
tests/
├── README.md              # 本文档
├── e2e/                   # 端到端测试 (Playwright)
│   ├── fixtures.ts        # 测试夹具
│   ├── pages/             # Page Object Model
│   ├── specs/             # 测试用例
│   └── data/              # 测试数据
└── unit/                  # 单元测试 (Vitest)
    ├── setup.ts           # 测试环境初始化
    ├── mocks/             # Mock 服务
    └── utils/             # 测试工具
```

## 📖 必读文档

| 文档 | 说明 | 阅读时机 |
|------|------|----------|
| [docs/TEST_MANAGEMENT.md](../docs/TEST_MANAGEMENT.md) | 测试管理制度（完整规范） | 编写任何测试前 |

## 🚀 快速开始

### 运行单元测试

```bash
cd src/admin
npm test

# 运行特定文件
npm test -- Button.test.tsx

# 带覆盖率
npm run test:coverage
```

### 运行 E2E 测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 调试模式（有界面）
npm run test:e2e:headed

# 调试特定用例
npm run test:e2e -- login.spec.ts
```

## 📝 创建新测试

### 单元测试

1. 简单组件/工具函数：与源码同目录创建 `*.test.tsx`
2. 复杂场景：在 `tests/unit/` 下创建

```typescript
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('应正确渲染', () => {
    render(<Button>点击</Button>);
    expect(screen.getByText('点击')).toBeInTheDocument();
  });
});
```

### E2E 测试

1. 在 `tests/e2e/pages/` 创建 Page Object（如需要）
2. 在 `tests/e2e/specs/` 创建测试用例

```typescript
// specs/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test('登录成功', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('admin', 'admin123');
  await expect(page).toHaveURL('/');
});
```

## 📊 覆盖率报告

运行 `npm run test:coverage` 后，报告生成在：
- `tests/reports/coverage/` - HTML 详细报告
- 控制台 - 摘要输出

## ⚠️ 注意事项

- **禁止**在根目录创建测试文件
- **禁止**提交 `.skip`、`.only` 标记的测试
- **禁止**硬编码真实密码、密钥
- **禁止**提交大于 1MB 的测试数据
- 测试数据优先使用 `tests/e2e/data/` 或工厂函数生成

## 🔧 配置说明

| 配置文件 | 用途 |
|----------|------|
| `vitest.config.ts` | 单元测试配置 |
| `playwright.config.ts` | E2E 测试配置 |
| `tests/unit/setup.ts` | 单元测试环境初始化 |
| `tests/e2e/fixtures.ts` | E2E 测试夹具 |

## ❓ 有问题？

请参阅 [docs/TEST_MANAGEMENT.md](../docs/TEST_MANAGEMENT.md) 获取完整规范，或在团队群聊中讨论。

---
**维护责任人**: 管理后台技术负责人  
**最后更新**: 2026-04-08
