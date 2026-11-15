# 「投诉管理」替换为「举报管理」设计

日期：2026-11-15
状态：已确认（用户确认：直接替换，完全改成举报）

## 意图

互动管理下的「投诉管理」（微信支付投诉）直接替换为「举报管理」，对接新的举报系统接口
（用户举报：对方能成号 + 举报内容 + 附件图片），列表管理 + 详情处理。

## 目标 / 非目标

- 目标：新建举报列表页（状态筛选 + 能成号搜索）+ 详情弹窗（双方卡片/内容/附件/处理）+ 处理操作（已处理/已驳回 + 必填意见）；删除支付投诉页面及其测试与服务代码；路由与菜单同步改。
- 非目标：不动 xpay 其它接口（充值档位等）；不改 `src/shared`（枚举放服务文件，沿用 xpay PayComplaintStatus 先例）；不改 SearchPanel 模板（时间范围筛选暂不做，后续需要再扩展模板）。

## 约束（接口以 cheng-swagger.json 为准）

- 列表：`GET /admin/v1/bizops/report`——page/size（最大 100）、status（0=待处理 1=已处理 2=已驳回）、target_match_code、start_time/end_time。
- 详情：`GET /admin/v1/bizops/report/{id}`——content、attachments、reporter/target（user_id/昵称/头像/能成号/性别）、status、handle_remark、handled_at、handled_by、created_at。
- 处理：`PATCH /admin/v1/bizops/report/{id}/handle`——`{ status: 1|2, remark: 必填 }`（0 不允许）。
- 模板组件：StandardPage/StandardTable/SearchPanel/UserDetailCardModal/ScrollableModal；消息 useAppNotification；头像 getAvatarUrl；附件图 getMediumUrl + preview 原图。
- 枚举 `ReportStatus { PENDING=0, HANDLED=1, REJECTED=2 }` 定义在 `src/api/services/report.ts`（不碰 src/shared）。

## 方案选择

- **选定**：直接替换（用户定）——删旧页面/测试/xpay 投诉接口与类型，路由 `complaints` → `reports`，菜单「举报管理」（FlagOutlined）。
- 备选（保留支付投诉改名并存）：用户已否。

## 页面与交互

- 列表：举报人（头像+昵称，点击开用户资料卡片）、被举报人（同）、举报内容（不设宽自动换行）、状态 Tag（橙/绿/红，带 title）、提交时间（双行）、操作「详情」（EyeOutlined）。
- 筛选：状态下拉（全部状态/待处理/已处理/已驳回）+ `target_match_code` 输入（搜索被举报能成号）；右侧刷新按钮。
- 详情弹窗（ScrollableModal）：双方卡片（头像/昵称/能成号/性别 Tag）、举报内容、附件图片（缩略图点击预览原图）、处理区——待处理：Radio 已处理/已驳回 + 处理意见 TextArea（必填，≤500）+「提交处理」；已处理/已驳回：只读展示处理意见/处理人/处理时间。
- 页面标题「举报管理」、描述（中文无技术术语）：「管理用户提交的举报信息，查看举报双方资料与凭证并完成处理。」

## 留给实现者

- 处理成功后刷新列表并关闭弹窗；处理意见长度上限 500 的提示。
- 删除范围：ComplaintManagement.tsx、tests/ComplaintManagement.test.tsx、xpay.ts 中投诉枚举/类型/接口方法（getComplaints/getComplaint/completeComplaint/replyComplaint/negotiationHistory 及关联类型），保留 xpay 其余内容。
