# 他俩能成 - 项目进度

> 本文件记录项目模块完成状态、接口迁移进度和关联的 git 提交。每次完成一批实质性改动并提交后更新。

## 更新机制

**触发条件**（满足任一即更新）：
- 新增/完成一个功能模块
- 新增/修改了涉及后端接口的功能（新增 API 调用、修改参数/响应映射）
- 修复了全局性问题（如缩略图、表格列统一等跨文件改动）

**不触发**：单文件小修、文案调整、样式微调。

**更新方式**：
1. `git commit` 提交改动，commit message 用简洁的动词短语描述
2. 将 commit hash 写入本文件对应条目的 `commit` 列
3. 更新 `最后更新` 日期

> 回溯时：在本文件找到对应条目 → 复制 commit hash → `git show <hash>` 或 `git revert <hash>`

---

## 最后更新

**2026-07-25**

---

## 已完成模块

### 系统管理
- 工作台、角色管理、管理账号、管理日志、修改密码、我的日志
- **来源管理**（v1 接口迁移完成，含单来源注册/上报数据统计弹窗）

### 运营管理
- 运营分类管理、活动分类管理、活动发布、轮播图管理、协议文档、FAQ管理
- 活动管理（含规格/SKU 配置向导、价格快捷配置、退款设置）
- 退款规则管理（super_admin 专属）
- 门票销售（root_category_id=2 隔离，含门票分类管理）
- 商品销售（root_category_id=3 隔离，含商品分类管理）
- 活动报名（订单管理，v1 重构为共享组件 OrderListPage）
- 购票信息（TicketOrders，v1 重构为共享组件）
- 购买信息（ProductOrders，v1 重构为共享组件）

### 财务管理
- 优惠券管理（v1 完整 CRUD + 兑换规则 + 发放功能）
- 发票管理（v1 接口，查询 + 详情）
- 支付管理（v1 接口迁移）
- 退款管理（v1 接口迁移）

### 社区管理
- 用户列表（v1 接口迁移）、用户统计、协议文档（v6 接口）

---

## 已完成接口迁移

| 模块 | 路径前缀 | 备注 |
|------|---------|------|
| 登录/鉴权 | `POST /admin/v1/login` | JWT Bearer Token |
| 管理员 CRUD | `/admin/v1/users` | |
| 角色管理 | `/admin/v1/roles` | |
| 权限分配 | `/admin/v1/permissions`、`/admin/v1/roles/:id/permissions` | |
| 分类管理 | `/admin/v1/mall/categories` | |
| 商品（活动）管理 | `/admin/v1/mall/products` | 支持 root_category_id 隔离 |
| 规格管理 | `/admin/v1/mall/products/:id/specs` | |
| SKU 管理 | `/admin/v1/mall/products/:id/skus` | |
| 预约时段 | `/admin/v1/mall/products/:id/booking-slots` | 含批量创建/删除 |
| 退款规则 | `/admin/v1/mall/refund-rules` | 含 CRUD + 显隐控制 |
| 用户管理 | `GET /admin/v1/mall/users`、`PATCH .../status` | 列表 + 状态切换 |
| 订单管理 | `GET /admin/v1/mall/orders`、`POST .../remark`、导出 | 支持 order_type 筛选 |
| 退款管理 | `GET /admin/v1/mall/refunds` | 退款记录查询 |
| 发票管理 | `GET /admin/v1/mall/invoices` | 发票记录查询 |
| 优惠券管理 | `/admin/v1/mall/coupons` + `/admin/v1/mall/exchange-configs` | 完整 CRUD + 兑换规则 + 发放 |
| 来源管理 | `/admin/v1/sources` + register-stats + report-stats | v1 完整迁移 |
| 图片上传 | `POST /admin/v1/upload/image` | vbegin CDN |
| 日志 | `/admin/v1/logs/audit`、`/admin/v1/logs/my` | |

### 仍在用 v6 的模块

| 模块 | 路径前缀 | 原因 |
|------|---------|------|
| 访问统计 | `/admin/v6/wxa/app/datacube/daily/visit/*` | v1 无对应接口 |
| 访问用户统计 | `/admin/v6/wxa/app/datacube/daily/retain/*`、`summary/*` | v1 无对应接口 |
| 用户统计 | `/admin/v6/user/datacube/*` | v1 无对应接口 |
| 支付管理 | `/admin/v6/event/order/payment` | 支付记录查询（v1 订单接口已含支付信息） |
| 动态/评论/话题 | `/admin/v6/feed/*`、`/admin/v6/comment/*`、`/admin/v6/topic/*` | v1 无对应接口（相关管理页面已移除） |

---

## 改造记录

| 日期 | 改造内容 | 影响范围 | commit |
|------|---------|---------|--------|
| 2026-07-25 | useAppNotification + console 清理 | 11 文件，修复 5 个违规 + 10+ 处控制台语句 | （待提交） |
| 2026-07-25 | CLAUDE.md 文档路径修正 + 发票管理菜单链接 | CLAUDE.md + MainLayout.tsx | （待提交） |
| 2026-07-25 | 文档同步更新（PROGRESS + SITEMAP） | docs/ | （待提交） |
| 2026-07-21 | 优惠券管理 v1 完整重构 | CouponManagement + coupon API（CRUD + 兑换规则 + 发放） | 72d269d |
| 2026-07-21 | 来源管理 v1 迁移 | SourceManagement + source API（注册/上报统计弹窗） | 72d269d |
| 2026-07-21 | 发票管理新模块 | InvoiceManagement（v1 接口） | 72d269d |
| 2026-07-21 | 订单/退款管理 v1 重构 | OrderListPage + RefundRecords + TicketOrders + ProductOrders | 72d269d |
| 2026-07-21 | 用户列表 v1 迁移 | UserList（头像/昵称/姓名/性别/年龄/积分/注册时间） | 72d269d |
| 2026-07-21 | FAQ 创建修复 + 协议内容加载修复 | FaqManagement + RichTextEditor | 72d269d |
| 2026-07-21 | 底部导航更新（DEMO 指南 5 Tab） | docs/demo-guide.md | 86cdfa7 |
| 2026-07-17 | 门票销售模块 | 新建 TicketManagement/TicketWizard/TicketEdit，共享组件增加 ticketMode | ba68aac |
| 2026-07-17 | 商品销售模块 | 新建 ProductManagement/ProductWizard/ProductEdit，共享组件增加 productMode | ba68aac |
| 2026-07-17 | 信息模板增强 | 新增"身份证号"预设字段 + idcardRestrict 附加限制 | ba68aac |
| 2026-07-17 | 文档标准完善 | 搜索交互、列排列、缩略图规则写入 CLAUDE.md + dev-standards.md | ba68aac |
| 2026-07-17 | 修复登录跳转+富文本换行+菜单权限 | 子路径部署适配、RichTextEditor innerHTML 注入、page-config 仅超管 | dd4c945 |
| 2026-07-17 | 前端小程序开发指南 | docs/frontend-miniapp-guide.md（10 章） | ac43147 |
| 2026-07-17 | 文档结构调整 | PROGRESS+SITEMAP 迁入 docs/，SITEMAP 重写为当前结构+更新机制 | 3f71921 |
| 2026-07-16 | 图片缩略图全站接入 | 16 文件，新增 imageUtils | ba68aac |
| 2026-07-16 | 表格列排列标准统一 | 23 文件，55 处修改 | ba68aac |
| 2026-07-16 | 产品 specs 日期类型互斥 | SkuConfigPanel 强制唯一日期 spec | ba68aac |
| 2026-07-16 | CLAUDE.md 精简 + 进度/标准文档重构 | 根 328→130 行，项目 232→69 行 | ba68aac |
| 2026-07-16 | 退款配置重构 | refund_type 字段 0/1/2/3，新增退款规则管理页面 | ba68aac |

---

## 待办

- 财务统计、工作台整体统计（需后端提供 v1 接口）
- 支付管理独立页面（目前支付信息内嵌在订单中）
- 代码拆分：SkuConfigWizard（1012行→拆分）等大文件
- 提取通用 Columns 渲染器（StatusColumn、DateTimeColumn 等）
- 测试覆盖（Vitest + React Testing Library）
- 性能优化（代码分割、懒加载）
- 部署配置（Docker、CI/CD）
