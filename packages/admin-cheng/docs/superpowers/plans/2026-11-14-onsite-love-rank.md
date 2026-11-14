# 现场管理弹窗「心动排名」TAB 实施计划

> ⚠️ 2026-11-15 用户调整（本计划交付后）：左男右女、去掉发起方文字与「共 N 次心动」统计——见设计文档 `2026-11-14-onsite-love-rank-design.md` 的调整注记。本计划为实施历史记录，不再据此重做。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 现场管理弹窗末尾新增「心动排名」TAB：心动配对排名列表（左女右男卡片、中间红/蓝心形、右侧刷新按钮），点击卡片打开用户资料卡片。

**Architecture:** 新增独立组件 `OnsiteLoveRankTab.tsx`（自拉取 `activityApi.getOnsiteLovesCouples`，循环分页 size=100 拉全量），`OnsiteManageModal` TAB 数组末尾加一项，沿用 cp/routine 的懒挂载模式（`tabKey === 'loveRank' ? <OnsiteLoveRankTab …/> : null`）。版式参考历史大屏列表式心动排名（commit `a242ad5` 之前）。

**Tech Stack:** React + TypeScript + Ant Design v5、vitest + @testing-library/react、axios（`activity-v1` service）。

**Spec:** `docs/superpowers/specs/2026-11-14-onsite-love-rank-design.md`

## Global Constraints

- 接口：`activityApi.getOnsiteLovesCouples(activityId, { page, size: 100 })`（现成，`OnsiteCouple` 类型现成）；组件按接口返回顺序渲染，**不自行重排**。
- 版式：**左女右男**；中间两行心形——上方红心（`#ff5b8f`）= `female_loves_count` 女方发起、下方蓝心（`#4da3ff`）= `male_loves_count` 男方发起；每行心形数 `Math.min(count, 3)`；行旁小字标签「女方发起」「男方发起」。
- 中间列文案：「第 N 名」（N=行序）+「共 {onsite_loves_count} 次心动」。
- 工具条：左侧说明「按现场心动次数倒序」，**右侧**刷新按钮（`ReloadOutlined`，loading=拉取中）。
- 头像 `getAvatarUrl(avatar)`；点击卡片打开 `UserDetailCardModal`（默认 `userApi.getUserDetail`）。
- 消息提示用 `useAppNotification`（禁止 antd message）；catch 变量名用 `err`。
- 懒挂载（切走即卸载，切回重拉），与 cp/routine TAB 一致。
- PC 为主兼容手机：行卡片 flex 布局，窄屏可横向滚动，不写死像素宽。

## Review Focus

1. 单方心动（一方计数为 0）→ 对应心行渲染 0 个心形（行空），不崩溃 — Task 1 测试 3。
2. 计数超过 3（如 5）→ 心形数上限 3 — Task 1 测试 2。
3. 接口失败 → 弹错误提示且 loading 结束 — Task 1 测试 7。
4. 缺字段（`male`/`female` 为 undefined、`nickname` 空、`onsite_number` 为 null）→ 显示 '-'，不崩溃 — Task 1 测试 9。
5. 配对超过 100 条 → 分页循环拉全量（page 递增直到 list.length < 100）— Task 1 测试 4。

---

### Task 1: OnsiteLoveRankTab 组件

**Files:**
- Create: `src/components/operation/OnsiteLoveRankTab.tsx`
- Test: `tests/OnsiteLoveRankTab.test.tsx`

**Interfaces:**
- Consumes: `activityApi.getOnsiteLovesCouples`（现有，`src/api/services/activity-v1.ts:363`）、`OnsiteCouple`（现有，同文件 `:183`）、`getAvatarUrl`（`src/utils/imageUtils.ts`）、`UserDetailCardModal`（现有）、`useAppNotification`。
- Produces: 默认导出 `OnsiteLoveRankTab: React.FC<{ activityId: string }>`。data-testid：`love-row`（行容器）、`love-card-female`（左女卡）、`love-center`（中间列）、`love-card-male`（右男卡）、`love-hearts-female`（红心行容器）、`love-hearts-male`（蓝心行容器）。Task 2 依赖这些。

- [ ] **Step 1: 写失败测试** `tests/OnsiteLoveRankTab.test.tsx`

按现有约定：`vi.hoisted` 造数据、`vi.mock('@/api/services/activity-v1')` 暴露 `activityApi.getOnsiteLovesCouples`、`vi.mock('@/api/services/user')` 暴露 `userApi.getUserDetail`（及其它被 UserDetailCardModal 链引用的方法，参考 `OnsiteManageModal.test.tsx:56` 的 mock 清单）、渲染包 `<App>`、`beforeAll` 配 `window.matchMedia`（参考 `OnsiteRoutineTab.test.tsx:65`）。

测试数据（两对，覆盖互心/单方/超限）：

```ts
const COUPLES = [
  { couple_id: 'c1', onsite_loves_count: 3, female_loves_count: 2, male_loves_count: 1,
    female: { onsite_number: 6, profile: { nickname: '小红', avatar: 'https://img.vbegin.com.cn/a.jpg' }, user: { user_id: 'uf1' } },
    male: { onsite_number: 3, profile: { nickname: '小刚', avatar: '' }, user: { user_id: 'um1' } } },
  { couple_id: 'c2', onsite_loves_count: 2, female_loves_count: 5, male_loves_count: 0,
    female: { onsite_number: 7, profile: { nickname: '小美' }, user: { user_id: 'uf2' } },
    male: { onsite_number: 4, profile: { nickname: '小强' }, user: { user_id: 'um2' } } },
];
```

测试用例与断言：

```ts
test('渲染排名列表：女卡在左、中间列居中、男卡在右，且显示排名与总心动次数', async () => {
  render(<App><OnsiteLoveRankTab activityId="a1" /></App>);
  await screen.findByText('小红');
  const row = screen.getAllByTestId('love-row')[0];
  expect((row.children[0] as HTMLElement).dataset.testid).toBe('love-card-female');
  expect((row.children[1] as HTMLElement).dataset.testid).toBe('love-center');
  expect((row.children[2] as HTMLElement).dataset.testid).toBe('love-card-male');
  expect(screen.getByText('第 1 名')).toBeInTheDocument();
  expect(screen.getByText('共 3 次心动')).toBeInTheDocument();
});

test('心形按次数渲染且上限 3：红行=女方发起、蓝行=男方发起', async () => {
  render(<App><OnsiteLoveRankTab activityId="a1" /></App>);
  await screen.findByText('小红');
  // 第 1 对：女 2 红心、男 1 蓝心
  const rows = screen.getAllByTestId('love-row');
  const r1f = within(rows[0]).getByTestId('love-hearts-female');
  const r1m = within(rows[0]).getByTestId('love-hearts-male');
  expect(r1f.querySelectorAll('.anticon-heart').length).toBe(2);
  expect(r1m.querySelectorAll('.anticon-heart').length).toBe(1);
  expect(r1f.style.color).toBe('rgb(255, 91, 143)');
  expect(r1m.style.color).toBe('rgb(77, 163, 255)');
  // 第 2 对：女 5 → 上限 3
  const r2f = within(rows[1]).getByTestId('love-hearts-female');
  expect(r2f.querySelectorAll('.anticon-heart').length).toBe(3);
  // 标签
  expect(screen.getAllByText('女方发起').length).toBe(2);
  expect(screen.getAllByText('男方发起').length).toBe(2);
});

test('单方心动：计数为 0 的一行不渲染心形', async () => {
  render(<App><OnsiteLoveRankTab activityId="a1" /></App>);
  await screen.findByText('小美');
  const r2m = within(screen.getAllByTestId('love-row')[1]).getByTestId('love-hearts-male');
  expect(r2m.querySelectorAll('.anticon-heart').length).toBe(0);
});

test('配对超过 100 条时分页循环拉全量', async () => {
  const page1 = Array.from({ length: 100 }, (_, i) => ({
    couple_id: `c${i}`, onsite_loves_count: 1, female_loves_count: 1, male_loves_count: 0,
    female: { profile: { nickname: `女${i}` }, user: { user_id: `f${i}` } },
    male: { profile: { nickname: `男${i}` }, user: { user_id: `m${i}` } },
  }));
  getOnsiteLovesCouplesMock
    .mockResolvedValueOnce(page1)
    .mockResolvedValueOnce([]);
  render(<App><OnsiteLoveRankTab activityId="a1" /></App>);
  await screen.findByText('女0');
  expect(getOnsiteLovesCouplesMock).toHaveBeenCalledWith('a1', { page: 1, size: 100 });
  expect(getOnsiteLovesCouplesMock).toHaveBeenCalledWith('a1', { page: 2, size: 100 });
  expect(screen.getAllByTestId('love-row').length).toBe(100);
});

test('刷新按钮重新拉取数据', async () => {
  render(<App><OnsiteLoveRankTab activityId="a1" /></App>);
  await screen.findByText('小红');
  const before = getOnsiteLovesCouplesMock.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
  await waitFor(() => expect(getOnsiteLovesCouplesMock.mock.calls.length).toBe(before + 1));
});

test('空数据显示空状态', async () => {
  getOnsiteLovesCouplesMock.mockResolvedValue([]);
  render(<App><OnsiteLoveRankTab activityId="a1" /></App>);
  expect(await screen.findByText('暂无现场心动配对')).toBeInTheDocument();
});

test('接口失败弹错误提示', async () => {
  getOnsiteLovesCouplesMock.mockRejectedValue({ response: { data: { message: '接口错误' } } });
  render(<App><OnsiteLoveRankTab activityId="a1" /></App>);
  expect(await screen.findByText('接口错误')).toBeInTheDocument();
});

test('缺字段防御：female 缺失与昵称/序号为空显示 -', async () => {
  getOnsiteLovesCouplesMock.mockResolvedValue([{
    couple_id: 'c9', onsite_loves_count: 1, female_loves_count: 1, male_loves_count: 0,
    male: { onsite_number: null, profile: { nickname: '' }, user: { user_id: 'm9' } },
  }]);
  render(<App><OnsiteLoveRankTab activityId="a1" /></App>);
  const card = await screen.findByTestId('love-card-female');
  expect(card.textContent).toContain('-');
});

test('点击嘉宾卡片打开用户资料卡片弹窗', async () => {
  getUserDetailMock.mockResolvedValue({ user: { user_id: 'um1', phone: '', is_migrated: false }, profile: {}, match_profile: null, wallet: null });
  render(<App><OnsiteLoveRankTab activityId="a1" /></App>);
  fireEvent.click(await screen.findByText('小刚'));
  expect(await screen.findByText('用户详情')).toBeInTheDocument();
});
```

（`within` 从 `@testing-library/react` 引入；`getOnsiteLovesCouplesMock`/`getUserDetailMock` 用 `vi.hoisted` 定义。）

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/admin-cheng && npx vitest run tests/OnsiteLoveRankTab.test.tsx`
Expected: FAIL（模块 `src/components/operation/OnsiteLoveRankTab.tsx` 不存在）

- [ ] **Step 3: 实现 `OnsiteLoveRankTab`** 于 `src/components/operation/OnsiteLoveRankTab.tsx`

签名与状态：props `{ activityId: string }`；state：`couples: OnsiteCouple[]`、`loading: boolean`、`detailUserId: string`（'' = 关闭）、`detailVisible: boolean`。

`fetchList`（useCallback，依赖 activityId）：循环 `activityApi.getOnsiteLovesCouples(activityId, { page, size: 100 })`，`list.length < 100` 时 break；catch 时 `showError(err?.response?.data?.message || '获取心动排名失败')`，finally 置 loading false。`useEffect` 挂载时拉取（依赖 activityId）。

渲染：工具条 `display:flex; justifyContent:space-between`（左「按现场心动次数倒序」次要色小字，右 `Button icon={<ReloadOutlined/>} loading={loading} onClick={fetchList}` 文本「刷新」）；列表区：loading 且无数据 → 居中 `Spin`；无数据 → `Empty description="暂无现场心动配对"`；否则行列表——每行 `data-testid="love-row"`，flex 布局三列：左 `love-card-female`（头像 `getAvatarUrl(female.profile?.avatar || '')` + `${female.onsite_number ?? '-'} - ${female.profile?.nickname || '-'}`，可点击）、中 `love-center`（第 N 名 / 共 {onsite_loves_count ?? 0} 次心动 / 红心行 `love-hearts-female` 颜色 `#ff5b8f` 标签「女方发起」/ 蓝心行 `love-hearts-male` 颜色 `#4da3ff` 标签「男方发起」）、右 `love-card-male`（同左，取 male）。心形：`Array.from({ length: Math.min(count ?? 0, 3) })` 渲染 `HeartFilled`。卡片点击回调 `onClick={() => { setDetailUserId(user.user_id); setDetailVisible(true); }}`。末尾渲染 `<UserDetailCardModal visible={detailVisible} userId={detailUserId} onClose={…清空两者…} />`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/admin-cheng && npx vitest run tests/OnsiteLoveRankTab.test.tsx`
Expected: PASS（全部用例）

- [ ] **Step 5: 提交并补 CHANGELOG**

```bash
git add packages/admin-cheng/src/components/operation/OnsiteLoveRankTab.tsx packages/admin-cheng/tests/OnsiteLoveRankTab.test.tsx
git commit -m "feat: 现场弹窗新增心动排名组件——左女右男卡片与红蓝心形列表"
```

随后在 `packages/admin-cheng/docs/CHANGELOG.md` 顶部补一行（时间、短哈希、主要修改），单独提交：`git commit -m "docs: CHANGELOG 记录心动排名组件"`。

---

### Task 2: 弹窗集成「心动排名」TAB

**Files:**
- Modify: `src/components/operation/OnsiteManageModal.tsx:17-22`（import 区）、`:497-503`（Tabs items 数组）
- Test: `tests/OnsiteManageModal.test.tsx:67-80`（activity-v1 mock 增补）、文件末尾新增 describe

**Interfaces:**
- Consumes: Task 1 的 `OnsiteLoveRankTab`（默认导出，props `{ activityId: string }`）及其 data-testid。
- Produces: 弹窗 TAB 序：…、流程编排、**心动排名（最后）**；key 为 `'loveRank'`。

- [ ] **Step 1: 写失败测试**（`tests/OnsiteManageModal.test.tsx`）

在 activity-v1 mock 中增加：`getOnsiteLovesCouples: getOnsiteLovesCouplesMock`（`vi.hoisted` 定义，默认 `mockResolvedValue([])`）。新增 describe：

```ts
describe('OnsiteManageModal 心动排名 TAB', () => {
  it('心动排名 TAB 位于末尾，点击后按活动拉取心动配对并显示空状态', async () => {
    renderModal();
    await waitFor(() => expect(screen.getAllByText(/张三/).length).toBeGreaterThan(0));
    const tabs = screen.getAllByRole('tab');
    expect(tabs[tabs.length - 1]).toHaveTextContent('心动排名');
    fireEvent.click(tabs[tabs.length - 1]);
    await waitFor(() => expect(getOnsiteLovesCouplesMock).toHaveBeenCalledWith('a1', expect.objectContaining({ size: 100 })));
    expect(await screen.findByText('暂无现场心动配对')).toBeInTheDocument();
  });
});
```

（`renderModal` 复用本文件现有辅助函数；`getOnsiteLovesCouplesMock` 在 `beforeEach` 中 `mockClear` 并恢复 `mockResolvedValue([])`。）

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/admin-cheng && npx vitest run tests/OnsiteManageModal.test.tsx`
Expected: FAIL（找不到「心动排名」TAB）

- [ ] **Step 3: 实现集成** 于 `OnsiteManageModal.tsx`

顶部 import `OnsiteLoveRankTab from '@/components/operation/OnsiteLoveRankTab'`；Tabs items 数组末尾追加：

```tsx
{ key: 'loveRank', label: '心动排名', children: tabKey === 'loveRank' ? <OnsiteLoveRankTab activityId={activityId} /> : null },
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/admin-cheng && npx vitest run tests/OnsiteManageModal.test.tsx tests/OnsiteLoveRankTab.test.tsx`
Expected: PASS（两个文件全部用例）

- [ ] **Step 5: 提交并补 CHANGELOG**

```bash
git add packages/admin-cheng/src/components/operation/OnsiteManageModal.tsx packages/admin-cheng/tests/OnsiteManageModal.test.tsx
git commit -m "feat: 现场管理弹窗末尾新增心动排名 TAB"
```

随后在 `packages/admin-cheng/docs/CHANGELOG.md` 顶部补一行（时间、短哈希、主要修改），单独提交：`git commit -m "docs: CHANGELOG 记录现场弹窗心动排名 TAB"`。
