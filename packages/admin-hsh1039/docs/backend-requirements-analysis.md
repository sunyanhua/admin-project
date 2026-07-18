# 后端功能补充需求分析与实现指引

> 基于 `docs/backend-requirements.md`（前端 DEMO 制作方提供），结合当前后台系统现状逐项分析。
> 每项包含：后台管理界面改动、后端接口改动、数据库改动三部分。
>
> **最后更新**：2026-07-18

---

## 命名约定

本报告所有新增字段遵循现有代码库的命名体系：

| 模式 | 用途 | 现有示例 | 新增字段示例 |
|------|------|------|------|
| `is_` 前缀 | 布尔状态标记 | `is_virtual`, `is_listed`, `is_visible` | `is_registered`, `is_verified`, `is_transferred`, `is_received` |
| `has_` 前缀 | 布尔能力标记 | `additional_fields_has_sensitive` | `has_booking` |
| `_type` 后缀 | 枚举字段 | `refund_type` | （无新增） |
| `_config` 后缀 | JSON 配置对象 | `additional_fields_config` | `booking_config` |
| `_mode` 后缀 | 行为模式 | — | `additional_fields_mode` |
| `_id` 后缀 | 外键关联 | `refund_rule_id`, `category_id` | （沿用现有） |
| `_at` 后缀 | 时间戳 | `created_at`, `updated_at` | `paid_at`, `verified_at`, `transferred_at` |
| `_no` 后缀 | 业务编号 | — | `order_no` |
| snake_case | 所有字段 | 全站统一 | 全站统一 |

### `additional_fields_*` 家族

`additional_fields_mode` 与现有的 `additional_fields_config`、`additional_fields_has_sensitive` 构成完整的信息模板控制体系：

| 字段 | 控制维度 | 说明 |
|------|------|------|
| `additional_fields_config` | **填什么** | 字段模板定义（JSON 数组） |
| `additional_fields_has_sensitive` | **敏感度** | 是否含手机号/身份证等敏感字段 |
| `additional_fields_mode` | **何时填** | `before_pay` / `after_pay` / `none` |

三者命名统一以 `additional_fields_` 为前缀，前端和后端一看便知它们属于同一功能体系。

---

## 总览

前端 DEMO 在制作过程中扩展了 5 个核心功能维度：

| # | 功能维度 | 核心字段 | 当前状态 | 优先级 |
|:--|---------|------|:-------|:-----:|
| 一 | 信息模板填写时机 | `additional_fields_mode` | **Product 表无此字段** | P0 |
| 二 | 订单卡券拆分 | `tickets` 表 / `persons.group` | **无订单接口、无卡券概念** | P0 |
| 三 | 票夹功能 | 复用 tickets 表 | **纯前端聚合，复用订单接口** | P1 |
| 四 | 核销与转赠 | `is_verified` / `is_transferred` | **无此功能** | P0 |
| 五 | 预约模式 | `has_booking` / `booking_config` | **无此功能** | P1 |
| 六 | 物流信息 | `express_company` / `express_no` 等 | **订单表无物流字段** | P1 |
| 七 | 订单数据传递 | 订单创建接口响应规范 | **无订单创建接口** | P0 |
| 八 | 列表与筛选 | — | **后台已有，需确认小程序端接口** | P1 |
| 九 | 个人中心 | 用户/积分/地址/优惠券接口 | **接口待补充** | P1 |
| 十 | 协议与购买须知 | — | **后台已有协议管理** | P2 |

> **P0** = 核心流程阻断，必须优先实现。**P1** = 重要功能，紧随其后。**P2** = 已有基础，小幅补充。

---

## 一、信息模板填写时机（additional_fields_mode）

### 1.1 需求简述

此字段控制 `additional_fields_config`（信息模板）的填写时机。四种用户端模式由 `additional_fields_mode` 和 `has_booking` 两个字段组合决定：

| 模式 | additional_fields_mode | has_booking | 适用场景 |
|------|:---:|:---:|------|
| 先登记后支付 | `before_pay` | false | 需要预先收集报名信息的活动（如音乐节） |
| 先支付后登记 | `after_pay` | false | 快速下单，支付后再补填信息 |
| 先支付后预约+登记 | `after_pay` | true | 需要预约时段的票务（如摇橹船票） |
| 无需登记 | `none` | false | 极简购买（如景山公园门票） |

> **设计逻辑**：`additional_fields_mode` 与 `additional_fields_config` 配套使用——管理员在后台配置了信息模板（config），再通过 mode 决定这些信息在支付前还是支付后收集。两者共同构成完整的信息采集流程。

### 1.2 后台管理界面改动

**文件**：`EventWizardModal.tsx`、`EventEditModal.tsx`、`TicketWizardModal.tsx`、`TicketEditModal.tsx`、`ProductWizardModal.tsx`、`ProductEditModal.tsx`、`SkuConfigWizard.tsx`

**改动内容**：

1. **Product 编辑表单新增字段**（所有 Wizard / EditModal）：
   - `additional_fields_mode` 下拉选择器（与 `additional_fields_config` 编辑区放在同一卡片/区域内）：
     - "先登记后支付" → `before_pay`
     - "先支付后登记" → `after_pay`
     - "无需登记" → `none`
   - `has_booking` 开关（仅当 `additional_fields_mode === 'after_pay'` 且 `ticketMode` 时显示）
   - `booking_config` 配置区域（仅当 `has_booking === true` 时显示）：
     - `advance_days`：可预约未来天数，InputNumber
     - `time_slots`：时段列表编辑器（时段名称 + 容量），支持增删

2. **默认值规则**（与现有业务逻辑一致）：
   - 活动：`additional_fields_mode = 'before_pay'`
   - 票务：`additional_fields_mode = 'none'`，可切换
   - 商品：`additional_fields_mode = 'none'`，可切换
   - `has_booking` 仅在 ticketMode 下可用
   - `booking_config` 仅在 `has_booking === true` 时显示

3. **SkuConfigWizard 步骤 2 联动**：
   - 标题文案根据 `additional_fields_mode` 变化：
     - `before_pay`："报名信息"（活动）/ "购票信息"（票务）/ "购买信息"（商品）
     - `after_pay`："登记信息模板（支付后可补填）"
     - `none`：隐藏步骤 2（跳过信息模板配置）

### 1.3 后端接口改动

**涉及接口**：

| 接口 | 改动 |
|------|------|
| `POST /admin/v1/mall/products` | 请求体新增 `additional_fields_mode`、`has_booking`、`booking_config` |
| `PUT /admin/v1/mall/products/{id}` | 同上 |
| `GET /admin/v1/mall/products/{id}` | 响应体新增 `additional_fields_mode`、`has_booking`、`booking_config` |
| `GET /admin/v1/mall/products` | 列表项新增 `additional_fields_mode`、`has_booking` |

**新增字段定义**（与现有 `additional_fields_*` 家族结构一致）：

```json
{
  "additional_fields_mode": "before_pay",
  "has_booking": false,
  "booking_config": {
    "advance_days": 14,
    "time_slots": [
      {"slot": "09:00-10:00", "capacity": 20},
      {"slot": "10:00-11:00", "capacity": 20}
    ]
  }
}
```

**字段说明**：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `additional_fields_mode` | string | `"before_pay"` | `before_pay` / `after_pay` / `none` |
| `has_booking` | boolean | `false` | 是否需要预约（遵循 `has_` 能力标记惯例） |
| `booking_config` | object \| null | `null` | 预约时段配置（遵循 `_config` 后缀惯例） |
| `booking_config.advance_days` | integer | `14` | 可预约未来天数 |
| `booking_config.time_slots` | array | `[]` | 时段列表，每项 `{slot, capacity}` |

### 1.4 数据库改动

**products 表新增列**：

| 列名 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `additional_fields_mode` | VARCHAR(16) | `'before_pay'` | before_pay / after_pay / none |
| `has_booking` | TINYINT(1) | `0` | 0=不需要预约, 1=需要预约 |
| `booking_config` | JSON | NULL | 预约时段配置 |

**迁移 SQL**（参考）：
```sql
ALTER TABLE products
  ADD COLUMN additional_fields_mode VARCHAR(16) NOT NULL DEFAULT 'before_pay'
    COMMENT '信息模板填写时机: before_pay=先登记后支付, after_pay=先支付后登记, none=无需登记',
  ADD COLUMN has_booking TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '是否需要预约（仅票务类可用）',
  ADD COLUMN booking_config JSON NULL
    COMMENT '预约配置: {advance_days, time_slots:[{slot,capacity}]}';
```

---

## 二、订单结构与卡券管理

### 2.1 需求简述

一个订单的购买份数（quantity）拆分为多张独立"卡券"（ticket）。例如购买"双人票 ×2"，订单包含 2 张入场券，每张有独立的人员信息、核销状态、转赠状态。

核心概念：**Order 1:N Ticket**，Ticket 是操作的最小单位（核销、转赠、登记均按 Ticket 进行）。

### 2.2 后台管理界面改动

**新建页面**：

1. **订单列表**（`#/operation/orders`，替换现有 `#/operation/event-orders` 为统一订单管理）
   - 列表列：订单编号、用户信息、产品名称、规格、数量（卡券张数）、金额、状态、下单时间、操作
   - 筛选：状态（待付款/已付款/已退款）、业务类型（活动/票务/商品）、关键词
   - 点击进入订单详情

2. **订单详情**（`#/operation/orders/:id`）
   - 订单基本信息区：编号、用户、产品、金额、时间、状态
   - 卡券列表区（每张卡券一行）：
     - 卡券编号（group_no）
     - 人员信息（姓名、手机号、身份证号）
     - 登记状态（`is_registered`）
     - 核销状态（`is_verified` + `verified_at`）
     - 转赠状态（`is_transferred` + 接收人）
     - 预约信息（如有）
   - 退款信息区：退款规则、退款金额、退款状态
   - 物流信息区（仅商品订单）：快递公司 + 单号 + 收货信息

3. **核销记录**（`#/operation/verifications`）
   - 列表：核销时间、核销人（管理员）、卡券编号、订单编号、产品名称
   - 筛选：时间范围、产品

4. **转赠记录**（`#/operation/transfers`）
   - 列表：转赠时间、转出人、接收人、卡券编号、产品名称

**文件**：
- `src/pages/operation/OrderManagement.tsx`（新建）
- `src/pages/operation/OrderDetail.tsx`（新建）
- `src/pages/operation/VerificationRecords.tsx`（新建）
- `src/pages/operation/TransferRecords.tsx`（新建）
- `src/router/index.tsx`（新增路由）
- `src/components/layout/MainLayout.tsx`（新增菜单项）

### 2.3 后端接口改动

**全新接口**：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/admin/v1/mall/orders` | 订单列表（分页、状态筛选、业务类型筛选） |
| `GET` | `/admin/v1/mall/orders/{id}` | 订单详情（含卡券列表、人员信息） |
| `POST` | `/api/v1/mall/orders` | 创建订单（用户端调用） |
| `PUT` | `/admin/v1/mall/orders/{id}/status` | 更新订单状态（支付回调/退款） |
| `PUT` | `/admin/v1/mall/orders/{id}/tickets/{ticket_id}/register` | 登记卡券人员信息（after_pay 模式用） |
| `POST` | `/admin/v1/mall/tickets/{ticket_id}/verify` | 核销卡券 |
| `POST` | `/admin/v1/mall/tickets/{ticket_id}/transfer` | 发起转赠（生成二维码 token） |
| `POST` | `/api/v1/mall/tickets/transfer/accept` | 接收转赠（扫码后调用） |
| `GET` | `/admin/v1/mall/verifications` | 核销记录列表 |
| `GET` | `/admin/v1/mall/transfers` | 转赠记录列表 |

**订单创建请求体**（参考结构）：

```json
{
  "product_id": 123,
  "sku_id": 456,
  "quantity": 2,
  "persons": [
    {"group": 1, "label": "成人1", "name": "张三", "mobile": "13800138000", "idcard": "110101199001011234"},
    {"group": 2, "label": "成人2", "name": "李四", "mobile": "13900139000", "idcard": "110101199002022345"}
  ],
  "coupon_code": null
}
```

> 商品订单（`is_virtual === false`）额外传 `receiver_name`、`receiver_mobile`、`receiver_address`（见 §六）。

**订单详情响应体**（参考结构）：

```json
{
  "id": 1001,
  "order_no": "202607180001",
  "user_id": 5001,
  "user_name": "1039车友小明",
  "user_avatar": "https://...",
  "product_id": 123,
  "product_title": "2026冰丝带汽车生活节",
  "product_type": "event",
  "cover_image": "https://...",
  "sku_id": 456,
  "sku_spec_text": "票种:单人票",
  "price": 99.00,
  "quantity": 1,
  "total_amount": 99.00,
  "status": "paid",
  "additional_fields_mode": "before_pay",
  "refund_type": 3,
  "refund_rule_id": 1,
  "refund_base_time": "2026-07-18T00:00:00+08:00",
  "created_at": "2026-07-17T14:30:00+08:00",
  "paid_at": "2026-07-17T14:31:00+08:00",
  "tickets": [
    {
      "id": 5001,
      "order_id": 1001,
      "group_no": 1,
      "is_registered": true,
      "is_verified": false,
      "verified_at": null,
      "is_transferred": false,
      "transferred_at": null,
      "transferred_to_user_id": null,
      "is_received": false,
      "booking": null,
      "persons": [
        {"label": "成人1", "name": "张三", "mobile": "138****8888", "idcard": "110101****1234"}
      ]
    }
  ],
  "express_company": null,
  "express_no": null,
  "receiver_name": null,
  "receiver_mobile": null,
  "receiver_address": null
}
```

> **注意**：`cover_image`、`product_title`、`product_type`、`sku_spec_text` 等字段为**冗余快照**（下单时从 Product/SKU 复制），避免前端额外请求。与现有 Product 接口的字段命名保持一致（snake_case）。

> **已移除的字段**（原 `backend-requirements.md` 中有，本报告删除）：
> - `detail_url` — 纯前端拼接，后端不应返回 URL
> - `is_no_register` — 前端可直接判断 `additional_fields_mode === 'none'`
> - `person_labels` / `person_count` — 前端可从 `tickets[].persons` 计算，如需保留可作为 API 响应中的便利字段

### 2.4 数据库改动

**新建 `orders` 表**：

```sql
CREATE TABLE orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单编号',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  product_id BIGINT NOT NULL COMMENT '产品ID',
  sku_id BIGINT NOT NULL COMMENT 'SKU ID',
  quantity INT NOT NULL DEFAULT 1 COMMENT '购买份数（=卡券张数）',
  price DECIMAL(10,2) NOT NULL COMMENT '单价',
  total_amount DECIMAL(10,2) NOT NULL COMMENT '总金额',
  status ENUM('pending','paid','refunded') NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  -- 以下为下单时从 Product 快照的字段（用于退款计算和历史记录，不随 Product 后续修改而变化）
  additional_fields_mode VARCHAR(16) NOT NULL DEFAULT 'before_pay' COMMENT '下单时的信息模板填写时机快照',
  refund_type INT NOT NULL DEFAULT 0 COMMENT '退款类型快照',
  refund_rule_id BIGINT NULL COMMENT '退款规则ID快照',
  refund_base_time DATETIME NULL COMMENT '退款基准时间快照',
  -- 物流（仅商品订单）
  express_company VARCHAR(64) NULL COMMENT '快递公司',
  express_no VARCHAR(64) NULL COMMENT '快递单号',
  receiver_name VARCHAR(64) NULL COMMENT '收货人',
  receiver_mobile VARCHAR(20) NULL COMMENT '收货人手机号',
  receiver_address VARCHAR(255) NULL COMMENT '收货地址',
  -- 时间戳
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  paid_at DATETIME NULL COMMENT '支付时间',
  INDEX idx_user_id (user_id),
  INDEX idx_product_id (product_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) COMMENT='订单表';
```

> **设计决策**：卡券状态（`is_registered`、`is_verified`、`is_transferred`）和人员信息（`persons`）**不在 orders 表中存储**，全部归属到 tickets 表。这样避免了 orders 表中的 JSON 嵌套对象（如 `{"1": true, "2": false}`），查询和更新都更高效。

**新建 `tickets` 表**（**强烈建议独立建表**）：

```sql
CREATE TABLE tickets (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL COMMENT '关联订单ID',
  group_no INT NOT NULL COMMENT '卡券编号（订单内序号，从1开始）',
  user_id BIGINT NOT NULL COMMENT '当前持有人ID（转赠后会变）',
  original_user_id BIGINT NOT NULL COMMENT '原始购买人ID',
  -- 状态（遵循 is_ 前缀惯例）
  is_registered TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已登记信息',
  is_verified TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已核销',
  is_transferred TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已转赠',
  is_received TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否来自他人转赠',
  -- 核销
  verified_at DATETIME NULL COMMENT '核销时间',
  verified_by BIGINT NULL COMMENT '核销操作人ID（管理员）',
  -- 转赠
  transferred_at DATETIME NULL COMMENT '转赠时间',
  transfer_token VARCHAR(64) NULL COMMENT '转赠二维码Token（唯一，有过期时间）',
  -- 人员信息
  persons JSON NULL COMMENT '该卡券的人员信息 [{label, name, mobile, idcard}]',
  -- 预约（仅 has_booking=true 的票务产品）
  booking_date DATE NULL COMMENT '预约日期',
  booking_slot VARCHAR(32) NULL COMMENT '预约时段',
  booking_status VARCHAR(16) NULL COMMENT '预约状态: booked / cancelled / used',
  -- 时间戳
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- 索引
  INDEX idx_order_id (order_id),
  INDEX idx_user_id (user_id),
  INDEX idx_transfer_token (transfer_token),
  UNIQUE KEY uk_order_group (order_id, group_no)
) COMMENT='卡券表（核销/转赠/登记的最小操作单位）';
```

> **独立建表理由**：核销、转赠、票夹查询都需要按 ticket 维度检索和更新。独立表可以走索引，JSON 字段则需要全表扫描。且独立表让 `is_registered`、`is_verified`、`is_transferred` 等状态字段可以直接用 WHERE 条件查询（如"查询某用户所有未核销的票"），而非 JSON 函数提取。

---

## 三、票夹功能

### 3.1 需求简述

用户端"我的票夹"页面，集中管理所有卡券（含自己购买的和他人转赠的），不依赖订单详情页。

### 3.2 后台管理界面改动

**无需单独后台页面**。管理员通过以下现有/新页面覆盖票夹相关管理需求：
- 订单详情页 → 查看每张卡券状态
- 核销记录页 → 查看核销历史
- 转赠记录页 → 查看转赠历史

### 3.3 后端接口改动

如果 tickets 独立建表，可直接提供高效的票夹接口：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/user/tickets` | 用户票夹列表（展平所有卡券，按 ticket 维度返回） |
| `GET` | `/api/v1/user/tickets?type=event\|ticket` | 按业务类型筛选 |

**票夹列表响应体**（建议结构，字段命名与 tickets 表保持一致）：

```json
{
  "list": [
    {
      "ticket_id": 5001,
      "order_id": 1001,
      "group_no": 1,
      "product_id": 123,
      "product_title": "2026冰丝带汽车生活节",
      "product_type": "event",
      "cover_image": "https://...",
      "sku_spec_text": "票种:单人票",
      "price": 99.00,
      "is_registered": true,
      "is_verified": false,
      "is_transferred": false,
      "is_received": false,
      "booking": null,
      "persons": [{"label": "成人1", "name": "张三"}]
    }
  ],
  "total": 5
}
```

### 3.4 数据库改动

tickets 表（§2.4）已覆盖所有字段，无需额外改动。

---

## 四、核销与转赠

### 4.1 需求简述

- **核销**：管理员/工作人员扫描用户出示的二维码，将卡券标记为"已核销"
- **转赠**：用户 A 生成转赠二维码 → 用户 B 扫码接收 → 卡券从 A 的票夹转移到 B 的票夹

### 4.2 后台管理界面改动

#### 核销操作页（`#/operation/verification`）

- 扫码输入框（支持扫码枪，自动回车）
- 扫码后展示卡券信息（产品名称、规格、当前持有人、登记信息）
- 确认核销按钮
- 批量核销（连续扫码，统一确认）

#### 订单详情中核销

- 卡券列表中，`is_verified === false` 的卡券旁边显示"核销"按钮
- 点击弹出确认框 → 确认后标记已核销

#### 转赠记录页（`#/operation/transfers`）

- 列表列：转赠时间、转出人、接收人、卡券编号、关联产品、订单编号
- 筛选：时间范围、产品

### 4.3 后端接口改动

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/admin/v1/mall/tickets/{ticket_id}` | 卡券详情（扫码后展示用） |
| `POST` | `/admin/v1/mall/tickets/{ticket_id}/verify` | 核销卡券（需管理员权限） |
| `POST` | `/admin/v1/mall/tickets/batch-verify` | 批量核销 |
| `POST` | `/api/v1/mall/tickets/{ticket_id}/transfer` | 生成转赠二维码（返回 token） |
| `POST` | `/api/v1/mall/tickets/transfer/accept` | 接收转赠（body: `{token}`） |
| `GET` | `/admin/v1/mall/verifications` | 核销记录列表（管理员） |
| `GET` | `/admin/v1/mall/transfers` | 转赠记录列表（管理员） |

**核销请求**：
```json
{
  "ticket_id": 5001,
  "verify_code": "扫码得到的验证码"
}
```

**转赠 accept 请求**：
```json
{
  "token": "TRANSFER_TOKEN_XXXX"
}
```

**业务规则（后端强制校验）**：
1. `is_verified === true` 的卡券不可转赠
2. `is_transferred === true` 的卡券原持有人不可核销（新持有人可核销）
3. `is_received === true` 的卡券不可再次转赠
4. 任一卡券转赠或核销后，**整单不可退款**
5. 转赠 token 应有有效期（建议 5 分钟），过期后需重新生成

### 4.4 数据库改动

tickets 表已包含所需字段（见 §2.4）：
- 核销：`is_verified` / `verified_at` / `verified_by`
- 转赠：`is_transferred` / `transferred_at` / `transfer_token`

**可选审计表**（如需记录核销/转赠的完整历史）：

```sql
-- 核销审计日志
CREATE TABLE verification_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  verified_by BIGINT NOT NULL COMMENT '核销操作人（管理员ID）',
  verified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_verified_at (verified_at)
) COMMENT='核销记录表';

-- 转赠记录
CREATE TABLE transfer_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  from_user_id BIGINT NOT NULL,
  to_user_id BIGINT NOT NULL,
  token VARCHAR(64) NOT NULL,
  status ENUM('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  INDEX idx_ticket_id (ticket_id),
  INDEX idx_token (token)
) COMMENT='转赠记录表';
```

---

## 五、预约模式（Booking）

### 5.1 需求简述

适用于需要提前预约使用时间的票务产品（如什刹海摇橹船票）。用户支付后，在订单详情中选择日期+时段进行预约，预约完成后不可退款。

### 5.2 后台管理界面改动

#### Product 编辑表单（已在 §1.2 中描述）

在 TicketWizardModal / TicketEditModal 中：
- `has_booking` 开关
- `booking_config` 配置区域：
  - `advance_days`：可预约未来天数
  - `time_slots`：动态增删的时段列表，每条包含时段名称（`slot`）和容量（`capacity`）

#### 预约管理页（`#/operation/bookings`）

- 列表列：预约时间、卡券编号、订单编号、产品名称、预约人、时段、状态
- 筛选：日期范围、产品、状态
- 操作：取消预约（特殊情况，需管理员权限）

### 5.3 后端接口改动

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/mall/products/{id}/booking-slots?date=2026-08-05` | 查询某日可预约时段及剩余容量 |
| `POST` | `/api/v1/mall/tickets/{ticket_id}/book` | 用户预约卡券 |
| `PUT` | `/admin/v1/mall/tickets/{ticket_id}/booking/cancel` | 取消预约（管理员用） |
| `GET` | `/admin/v1/mall/bookings` | 预约列表（管理员） |

**预约请求体**：
```json
{
  "date": "2026-08-05",
  "slot": "10:00-11:00",
  "persons": [
    {"label": "成人1", "name": "张三", "mobile": "13800138000"}
  ]
}
```

> 当产品的 `additional_fields_mode === 'after_pay'` 时，预约时同时提交人员登记信息（persons）。

**时段容量查询响应**：
```json
{
  "date": "2026-08-05",
  "slots": [
    {"slot": "09:00-10:00", "capacity": 20, "booked": 5, "available": 15},
    {"slot": "10:00-11:00", "capacity": 20, "booked": 20, "available": 0}
  ]
}
```

**业务规则**：
1. 预约完成后订单不可退款（后端强制，修改 `status` 的退款权限判断）
2. 同一卡券只能预约一次（`uk_ticket_id` 唯一约束）
3. 已过日期不可预约
4. 时段容量满时不可预约（需在事务中检查 `COUNT(*) < capacity`）
5. 取消预约需管理员权限

### 5.4 数据库改动

products 表的 `booking_config` 字段已在 §1.4 中覆盖。

tickets 表的预约字段已在 §2.4 中覆盖（`booking_date`、`booking_slot`、`booking_status`）。

**可选独立预约表**（如需更复杂的预约管理，如改签、排队等）：

```sql
CREATE TABLE bookings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  booking_date DATE NOT NULL,
  booking_slot VARCHAR(32) NOT NULL,
  status ENUM('booked','cancelled','used') NOT NULL DEFAULT 'booked',
  persons JSON NULL COMMENT '预约时填写的人员信息',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_product_date_slot (product_id, booking_date, booking_slot),
  INDEX idx_user_id (user_id),
  UNIQUE KEY uk_ticket_id (ticket_id)
) COMMENT='预约表';
```

---

## 六、物流信息

### 6.1 需求简述

商品订单（实物商品如冰箱贴）需要填写收货信息并记录物流单号。

### 6.2 后台管理界面改动

#### 订单详情页（已在 §2.2 中描述）

商品订单（`is_virtual === false`）的订单详情中增加：
- **收货信息区**：收货人、手机号、地址（只读展示）
- **物流编辑区**（管理员操作）：
  - 快递公司下拉/输入框
  - 快递单号输入框
  - "保存物流信息"按钮

#### 订单列表页

- 列表增加"发货状态"列：待发货（无物流单号）/ 已发货（有物流单号）
- 批量发货功能（可选）

### 6.3 后端接口改动

| 方法 | 路径 | 说明 |
|------|------|------|
| `PUT` | `/admin/v1/mall/orders/{id}/shipping` | 更新物流信息（管理员） |

**请求体**：
```json
{
  "express_company": "顺丰速运",
  "express_no": "SF1234567890"
}
```

收货地址（`receiver_name`、`receiver_mobile`、`receiver_address`）在订单创建时填入，物流信息由管理员在后台填写。

### 6.4 数据库改动

已在 §2.4 的 orders 表中覆盖：`express_company`、`express_no`、`receiver_name`、`receiver_mobile`、`receiver_address`。

---

## 七、订单数据传递

### 7.1 需求简述

创建订单接口需返回完整的订单对象（含快照字段和卡券列表），前端无需额外请求即可渲染订单详情。

### 7.2 后台管理界面改动

无直接改动。间接要求后台的订单详情页能展示所有这些字段（见 §2.2）。

### 7.3 后端接口改动

核心接口：**`POST /api/v1/mall/orders`**（用户端下单接口）

**请求体**（完整版）：

```json
{
  "product_id": 123,
  "sku_id": 456,
  "quantity": 2,
  "persons": [
    {
      "group": 1,
      "label": "成人1",
      "name": "张三",
      "mobile": "13800138000",
      "idcard": "110101199001011234"
    },
    {
      "group": 2,
      "label": "成人2",
      "name": "",
      "mobile": "",
      "idcard": ""
    }
  ],
  "receiver_name": "小明",
  "receiver_mobile": "13912345678",
  "receiver_address": "北京市朝阳区建国路88号",
  "coupon_code": null
}
```

> 商品订单（`is_virtual === false`）时 `receiver_*` 字段必填；虚拟产品（活动/票务）不传。

**响应体**需包含的字段（按来源分类）：

| 字段 | 来源 | 说明 |
|------|------|------|
| `id` | 新建 | 订单 ID |
| `order_no` | 生成 | 订单编号（遵循 `_no` 后缀惯例） |
| `status` | 默认 | `"pending"`（待支付） |
| **Product 快照 →** | | |
| `additional_fields_mode` | 从 Product 读取 | 下单时的信息模板填写时机 |
| `refund_type` | 从 Product 读取 | 退款类型（与 Product 接口一致，数值型） |
| `refund_rule_id` | 从 Product 读取 | 退款规则 ID |
| `refund_base_time` | 从 SKU→SpecValue→Product 级联 | 退款基准时间（遵循现有级联规则） |
| `refund_stages` | 从 RefundRule 读取 | 阶梯退阶段规则（前端展示用，不额外请求） |
| `has_booking` | 从 Product 读取 | 是否需要预约（快照） |
| `cover_image` | 从 Product 读取 | 产品封面图（冗余，减少前端请求） |
| `product_title` | 从 Product 读取 | 产品标题（冗余） |
| `product_type` | 从 categories 推导 | event / ticket / product |
| `sku_spec_text` | 从 SKU 读取 | 规格文本（冗余） |
| **Ticket 列表 →** | | |
| `tickets[]` | 根据 quantity 创建 | 卡券列表（见 §2.3 完整结构） |
| **物流 →** | | |
| `express_company` | 初始 null | 管理员后填 |
| `express_no` | 初始 null | 管理员后填 |
| `receiver_name` | 请求体 | 仅商品订单 |
| `receiver_mobile` | 请求体 | 仅商品订单 |
| `receiver_address` | 请求体 | 仅商品订单 |

> **已从前端原需求中移除的字段**：
> - ~~`detail_url`~~ — 前端根据 `product_id` + `product_type` 自行拼接
> - ~~`is_no_register`~~ — 前端判断 `additional_fields_mode === 'none'`
> - ~~`person_labels`~~ / ~~`person_count`~~ — 前端从 `tickets[].persons` 计算
> - ~~`is_booking`~~ — 已统一为 `has_booking`

### 7.4 数据库改动

已在 §2.4 的 orders + tickets 表中覆盖所有字段。

---

## 八、列表与筛选

### 8.1 需求简述

活动/门票/商品三个列表页（用户端）需要：关键词搜索 + 分类筛选 + 卡片式列表。

### 8.2 后台管理界面改动

**已有**：`EventManagement.tsx`、`TicketManagement.tsx`、`ProductManagement.tsx` 均已有搜索和分类筛选功能。后台管理界面无需额外改动。

### 8.3 后端接口改动

**现有接口** `GET /admin/v1/mall/products` 已支持：`keyword`、`category_id`、`root_category_id`、`is_listed`、`is_visible`。用户端接口需确保参数一致。

**用户端订单列表**需要新增：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/user/orders` | 用户订单列表，支持 `status` 筛选 |

### 8.4 数据库改动

无额外改动。现有 products 表已有 `category_id`，orders 表已有 `status`。

---

## 九、个人中心

### 9.1 需求简述

个人中心包含：编辑资料、我的积分、我的订单、我的票夹、我的优惠券、收货地址、帮助与反馈。

### 9.2 后台管理界面改动

**现有页面**：
- 注册用户（`#/operation/users`）— 已有
- 优惠券管理（`#/finance/coupons`）— 已有

**可补充**：
- 用户详情页增强：查看该用户的订单数、票夹数、优惠券数、积分余额
- 积分管理页（可选，如需后台手动发放积分）

### 9.3 后端接口改动

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|:--:|
| `GET` | `/api/v1/user/profile` | 获取用户资料 | **新增** |
| `PUT` | `/api/v1/user/profile` | 更新用户资料 | **新增** |
| `GET` | `/api/v1/user/orders` | 我的订单列表 | **新增** |
| `GET` | `/api/v1/user/tickets` | 我的票夹列表 | **新增** |
| `GET` | `/api/v1/user/points` | 积分余额 + 累计/已用 | **新增** |
| `GET` | `/api/v1/user/points/logs` | 积分明细列表 | **新增** |
| `GET` | `/api/v1/user/coupons` | 我的优惠券列表 | **新增** |
| `GET` | `/api/v1/user/addresses` | 收货地址列表 | **新增** |
| `POST` | `/api/v1/user/addresses` | 新增收货地址 | **新增** |
| `PUT` | `/api/v1/user/addresses/{id}` | 编辑收货地址 | **新增** |
| `DELETE` | `/api/v1/user/addresses/{id}` | 删除收货地址 | **新增** |
| `PUT` | `/api/v1/user/addresses/{id}/default` | 设为默认地址 | **新增** |

**已有接口**：
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/admin/v1/users` | 用户列表（管理员）— 已有 |

### 9.4 数据库改动

**用户资料**：现有 users 表需确认是否包含 `avatar`、`nickname`、`name`、`gender`、`birthday`、`district`。

**新建表**：

```sql
-- 积分记录表
CREATE TABLE point_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  points INT NOT NULL COMMENT '变动积分数（正=获得，负=使用）',
  type VARCHAR(32) NOT NULL COMMENT '类型: earn / use / expire / admin',
  description VARCHAR(255) NULL COMMENT '变动说明',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) COMMENT='积分记录表';

-- 收货地址表
CREATE TABLE user_addresses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(64) NOT NULL COMMENT '收货人',
  mobile VARCHAR(20) NOT NULL COMMENT '手机号',
  province VARCHAR(64) NULL,
  city VARCHAR(64) NULL,
  district VARCHAR(64) NULL,
  address VARCHAR(255) NOT NULL COMMENT '详细地址',
  is_default TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否默认地址',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
) COMMENT='收货地址表';
```

---

## 十、协议与购买须知

### 10.1 需求简述

下单流程中展示勾选框：
- 活动："我已阅读并同意 **活动报名协议**"
- 门票："我已阅读并同意 **购票须知**"
- 商品："我已阅读并同意 **购买须知**"

### 10.2 后台管理界面改动

**已有**：`#/operation/agreements` — 协议文档管理页面。

如果当前协议文档没有"适用类型"区分，建议新增：
- 在协议编辑弹窗中增加"适用类型"下拉：全部 / 活动 / 票务 / 商品
- Product 的 `detail_desc` 中 `hasagreement` 可改为引用协议 ID

### 10.3 后端接口改动

现有协议管理接口可能需要新增 `agreement_type` 字段：
- 取值：`all` / `event` / `ticket` / `product`

Product 的 `detail_desc` 中协议部分可逐步演进为引用模式：
```json
{
  "detail": "...",
  "hasagreement": true,
  "agreement_id": 1,
  "agreement": "..."
}
```

> 如果 agreement 内容是静态写入 `detail_desc` 的，则不需要改——前端直接从 Product 读取即可。当前阶段保持现状即可。

### 10.4 数据库改动

agreements 表如需新增类型字段：
```sql
ALTER TABLE agreements
  ADD COLUMN agreement_type VARCHAR(16) NOT NULL DEFAULT 'all'
    COMMENT '适用类型: all=全部, event=活动, ticket=票务, product=商品';
```

---

## 附录 A：数据库改动汇总

### A.1 现有表新增列

**products 表**：

| 列名 | 类型 | 默认值 | 命名依据 |
|------|------|--------|------|
| `additional_fields_mode` | VARCHAR(16) | `'before_pay'` | 与 `additional_fields_config` 配套，`_mode` 表示行为模式 |
| `has_booking` | TINYINT(1) | `0` | 遵循 `has_` 能力标记惯例（参考 `additional_fields_has_sensitive`） |
| `booking_config` | JSON | NULL | 遵循 `_config` 后缀惯例（参考 `additional_fields_config`） |

**agreements 表**（可选）：

| 列名 | 类型 | 默认值 |
|------|------|--------|
| `agreement_type` | VARCHAR(16) | `'all'` |

### A.2 新建表

| 表名 | 优先级 | 核心字段（遵循命名约定） |
|------|:---:|------|
| `orders` | **P0** | `order_no`、`additional_fields_mode`（快照）、`express_company`、`express_no` 等 |
| `tickets` | **P0** | `is_registered`、`is_verified`、`is_transferred`、`is_received`、`persons`、`booking_*` |
| `verification_logs` | P1 | 核销审计日志 |
| `transfer_logs` | P1 | 转赠记录 |
| `bookings` | P1 | 独立预约记录 |
| `point_logs` | P1 | 积分变动记录 |
| `user_addresses` | P1 | `is_default` 遵循 `is_` 前缀 |

---

## 附录 B：后端接口改动汇总

### B.1 新增接口（按模块）

**订单模块**（P0）：

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/mall/orders` | 创建订单（返回完整订单对象含 tickets 列表） |
| `GET` | `/admin/v1/mall/orders` | 订单列表（管理员） |
| `GET` | `/admin/v1/mall/orders/{id}` | 订单详情（含 tickets 列表） |
| `PUT` | `/admin/v1/mall/orders/{id}/status` | 更新订单状态 |
| `PUT` | `/admin/v1/mall/orders/{id}/shipping` | 填写物流信息 |

**卡券模块**（P0）：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/admin/v1/mall/tickets/{ticket_id}` | 卡券详情（扫码核销时展示） |
| `PUT` | `/admin/v1/mall/tickets/{ticket_id}/register` | 登记人员信息（after_pay 模式） |
| `POST` | `/admin/v1/mall/tickets/{ticket_id}/verify` | 核销卡券 |
| `POST` | `/admin/v1/mall/tickets/batch-verify` | 批量核销 |
| `POST` | `/api/v1/mall/tickets/{ticket_id}/transfer` | 发起转赠（返回 token） |
| `POST` | `/api/v1/mall/tickets/transfer/accept` | 接收转赠 |

**预约模块**（P1）：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/mall/products/{id}/booking-slots` | 查询可预约时段及容量 |
| `POST` | `/api/v1/mall/tickets/{ticket_id}/book` | 提交预约 |
| `PUT` | `/admin/v1/mall/tickets/{ticket_id}/booking/cancel` | 取消预约 |

**用户端接口**（P1）：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/user/profile` | 用户资料 |
| `PUT` | `/api/v1/user/profile` | 更新资料 |
| `GET` | `/api/v1/user/orders` | 我的订单 |
| `GET` | `/api/v1/user/tickets` | 我的票夹 |
| `GET` | `/api/v1/user/points` | 积分余额 |
| `GET` | `/api/v1/user/points/logs` | 积分明细 |
| `GET` | `/api/v1/user/coupons` | 我的优惠券 |
| `GET/POST/PUT/DELETE` | `/api/v1/user/addresses` | 收货地址 CRUD |
| `PUT` | `/api/v1/user/addresses/{id}/default` | 设为默认地址 |

**管理端查询接口**（P1）：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/admin/v1/mall/verifications` | 核销记录列表 |
| `GET` | `/admin/v1/mall/transfers` | 转赠记录列表 |
| `GET` | `/admin/v1/mall/bookings` | 预约记录列表 |

### B.2 已有接口修改

| 接口 | 改动内容 |
|------|------|
| `POST /admin/v1/mall/products` | 请求体新增 `additional_fields_mode`、`has_booking`、`booking_config` |
| `PUT /admin/v1/mall/products/{id}` | 同上 |
| `GET /admin/v1/mall/products/{id}` | 响应体新增 `additional_fields_mode`、`has_booking`、`booking_config` |
| `GET /admin/v1/mall/products` | 列表项新增 `additional_fields_mode`、`has_booking` |

---

## 附录 C：后台管理界面改动汇总

### C.1 修改现有文件

| 文件 | 改动 |
|------|------|
| `EventWizardModal.tsx` | 新增 `additional_fields_mode` 选择器 + `has_booking` 开关 + `booking_config` 编辑器 |
| `EventEditModal.tsx` | 同上 |
| `TicketWizardModal.tsx` | 同上（`has_booking` 仅 ticket 可用） |
| `TicketEditModal.tsx` | 同上 |
| `ProductWizardModal.tsx` | 新增 `additional_fields_mode` 选择器 |
| `ProductEditModal.tsx` | 同上 |
| `SkuConfigWizard.tsx` | 步骤 2 标题联动 `additional_fields_mode`，`none` 时隐藏步骤 2 |
| `src/router/index.tsx` | 新增 6 条路由 |
| `src/components/layout/MainLayout.tsx` | 菜单新增"订单管理"分组 |

### C.2 新建页面

| 页面 | 路由 | 优先级 |
|------|------|:---:|
| 订单管理 | `#/operation/orders` | **P0** |
| 订单详情 | `#/operation/orders/:id` | **P0** |
| 核销管理 | `#/operation/verification` | **P0** |
| 核销记录 | `#/operation/verifications` | P1 |
| 转赠记录 | `#/operation/transfers` | P1 |
| 预约管理 | `#/operation/bookings` | P1 |

---

## 附录 D：开发优先级与依赖关系

```
Phase 1（P0 — 核心流程，不可跳过）
├── 1. Product 表新增 additional_fields_mode / has_booking / booking_config
├── 2. Product CRUD 接口支持新字段（请求体 + 响应体）
├── 3. 后台 Product 编辑表单增加新字段（Wizard + EditModal × 6）
├── 4. SkuConfigWizard 步骤 2 联动 additional_fields_mode
├── 5. 新建 orders 表 + tickets 表
├── 6. 订单创建接口（POST /api/v1/mall/orders）
├── 7. 订单列表/详情接口（管理端 + 用户端）
├── 8. 后台订单管理页面（列表 + 详情）
├── 9. 核销接口 + 后台核销操作页
└── 10. 转赠接口（发起 + 接收）

Phase 2（P1 — 重要功能）
├── 11. 用户端票夹接口（GET /api/v1/user/tickets）
├── 12. 预约接口（时段查询 + 提交 + 取消）
├── 13. 后台预约管理页面
├── 14. 物流信息接口 + 后台填写物流
├── 15. 收货地址 CRUD 接口
├── 16. 积分接口 + 后台积分管理
├── 17. 优惠券用户端接口
└── 18. 核销/转赠/预约记录页面

Phase 3（P2 — 补充完善）
├── 19. 协议类型字段（agreement_type）
├── 20. 用户详情页增强（订单数/票夹数/积分/优惠券）
└── 21. 批量发货功能
```

---

*本文档由 DEMO 制作方的 `backend-requirements.md` 触发，结合后台现有代码（`src/api/services/product.ts`、CLAUDE.md、SITEMAP.md、frontend-miniapp-guide.md）逐项分析而成。所有新增字段命名遵循现有代码库的 `is_`/`has_`/`_config`/`_mode`/`_at` 等约定。*
