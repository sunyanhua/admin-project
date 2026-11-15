# 「投诉管理」替换为「举报管理」实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建「举报管理」页面（列表+详情+处理）对接 `/admin/v1/bizops/report*`，删除「投诉管理」页面/测试/xpay 投诉接口，路由与菜单同步替换。

**Architecture:** 新建 `src/api/services/report.ts`（枚举+类型+接口）与 `src/pages/community/ReportManagement.tsx`（列表+内嵌详情弹窗，沿用旧页结构）；删除 ComplaintManagement.tsx 与其测试及 xpay.ts 投诉相关代码；router/menuConfig 改路由与菜单。

**Tech Stack:** React + TypeScript + Ant Design v5、vitest + @testing-library/react。

**Spec:** `docs/superpowers/specs/2026-11-15-report-management-design.md`

## Global Constraints

- 接口三件套（swagger 已确认）：列表 GET `/admin/v1/bizops/report`（page/size/status/target_match_code）、详情 GET `/admin/v1/bizops/report/{id}`、处理 PATCH `/{id}/handle` `{ status: 1|2, remark 必填 }`。
- 枚举 `ReportStatus { PENDING=0, HANDLED=1, REJECTED=2 }` + labels/colors 放 `src/api/services/report.ts`（禁改 src/shared）。
- 模板组件：StandardPage/StandardTable/SearchPanel/ScrollableModal/UserDetailCardModal；消息 useAppNotification；头像 getAvatarUrl；附件 getMediumUrl + preview 原图。
- 状态 Tag：待处理 orange / 已处理 green / 已驳回 red，带 title。
- 举报人/被举报人列：头像+昵称（点击开 UserDetailCardModal）；举报内容列不设宽、wordBreak break-word；时间列双行（dateTimeColumn）。
- 处理意见 TextArea 必填、maxLength 500 showCount；提交成功 toast + 刷新列表 + 关闭弹窗。
- 页面标题「举报管理」+ 描述（中文无技术术语，见 spec）。
- 项目提交习惯：每任务提交 + CHANGELOG 补记；不构建不推送（除非用户要求）。

## Review Focus

1. 处理意见为空 → 拦截提示，不调接口 — Task 2 测试。
2. 已处理/已驳回 → 无处理表单，只读展示处理记录（意见/处理人/时间）— Task 2 测试。
3. 状态筛选与能成号搜索按 API 参数名传参（status / target_match_code）— Task 2 测试。
4. 附件空数组 → 不渲染附件区，不崩溃 — Task 2 测试。
5. 替换干净：全仓库无 投诉管理/ComplaintManagement 残留（xpay 服务投诉代码删除后 tsc 与全量测试绿）— Task 3 验证。

---

### Task 1: report 服务

**Files:**
- Create: `src/api/services/report.ts`

**Interfaces:**
- Consumes: `request`（`src/api/index.ts` 默认导出）、swagger 模型（本文件内定义类型）。
- Produces: `ReportStatus` 枚举、`REPORT_STATUS_LABELS`/`REPORT_STATUS_COLORS`、`AdminReportListItem`/`AdminReportUserCard`/`AdminReportDetailResponse`/`AdminHandleReportRequest`、`reportApi.getList/getDetail/handle`。Task 2 依赖这些。

- [ ] **Step 1: 写服务文件** 于 `src/api/services/report.ts`

按 swagger 逐字段定义类型（字段名禁止猜测，见 spec 约束的模型清单）：`AdminReportUserCard { user_id, nickname, avatar, gender, match_code }`；`AdminReportListItem { id, status, content, created_at, reporter_id, target_user_id, target_match_code, reporter, target, handle_remark, handled_at, handled_by }`；`AdminReportDetailResponse extends 列表项 { attachments: { url?, file_type?, media_id? }[] }`（附件形状与 congratulation 的 CongratulationAttachment 一致）；`AdminHandleReportRequest { status: 1|2, remark: string }`。接口：

```ts
export const reportApi = {
  getList: (params?: { page?: number; size?: number; status?: number; target_match_code?: string; start_time?: string; end_time?: string }) =>
    request.get('/admin/v1/bizops/report', { params }),
  getDetail: (id: string) => request.get(`/admin/v1/bizops/report/${id}`),
  handle: (id: string, data: { status: number; remark: string }) =>
    request.patch(`/admin/v1/bizops/report/${id}/handle`, data),
};
```

- [ ] **Step 2: tsc 验证**

Run: `cd packages/admin-cheng && npx tsc --noEmit`
Expected: 无 report.ts 相关错误（既有无关错误除外）

- [ ] **Step 3: 提交**

```bash
git add packages/admin-cheng/src/api/services/report.ts
git commit -m "feat: 举报服务——report 接口三件套与枚举类型（swagger 对齐）"
```

随后 CHANGELOG 顶部补一行并单独提交：`git commit -m "docs: CHANGELOG 记录举报服务"`。

---

### Task 2: ReportManagement 页面 + 测试

**Files:**
- Create: `src/pages/community/ReportManagement.tsx`
- Test: `tests/ReportManagement.test.tsx`（新建）

**Interfaces:**
- Consumes: Task 1 的 `reportApi`/`ReportStatus`/`REPORT_STATUS_LABELS`/`REPORT_STATUS_COLORS`/类型；`UserDetailCardModal`（默认 userApi.getUserDetail）。
- Produces: 页面默认导出 `ReportManagement`；详情弹窗 testid `report-detail-section`、处理区 testid `report-handle-section`。Task 3 依赖页面文件与测试。

- [ ] **Step 1: 写失败测试** `tests/ReportManagement.test.tsx`

按现有约定：`vi.hoisted` 造数据、`vi.mock('@/api/services/report')`（getList/getDetail/handle 三个 mock）、`vi.mock('@/api/services/user')`（UserDetailCardModal 链 mock 清单，参考 OnsiteLoveRankTab.test）、渲染包 `<App>`。matchMedia 已由 setupTests 全局兜底（无需本地定义）。

数据（三态各一条）：

```ts
const REPORTS = [
  { id: 'r1', status: 0, content: '该用户言语骚扰', created_at: '2026-11-15T09:00:00+08:00', target_match_code: '12345678',
    reporter: { user_id: 'u1', nickname: '张三', avatar: '', gender: 1, match_code: '87654321' },
    target: { user_id: 'u2', nickname: '李四', avatar: '', gender: 2, match_code: '12345678' } },
  { id: 'r2', status: 1, content: '虚假资料', created_at: '2026-11-15T10:00:00+08:00', target_match_code: '11111111',
    reporter: { user_id: 'u3', nickname: '王五', avatar: '', gender: 1, match_code: '22222222' },
    target: { user_id: 'u4', nickname: '赵六', avatar: '', gender: 2, match_code: '11111111' } },
  { id: 'r3', status: 2, content: '刷单广告', created_at: '2026-11-15T11:00:00+08:00', target_match_code: '33333333',
    reporter: { user_id: 'u5', nickname: '钱七', avatar: '', gender: 1, match_code: '44444444' },
    target: { user_id: 'u6', nickname: '孙八', avatar: '', gender: 2, match_code: '33333333' } },
];
```

用例与断言：

```ts
it('列表渲染三种状态 Tag 与举报人/被举报人', async () => {
  getListMock.mockResolvedValue({ list: REPORTS, total: 3 });
  render(<App><ReportManagement /></App>);
  expect(await screen.findByText('张三')).toBeInTheDocument();
  expect(screen.getByText('李四')).toBeInTheDocument();
  expect(screen.getByText('待处理')).toBeInTheDocument();
  expect(screen.getByText('已处理')).toBeInTheDocument();
  expect(screen.getByText('已驳回')).toBeInTheDocument();
});

it('状态筛选按 status 传参', async () => {
  render(<App><ReportManagement /></App>);
  await screen.findByText('张三');
  getListMock.mockClear();
  // 打开状态下拉选择「已处理」
  fireEvent.mouseDown(document.querySelector('.ant-select-selector')!);
  await userEvent.click(await screen.findByTitle('已处理'));
  await waitFor(() => expect(getListMock).toHaveBeenCalledWith(expect.objectContaining({ status: 1 })));
});

it('能成号搜索按 target_match_code 传参', async () => {
  render(<App><ReportManagement /></App>);
  await screen.findByText('张三');
  getListMock.mockClear();
  fireEvent.change(screen.getByPlaceholderText('搜索被举报能成号'), { target: { value: '12345678' } });
  fireEvent.click(screen.getByRole('button', { name: /搜\s*索/ }));
  await waitFor(() => expect(getListMock).toHaveBeenCalledWith(expect.objectContaining({ target_match_code: '12345678' })));
});

it('详情：待处理显示处理表单，意见必填拦截', async () => {
  getListMock.mockResolvedValue({ list: [REPORTS[0]], total: 1 });
  getDetailMock.mockResolvedValue({ ...REPORTS[0], attachments: [] });
  render(<App><ReportManagement /></App>);
  fireEvent.click(await screen.findByRole('button', { name: /详\s*情/ }));
  const handle = await screen.findByTestId('report-handle-section');
  expect(within(handle).getByText('已处理')).toBeInTheDocument();
  expect(within(handle).getByText('已驳回')).toBeInTheDocument();
  fireEvent.click(within(handle).getByRole('button', { name: /提交处理/ }));
  expect(await screen.findByText('请填写处理意见')).toBeInTheDocument();
  expect(handleMock).not.toHaveBeenCalled();
});

it('处理提交：按 status+remark 传参，成功后刷新并关闭', async () => {
  getListMock.mockResolvedValue({ list: [REPORTS[0]], total: 1 });
  getDetailMock.mockResolvedValue({ ...REPORTS[0], attachments: [] });
  handleMock.mockResolvedValue({});
  render(<App><ReportManagement /></App>);
  fireEvent.click(await screen.findByRole('button', { name: /详\s*情/ }));
  const handle = await screen.findByTestId('report-handle-section');
  fireEvent.click(within(handle).getByLabelText('已处理'));
  fireEvent.change(within(handle).getByPlaceholderText(/处理意见/), { target: { value: '已警告该用户' } });
  fireEvent.click(within(handle).getByRole('button', { name: /提交处理/ }));
  await waitFor(() => expect(handleMock).toHaveBeenCalledWith('r1', { status: 1, remark: '已警告该用户' }));
  await waitFor(() => expect(getListMock.mock.calls.length).toBeGreaterThanOrEqual(2));
});

it('已处理举报：只读展示处理记录，无处理表单', async () => {
  getListMock.mockResolvedValue({ list: [REPORTS[1]], total: 1 });
  getDetailMock.mockResolvedValue({ ...REPORTS[1], attachments: [], handle_remark: '已处理完毕', handled_at: '2026-11-15T12:00:00+08:00', handled_by: '管理员' });
  render(<App><ReportManagement /></App>);
  fireEvent.click(await screen.findByRole('button', { name: /详\s*情/ }));
  await screen.findByTestId('report-detail-section');
  expect(screen.queryByTestId('report-handle-section')).toBeNull();
  expect(screen.getByText(/已处理完毕/)).toBeInTheDocument();
});

it('点击举报人昵称打开用户资料卡片', async () => {
  getListMock.mockResolvedValue({ list: [REPORTS[0]], total: 1 });
  getUserDetailMock.mockResolvedValue({ user: { user_id: 'u1', phone: '', is_migrated: false }, profile: {}, match_profile: null, wallet: null });
  render(<App><ReportManagement /></App>);
  fireEvent.click(await screen.findByText('张三'));
  expect(await screen.findByText('用户详情')).toBeInTheDocument();
  expect(getUserDetailMock).toHaveBeenCalledWith('u1');
});
```

（`userEvent` 从 @testing-library/user-event；`within` 从 @testing-library/react。）

- [ ] **Step 2: 运行测试确认失败**

Run: `cd packages/admin-cheng && npx vitest run tests/ReportManagement.test.tsx`
Expected: FAIL（模块 `src/pages/community/ReportManagement.tsx` 不存在）

- [ ] **Step 3: 实现页面** 于 `src/pages/community/ReportManagement.tsx`

结构（参照旧 ComplaintManagement 同款页面骨架）：
- `REPORT_FILTERS`：status select（全部状态，options 待处理/已处理/已驳回，不含「全部」）+ `target_match_code` input（placeholder 搜索被举报能成号）。
- `useListPage` + `formatResponse`（Array/`{list,total}` 双兼容）。
- 列：举报人（Button link 包 Space 包 UserAvatar+昵称 → UserDetailCardModal，user_id 为空不点击）、被举报人（同）、举报内容（不设宽 wordBreak）、状态 Tag（labels/colors + title）、dateTimeColumn created_at、操作「详情」（EyeOutlined，打开详情弹窗）。
- 详情弹窗（ScrollableModal，本文件内嵌）：`report-detail-section` 包裹——双方卡片（Avatar getAvatarUrl + 昵称 + 能成号 + 性别 Tag）、举报内容、附件 `getMediumUrl`+preview 原图（附件空不渲染）、状态 Tag；`detail.status === ReportStatus.PENDING` 时渲染 `report-handle-section`：Radio 已处理（1）/已驳回（2）+ TextArea 处理意见（placeholder 含「处理意见」、maxLength 500 showCount、必填校验「请填写处理意见」）+「提交处理」按钮 → `reportApi.handle(id, { status, remark })` 成功后 success toast + onSuccess 刷新 + 关闭；非待处理显示处理记录（处理意见/处理人/处理时间）。
- 打开弹窗即 `reportApi.getDetail` 重拉（同 UserDetailCardModal 系统标准）。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd packages/admin-cheng && npx vitest run tests/ReportManagement.test.tsx`
Expected: PASS（7 例）

- [ ] **Step 5: 提交并补 CHANGELOG**

```bash
git add packages/admin-cheng/src/pages/community/ReportManagement.tsx packages/admin-cheng/tests/ReportManagement.test.tsx
git commit -m "feat: 举报管理页面——列表/详情/处理（report 接口三件套）"
```

随后 CHANGELOG 顶部补一行并单独提交。

---

### Task 3: 替换清理

**Files:**
- Delete: `src/pages/community/ComplaintManagement.tsx`、`tests/ComplaintManagement.test.tsx`
- Modify: `src/api/services/xpay.ts`（删除投诉枚举/类型/接口方法：PayComplaintStatus、PayComplaintDirection、AdminComplaintMessageItem、AdminComplaintItem、AdminComplaintDetail、getComplaints、getComplaint、completeComplaint、replyComplaint、negotiationHistory 及相关，保留充值档位等其余内容）、`src/router/index.tsx`（import 与路由 `complaints` → `reports`）、`src/components/layout/menuConfig.tsx`（key `/operation/reports`、label「举报管理」、icon FlagOutlined）

**Interfaces:**
- Consumes: Task 2 的 `ReportManagement` 默认导出。
- Produces: 路由 `/operation/reports`；全仓库无「投诉管理」残留（xpay 支付投诉代码删除后 tsc 与相关测试绿）。

- [ ] **Step 1: 执行删除与替换**

删除两个文件；xpay.ts 按上述范围删（先 `grep -n` 定位投诉代码段再删，保留文件其余内容）；router 与 menuConfig 替换（先检查是否有测试断言旧菜单名/旧路由，如有同步更新断言）。

- [ ] **Step 2: 验证**

Run: `cd packages/admin-cheng && npx vitest run tests/ReportManagement.test.tsx && npx tsc --noEmit`
再 `grep -rn "投诉管理\|ComplaintManagement\|complaints" packages/admin-cheng/src` 确认无残留（xpay 投诉相关应已全部删除；`/admin/v1/xpay/complaints` 字符串不得再出现）。
Expected: 测试绿；tsc 无新增错误；grep 无残留。

- [ ] **Step 3: 提交并补 CHANGELOG**

```bash
git add -A packages/admin-cheng/src/api/services/xpay.ts packages/admin-cheng/src/router/index.tsx packages/admin-cheng/src/components/layout/menuConfig.tsx
git rm packages/admin-cheng/src/pages/community/ComplaintManagement.tsx packages/admin-cheng/tests/ComplaintManagement.test.tsx
git commit -m "refactor: 投诉管理直接替换为举报管理——删支付投诉页面/测试/服务接口，路由与菜单同步"
```

随后 CHANGELOG 顶部补一行并单独提交。
