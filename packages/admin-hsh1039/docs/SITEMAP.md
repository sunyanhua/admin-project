# 1039发现 — 后台管理站点地图

> 本文件由菜单结构 (`MainLayout.tsx`) 和路由配置 (`router/index.tsx`) 自动推导。每次新增/修改页面后更新。

## 更新机制

**触发条件**（满足任一即更新）：
- 新增/删除一个菜单项或页面路由
- 页面路由路径发生变化
- 菜单分组结构发生变化

**不触发**：页面内部逻辑修改、样式调整。

**更新方式**：
1. 修改代码中的菜单和路由后，同步更新本文件
2. 更新 `最后更新` 日期

---

## 最后更新

**2026-07-17**

---

## 树状结构图

```
1039发现 管理后台
├── ⚙️ 系统管理
│   ├── 📊 工作台 #/
│   │   └── 接口: GET /admin/v1/login (获取登录状态)
│   │
│   ├── 👤 管理员管理
│   │   ├── 角色管理 #/system/roles
│   │   │   └── 接口: GET/POST/PUT/DELETE /admin/v1/roles
│   │   ├── 管理账号 #/system/admins
│   │   │   └── 接口: GET/POST/PUT/DELETE /admin/v1/users
│   │   └── 管理日志 #/system/admin-logs
│   │       └── 接口: GET /admin/v1/logs/audit
│   │
│   ├── 🔐 我的账户
│   │   ├── 修改密码 #/system/change-password
│   │   │   └── 接口: POST /admin/v1/login/pass
│   │   └── 我的日志 #/system/my-logs
│   │       └── 接口: GET /admin/v1/logs/my
│   │
│   └── 📈 访问数据统计
│       ├── 来源管理 #/system/sources
│       └── 访问统计 #/system/visits
│       └── 访问用户统计 #/system/visits/users
│
├── 🛒 运营管理
│   ├── ⚙️ 配置管理
│   │   ├── 页面配置管理 #/operation/page-config 🔒(超管)
│   │   ├── 运营分类管理 #/operation/categories 🔒(超管)
│   │   ├── 退款规则管理 #/operation/refund-rules
│   │   ├── 轮播图管理 #/operation/banners
│   │   ├── 协议文档 #/operation/agreements
│   │   └── FAQ管理 #/operation/faq
│   │
│   ├── 👥 用户管理
│   │   ├── 注册用户 #/operation/users
│   │   └── 用户统计 #/operation/user-stats
│   │
│   ├── 🎉 活动管理
│   │   ├── 活动分类管理 #/operation/event-categories
│   │   ├── 活动发布 #/operation/events
│   │   └── 活动报名 #/operation/event-orders
│   │
│   ├── 🎫 门票管理
│   │   ├── 门票分类管理 #/operation/ticket-categories
│   │   ├── 门票销售 #/operation/tickets (新增)
│   │   └── 购票信息 #/operation/ticket-orders (待开发)
│   │
│   └── 📦 商品管理
│       ├── 商品分类管理 #/operation/product-categories
│       ├── 商品销售 #/operation/products (新增)
│       └── 购买信息 #/operation/product-orders (待开发)
│
└── 💰 财务管理
    └── 📊 财务信息
        ├── 支付管理 #/finance/payments
        ├── 退款管理 #/finance/refunds
        ├── 优惠券管理 #/finance/coupons
        └── 财务统计 #/finance/stats (待开发)
```

---

## 详细说明

### 一、系统管理

| 页面 | 路由 | 功能 |
|------|------|------|
| 工作台 | `#/` | 首页仪表盘 |
| 角色管理 | `#/system/roles` | 角色 CRUD |
| 管理账号 | `#/system/admins` | 管理员账号 CRUD |
| 管理日志 | `#/system/admin-logs` | 审计日志查询 |
| 修改密码 | `#/system/change-password` | 修改当前登录密码 |
| 我的日志 | `#/system/my-logs` | 当前管理员操作日志 |
| 来源管理 | `#/system/sources` | 访问来源管理 |
| 访问统计 | `#/system/visits` | 浏览访问数据 |
| 访问用户统计 | `#/system/visits/users` | 访问用户数据 |

### 二、运营管理

| 页面 | 路由 | 权限 | 功能 |
|------|------|------|------|
| 页面配置管理 | `#/operation/page-config` | 🔒超管 | 页面配置 |
| 运营分类管理 | `#/operation/categories` | 🔒超管 | 分类树管理 |
| 退款规则管理 | `#/operation/refund-rules` | 全部 | 退款规则 CRUD |
| 轮播图管理 | `#/operation/banners` | 全部 | Banner 管理 |
| 协议文档 | `#/operation/agreements` | 全部 | 协议文档管理 |
| FAQ管理 | `#/operation/faq` | 全部 | FAQ 管理 |
| 注册用户 | `#/operation/users` | 全部 | 用户列表 |
| 用户统计 | `#/operation/user-stats` | 全部 | 用户数据统计 |
| 活动分类管理 | `#/operation/event-categories` | 全部 | 活动分类（上下架/显隐/权重） |
| 活动发布 | `#/operation/events` | 全部 | 活动 CRUD + 规格/SKU 配置 |
| 活动报名 | `#/operation/event-orders` | 全部 | 报名订单管理 |
| 门票分类管理 | `#/operation/ticket-categories` | 全部 | 门票分类（上下架/显隐/权重） |
| 门票销售 | `#/operation/tickets` | 全部 | 门票 CRUD + 规格/SKU 配置 |
| 商品分类管理 | `#/operation/product-categories` | 全部 | 商品分类（上下架/显隐/权重） |
| 商品销售 | `#/operation/products` | 全部 | 商品 CRUD + 规格/SKU 配置 |

### 三、财务管理

| 页面 | 路由 | 功能 |
|------|------|------|
| 支付管理 | `#/finance/payments` | 支付记录查询 |
| 退款管理 | `#/finance/refunds` | 退款记录查询 |
| 优惠券管理 | `#/finance/coupons` | 优惠券管理 |
| 财务统计 | `#/finance/stats` | 待开发 |

---

## 页面文件组织

```
src/pages/
├── Login.tsx                          # 登录页
├── Dashboard.tsx                      # 工作台
├── NotFound.tsx                       # 404
│
├── system/                            # 系统管理
│   ├── AdminManagement.tsx            # 管理账号
│   ├── AdminLogs.tsx                  # 管理日志
│   ├── RoleManagement.tsx             # 角色管理
│   ├── ChangePassword.tsx             # 修改密码
│   ├── MyLogs.tsx                     # 我的日志
│   ├── SourceManagement.tsx           # 来源管理
│   ├── VisitStatistics.tsx            # 访问统计
│   ├── VisitUserStats.tsx             # 访问用户统计
│   ├── BannerManagement.tsx           # 轮播图管理
│   └── FaqManagement.tsx              # FAQ管理
│
├── operation/                         # 运营管理
│   ├── CategoryManagement.tsx         # 运营分类管理
│   ├── PageConfigManagement.tsx       # 页面配置管理
│   ├── RefundRuleManagement.tsx       # 退款规则管理
│   ├── EventCategoryManagement.tsx    # 活动分类管理
│   ├── EventManagement.tsx            # 活动发布
│   ├── TicketCategoryManagement.tsx    # 门票分类管理
│   ├── TicketManagement.tsx           # 门票销售
│   ├── ProductCategoryManagement.tsx  # 商品分类管理
│   └── ProductManagement.tsx          # 商品销售
│
├── events/                            # 事件/财务
│   ├── EventOrders.tsx                # 活动报名
│   ├── PaymentRecords.tsx             # 支付记录
│   ├── RefundRecords.tsx              # 退款记录
│   └── SettlementAudit.tsx            # 结算审核
│
├── finance/                           # 财务管理
│   ├── CouponManagement.tsx           # 优惠券管理
│   └── WithdrawalManagement.tsx       # 提现管理
│
└── community/                         # 社区管理
    ├── UserList.tsx                   # 注册用户
    ├── UserStats.tsx                  # 用户统计
    ├── FeedManagement.tsx             # 动态管理
    ├── CommentManagement.tsx          # 评论管理
    ├── TopicManagement.tsx            # 话题管理
    └── AgreementManagement.tsx        # 协议文档
```

---

## 公共组件

```
src/components/operation/             # 运营共享组件
├── EventWizardModal.tsx               # 活动创建向导
├── EventEditModal.tsx                 # 活动编辑弹窗
├── TicketWizardModal.tsx              # 门票创建向导
├── TicketEditModal.tsx                # 门票编辑弹窗
├── ProductWizardModal.tsx             # 商品创建向导
├── ProductEditModal.tsx               # 商品编辑弹窗
├── SkuConfigWizard.tsx                # SKU 配置向导（公用于活动/门票/商品）
├── SkuConfigPanel.tsx                 # SKU 组合配置面板
├── SkuConfigModal.tsx                 # SKU 高级配置弹窗
├── SkuPriceModal.tsx                  # SKU 快捷配置弹窗
├── RefundSettings.tsx                 # 退款设置组件
├── ExtraInfoEditor.tsx                # 信息模板编辑器
├── EventCategoryEditModal.tsx         # 活动分类编辑弹窗
├── MallCategoryEditModal.tsx          # 通用分类编辑弹窗（门票/商品）
└── CategoryEditModal.tsx              # 运营分类编辑弹窗
```
