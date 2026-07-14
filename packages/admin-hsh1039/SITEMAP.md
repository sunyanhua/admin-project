# 后台管理站点地图

## 树状结构图

```
1039俱乐部+管理后台
├── ⚙️ 系统管理
│   ├── 📊 工作台
│   │   └── 系统首页 #/
│   │       └── 接口: GET /admin/login (获取登录状态和菜单)
│   │
│   ├── 👤 管理员管理
│   │   ├── 管理账号管理 #/system/admins
│   │   │   ├── 接口: GET /admin/user (列表)
│   │   │   ├── 接口: POST /admin/user (创建)
│   │   │   ├── 接口: POST /admin/user/{id} (更新)
│   │   │   ├── 接口: POST /admin/user/delete (删除)
│   │   │   └── 接口: GET /admin/user/{id} (详情)
│   │   └── 管理日志查看 #/system/admin-logs
│   │       └── 接口: GET /admin/logs (操作日志)
│   │
│   ├── 🔐 我的账户
│   │   ├── 修改密码 #/system/change-password
│   │   │   └── 接口: POST /admin/login/pass
│   │   └── 我的日志 #/system/my-logs
│   │       └── 接口: GET /admin/login/logs
│   │
│   ├── 📈 访问数据统计
│   │   ├── 来源管理 #/system/sources
│   │   │   └── 接口: 暂无接口
│   │   └── 访问统计 #/system/visits
│   │       └── 接口: 暂无接口
│   │
│   └── 📄 配置管理
│       ├── 轮播图管理 #/system/banners
│       │   ├── 接口: GET /admin/v6/banner (列表)
│       │   ├── 接口: POST /admin/v6/banner (创建)
│       │   ├── 接口: POST /admin/v6/banner/{id} (更新)
│       │   ├── 接口: POST /admin/v6/banner/delete (删除)
│       │   ├── 接口: POST /admin/v6/banner/status (状态)
│       │   └── 接口: POST /admin/v6/banner/visible (可见性)
│       │
│       ├── 城市管理 #/system/cities
│       │   ├── 接口: GET /admin/v6/city (列表)
│       │   ├── 接口: POST /admin/v6/city (创建)
│       │   ├── 接口: POST /admin/v6/city/{adcode} (更新)
│       │   ├── 接口: POST /admin/v6/city/delete (删除)
│       │   ├── 接口: POST /admin/v6/city/status (状态)
│       │   └── 接口: POST /admin/v6/city/visible (可见性)
│       │
│       ├── 协议文档 #/system/agreements
│       │   └── 接口: GET/POST /admin/v6/config/agreement_* (通过配置接口)
│       │
│       └── 热门搜索词 #/system/hot-keywords
│           └── 接口: GET/POST /admin/v6/config/hot_keywords (通过配置接口)

├── 👥 社区管理
│   ├── ⚙️ 基本配置
│   │   ├── 审核模式 #/community/settings
│   │   │   └── 接口: GET/POST /admin/v6/config/UGC.* (通过配置接口)
│   │   └── 积分设置 #/community/points
│   │       └── 接口: GET/POST /admin/v6/config/points_* (通过配置接口)
│   │
│   ├── 👤 用户管理
│   │   ├── 用户标签管理 #/community/user-tags
│   │   │   └── 接口: 暂无接口
│   │   ├── 注册用户管理 #/community/users
│   │   │   ├── 接口: GET /admin/v6/user (列表)
│   │   │   └── 接口: GET /admin/v6/user/{id} (详情)
│   │   └── 用户认证 #/community/partner-auth
│   │       ├── 接口: GET /admin/v6/user/coop (列表)
│   │       ├── 接口: GET /admin/v6/user/coop/{id} (详情)
│   │       └── 接口: POST /admin/v6/user/coop/{id} (审核)
│   │
│   ├── 💬 动态管理
│   │   ├── 话题管理 #/community/topics
│   │   │   ├── 接口: GET /admin/v6/topic (列表)
│   │   │   ├── 接口: POST /admin/v6/topic (创建)
│   │   │   ├── 接口: PUT /admin/v6/topic/{id} (更新)
│   │   │   ├── 接口: POST /admin/v6/topic/delete (删除)
│   │   │   └── 接口: POST /admin/v6/topic/status (状态)
│   │   ├── 动态发布管理 #/community/feeds
│   │   │   ├── 接口: GET /admin/v6/feed (列表)
│   │   │   ├── 接口: GET /admin/v6/feed/{id} (详情)
│   │   │   ├── 接口: POST /admin/v6/feed/{id} (更新)
│   │   │   └── 接口: POST /admin/v6/feed/recom (推荐)
│   │   └── 评论管理 #/community/comments
│   │       └── 接口: 暂无接口
│   │
│   └── 📊 社区统计
│       ├── 用户统计 #/community/stats/users
│       │   └── 接口: 暂无接口
│       └── 动态统计 #/community/stats/feeds
│           └── 接口: 暂无接口

└── 🎉 活动管理
    ├── ⚙️ 基本配置
    │   ├── 活动类型管理 #/events/categories
    │   │   └── 接口: 暂无接口 (可复用 /admin/v6/category)
    │   └── 费率配置 #/events/fee-config
    │       └── 接口: GET/POST /admin/v6/config/fee_* (通过配置接口)
    │
    ├── 📝 活动信息管理
    │   ├── 活动发布管理 #/events/list
    │   │   ├── 接口: GET /admin/v6/event (列表)
    │   │   ├── 接口: GET /admin/v6/event/{id} (详情)
    │   │   ├── 接口: POST /admin/v6/event/{id} (更新)
    │   │   └── 接口: POST /admin/v6/event/recom (推荐)
    │   └── 活动报名 #/events/finance/orders
    │       ├── 接口: GET /admin/v6/event/order (列表)
    │       └── 接口: GET /admin/v6/event/order/{id} (详情)
    │
    └── 💰 活动财务管理
        │   ├── 接口: GET /admin/v6/event/order (列表)
        │   └── 接口: GET /admin/v6/event/order/{id} (详情)
        ├── 支付记录 #/events/finance/payments
        │   ├── 接口: GET /admin/v6/event/order/payment (列表)
        │   └── 接口: GET /admin/v6/event/order/payment/{id} (详情)
        ├── 退款记录 #/events/finance/refunds
        │   ├── 接口: GET /admin/v6/event/order/refund (列表)
        │   └── 接口: GET /admin/v6/event/order/refund/{id} (详情)
        └── 提现管理 #/events/finance/withdrawals
            ├── 接口: GET /admin/v6/wxa/user/wallet/withdraw (列表)
            ├── 接口: GET /admin/v6/wxa/user/wallet/withdraw/{id} (详情)
            └── 接口: POST /admin/v6/wxa/user/wallet/withdraw/{id} (审核)

```

---

## 详细说明

### 一、系统管理

#### 1.1 工作台 (Dashboard)

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 系统首页 | `#/` | 管理员登录后的首页，展示概览数据 | `GET /admin/login` (获取登录状态) |

#### 1.2 管理员管理

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 管理账号管理 | `#/system/admins` | 管理系统管理员账号的增删改查 | `GET /admin/user`<br>`POST /admin/user`<br>`POST /admin/user/{id}`<br>`POST /admin/user/delete` |
| 管理日志查看 | `#/system/admin-logs` | 系统管理员的操作记录日志查询 | `GET /admin/logs` |

#### 1.3 我的账户

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 修改密码 | `#/system/change-password` | 修改当前登录管理员的密码 | `POST /admin/login/pass` |
| 我的日志 | `#/system/my-logs` | 查看当前管理员的操作记录 | `GET /admin/login/logs` |

#### 1.4 访问数据统计

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 来源管理 | `#/system/sources` | 平台的访问与注册来源管理 | **暂无接口** |
| 访问统计 | `#/system/visits` | 平台的浏览访问统计数据 | **暂无接口** |

#### 1.5 配置管理

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 轮播图管理 | `#/system/banners` | 首页及各页面轮播图管理 | `GET /admin/v6/banner`<br>`POST /admin/v6/banner`<br>`POST /admin/v6/banner/{id}`<br>`POST /admin/v6/banner/delete`<br>`POST /admin/v6/banner/status`<br>`POST /admin/v6/banner/visible` |
| 城市管理 | `#/system/cities` | 行政区划城市管理 | `GET /admin/v6/city`<br>`POST /admin/v6/city`<br>`POST /admin/v6/city/{adcode}`<br>`POST /admin/v6/city/delete`<br>`POST /admin/v6/city/status`<br>`POST /admin/v6/city/visible` |
| 协议文档 | `#/system/agreements` | 平台协议文档管理 | `GET /admin/v6/config/{name}`<br>`POST /admin/v6/config/{name}` |
| 热门搜索词 | `#/system/hot-keywords` | 热门搜索词管理 | `GET /admin/v6/config/{name}`<br>`POST /admin/v6/config/{name}` |

---

### 二、社区管理

#### 2.1 基本配置

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 审核模式 | `#/community/settings` | 社区动态和评论的审核模式配置 | `GET /admin/v6/config/UGC.*`<br>`POST /admin/v6/config/UGC.*` |
| 积分设置 | `#/community/points` | 平台积分规则配置 | `GET /admin/v6/config/points_*`<br>`POST /admin/v6/config/points_*` |

#### 2.2 用户管理

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 用户标签管理 | `#/community/user-tags` | 平台用户标签的配置管理 | **暂无接口** |
| 注册用户管理 | `#/community/users` | 注册用户信息的管理 | `GET /admin/v6/user`<br>`GET /admin/v6/user/{id}` |
| 用户认证 | `#/community/partner-auth` | 主理人/商户合作认证审核 | `GET /admin/v6/user/coop`<br>`GET /admin/v6/user/coop/{id}`<br>`POST /admin/v6/user/coop/{id}` |

#### 2.3 动态管理

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 话题管理 | `#/community/topics` | 平台话题的增删改查、封面图片上传 | `GET /admin/v6/topic`<br>`POST /admin/v6/topic`<br>`PUT /admin/v6/topic/{id}`<br>`POST /admin/v6/topic/delete` |
| 动态发布管理 | `#/community/feeds` | 用户动态内容的查看与管理 | `GET /admin/v6/feed`<br>`GET /admin/v6/feed/{id}`<br>`POST /admin/v6/feed/{id}`<br>`POST /admin/v6/feed/recom` |
| 评论管理 | `#/community/comments` | 动态评论的查看与管理 | **暂无接口** |

#### 2.4 社区统计

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 用户统计 | `#/community/stats/users` | 社区注册用户数据的统计 | **暂无接口** |
| 动态统计 | `#/community/stats/feeds` | 社区动态发布与评论数据的统计 | **暂无接口** |

---

### 三、活动管理

#### 3.1 基本配置

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 活动类型管理 | `#/events/categories` | 平台活动类型的管理 | **暂无接口** (可复用分类接口) |
| 费率配置 | `#/events/fee-config` | 平台费率规则配置 | `GET /admin/v6/config/fee_*`<br>`POST /admin/v6/config/fee_*` |

#### 3.2 活动信息管理

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 活动发布管理 | `#/events/list` | 活动发布信息的查看、审核与推荐 | `GET /admin/v6/event`<br>`GET /admin/v6/event/{id}`<br>`POST /admin/v6/event/{id}`<br>`POST /admin/v6/event/recom` |
| 活动报名 | `#/events/finance/orders` | 活动报名订单管理 | `GET /admin/v6/event/order`<br>`GET /admin/v6/event/order/{id}` |

#### 3.3 活动财务管理

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 支付记录 | `#/events/finance/payments` | 用户支付记录查询 | `GET /admin/v6/event/order/payment`<br>`GET /admin/v6/event/order/payment/{id}` |
| 退款记录 | `#/events/finance/refunds` | 订单退款记录查询 | `GET /admin/v6/event/order/refund`<br>`GET /admin/v6/event/order/refund/{id}` |
| 提现管理 | `#/events/finance/withdrawals` | 用户钱包提现申请审核 | `GET /admin/v6/wxa/user/wallet/withdraw`<br>`GET /admin/v6/wxa/user/wallet/withdraw/{id}`<br>`POST /admin/v6/wxa/user/wallet/withdraw/{id}` |

#### 3.4 活动统计

| 页面 | 路由 | 说明 | 调用接口 |
|------|------|------|----------|
| 活动数据统计 | `#/events/stats` | 活动相关数据的统计报表 | **暂无接口** |

---

## 接口与页面对照表

### 已匹配接口（可直接使用）

| 接口路径 | 对应页面 |
|----------|----------|
| `GET/POST /admin/login` | 登录页、系统首页 |
| `POST /admin/logout` | 全局登出功能 |
| `POST /admin/login/pass` | 修改密码页 |
| `GET /admin/login/logs` | 我的日志页 |
| `GET/POST /admin/user` | 管理员管理、注册用户管理 |
| `GET/POST /admin/user/{id}` | 管理员编辑、用户详情 |
| `POST /admin/user/delete` | 管理员删除 |
| `GET /admin/logs` | 管理日志查看 |
| `GET/POST /admin/v6/banner` | 轮播图管理 |
| `GET/POST /admin/v6/city` | 城市管理 |
| `GET/POST /admin/v6/config/{name}` | 系统配置、协议文档、费率配置、积分设置 |
| `GET/POST /admin/v6/topic` | 话题管理 |
| `GET/POST /admin/v6/feed` | 动态发布管理 |
| `GET/POST /admin/v6/event` | 活动发布管理 |
| `GET /admin/v6/event/order` | 活动报名 |
| `GET /admin/v6/event/order/payment` | 支付记录 |
| `GET /admin/v6/event/order/refund` | 退款记录 |
| `GET/POST /admin/v6/user/coop` | 用户认证 |
| `GET/POST /admin/v6/wxa/user/wallet/withdraw` | 提现管理 |

### 暂无接口（需要后端提供）

| 功能模块 | 页面 | 建议接口 |
|----------|------|----------|
| 访问统计 | 来源管理、访问统计 | `GET /admin/v6/stats/visit`<br>`GET /admin/v6/stats/source` |
| 用户标签 | 用户标签管理 | `GET/POST /admin/v6/user/tags` |
| 评论管理 | 评论管理 | `GET/POST /admin/v6/feed/comments` |
| 社区统计 | 用户统计、动态统计 | `GET /admin/v6/stats/users`<br>`GET /admin/v6/stats/feeds` |
| 活动配置 | 活动类型管理 | `GET/POST /admin/v6/event/categories` |
| 活动统计 | 活动数据统计 | `GET /admin/v6/stats/events` |

---

## 路由设计规范

### 路由命名规则

1. **一级路由**：对应主导航菜单
   - `#/system/*` - 系统管理
   - `#/community/*` - 社区管理
   - `#/events/*` - 活动管理

2. **二级路由**：对应子菜单/功能模块
   - `#/system/admins` - 管理员管理
   - `#/system/banners` - 轮播图管理
   - `#/community/users` - 用户管理
   - `#/events/list` - 活动列表

3. **三级路由**：对应子功能/详情页
   - `#/events/finance/orders` - 活动报名
   - `#/events/finance/withdrawals` - 提现管理
   - `#/community/stats/users` - 用户统计

### 页面文件组织

```
src/pages/
├── Login.tsx                  # 登录页
├── system/                    # 系统管理
│   ├── Dashboard.tsx          # 系统首页（工作台）
│   ├── AdminManagement.tsx    # 管理员管理
│   ├── AdminLogs.tsx          # 管理日志
│   ├── BannerManagement.tsx   # 轮播图管理
│   ├── CityManagement.tsx     # 城市管理
│   └── ...
├── community/                 # 社区管理
│   ├── CommunitySettings.tsx  # 审核模式
│   ├── PointsSettings.tsx     # 积分设置
│   ├── UserTags.tsx           # 用户标签
│   ├── UserList.tsx           # 注册用户
│   ├── PartnerAuth.tsx        # 用户认证
│   ├── TopicManagement.tsx     # 话题管理
│   ├── FeedManagement.tsx     # 动态管理
│   ├── CommentManagement.tsx  # 评论管理
│   ├── AgreementManagement.tsx # 协议文档
│   └── ...
└── events/                    # 活动管理
    ├── EventCategories.tsx     # 活动类型
    ├── FeeConfig.tsx           # 费率配置
    ├── EventList.tsx          # 活动列表
    ├── EventOrders.tsx        # 活动报名
    ├── PaymentRecords.tsx      # 支付记录
    ├── RefundRecords.tsx       # 退款记录
    ├── WithdrawalManagement.tsx # 提现管理
    └── ...
```

---

*文档版本: 2026-04-29*
*维护者: 管理后台开发团队*
