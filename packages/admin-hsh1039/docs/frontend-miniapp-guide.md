# 前端小程序开发指南 — 活动 / 票务 / 商品

> 面向微信小程序前端开发工程师。本文档详细说明如何读取和渲染活动、票务、商品数据，包括 SKU 选择、退款判断、报名/购买信息填写、日期解析等。

---

## 1. 业务类型区分

后台管理使用 `root_category_id` 区分三类业务：

| root_category_id | 业务类型 | 小程序前端展示 |
|:---:|------|------|
| 1 | 活动 | 用户参与报名、填写信息、可在开始前退款 |
| 2 | 票务 | 用户购买票务、票未核销前可退款 |
| 3 | 商品 | 用户购买实物商品、不支持线上退款 |

**小程序不需要查 `root_category_id`**。后台创建产品时后端会自动根据所选分类推导。小程序只需读取产品数据并正常展示即可。

---

## 2. 核心接口

> 所有接口前缀：`/admin/v1/mall/`（后台）或小程序端对应路径。以下以后台接口说明数据结构，小程序端接口路径可能不同，但**响应字段一致**。

| 接口 | 用途 |
|------|------|
| `GET /admin/v1/mall/products` | 列表查询（带分页 + root_category_id 筛选） |
| `GET /admin/v1/mall/products/{id}` | 产品详情（含完整字段） |
| `GET /admin/v1/mall/products/{id}/specs` | 规格组列表（含规格值） |
| `GET /admin/v1/mall/products/{id}/skus` | SKU 列表 |
| `GET /admin/v1/mall/refund-rules` | 退款规则列表 |
| `GET /admin/v1/mall/categories` | 分类树 |

---

## 3. 数据模型详解

### 3.1 Product 产品

```typescript
interface Product {
  id: number;
  title: string;              // 产品名称
  sub_title?: string;         // 产品简介
  cover_image?: string;       // 封面图 URL（CDN）
  carousel_images?: string[]; // 轮播/配图 URL 数组
  detail_desc?: string;       // ⚠️ JSON 字符串，需解析（见 §3.2）
  category_id: number;        // 分类 ID
  category_name?: string;     // 分类名称
  categories?: { id: number; name: string }[];  // 分类祖先链
  is_virtual: boolean;        // true=虚拟(活动/票务), false=实物(商品)
  is_listed: boolean;         // 是否上架
  is_visible: boolean;        // 是否可见
  
  // === 报名 / 购买信息 ===
  additional_fields_config?: any[] | null;  // ⚠️ 信息模板数组（见 §3.3）
  additional_fields_has_sensitive?: boolean; // 是否含敏感字段（手机/身份证）
  
  // === 退款相关 ===
  refund_type: number;        // 0=不退款 1=随时退 2=指定日期前退 3=阶梯退
  refund_rule_id?: number;    // 关联的退款规则 ID（阶梯退时必选）
  refund_base_time?: string;  // RFC3339，退款基准截止时间
  
  // === 有效期 ===
  usable?: string;            // RFC3339，生效时间（可为空=不限）
  expiry?: string;            // RFC3339，截止时间（可为空=不限）
  
  sort_order: number;         // 排序权重
  created_at: string;         // RFC3339
  updated_at: string;         // RFC3339
}
```

### 3.2 detail_desc 格式

`detail_desc` 是 **JSON 字符串**，需要 `JSON.parse` 解析。结构因业务类型不同而有差异：

#### 活动
```json
{
  "datetime": "2026年7月18日-20日 每天 09:00-21:00",
  "detail": "<p>活动详细介绍 HTML</p><h3>亮点</h3><ul><li>...</li></ul>",
  "hasagreement": true,
  "agreement": "<p>报名协议 HTML</p>"
}
```

#### 票务 / 商品
```json
{
  "detail": "<p>详细介绍 HTML</p>",
  "hasagreement": false
}
```

> **注意**：`detail` 和 `agreement` 字段是 HTML 字符串，小程序需要用 `rich-text` 组件渲染。

> **注意**：服务器返回的 JSON 可能包含 HTML 转义（`&quot;` → `"`、`&#34;` → `"`），解析前需要先做一次 HTML 解码。

### 3.3 additional_fields_config 信息模板

`additional_fields_config` 定义了用户需要填写的字段。格式为数组，每个元素代表一个信息组：

```typescript
// Product 级模板（全局配置）
interface AdditionalFieldConfig {
  name: string;   // 组名，如"基本信息"
  num?: number;   // Product 级不传；SKU 级=需要填写的份数
  config: {       // 该组包含的字段
    label: string;        // 字段名，如"姓名"
    type: "text" | "textarea" | "select" | "multi_select" | "image";
    required: boolean;    // 是否必填
    format?: "" | "mobile" | "idcard" | "positive_integer" | "number";
    options?: string[];   // select/multi_select 的选项
    idcardRestrict?: "" | "adult" | "child" | "male" | "female";
  }[];
}
```

**Product 级 vs SKU 级**：
- Product 的 `additional_fields_config` 是**全局模板**，定义有哪些字段
- 每个 SKU 的 `additional_fields_config` 可以**覆盖 Product 级**，为空时回退到 Product 模板
- SKU 级模板格式同 Product，但每个组多了 `num` 字段表示该 SKU 下此组信息要填几份

**示例**：活动"2026冰丝带汽车生活节"的 Product 级配置：
```json
[
  {
    "name": "报名信息",
    "config": [
      { "label": "姓名", "type": "text", "required": true, "format": "" },
      { "label": "手机号", "type": "text", "required": true, "format": "mobile" },
      { "label": "身份证号", "type": "text", "required": true, "format": "idcard", "idcardRestrict": "" },
      { "label": "性别", "type": "select", "required": false, "options": ["男", "女"] }
    ]
  }
]
```

**设计意图**：
- Product 级定义有哪些字段可填，作为默认模板
- SKU 级可覆盖：例如一个 SKU 要填 1 份信息，另一个要填 2 份（如"双人票"）
- 小程序展示时，优先用 SKU 级模板，没有则用 Product 级模板

**身份证的限制条件** (`idcardRestrict`)：当字段 label 为"身份证号"且 format 为"idcard"时，可附加强制要求：
- `""`：无要求
- `"adult"`：必须为成人（18岁以上）
- `"child"`：必须为儿童（18岁以下）
- `"male"`：必须为男性
- `"female"`：必须为女性

### 3.4 SpecGroup 规格组

```typescript
interface SpecGroup {
  id: number;
  name: string;              // 规格名称，如"票种"、"船票类型"、"款式"
  is_time_type: boolean;     // 是否为日期类型（如场次日期）
  values: SpecValue[];
}

interface SpecValue {
  id: number;
  value: string;             // 规格值，如"成人票"、"普通船票"
  sort_order: number;
  refund_base_time?: string; // RFC3339，该规格值对应的退款基准时间（SKU 没设时从这继承）
}
```

### 3.5 SKU

```typescript
interface Sku {
  id: number;
  spec_indices: string;      // ⚠️ 规格值 ID 串，格式如 "351_353"，顺序对应 SpecGroup 的 sort_order
  spec_text: string;         // 人类可读，如"票种:成人票 | 日期:2026-07-18"
  price: number;             // 价格（元），浮点数
  stock: number;             // 库存
  status: number;            // 0=下架 1=上架
  sold_count: number;        // 已售数量
  
  // 有效期（SKU 级优先于 Product 级）
  usable?: string;           // RFC3339，可为空
  expiry?: string;           // RFC3339，可为空
  
  // 退款
  refund_base_time?: string; // RFC3339，该 SKU 的退款截止时间
  additional_fields_config?: any[] | null;  // SKU 级信息模板（覆盖 Product 模板）
}
```

### 3.6 spec_indices 详解

`spec_indices` 是规格值的笛卡尔积 ID 串。例如两个规格组：

| 规格组 | 值 |
|--------|-----|
| 票种 (id=10) | 成人票(valueId=351)、儿童票(valueId=352) |
| 日期 (id=11) | 2026-07-18(valueId=353)、2026-07-19(valueId=354) |

则产生 4 个 SKU，其 `spec_indices` 分别为：
```
351_353   → 成人票 / 2026-07-18
351_354   → 成人票 / 2026-07-19
352_353   → 儿童票 / 2026-07-18
352_354   → 儿童票 / 2026-07-19
```

> **解析方法**：用 `_` 分割 `spec_indices`，按顺序匹配 `SpecGroup[].values[].id`。

---

## 4. 退款逻辑

### 4.1 refund_type 取值

| 值 | 含义 | 用户端行为 |
|:--|------|------|
| 0 | 不退款 | 不显示退款入口 |
| 1 | 随时退 | 在 `refund_base_time` 之前可随时全额退款 |
| 2 | 指定日期前退 | 在设置的截止日期前可退款 |
| 3 | 阶梯退 | 根据退款规则按阶段比例退款 |

### 4.2 退款基准时间

判断用户能否退款的参数是 `refund_base_time`，取值优先级：

```
SKU.refund_base_time  >  SpecValue.refund_base_time  >  Product.refund_base_time
```

- 如果 SKU 有值 → 用 SKU 的
- SKU 为空 → 查看该 SKU 对应规格值的 `refund_base_time`
- 都为空 → 用 Product 级别的

**示例**：用户购买了"成人票 + 2026-07-18"这个 SKU（spec_indices=351_353），`refund_base_time` 为 `"2026-07-18T00:00:00+08:00"`，则用户在此时间之前可以退款，过了就不能退。

> 票务（root_category_id=2）的随时退文案为"票未核销前可退款"——前端需根据业务类型切换提示。

### 4.3 退款规则（阶梯退用）

```typescript
interface RefundRule {
  id: number;
  name: string;
  stages: RefundRuleStage[];
}

interface RefundRuleStage {
  days_before: number;       // 提前天数
  refund_type: "rate" | "fixed";  // rate=按比例, fixed=固定金额
  refund_value: number;      // 比例值(%) 或 金额(元)
}
```

**阶梯退计算示例**：规则"[提前30天退100% / 提前7天退50% / 提前0天退0%]"，

```json
{
  "stages": [
    { "days_before": 30, "refund_type": "rate", "refund_value": 100 },
    { "days_before": 7,  "refund_type": "rate", "refund_value": 50 },
    { "days_before": 0,  "refund_type": "rate", "refund_value": 0 }
  ]
}
```

小程序端计算退款金额时：用活动开始时间（或 SKU 的 `refund_base_time`）减去当天日期，得到 `dayDiff`，在 stages 中找到第一个 `days_before <= dayDiff` 的阶段，取对应的 `refund_value`。

---

## 5. 有效期判断

产品或 SKU 的 `usable`（生效时间）和 `expiry`（截止时间）控制以下逻辑：

- **`usable` 为空**：不限，立即生效
- **`expiry` 为空**：不限，永不过期
- **SKU 级优先于 Product 级**：SKU 有值用 SKU 的，SKU 为空用 Product 的

小程序端展示逻辑：

| Product.usable | Product.expiry | SKU.usable | SKU.expiry | 显示 |
|:--:|:--:|:--:|:--:|------|
| 有 | 有 | - | - | 统一有效期（所有 SKU 相同） |
| 空 | 空 | 有 | 有 | **各 SKU 独立有效期**，按 SKU 切换显示 |
| 空 | 空 | 空 | 空 | 不限 |

---

## 6. 信息模板展示

流程：

1. 加载 Product → 拿到 `additional_fields_config`（Product 级模板）
2. 加载 SKU 列表 → 每个 SKU 可能有自己的 `additional_fields_config`
3. 用户选 SKU → 查找该 SKU 的模板，为空则用 Product 级模板
4. 根据模板的 `config` 数组渲染表单字段

### 字段类型渲染对照

| type | 前端组件 | 备注 |
|------|---------|------|
| `text` | `<input>` | 结合 `format` 做输入限制 |
| `textarea` | `<textarea>` | |
| `select` | 单选 picker | 选项来自 `options` |
| `multi_select` | 多选 checkbox 组 | 选项来自 `options` |
| `image` | 图片上传 | |

### format 校验规则

| format | 规则 |
|--------|------|
| `mobile` | 11 位手机号 |
| `idcard` | 18 位身份证号（含校验位） |
| `positive_integer` | 正整数 |
| `number` | 数字 |

### 敏感字段

`additional_fields_has_sensitive` 为 `true` 时，说明有手机号/身份证号等字段，**务必加密传输**或使用小程序获取授权的手机号接口。

---

## 7. 图片 URL 处理

图片 URL 格式：`https://1039-club-cdn.vbegin.com.cn/upload/2026-07/xxx.jpg`

缩略图规则（小程序端可选使用以节省流量）：
- 原图：`https://cdn.vbegin.com.cn/upload/xxx.jpg`
- 缩略图 256px：`https://cdn.vbegin.com.cn/upload/xxx.jpg/256.0`
- 缩略图 512px：`https://cdn.vbegin.com.cn/upload/xxx.jpg/512.0`
- 缩略图 1024px：`https://cdn.vbegin.com.cn/upload/xxx.jpg/1024.0`

> **优先从 cover_image 取封面，从 carousel_images 取轮播配图。** 如果 cover_image 为空，展示默认占位图。

---

## 8. 完整加载流程

### 列表页

```
GET /products?root_category_id={1|2|3}&is_listed=true&page=1&page_size=20
→ 遍历 list，每项显示 title / sub_title / cover_image / price 区间
```

price 区间需要提前加载该产品所有 SKU 取 min/max。

### 详情页

```
Step 1: GET /products/{id}        → 拿到产品基本信息 + refund_type + detail_desc JSON
Step 2: JSON.parse(detail_desc)   → 拿到 detail(HTML) + datetime(活动专属) + agreement(选填)
Step 3: GET /products/{id}/specs  → 拿到规格组 + 规格值列表
Step 4: GET /products/{id}/skus   → 拿到所有 SKU（含 price/stock/usable/expiry/refund_base_time/AFC）
Step 5: 用户选择规格组合 → 根据 spec_indices 找到对应 SKU
Step 6: 读取 SKU 的 additional_fields_config（为空则用 Product 的）
Step 7: 渲染信息模板表单
Step 8: 根据 refund_type 展示退款规则
Step 9: 提交订单
```

---

## 9. 订单提交时需注意

- `spec_indices`：用户选择的规格组合对应的 ID 串
- 报名信息：按 `additional_fields_config` 模板填写的值，提交时拼成 `[{name, config:[...]}]` 对应的格式（后端暂定为 JSON 存储，具体字段名以后端下单接口文档为准）
- 退款：下单前需计算并提示退款规则
- 库存：提交前检查 `stock - sold_count > 0`

---

## 10. 常见问题

### Q: 怎么判断是活动、票务还是商品？
通过 `categories` 数组查找祖先 ID。如果祖先包含 id=1 则为活动，id=2 为票务，id=3 为商品。

### Q: detail_desc 解析失败怎么办？
服务端返回的 JSON 可能带 HTML 转义，先用 `str.replace(/&(?:#34|quot);/g, '"')` 还原再 `JSON.parse`。极端情况下可能带 `\\"` 双重转义，需额外 `str.replace(/\\\\"/g, '\\"')`。

### Q: 什么时候显示"购买信息" vs "报名信息" vs "购票信息"？
活动显示"报名信息"，票务显示"购票信息"，商品显示"购买信息"。从 `categories` 祖先 ID 判断。

### Q: 退款按钮要不要显示？
`refund_type === 0` 时不显示退款入口。其他值均显示。

### Q: 库存显示"不限"？
票务的 `stock` 值固定为 `99999`（后台逻辑）。小程序端遇到 `stock >= 99999` 时显示"不限"即可。

### Q: 缩略图怎么用？
封面列表页建议用 `/256.0` 后缀，详情页大图用原图。只对 `vbegin.com.cn` CDN 的图片有效。
