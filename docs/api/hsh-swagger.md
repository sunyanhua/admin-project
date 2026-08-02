# BizMall 前端接口文档

> 版本：v1.1 | 日期：2026-08-02 | 协议：HTTPS | 格式：JSON | 编码：UTF-8

> 本文档与 Swagger 注释同步维护，与 API 接口颗粒度对齐。

---

## 一、整体说明

### 1.1 URL 前缀

| 端 | 前缀 | 说明 |
|----|------|------|
| C 端 | `/api/v1` | 微信小程序用户侧接口 |
| 后台 | `/admin/v1` | 管理后台接口，需 RBAC 鉴权 |

### 1.2 鉴权方式

| 端 | 方式 | Token 类型 | 有效期 |
|----|------|-----------|--------|
| C 端（wxa） | `Authorization: Bearer <access_token>` | Access Token | 7 天 |
| 后台（admin） | `Authorization: Bearer <admin_token>` | Access Token | 2h（过期前通过 `/admin/v1/login/refresh` 续期） |

### 1.3 统一响应结构

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | int | 业务状态码，`0` 为成功，非 `0` 为异常 |
| `message` | string | 提示信息 |
| `data` | any | 响应数据，分页时含 `list`、`total`、`page`、`page_size` |

### 1.4 通用 HTTP 错误码

| HTTP 状态码 | 含义 |
|:----------:|------|
| 200 | 成功（含业务错误码，需检查 `code` 字段） |
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 过期 |
| 403 | 无权限访问（后台接口） |
| 404 | 资源不存在 |
| 422 | 请求参数校验失败 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 1.5 构建版本

`GET /api/v1/health` 返回当前部署的构建信息，无需认证，前端可据此确认部署版本：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "status": "healthy",
    "version": "v1.0.0",
    "git_commit": "a1b2c3d",
    "build_time": "2026-07-10T10:30:00Z",
    "environment": "test",
    "go_version": "go1.26.2"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | string | 服务健康状态，正常为 `"healthy"` |
| `version` | string | 语义化版本号，未通过 ldflags 注入时为 `"dev"` |
| `git_commit` | string | Git 提交哈希（7 位短格式），未注入时为 `"unknown"` |
| `build_time` | string | 构建时间（ISO 8601 UTC），未注入时为 `"unknown"` |
| `environment` | string | 部署环境标识：`dev` / `test` / `production` |
| `go_version` | string | Go 运行时版本 |

### 1.6 URN 权限体系

后台接口采用 **URN（Uniform Resource Name）** 格式的 RBAC 权限控制，命名规则：

```
urn:bizmall:<module>:<action>
```

超级管理员拥有 `urn:bizmall:*` 根权限，涵盖以下全部子权限：

| URN | 模块 | 权限范围 |
|-----|------|--------|
| `urn:bizmall:*` | 全局 | 超级管理员全部权限（根节点） |
| `urn:bizmall:admin:user:read` | 管理员 | 查看管理员列表、管理员详情 |
| `urn:bizmall:admin:user:write` | 管理员 | 创建管理员、编辑管理员 |
| `urn:bizmall:admin:user:delete` | 管理员 | 删除管理员 |
| `urn:bizmall:admin:role:read` | 角色权限 | 查看权限树、角色列表、角色已分配权限 |
| `urn:bizmall:admin:role:write` | 角色权限 | 创建/编辑权限节点、创建/编辑角色、为角色分配权限 |
| `urn:bizmall:admin:role:delete` | 角色权限 | 删除权限节点、删除角色 |
| `urn:bizmall:user:read` | C 端用户 | 查看 C 端用户列表、用户详情 |
| `urn:bizmall:user:write` | C 端用户 | 修改 C 端用户状态（启用/禁用） |
| `urn:bizmall:product:read` | 商品 | 查看分类/品牌/商品/SKU/规格组 |
| `urn:bizmall:product:write` | 商品 | 创建/编辑分类/品牌/商品/SKU/规格组、上下架 |
| `urn:bizmall:product:delete` | 商品 | 删除分类/品牌/商品/规格组 |
| `urn:bizmall:refundrule:read` | 退款规则 | 查看退款规则列表与详情 |
| `urn:bizmall:refundrule:write` | 退款规则 | 创建与编辑退款规则 |
| `urn:bizmall:refundrule:delete` | 退款规则 | 删除退款规则 |
| `urn:bizmall:order:read` | 订单 | 查看订单列表/详情/导出、物流公司列表 |
| `urn:bizmall:order:write` | 订单 | 发货（单笔/批量导入）、添加备注 |
| `urn:bizmall:after_sale:read` | 售后 | 查看售后列表/详情、退款记录 |
| `urn:bizmall:after_sale:write` | 售后 | 审核售后单、确认退货收货、执行退款 |
| `urn:bizmall:ticket:read` | 票夹 | 查看票夹列表、票夹详情 |
| `urn:bizmall:ticket:verify` | 票夹 | 核销（扫码查询+确认核销） |
| `urn:bizmall:ticket:write` | 票夹 | 票夹管理（后台批量核销） |
| `urn:bizmall:wxa:app:read` | 微信配置 | 查看小程序应用列表与详情 |
| `urn:bizmall:wxa:app:write` | 微信配置 | 创建与编辑小程序应用 |
| `urn:bizmall:wxa:app:delete` | 微信配置 | 禁用小程序应用 |
| `urn:bizmall:wxa:mach:read` | 微信配置 | 查看支付商户列表与详情 |
| `urn:bizmall:wxa:mach:write` | 微信配置 | 创建与编辑支付商户 |
| `urn:bizmall:wxa:mach:delete` | 微信配置 | 禁用支付商户 |
| `urn:bizmall:cms:read` | CMS | 查看资讯/Banner/公告/帮助分类/帮助文章、通知模板列表 |
| `urn:bizmall:cms:write` | CMS | 创建/编辑内容、上下架、可见性、通知模板创建/编辑 |
| `urn:bizmall:cms:delete` | CMS | 删除内容（软删除或硬删除） |
| `urn:bizmall:coupon:read` | 优惠券 | 查看优惠券模板列表/详情、兑换配置列表 |
| `urn:bizmall:coupon:write` | 优惠券 | 创建/编辑/启停/删除优惠券模板、后台发放优惠券 |
| `urn:bizmall:points:config` | 积分 | 积分规则管理、积分流水查询、积分异常修正、积分兑换配置 |
| `urn:bizmall:settings:read` | 系统设置 | 查看系统配置项 |
| `urn:bizmall:settings:write` | 系统设置 | 创建/编辑/启停/删除系统配置项 |

> **注意：** 以下模块的后台接口未绑定细粒度 URN，仅要求 `AdminAuth`（管理员已登录）即可访问：核销人员与记录管理、操作日志、后台上传图片、通知发送记录查询。
退款规则管理（`urn:bizmall:refundrule:*`）为独立 URN 权限体系，直属于根节点（与商品模块平级）。

---

## 二、Excel 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| POST | `/admin/v1/excel/build` | 构建 Excel 文件 | AdminAuth | AdminAuth |
| POST | `/admin/v1/excel/parse` | 解析 Excel 文件 | AdminAuth | AdminAuth |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `file` | formData | file | — | ✅ | Excel 文件（.xlsx） |

## 三、购物车 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/api/v1/cart` | 购物车列表 | WxaAuth | — |
| POST | `/api/v1/cart` | 添加至购物车 | WxaAuth | — |
| DELETE | `/api/v1/cart` | 清空购物车 | WxaAuth | — |
| PUT | `/api/v1/cart/:id` | 修改购物车项 | WxaAuth | — |
| DELETE | `/api/v1/cart/:id` | 删除购物车项 | WxaAuth | — |
| PUT | `/api/v1/cart/batch-select` | 批量选中/取消 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `id` | path | integer | ≥ 1 | ✅ | 购物车项ID |

## 四、微信配置 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/wxa/apps` | 小程序应用列表 | AdminAuth | `urn:bizmall:wxa:app:read` |
| POST | `/admin/v1/wxa/apps` | 创建小程序应用 | AdminAuth | `urn:bizmall:wxa:app:write` |
| GET | `/admin/v1/wxa/apps/:id` | 小程序应用详情 | AdminAuth | `urn:bizmall:wxa:app:read` |
| PUT | `/admin/v1/wxa/apps/:id` | 更新小程序应用 | AdminAuth | `urn:bizmall:wxa:app:write` |
| DELETE | `/admin/v1/wxa/apps/:id` | 禁用小程序应用 | AdminAuth | `urn:bizmall:wxa:app:delete` |
| GET | `/admin/v1/wxa/machs` | 商户配置列表 | AdminAuth | `urn:bizmall:wxa:mach:read` |
| POST | `/admin/v1/wxa/machs` | 创建商户配置 | AdminAuth | `urn:bizmall:wxa:mach:write` |
| GET | `/admin/v1/wxa/machs/:id` | 商户配置详情 | AdminAuth | `urn:bizmall:wxa:mach:read` |
| PUT | `/admin/v1/wxa/machs/:id` | 更新商户配置 | AdminAuth | `urn:bizmall:wxa:mach:write` |
| DELETE | `/admin/v1/wxa/machs/:id` | 禁用商户配置 | AdminAuth | `urn:bizmall:wxa:mach:delete` |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `keyword` | query | string | — | — | 搜索关键词（appid） |
| `page` | query | integer | — | — | 页码 |
| `page_size` | query | integer | ≤ 100 | — | 每页条数 |
| `id` | path | string | — | ✅ | 小程序应用 ID |
| `status` | query | integer | — | — | 状态过滤：1-启用 0-禁用 |

## 五、核销模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/verification/records` | 管理员查询核销记录 | AdminAuth | `urn:bizmall:verification:read` |
| GET | `/admin/v1/mall/verification/records/export` | 管理员导出核销记录 | AdminAuth | `urn:bizmall:verification:read` |
| GET | `/admin/v1/mall/verification/staff` | 管理员分页查询核销人员列表 | AdminAuth | `urn:bizmall:verification:read` |
| POST | `/admin/v1/mall/verification/staff` | 管理员创建核销人员 | AdminAuth | `urn:bizmall:verification:write` |
| GET | `/admin/v1/mall/verification/staff/:id` | 管理员查询核销人员详情 | AdminAuth | `urn:bizmall:verification:read` |
| PUT | `/admin/v1/mall/verification/staff/:id` | 管理员编辑核销人员 | AdminAuth | `urn:bizmall:verification:write` |
| DELETE | `/admin/v1/mall/verification/staff/:id` | 管理员删除核销人员 | AdminAuth | `urn:bizmall:verification:write` |
| POST | `/admin/v1/mall/verification/staff/:id/binding-code` | 管理员重新生成绑定码 | AdminAuth | `urn:bizmall:verification:write` |
| POST | `/admin/v1/mall/verification/staff/:id/unbind` | 管理员解除绑定 | AdminAuth | `urn:bizmall:verification:write` |
| POST | `/api/v1/wxa/mall/verification/confirm` | 确认核销 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/verification/records` | Wxa已绑定用户查询核销记录 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/verification/scan/:code` | 扫码查询核销信息 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/verification/staff/bind` | 扫码绑定核销人员 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/verification/staff/status` | 查询绑定状态 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/verification/tickets` | C端查询核销券列表 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `page` | query | integer | ≥ 1 | — | 页码 |
| `page_size` | query | integer | 1–100 | — | 每页条数 |
| `ticket_code` | query | string | — | — | 核销码筛选 |
| `operator_id` | query | integer | — | — | 操作人员ID筛选 |
| `start_date` | query | string | — | — | 开始日期（格式：2006-01-02） |
| `end_date` | query | string | — | — | 结束日期（格式：2006-01-02） |
| `keyword` | query | string | — | — | 姓名关键词 |
| `id` | path | integer | ≥ 1 | ✅ | 人员ID |
| `code` | path | string | — | ✅ | 核销码（Base32 + HMAC 校验码，长度 ≥ 30） |
| `status` | query | integer | — | — | 状态筛选：1=有效, 2=已用完, 3=已过期 |

## 六、优惠券模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/coupons` | 分页查询优惠券模板列表 | AdminAuth | `urn:bizmall:coupon:read` |
| POST | `/admin/v1/mall/coupons` | 创建优惠券模板 | AdminAuth | `urn:bizmall:coupon:write` |
| GET | `/admin/v1/mall/coupons/:id` | 查询优惠券模板详情 | AdminAuth | `urn:bizmall:coupon:read` |
| PUT | `/admin/v1/mall/coupons/:id` | 编辑优惠券模板 | AdminAuth | `urn:bizmall:coupon:write` |
| DELETE | `/admin/v1/mall/coupons/:id` | 删除优惠券模板 | AdminAuth | `urn:bizmall:coupon:write` |
| PUT | `/admin/v1/mall/coupons/:id/status` | 启用/停用优惠券模板 | AdminAuth | `urn:bizmall:coupon:write` |
| GET | `/admin/v1/mall/coupons/exchange-configs` | 查询兑换配置列表 | AdminAuth | `urn:bizmall:coupon:read` |
| POST | `/admin/v1/mall/coupons/exchange-configs` | 创建兑换配置 | AdminAuth | `urn:bizmall:points:config` |
| PUT | `/admin/v1/mall/coupons/exchange-configs/:id` | 编辑兑换配置 | AdminAuth | `urn:bizmall:points:config` |
| POST | `/admin/v1/mall/coupons/send` | 后台手动发放优惠券 | AdminAuth | `urn:bizmall:coupon:write` |
| POST | `/api/v1/mall/coupons/:id/claim` | 领取优惠券 | WxaAuth | — |
| GET | `/api/v1/mall/coupons/available` | 可领取优惠券列表 | WxaAuth | — |
| GET | `/api/v1/mall/coupons/my` | 我的优惠券列表 | WxaAuth | — |
| POST | `/api/v1/mall/coupons/preview` | 满减试算 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `page` | query | integer | ≥ 1 | — | 页码 |
| `page_size` | query | integer | 1–100 | — | 每页条数 |
| `keyword` | query | string | — | — | 搜索关键词 |
| `status` | query | integer | — | — | 状态（0启用 1停用） |
| `id` | path | integer | ≥ 1 | ✅ | 优惠券ID |

## 七、发票模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/api/v1/wxa/mall/orders/:id/invoice` | 查询发票状态 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders/:id/invoice` | 申请发票 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `id` | path | integer | — | ✅ | 订单ID |

## 八、预约时段 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/products/:id/booking-slots` | 预约时段列表 | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/products/:id/booking-slots` | 创建预约时段 | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/products/:id/booking-slots` | 批量删除预约时段 | AdminAuth | `urn:bizmall:product:delete` |
| PUT | `/admin/v1/mall/products/:id/booking-slots/:slotId` | 编辑预约时段 | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/products/:id/booking-slots/:slotId` | 删除预约时段 | AdminAuth | `urn:bizmall:product:delete` |
| PUT | `/admin/v1/mall/products/:id/booking-slots/:slotId/status` | 启停预约时段 | AdminAuth | `urn:bizmall:product:write` |
| POST | `/admin/v1/mall/products/:id/booking-slots/batch` | 批量创建预约时段 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/api/v1/mall/products/:id/booking-dates` | C端可预约日期列表 | — | — |
| GET | `/api/v1/mall/products/:id/booking-slots` | C端可预约时段列表 | — | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `id` | path | integer | — | ✅ | 商品ID |
| `page` | query | integer | ≥ 1 | — | 页码（默认 1） |
| `page_size` | query | integer | 1–100 | — | 每页数量（最大 100） |
| `sku_id` | query | integer | — | — | SKU ID |
| `date_from` | query | string | — | — | 开始日期 YYYY-MM-DD |
| `date_to` | query | string | — | — | 结束日期 YYYY-MM-DD |
| `slotId` | path | integer | — | ✅ | 时段ID |
| `month` | query | string | — | ✅ | 月份 YYYY-MM |
| `date` | query | string | — | ✅ | 日期 YYYY-MM-DD |

## 九、售后模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/after-sales` | 后台售后列表 | AdminAuth | `urn:bizmall:after_sale:read` |
| GET | `/admin/v1/mall/after-sales/:id` | 后台售后详情 | AdminAuth | `urn:bizmall:after_sale:read` |
| POST | `/admin/v1/mall/after-sales/:id/confirm-return` | 确认收到退货 | AdminAuth | `urn:bizmall:after_sale:write` |
| POST | `/admin/v1/mall/after-sales/:id/refund` | 执行退款 | AdminAuth | `urn:bizmall:after_sale:write` |
| POST | `/admin/v1/mall/after-sales/:id/review` | 审核售后单 | AdminAuth | `urn:bizmall:after_sale:write` |
| GET | `/admin/v1/mall/refunds` | 退款记录列表 | AdminAuth | AdminAuth |
| GET | `/api/v1/wxa/mall/after-sales` | C端售后列表 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/after-sales` | 提交售后申请 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/after-sales/:id` | C端售后详情 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/after-sales/:id/return-logistics` | 填写退货物流 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `status` | query | integer | 0–5 | — | 售后状态（0=待审核 1=审核通过 2=审核拒绝 3=已退货 4=退款完成 5=已关闭，不传=不限） |
| `type` | query | string | — | — | 售后类型（refund=仅退款 return_refund=退货退款，不传=不限） |
| `start_date` | query | string | — | — | 创建起始日期（格式 2006-01-02） |
| `end_date` | query | string | — | — | 创建截止日期（格式 2006-01-02） |
| `page` | query | integer | ≥ 1 | — | 页码（默认 1） |
| `page_size` | query | integer | 1–100 | — | 每页条数（默认 20，最大 100） |
| `id` | path | integer | ≥ 1 | ✅ | 售后单ID |
| `after_sale_id` | query | integer | ≥ 1 | — | 售后单 ID（可选筛选） |

## 十、地址管理 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/api/v1/wxa/addresses` | C端收货地址列表 | WxaAuth | — |
| POST | `/api/v1/wxa/addresses` | 新增收货地址 | WxaAuth | — |
| PUT | `/api/v1/wxa/addresses/:id` | 编辑收货地址 | WxaAuth | — |
| DELETE | `/api/v1/wxa/addresses/:id` | 删除收货地址 | WxaAuth | — |
| PUT | `/api/v1/wxa/addresses/:id/default` | 设为默认地址 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `id` | path | integer | — | ✅ | 地址ID |

## 十一、支付模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| POST | `/api/v1/wxa/mall/orders/:id/cancel` | 取消订单 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders/:id/pay` | 发起支付 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/orders/:id/pay-status` | 查询支付状态 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders/:id/payment-success` | 支付成功上报 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders/:id/query-payment` | 主动查询支付 | WxaAuth | — |
| POST | `/notify/v1/mall/payment/wechat/:mix` | 支付回调通知 | NotifySign | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `id` | path | integer | — | ✅ | 订单ID（正整数） |
| `mix` | path | string | — | ✅ | 混淆编码 |

## 十二、文件上传 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| POST | `/admin/v1/upload/archive` | 上传压缩包（后台） | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/archive/chunk` | 压缩包分片上传 | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/archive/chunk/abort` | 取消压缩包分片上传 | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/audio` | 上传音频（后台） | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/audio/chunk` | 音频分片上传 | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/audio/chunk/abort` | 取消音频分片上传 | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/image` | 上传图片（后台） | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/image/chunk` | 图片分片上传 | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/image/chunk/abort` | 取消图片分片上传 | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/video` | 上传视频（后台） | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/video/chunk` | 视频分片上传 | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/video/chunk/abort` | 取消视频分片上传 | AdminAuth | AdminAuth |
| GET | `/api/v1/wxa/upload/image` | 获取媒体文件 | WxaAuth | — |
| POST | `/api/v1/wxa/upload/image` | 上传图片（C端） | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `file` | formData | file | — | ✅ | 归档文件 |
| `chunk_index` | formData | integer | — | ✅ | 当前分片序号（从0开始） |
| `total_chunks` | formData | integer | — | ✅ | 总分片数 |
| `file_name` | formData | string | — | — | 原始文件名（首片必填） |
| `file_size` | formData | integer | — | — | 完整文件预期总大小（首片必填） |
| `upload_token` | formData | string | — | — | 上传令牌（续片必填） |
| `media_id` | query | string | — | ✅ | 媒体文件ID（minLength=32） |

## 十三、来源管理 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/sources` | 分页查询来源列表（后台） | AdminAuth | `urn:bizmall:source:read` |
| POST | `/admin/v1/sources` | 创建来源 | AdminAuth | `urn:bizmall:source:write` |
| GET | `/admin/v1/sources/:id` | 查询来源详情（后台） | AdminAuth | `urn:bizmall:source:read` |
| PUT | `/admin/v1/sources/:id` | 编辑来源 | AdminAuth | `urn:bizmall:source:write` |
| DELETE | `/admin/v1/sources/:id` | 删除来源（软删除） | AdminAuth | `urn:bizmall:source:delete` |
| GET | `/admin/v1/sources/register-stats` | 注册用户按天汇总 | AdminAuth | `urn:bizmall:source:read` |
| GET | `/admin/v1/sources/report-stats` | 上报日志按天汇总 | AdminAuth | `urn:bizmall:source:read` |
| POST | `/api/v1/source/report` | 来源上报（C 端，无需鉴权） | — | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `id` | path | integer | — | ✅ | 来源ID |
| `start_date` | query | string | — | ✅ | 开始日期 (YYYY-MM-DD) |
| `end_date` | query | string | — | ✅ | 结束日期 (YYYY-MM-DD) |

## 十四、商品模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/brands` | 分页查询品牌列表（后台） | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/brands` | 创建品牌 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/brands/:id` | 编辑品牌 | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/brands/:id` | 删除品牌 | AdminAuth | `urn:bizmall:product:delete` |
| GET | `/admin/v1/mall/categories` | 获取完整分类树（后台） | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/categories` | 创建分类 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/categories/:id` | 编辑分类 | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/categories/:id` | 删除分类 | AdminAuth | `urn:bizmall:product:delete` |
| PUT | `/admin/v1/mall/categories/:id/list-status` | 更新分类上下架状态 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/categories/:id/sort-order` | 更新分类排序 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/categories/:id/visibility` | 更新分类可见性 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/admin/v1/mall/products` | 分页查询商品列表（后台） | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/products` | 创建商品 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/admin/v1/mall/products/:id` | 查询商品详情（后台） | AdminAuth | `urn:bizmall:product:read` |
| PUT | `/admin/v1/mall/products/:id` | 编辑商品 | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/products/:id` | 删除商品（软删除） | AdminAuth | `urn:bizmall:product:delete` |
| PUT | `/admin/v1/mall/products/:id/additional-fields` | 独立更新商品附加字段配置 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/:id/expiry` | 更新商品售卖截止时间 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/:id/lbs` | 更新商品经纬度 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/:id/list-status` | 更新商品上下架状态 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/:id/refund-rule` | 更新商品退款规则关联 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/admin/v1/mall/products/:id/skus` | 查询商品SKU列表 | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/products/:id/skus` | 批量创建SKU | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/products/:id/skus` | 删除商品全部SKU | AdminAuth | `urn:bizmall:product:delete` |
| PUT | `/admin/v1/mall/products/:id/skus/:sku_id` | 编辑单个SKU | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/:id/skus/:sku_id/additional-fields` | 独立更新SKU附加字段配置 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/:id/skus/:sku_id/expiry` | 更新SKU过期时间 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/:id/skus/:sku_id/usable` | 更新SKU生效时间 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/:id/sort-order` | 更新商品排序 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/admin/v1/mall/products/:id/specs` | 查询商品规格组列表 | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/products/:id/specs` | 创建规格组及规格值 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/:id/specs/:spec_id` | 编辑规格组 | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/products/:id/specs/:spec_id` | 删除规格组 | AdminAuth | `urn:bizmall:product:delete` |
| PUT | `/admin/v1/mall/products/:id/usable` | 更新商品售卖开始时间 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/:id/visibility` | 更新商品可见性 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/api/v1/mall/brands` | 获取启用品牌列表（C端） | — | — |
| GET | `/api/v1/mall/categories` | 获取分类树（C端） | — | — |
| GET | `/api/v1/mall/products` | 商品搜索/列表（C端） | — | — |
| GET | `/api/v1/mall/products/:id` | 商品详情（C端） | — | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `page` | query | integer | ≥ 1 | — | 页码（默认 1） |
| `page_size` | query | integer | 1–100 | — | 每页数量（最大 100） |
| `keyword` | query | string | — | — | 搜索关键词 |
| `id` | path | integer | ≥ 1 | ✅ | 品牌ID |
| `is_listed` | query | boolean | — | — | 筛选上架状态 |
| `is_visible` | query | boolean | — | — | 筛选可见状态 |
| `category_id` | query | integer | — | — | 分类ID |
| `brand_id` | query | integer | — | — | 品牌ID |
| `product_type` | query | string | — | — | 商品类型（physical/virtual） |
| `sku_id` | path | integer | ≥ 1 | ✅ | SKU ID |
| `spec_id` | path | integer | ≥ 1 | ✅ | 规格组ID |
| `sort_by` | query | string | — | — | 排序字段（price_asc/price_desc/sold_desc/newest） |
| `min_price` | query | number | — | — | 最低价格（元） |
| `max_price` | query | number | — | — | 最高价格（元） |
| `root_category_id` | query | integer | — | — | 根级分类ID |

## 十五、积分模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| POST | `/admin/v1/mall/points/adjust` | 管理员积分异常修正 | AdminAuth | `urn:bizmall:points:config` |
| GET | `/admin/v1/mall/points/records` | 后台积分流水查询 | AdminAuth | `urn:bizmall:points:config` |
| GET | `/admin/v1/mall/points/rules` | 积分规则列表 | AdminAuth | `urn:bizmall:points:config` |
| POST | `/admin/v1/mall/points/rules` | 创建积分规则 | AdminAuth | `urn:bizmall:points:config` |
| PUT | `/admin/v1/mall/points/rules/:id` | 编辑积分规则 | AdminAuth | `urn:bizmall:points:config` |
| GET | `/api/v1/wxa/mall/points/balance` | 积分余额查询 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/points/exchange-items` | 积分商城兑换项列表 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/points/exchange/:config_id` | 积分兑换优惠券 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/points/records` | 积分流水查询 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/points/sign` | 每日签到 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/points/sign/calendar` | 查询签到日历 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/points/sign/makeup` | 补签 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/points/sign/status` | 查询签到状态 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `user_id` | query | string | — | — | 用户ID |
| `change_type` | query | string | — | — | 流水类型：earn(获取)/spend(消费)/adjust(调整) |
| `page` | query | integer | ≥ 1 | — | 页码 |
| `page_size` | query | integer | 1–100 | — | 每页条数 |
| `rule_type` | query | string | — | — | 规则类型 |
| `id` | path | integer | ≥ 1 | ✅ | 规则ID |
| `config_id` | path | integer | ≥ 1 | ✅ | 兑换配置ID |
| `year` | query | integer | 2000–2100 | ✅ | 年份 |
| `month` | query | integer | 1–12 | ✅ | 月份 |

## 十六、用户模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/users` | 查询C端用户列表 | AdminAuth | `urn:bizmall:user:read` |
| GET | `/admin/v1/mall/users/:id` | 查询C端用户详情 | AdminAuth | `urn:bizmall:user:read` |
| PATCH | `/admin/v1/mall/users/:id/status` | 修改C端用户状态（启用/禁用） | AdminAuth | `urn:bizmall:user:write` |
| POST | `/api/v1/wxa/phone` | 获取微信手机号 | WxaAuth | — |
| GET | `/api/v1/wxa/user` | 获取当前用户个人信息 | WxaAuth | — |
| PUT | `/api/v1/wxa/user` | 更新用户昵称和头像 | WxaAuth | — |
| POST | `/api/v1/wxa/user/register` | 用户注册 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `page` | query | integer | — | — | 页码 |
| `page_size` | query | integer | — | — | 每页条数 |
| `keyword` | query | string | — | — | 关键词搜索（昵称） |
| `source_id` | query | integer | — | — | 来源ID筛选（不传=不筛选） |
| `id` | path | string | — | ✅ | 用户ID（HashID） |

## 十七、通知模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/notification-templates` | 通知模板列表 | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/mall/notification-templates` | 创建通知模板 | AdminAuth | `urn:bizmall:cms:write` |
| PUT | `/admin/v1/mall/notification-templates/:id` | 编辑通知模板 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/mall/notifications` | 后台通知发送记录列表 | AdminAuth | AdminAuth |
| GET | `/api/v1/notifications` | 站内信列表 | WxaAuth | — |
| PUT | `/api/v1/notifications/:id/read` | 标记单条已读 | WxaAuth | — |
| PUT | `/api/v1/notifications/read-all` | 全部标记已读 | WxaAuth | — |
| GET | `/api/v1/notifications/unread-count` | 未读消息数 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `id` | path | integer | ≥ 1 | ✅ | 模板ID |

## 十八、票夹模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/api/v1/wxa/mall/tickets` | C端票夹列表 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/tickets/:id` | C端票夹详情 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/tickets/:id/book` | C端预约票夹 | WxaAuth | — |
| PUT | `/api/v1/wxa/mall/tickets/:id/register` | 登记票夹人员信息 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/tickets/:id/transfer` | 发起转赠 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/tickets/transfer/accept` | 接收转赠 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `page` | query | integer | — | — | 页码 |
| `page_size` | query | integer | — | — | 每页数量 |
| `order_id` | query | integer | — | — | 按子单ID筛选 |
| `parent_order_id` | query | integer | — | — | 按主单ID筛选 |
| `order_item_id` | query | integer | — | — | 按订单商品行ID筛选 |
| `booking_slot_id` | query | integer | — | — | 按预约时段ID筛选 |
| `category_id` | query | integer | — | — | 按商品分类ID筛选 |
| `root_category_id` | query | integer | — | — | 按根分类ID筛选 |
| `id` | path | integer | — | ✅ | 票夹ID |

## 十九、管理后台 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/permissions` | 获取完整权限树 | AdminAuth | `urn:bizmall:admin:role:read` |
| GET | `/admin/v1/roles` | 角色列表 | AdminAuth | `urn:bizmall:admin:role:read` |
| POST | `/admin/v1/roles` | 创建角色 | AdminAuth | `urn:bizmall:admin:role:write` |
| PUT | `/admin/v1/roles/:id` | 编辑角色 | AdminAuth | `urn:bizmall:admin:role:write` |
| DELETE | `/admin/v1/roles/:id` | 删除角色 | AdminAuth | `urn:bizmall:admin:role:delete` |
| GET | `/admin/v1/roles/:id/permissions` | 查询角色已分配的权限列表 | AdminAuth | `urn:bizmall:admin:role:read` |
| PUT | `/admin/v1/roles/:id/permissions` | 为角色分配权限 | AdminAuth | `urn:bizmall:admin:role:write` |
| GET | `/admin/v1/users` | 管理员列表 | AdminAuth | `urn:bizmall:admin:user:read` |
| POST | `/admin/v1/users` | 创建管理员 | AdminAuth | `urn:bizmall:admin:user:write` |
| GET | `/admin/v1/users/:id` | 管理员详情 | AdminAuth | `urn:bizmall:admin:user:read` |
| PUT | `/admin/v1/users/:id` | 编辑管理员 | AdminAuth | `urn:bizmall:admin:user:write` |
| DELETE | `/admin/v1/users/:id` | 删除管理员 | AdminAuth | `urn:bizmall:admin:user:delete` |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `page` | query | integer | — | — | 页码 |
| `page_size` | query | integer | — | — | 每页条数 |
| `id` | path | integer | — | ✅ | 角色ID |
| `keyword` | query | string | — | — | 关键词搜索（用户名/姓名） |
| `role_id` | query | integer | — | — | 角色ID筛选 |
| `status` | query | integer | — | — | 状态筛选（0=禁用，1=启用，不传=不筛选） |

## 二十、操作日志 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/logs/audit` | 审计日志列表 | AdminAuth | AdminAuth |
| GET | `/admin/v1/logs/audit/:id` | 审计日志详情 | AdminAuth | AdminAuth |
| POST | `/admin/v1/logs/audit/archive` | 归档日志 | AdminAuth | AdminAuth |
| GET | `/admin/v1/logs/audit/verify` | 验证哈希链完整性 | AdminAuth | AdminAuth |
| GET | `/admin/v1/logs/my` | 我的日志列表 | AdminAuth | AdminAuth |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `id` | path | integer | ≥ 1 | ✅ | 日志ID |

## 二十一、内容管理 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/cms/articles` | 分页查询资讯列表（后台） | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/cms/articles` | 创建资讯 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/cms/articles/:id` | 查询资讯详情（后台） | AdminAuth | `urn:bizmall:cms:read` |
| PUT | `/admin/v1/cms/articles/:id` | 编辑资讯 | AdminAuth | `urn:bizmall:cms:write` |
| DELETE | `/admin/v1/cms/articles/:id` | 删除资讯（软删除） | AdminAuth | `urn:bizmall:cms:delete` |
| PUT | `/admin/v1/cms/articles/:id/status` | 更新资讯上架/下架状态 | AdminAuth | `urn:bizmall:cms:write` |
| PUT | `/admin/v1/cms/articles/:id/visibility` | 更新资讯可见性 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/cms/banners` | 分页查询Banner列表（后台） | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/cms/banners` | 创建Banner | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/cms/banners/:id` | 查询Banner详情（后台） | AdminAuth | `urn:bizmall:cms:read` |
| PUT | `/admin/v1/cms/banners/:id` | 编辑Banner | AdminAuth | `urn:bizmall:cms:write` |
| DELETE | `/admin/v1/cms/banners/:id` | 删除Banner（硬删除） | AdminAuth | `urn:bizmall:cms:delete` |
| GET | `/admin/v1/cms/help-categories` | 分页查询帮助分类列表（后台） | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/cms/help-categories` | 创建帮助分类 | AdminAuth | `urn:bizmall:cms:write` |
| PUT | `/admin/v1/cms/help-categories/:id` | 编辑帮助分类 | AdminAuth | `urn:bizmall:cms:write` |
| DELETE | `/admin/v1/cms/help-categories/:id` | 删除帮助分类 | AdminAuth | `urn:bizmall:cms:delete` |
| GET | `/admin/v1/cms/helps` | 分页查询帮助文章列表（后台） | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/cms/helps` | 创建帮助文章 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/cms/helps/:id` | 查询帮助文章详情（后台） | AdminAuth | `urn:bizmall:cms:read` |
| PUT | `/admin/v1/cms/helps/:id` | 编辑帮助文章 | AdminAuth | `urn:bizmall:cms:write` |
| DELETE | `/admin/v1/cms/helps/:id` | 删除帮助文章（软删除） | AdminAuth | `urn:bizmall:cms:delete` |
| GET | `/admin/v1/cms/notices` | 分页查询公告列表（后台） | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/cms/notices` | 创建公告 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/cms/notices/:id` | 查询公告详情（后台） | AdminAuth | `urn:bizmall:cms:read` |
| PUT | `/admin/v1/cms/notices/:id` | 编辑公告 | AdminAuth | `urn:bizmall:cms:write` |
| DELETE | `/admin/v1/cms/notices/:id` | 删除公告（软删除） | AdminAuth | `urn:bizmall:cms:delete` |
| PUT | `/admin/v1/cms/notices/:id/status` | 更新公告状态（草稿/发布/撤销） | AdminAuth | `urn:bizmall:cms:write` |
| PUT | `/admin/v1/cms/notices/:id/visibility` | 更新公告可见性 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/api/v1/cms/articles` | 资讯列表（C端） | — | — |
| GET | `/api/v1/cms/articles/:id` | 资讯详情（C端） | — | — |
| GET | `/api/v1/cms/banners` | Banner列表（C端，仅上架且在有效期内） | — | — |
| GET | `/api/v1/cms/help-categories` | 帮助分类列表（C端，含嵌套文章） | — | — |
| GET | `/api/v1/cms/helps` | 帮助文章列表（C端） | — | — |
| GET | `/api/v1/cms/helps/:id` | 帮助文章详情（C端） | — | — |
| GET | `/api/v1/cms/notices` | 公告列表（C端） | — | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `id` | path | integer | ≥ 1 | ✅ | 资讯ID |

## 二十二、订单模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/logistics-companies` | 物流公司列表 | AdminAuth | `urn:bizmall:order:read` |
| POST | `/admin/v1/mall/logistics-companies` | 创建物流公司 | AdminAuth | `urn:bizmall:order:write` |
| PUT | `/admin/v1/mall/logistics-companies/:id` | 编辑物流公司 | AdminAuth | `urn:bizmall:order:write` |
| DELETE | `/admin/v1/mall/logistics-companies/:id` | 删除物流公司 | AdminAuth | `urn:bizmall:order:write` |
| GET | `/admin/v1/mall/orders` | 后台订单列表 | AdminAuth | `urn:bizmall:order:read` |
| GET | `/admin/v1/mall/orders/:id` | 后台订单详情 | AdminAuth | `urn:bizmall:order:read` |
| POST | `/admin/v1/mall/orders/:id/remark` | 添加订单备注 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/orders/:id/ship` | 手动发货 | AdminAuth | AdminAuth |
| GET | `/admin/v1/mall/orders/export` | 导出订单 | AdminAuth | `urn:bizmall:order:read` |
| POST | `/admin/v1/mall/orders/import/ship` | 批量发货导入 | AdminAuth | `urn:bizmall:order:write` |
| GET | `/api/v1/wxa/mall/orders` | C端订单列表 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders` | 创建订单 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/orders/:id` | C端订单详情 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders/:id/confirm-receipt` | 确认收货 | WxaAuth | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `id` | path | integer | — | ✅ | 物流公司ID |
| `order_no` | query | string | — | — | 订单号（模糊搜索） |
| `status` | query | integer | — | — | 订单状态（0待支付 1已支付 2待发货 3已发货 4已收货 5已完成 6已取消 7售后中） |
| `order_type` | query | string | — | — | 订单类型（physical/verification） |
| `start_date` | query | string | — | — | 开始日期（YYYY-MM-DD） |
| `end_date` | query | string | — | — | 结束日期（YYYY-MM-DD） |
| `page` | query | integer | — | — | 页码（默认1） |
| `page_size` | query | integer | — | — | 每页数量（默认20，最大100） |
| `root_category_id` | query | integer | — | — | 商品一级分类ID（按分类筛选） |
| `phone` | query | string | — | — | 下单用户手机号（精确匹配） |

## 二十三、系统设置 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/settings` | 设置项列表 | — | — |
| POST | `/admin/v1/settings` | 创建设置项 | — | — |
| GET | `/admin/v1/settings/:id` | 设置项详情 | — | — |
| PUT | `/admin/v1/settings/:id` | 更新设置项 | — | — |
| DELETE | `/admin/v1/settings/:id` | 删除设置项 | — | — |
| PUT | `/admin/v1/settings/:id/enabled` | 启用/禁用设置项 | — | — |
| GET | `/api/v1/settings/:key` | 读取公开设置 | — | — |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `keyword` | query | string | — | — | 搜索关键词（key/label） |
| `group_name` | query | string | — | — | 分组名称 |
| `is_enabled` | query | boolean | — | — | 启用状态 |
| `page` | query | integer | — | — | 页码 |
| `page_size` | query | integer | ≤ 100 | — | 每页条数 |
| `id` | path | integer | — | ✅ | 设置项 ID |
| `key` | path | string | — | ✅ | 设置项 key |

## 二十四、票夹管理 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/tickets` | 管理后台票夹列表 | AdminAuth | `urn:bizmall:ticket:read` |
| GET | `/admin/v1/mall/tickets/:code` | 扫码查询票夹 | AdminAuth | `urn:bizmall:ticket:read` |
| PUT | `/admin/v1/mall/tickets/:id/booking/cancel` | 管理后台取消预约 | AdminAuth | `urn:bizmall:ticket:write` |
| POST | `/admin/v1/mall/tickets/:id/verify` | 核销卡券 | AdminAuth | `urn:bizmall:ticket:verify` |
| POST | `/admin/v1/mall/tickets/batch-verify` | 批量核销 | AdminAuth | `urn:bizmall:ticket:verify` |
| GET | `/admin/v1/mall/transfers` | 转赠记录列表 | AdminAuth | `urn:bizmall:ticket:read` |
| GET | `/admin/v1/mall/verifications` | 核销记录列表 | AdminAuth | `urn:bizmall:ticket:read` |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `page` | query | integer | — | — | 页码（默认 1） |
| `page_size` | query | integer | — | — | 每页数量（默认 20，最大 50） |
| `order_id` | query | integer | — | — | 按子单ID筛选 |
| `parent_order_id` | query | integer | — | — | 按主单ID筛选 |
| `order_item_id` | query | integer | — | — | 按订单商品行ID筛选 |
| `holder_id` | query | string | — | — | 按持有人ID筛选（HashID 精确匹配） |
| `category_id` | query | integer | — | — | 按商品分类ID筛选 |
| `root_category_id` | query | integer | — | — | 按根分类ID筛选 |
| `booking_slot_id` | query | integer | — | — | 按预约时段ID筛选 |
| `is_verified` | query | boolean | — | — | 按核销状态筛选 |
| `is_transferred` | query | boolean | — | — | 按转赠状态筛选 |
| `is_refunded` | query | boolean | — | — | 按退款状态筛选 |
| `code` | path | string | — | ✅ | 票夹码/ID |
| `id` | path | integer | — | ✅ | 票夹ID |

## 二十五、认证模块 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/login` | 获取当前管理员登录状态 | AdminAuth | — |
| POST | `/admin/v1/login` | 管理员登录 | — | — |
| POST | `/admin/v1/login/pass` | 管理员修改密码 | AdminAuth | — |
| POST | `/admin/v1/login/refresh` | 管理员Token续期 | AdminAuth | — |
| POST | `/admin/v1/logout` | 管理员登出 | AdminAuth | — |
| POST | `/api/v1/wxa/login` | 微信小程序登录 | — | — |

## 二十六、数据统计 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/datacube/retain` | 留存分析 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/retain/trend` | 留存趋势聚合 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/summary` | 每日摘要 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/summary/trend` | 每日摘要趋势 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/user-portrait` | 用户画像 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/user-portrait/trend` | 用户画像趋势聚合 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/visit-distribution` | 访问分布 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/visit-distribution/trend` | 访问分布趋势聚合 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/visit-page` | 页面访问 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/visit-page/trend` | 页面访问趋势聚合 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/visit-trend` | 访问趋势 | AdminAuth | `urn:bizmall:datacube:read` |
| GET | `/admin/v1/datacube/visit-trend/trend` | 访问趋势聚合 | AdminAuth | `urn:bizmall:datacube:read` |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `appid` | query | string | — | — | 小程序AppID |
| `ref_date` | query | string | — | — | 统计日期(YYYYMMDD) |
| `page` | query | integer | — | — | 页码 |
| `page_size` | query | integer | — | — | 每页条数 |
| `start_date` | query | string | — | ✅ | 开始日期(YYYYMMDD) |
| `end_date` | query | string | — | ✅ | 结束日期(YYYYMMDD) |
| `key` | query | integer | — | — | 画像维度键 |
| `index` | query | string | — | — | 分布维度指标 |
| `path` | query | string | — | — | 页面路径 |

## 二十七、退款规则 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/refund-rules` | 退款规则列表 | AdminAuth | `urn:bizmall:refundrule:read` |
| POST | `/admin/v1/mall/refund-rules` | 创建退款规则 | AdminAuth | `urn:bizmall:refundrule:write` |
| GET | `/admin/v1/mall/refund-rules/:id` | 退款规则详情 | AdminAuth | `urn:bizmall:refundrule:read` |
| PUT | `/admin/v1/mall/refund-rules/:id` | 更新退款规则 | AdminAuth | `urn:bizmall:refundrule:write` |
| DELETE | `/admin/v1/mall/refund-rules/:id` | 删除退款规则 | AdminAuth | `urn:bizmall:refundrule:delete` |
| PUT | `/admin/v1/mall/refund-rules/:id/hidden` | 更新退款规则隐藏状态 | AdminAuth | `urn:bizmall:refundrule:write` |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `page` | query | integer | — | — | 页码 |
| `page_size` | query | integer | — | — | 每页数量 |
| `is_system` | query | boolean | — | — | 是否系统级 |
| `is_hidden` | query | boolean | — | — | 是否隐藏 |
| `id` | path | integer | — | ✅ | 规则ID |

## 二十八、发票管理 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/invoices` | 管理后台发票列表 | AdminAuth | AdminAuth |

**参数约束：**

| 参数 | 位置 | 类型 | 约束 | 必填 | 说明 |
|------|:----:|:----:|------|:----:|------|
| `page` | query | integer | — | — | 页码 |
| `page_size` | query | integer | — | — | 每页数量 |

---

> 本文档由 `go run internal/router/swagger_md_gen.go` 自动生成，与 `swag init` 产出的 OpenAPI 规范同步。
> 修改 API 接口后请重新生成本文档以保持对齐。
