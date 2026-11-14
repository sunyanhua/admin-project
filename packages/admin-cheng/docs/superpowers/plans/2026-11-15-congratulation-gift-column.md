# 报喜管理「官方随份子」列三态化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 报喜信息管理列表「官方随份子」列改为三态 Tag：未上传结婚证 / 已传结婚证，未随份子 / 已随￥{金额}。

**Architecture:** 新增小组件 `CongratulationGiftStatusTag`（按 `has_marriage_certificate` + `is_official_gift` + `gift_amount` 派生三态渲染 Tag），页面列渲染替换为该组件并加宽 110 → 170。纯展示改动，无新接口、无新枚举。

**Tech Stack:** React + TypeScript + Ant Design v5、vitest + @testing-library/react。

**Spec:** `docs/superpowers/specs/2026-11-15-congratulation-gift-column-design.md`

## Global Constraints

- 三态判定与文案（用户已确认，文字统一用「结婚证」）：
  1. `has_marriage_certificate !== true` → 灰 Tag「未上传结婚证」
  2. `has_marriage_certificate && !is_official_gift` → 蓝 Tag「已传结婚证，未随份子」
  3. `is_official_gift` → 绿 Tag「已随￥{金额}」（**全角￥** + `formatCents(gift_amount ?? 0)` 两位小数，`formatCents` 现成于 `src/utils/format.ts:128`）
- Tag 必须有 `title` 属性（项目表格规范；title 与 Tag 文本相同）。
- Tag 颜色用 antd 预设：`default`（灰）/ `blue` / `green`。
- 消息提示用 `useAppNotification`；catch 变量名 `err`（本改动无接口调用，不涉及）。
- 项目提交习惯：每任务提交 + CHANGELOG 补记；不构建不推送（除非用户要求）。

## Review Focus

1. `has_marriage_certificate` 缺失/为 false（旧数据）→ 灰 Tag「未上传结婚证」，不崩溃 — Task 1 测试 1。
2. `is_official_gift` 为 true 但 `gift_amount` 为 null → 显示「已随￥0.00」— Task 1 测试 4。
3. 非整元金额（如 150 分）→ 两位小数「已随￥1.50」— Task 1 测试 5。
4. 三态互斥：`is_official_gift` 为 true 时无论证书状态，显示「已随￥…」— Task 1 测试 6。
5. 页面集成：列替换后三种状态在页面列表正常渲染 — Task 2 测试。

---

### Task 1: CongratulationGiftStatusTag 组件

**Files:**
- Create: `src/components/operation/CongratulationGiftStatusTag.tsx`
- Test: `tests/CongratulationGiftStatusTag.test.tsx`

**Interfaces:**
- Consumes: `AdminCongratulationItem`（`src/api/services/congratulation.ts:146`，只读三字段）、`formatCents`、antd `Tag`。
- Produces: 默认导出 `CongratulationGiftStatusTag: React.FC<{ item: AdminCongratulationItem }>`。Task 2 依赖。

- [ ] **Step 1: 写失败测试** `tests/CongratulationGiftStatusTag.test.tsx`

```ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CongratulationGiftStatusTag from '@/components/operation/CongratulationGiftStatusTag';

const itemOf = (patch: Record<string, any>) => ({ id: 'c1', status: 1, ...patch }) as any;

describe('CongratulationGiftStatusTag 官方随份子三态', () => {
  it('无结婚证：灰 Tag「未上传结婚证」', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ has_marriage_certificate: false, is_official_gift: false })} />);
    const tag = screen.getByText('未上传结婚证');
    expect(tag).toHaveAttribute('title', '未上传结婚证');
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-default');
  });

  it('有结婚证未随份子：蓝 Tag「已传结婚证，未随份子」', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ has_marriage_certificate: true, is_official_gift: false })} />);
    const tag = screen.getByText('已传结婚证，未随份子');
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-blue');
  });

  it('已随份子：绿 Tag「已随￥520.00」', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ is_official_gift: true, gift_amount: 52000 })} />);
    const tag = screen.getByText('已随￥520.00');
    expect(tag.closest('.ant-tag')).toHaveClass('ant-tag-green');
  });

  it('已随份子但金额为 null：显示「已随￥0.00」', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ is_official_gift: true, gift_amount: null })} />);
    expect(screen.getByText('已随￥0.00')).toBeInTheDocument();
  });

  it('非整元金额：150 分 →「已随￥1.50」', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ is_official_gift: true, gift_amount: 150 })} />);
    expect(screen.getByText('已随￥1.50')).toBeInTheDocument();
  });

  it('已随优先：无结婚证但已随份子 → 显示已随', () => {
    render(<CongratulationGiftStatusTag item={itemOf({ has_marriage_certificate: false, is_official_gift: true, gift_amount: 200 })} />);
    expect(screen.getByText('已随￥2.00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/admin-cheng && npx vitest run tests/CongratulationGiftStatusTag.test.tsx`
Expected: FAIL（模块 `src/components/operation/CongratulationGiftStatusTag.tsx` 不存在）

- [ ] **Step 3: 实现组件** 于 `src/components/operation/CongratulationGiftStatusTag.tsx`

签名：`const CongratulationGiftStatusTag: React.FC<{ item: AdminCongratulationItem }> = ({ item }) => …`。
三态判定顺序（已随最高优先）：`item.is_official_gift` → 绿 Tag `已随￥${formatCents(item.gift_amount ?? 0)}`；否则 `item.has_marriage_certificate === true` → 蓝 Tag `已传结婚证，未随份子`；否则灰 Tag `未上传结婚证`。每个 `<Tag color={…} title={…}>`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/admin-cheng && npx vitest run tests/CongratulationGiftStatusTag.test.tsx`
Expected: PASS（6 例）

- [ ] **Step 5: 提交并补 CHANGELOG**

```bash
git add packages/admin-cheng/src/components/operation/CongratulationGiftStatusTag.tsx packages/admin-cheng/tests/CongratulationGiftStatusTag.test.tsx
git commit -m "feat: 官方随份子三态 Tag 组件——未上传结婚证/已传未随/已随金额"
```

随后在 `packages/admin-cheng/docs/CHANGELOG.md` 顶部补一行（时间、短哈希、主要修改），单独提交：`git commit -m "docs: CHANGELOG 记录官方随份子三态组件"`。

---

### Task 2: 页面列替换 + 集成测试

**Files:**
- Modify: `src/pages/operation/CongratulationManagement.tsx`（import 区、`:129-132` 官方随份子列）
- Test: `tests/CongratulationManagement.test.tsx`（新建）

**Interfaces:**
- Consumes: Task 1 的 `CongratulationGiftStatusTag`（默认导出，props `{ item: AdminCongratulationItem }`）。
- Produces: 官方随份子列渲染三态 Tag，列宽 170。

- [ ] **Step 1: 写失败测试** `tests/CongratulationManagement.test.tsx`

按 `tests/CashTierManagement.test.tsx` 的 mock 约定：`vi.hoisted` 造 `CONGRATS` 三条记录（三态各一：`{ id:'c1', status:1, has_marriage_certificate:false, is_official_gift:false, male_nickname:'张三', female_nickname:'李四', … }`、`{ id:'c2', has_marriage_certificate:true, is_official_gift:false, … }`、`{ id:'c3', is_official_gift:true, gift_amount:52000, … }`）；`vi.mock('@/api/services/congratulation')`（`getList` 返回 `{ list: CONGRATS, total: 3 }`，`getGifts`/`getCashTiers` 返回空）、`vi.mock('@/api/services/xpay')`、`vi.mock('@/api/services/user')`（同 CashTierManagement.test 清单）；渲染包 `<App>`；`beforeAll` 配 matchMedia。

```ts
it('官方随份子列显示三种状态', async () => {
  render(<App><CongratulationManagement /></App>);
  expect(await screen.findByText('未上传结婚证')).toBeInTheDocument();
  expect(screen.getByText('已传结婚证，未随份子')).toBeInTheDocument();
  expect(screen.getByText('已随￥520.00')).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/admin-cheng && npx vitest run tests/CongratulationManagement.test.tsx`
Expected: FAIL（页面仍渲染旧列：找不到「未上传结婚证」）

- [ ] **Step 3: 实现列替换** 于 `CongratulationManagement.tsx`

顶部 import `CongratulationGiftStatusTag from '@/components/operation/CongratulationGiftStatusTag'`；官方随份子列（`:129-132`）改为：

```tsx
{
  title: '官方随份子', key: 'gift', width: 170,
  render: (_: any, r: AdminCongratulationItem) => <CongratulationGiftStatusTag item={r} />,
},
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/admin-cheng && npx vitest run tests/CongratulationGiftStatusTag.test.tsx tests/CongratulationManagement.test.tsx`
Expected: PASS（两文件全部用例）

- [ ] **Step 5: 提交并补 CHANGELOG**

```bash
git add packages/admin-cheng/src/pages/operation/CongratulationManagement.tsx packages/admin-cheng/tests/CongratulationManagement.test.tsx
git commit -m "feat: 报喜列表官方随份子列三态化展示"
```

随后在 `packages/admin-cheng/docs/CHANGELOG.md` 顶部补一行（时间、短哈希、主要修改），单独提交：`git commit -m "docs: CHANGELOG 记录官方随份子列三态化"`。
