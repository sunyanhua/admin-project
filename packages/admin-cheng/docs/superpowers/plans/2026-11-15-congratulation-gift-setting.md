# 报喜已通过后独立设置官方随份子 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 详情弹窗对已通过的报喜提供「官方随份子」独立设置区块（勾选+金额+提交），成功后刷新列表并关闭。

**Architecture:** 修改 `CongratulationDetailModal.tsx`：新增设置区块（仅 `status === CongratulationStatus.APPROVED` 显示；已设置转只读），调用现成 `congratulationApi.setGift`；审核区的随份子勾选在已通过状态下隐藏。纯前端改动，无新接口。

**Tech Stack:** React + TypeScript + Ant Design v5、vitest + @testing-library/react。

**Spec:** `docs/superpowers/specs/2026-11-15-congratulation-gift-setting-design.md`

## Global Constraints

- 接口：`congratulationApi.setGift(id, { is_official_gift: true, gift_amount })`（分）；状态枚举 `CongratulationStatus.APPROVED`（禁止硬编码 1）。
- 校验：未勾选点击「设置随份子」→ 错误提示「请勾选官方随份子」；勾选后金额必填 >0 → 提示「请填写大于 0 的金额」。
- 金额：`InputNumber min={0.01} precision={2}`，提交 `Math.round(元 * 100)`。
- 成功后：`success('官方随份子已设置')` + `onSuccess()` + `onClose()`。
- 弹窗打开时重置新 state（与现有 action/reason/officialGift/giftYuan 同一 effect）。
- 消息提示 `useAppNotification`；catch 变量名 `err`。
- 项目提交习惯：提交 + CHANGELOG 补记；不构建不推送（除非用户要求）。

## Review Focus

1. 已通过且已设置 → 区块只读（无按钮），不出现重复设置入口 — 测试 2。
2. 已提交状态 → 无独立区块，审核流程勾选照旧 — 测试 3/6。
3. 勾选未填金额 → 拦截不调接口 — 测试 4。
4. 金额元转分正确（5.20 元 → 520 分）与参数形状 `{ is_official_gift: true, gift_amount: 520 }` — 测试 5。
5. 设置成功后刷新列表（onSuccess 调用）并关闭弹窗（onClose 调用）— 测试 5。

---

### Task 1: 详情弹窗独立设置区块

**Files:**
- Modify: `src/components/operation/CongratulationDetailModal.tsx`（state、审核区勾选条件、新区块、handleSetGift）
- Test: `tests/CongratulationDetailModal.test.tsx`（新建）

**Interfaces:**
- Consumes: `congratulationApi.getDetail/setGift/audit`、`CongratulationStatus`（@shared/constants）、`ScrollableModal`、`useAppNotification`（均现成）。
- Produces: 区块 testid `gift-setting-section`、审核区 testid `audit-section`；按钮文案「设置随份子」。

- [ ] **Step 1: 写失败测试** `tests/CongratulationDetailModal.test.tsx`

按现有约定：`vi.hoisted` 造详情数据、`vi.mock('@/api/services/congratulation')`（getDetail/getDetailMock、setGift/setGiftMock、audit）、渲染包 `<App>`、`beforeAll` matchMedia。

数据（已通过未设置）：

```ts
const DETAIL_APPROVED = {
  id: 'c1', status: 1, is_official_gift: false,
  male_nickname: '张三', female_nickname: '李四', created_at: '2026-11-15T10:00:00+08:00',
};
```

用例与断言：

```ts
const renderModal = (onClose = vi.fn(), onSuccess = vi.fn()) =>
  render(<App><CongratulationDetailModal visible congratulationId="c1" onClose={onClose} onSuccess={onSuccess} /></App>);

it('已通过且未设置：显示独立设置区块', async () => {
  getDetailMock.mockResolvedValue(DETAIL_APPROVED);
  renderModal();
  const section = await screen.findByTestId('gift-setting-section');
  expect(within(section).getByText('官方随份子')).toBeInTheDocument();
  expect(within(section).getByRole('button', { name: /设置随份子/ })).toBeInTheDocument();
});

it('已通过且已设置：区块只读，无设置按钮', async () => {
  getDetailMock.mockResolvedValue({ ...DETAIL_APPROVED, is_official_gift: true, gift_amount: 52000 });
  renderModal();
  const section = await screen.findByTestId('gift-setting-section');
  expect(within(section).getByText(/已设置 ¥520\.00/)).toBeInTheDocument();
  expect(within(section).queryByRole('button', { name: /设置随份子/ })).toBeNull();
});

it('已提交状态：不显示独立设置区块', async () => {
  getDetailMock.mockResolvedValue({ ...DETAIL_APPROVED, status: 0 });
  renderModal();
  await screen.findByText('张三');
  expect(screen.queryByTestId('gift-setting-section')).toBeNull();
});

it('勾选后未填金额：拦截并提示，不调接口', async () => {
  getDetailMock.mockResolvedValue(DETAIL_APPROVED);
  renderModal();
  const section = await screen.findByTestId('gift-setting-section');
  fireEvent.click(within(section).getByRole('checkbox'));
  fireEvent.click(within(section).getByRole('button', { name: /设置随份子/ }));
  expect(await screen.findByText('请填写大于 0 的金额')).toBeInTheDocument();
  expect(setGiftMock).not.toHaveBeenCalled();
});

it('勾选并填金额：按分调用 setGift，成功后刷新并关闭', async () => {
  getDetailMock.mockResolvedValue(DETAIL_APPROVED);
  setGiftMock.mockResolvedValue({});
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  renderModal(onClose, onSuccess);
  const section = await screen.findByTestId('gift-setting-section');
  fireEvent.click(within(section).getByRole('checkbox'));
  fireEvent.change(within(section).getByRole('spinbutton'), { target: { value: '5.20' } });
  fireEvent.click(within(section).getByRole('button', { name: /设置随份子/ }));
  await waitFor(() => expect(setGiftMock).toHaveBeenCalledWith('c1', { is_official_gift: true, gift_amount: 520 }));
  await waitFor(() => {
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

it('已通过状态：审核区不显示随份子勾选', async () => {
  getDetailMock.mockResolvedValue(DETAIL_APPROVED);
  renderModal();
  const audit = await screen.findByTestId('audit-section');
  expect(within(audit).queryByText('官方随份子')).toBeNull();
});
```

（`within`/`fireEvent`/`waitFor` 从 @testing-library/react 引入。注：antd `InputNumber` 的输入框 role 为 `spinbutton`。）

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/admin-cheng && npx vitest run tests/CongratulationDetailModal.test.tsx`
Expected: FAIL（找不到 `gift-setting-section` / 审核区仍有勾选）

- [ ] **Step 3: 实现** 于 `CongratulationDetailModal.tsx`

1. 新 state：`setGiftChecked: boolean`、`setGiftYuan: number | null`、`settingGift: boolean`；弹窗打开 effect 中与现有 state 一并重置。
2. `handleSetGift`：未勾选 → `showError('请勾选官方随份子')`；勾选且金额空/≤0 → `showError('请填写大于 0 的金额')`；否则 `setGift(detail.id, { is_official_gift: true, gift_amount: Math.round(setGiftYuan * 100) })`，成功 `success('官方随份子已设置')` + `onSuccess()` + `onClose()`，catch `showError(err?.response?.data?.message || '设置失败')`。
3. 审核区加 `data-testid="audit-section"`；其随份子勾选条件改为 `action === 1 && detail.status !== CongratulationStatus.APPROVED && (…)`。
4. 审核区下方新增区块：`detail.status === CongratulationStatus.APPROVED` 时渲染 `data-testid="gift-setting-section"`——已设置 → 只读文案「已设置 ¥{(gift_amount??0)/100).toFixed(2)}，一经提交不可变更」；未设置 → Checkbox「官方随份子」+ `InputNumber min={0.01} precision={2}` 金额（元）+ `Button loading={settingGift}`「设置随份子」，同款分隔样式（borderTop #e8e8e8）。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/admin-cheng && npx vitest run tests/CongratulationDetailModal.test.tsx`
Expected: PASS（6 例）

- [ ] **Step 5: 提交并补 CHANGELOG**

```bash
git add packages/admin-cheng/src/components/operation/CongratulationDetailModal.tsx packages/admin-cheng/tests/CongratulationDetailModal.test.tsx
git commit -m "feat: 报喜已通过后详情弹窗可独立设置官方随份子"
```

随后在 `packages/admin-cheng/docs/CHANGELOG.md` 顶部补一行（时间、短哈希、主要修改），单独提交：`git commit -m "docs: CHANGELOG 记录报喜独立设置官方随份子"`。
