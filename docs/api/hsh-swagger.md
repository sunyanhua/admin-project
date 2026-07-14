# BizMall 前端接口文档

> 版本：v1.1 | 日期：2026-07-14 | 协议：HTTPS | 格式：JSON | 编码：UTF-8

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
| `urn:bizmall:product:read` | 商品 | 查看分类/品牌/商品/SKU/规格组 |
| `urn:bizmall:product:write` | 商品 | 创建/编辑分类/品牌/商品/SKU/规格组、上下架 |
| `urn:bizmall:product:delete` | 商品 | 删除分类/品牌/商品/规格组 |
| `urn:bizmall:refundrule:read` | 退款规则 | 查看退款规则列表与详情 |
| `urn:bizmall:refundrule:write` | 退款规则 | 创建与编辑退款规则 |
| `urn:bizmall:refundrule:delete` | 退款规则 | 删除退款规则 |
| `urn:bizmall:cms:read` | CMS | 查看资讯/Banner/公告/帮助分类/帮助文章、通知模板列表 |
| `urn:bizmall:cms:write` | CMS | 创建/编辑内容、上下架、可见性、通知模板创建/编辑 |
| `urn:bizmall:cms:delete` | CMS | 删除内容（软删除或硬删除） |
| `urn:bizmall:coupon:read` | 优惠券 | 查看优惠券模板列表/详情、兑换配置列表 |
| `urn:bizmall:coupon:write` | 优惠券 | 创建/编辑/启停/删除优惠券模板、后台发放优惠券 |
| `urn:bizmall:points:config` | 积分 | 积分规则管理、积分流水查询、积分异常修正、积分兑换配置 |
| `urn:bizmall:user:read` | C 端用户 | 查看 C 端用户列表、用户详情 |
| `urn:bizmall:user:write` | C 端用户 | 修改 C 端用户状态（启用/禁用） |

> **注意：** 以下模块的后台接口未绑定细粒度 URN，仅要求 `AdminAuth`（管理员已登录）即可访问：售后管理、订单管理、物流公司字典、核销人员与记录管理、操作日志、后台上传图片、通知发送记录查询。
退款规则管理为独立 URN 权限体系（`urn:bizmall:refundrule:*`），归属商品管理权限树之下。

---

## 二、Users 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/users` | 查询C端用户列表 | AdminAuth | `urn:bizmall:user:read` |
| GET | `/admin/v1/mall/users/:id` | 查询C端用户详情 | AdminAuth | `urn:bizmall:user:read` |
| PATCH | `/admin/v1/mall/users/:id/status` | 修改C端用户状态（启用/禁用） | AdminAuth | `urn:bizmall:user:write` |
| POST | `/api/v1/wxa/phone` | 获取微信手机号 | WxaAuth | — |
| GET | `/api/v1/wxa/user` | 获取当前用户个人信息 | WxaAuth | — |
| PUT | `/api/v1/wxa/user` | 更新用户昵称和头像 | WxaAuth | — |
| POST | `/api/v1/wxa/user/register` | 用户注册 | WxaAuth | — |

## 三、Auth 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/login` | 获取当前管理员登录状态 | AdminAuth | — |
| POST | `/admin/v1/login` | 管理员登录 | — | — |
| POST | `/admin/v1/login/pass` | 管理员修改密码 | AdminAuth | — |
| POST | `/admin/v1/login/refresh` | 管理员Token续期 | AdminAuth | — |
| POST | `/admin/v1/logout` | 管理员登出 | AdminAuth | — |
| POST | `/api/v1/wxa/login` | 微信小程序登录 | — | — |

## 四、Admin 模块

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

## 五、Products 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/brands` | 分页查询品牌列表（后台） | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/brands` | 创建品牌 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/brands/{id}` | 编辑品牌 | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/brands/{id}` | 删除品牌 | AdminAuth | `urn:bizmall:product:delete` |
| GET | `/admin/v1/mall/categories` | 获取完整分类树（后台） | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/categories` | 创建分类 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/categories/{id}` | 编辑分类 | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/categories/{id}` | 删除分类 | AdminAuth | `urn:bizmall:product:delete` |
| PUT | `/admin/v1/mall/categories/{id}/list-status` | 更新分类上下架状态 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/categories/{id}/sort-order` | 更新分类排序 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/categories/{id}/visibility` | 更新分类可见性 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/admin/v1/mall/products` | 分页查询商品列表（后台） | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/products` | 创建商品 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/admin/v1/mall/products/{id}` | 查询商品详情（后台） | AdminAuth | `urn:bizmall:product:read` |
| PUT | `/admin/v1/mall/products/{id}` | 编辑商品 | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/products/{id}` | 删除商品（软删除） | AdminAuth | `urn:bizmall:product:delete` |
| PUT | `/admin/v1/mall/products/{id}/expiry` | 更新商品售卖截止时间 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/{id}/lbs` | 更新商品经纬度 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/{id}/list-status` | 更新商品上下架状态 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/{id}/refund-rule` | 更新商品退款规则关联 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/admin/v1/mall/products/{id}/skus` | 查询商品SKU列表 | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/products/{id}/skus` | 批量创建SKU | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/products/{id}/skus` | 删除商品全部SKU | AdminAuth | `urn:bizmall:product:delete` |
| PUT | `/admin/v1/mall/products/{id}/skus/{sku_id}` | 编辑单个SKU | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/{id}/skus/{sku_id}/expiry` | 更新SKU过期时间 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/{id}/skus/{sku_id}/usable` | 更新SKU生效时间 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/{id}/sort-order` | 更新商品排序 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/admin/v1/mall/products/{id}/specs` | 查询商品规格组列表 | AdminAuth | `urn:bizmall:product:read` |
| POST | `/admin/v1/mall/products/{id}/specs` | 创建规格组及规格值 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/{id}/specs/{spec_id}` | 编辑规格组 | AdminAuth | `urn:bizmall:product:write` |
| DELETE | `/admin/v1/mall/products/{id}/specs/{spec_id}` | 删除规格组 | AdminAuth | `urn:bizmall:product:delete` |
| PUT | `/admin/v1/mall/products/{id}/usable` | 更新商品售卖开始时间 | AdminAuth | `urn:bizmall:product:write` |
| PUT | `/admin/v1/mall/products/{id}/visibility` | 更新商品可见性 | AdminAuth | `urn:bizmall:product:write` |
| GET | `/api/v1/mall/brands` | 获取启用品牌列表（C端） | — | — |
| GET | `/api/v1/mall/categories` | 获取分类树（C端） | — | — |
| GET | `/api/v1/mall/products` | 商品搜索/列表（C端） | — | — |
| GET | `/api/v1/mall/products/{id}` | 商品详情（C端） | — | — |

## 六、Cart 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/api/v1/cart` | 购物车列表 | WxaAuth | — |
| POST | `/api/v1/cart` | 添加至购物车 | WxaAuth | — |
| DELETE | `/api/v1/cart` | 清空购物车 | WxaAuth | — |
| PUT | `/api/v1/cart/:id` | 修改购物车项 | WxaAuth | — |
| DELETE | `/api/v1/cart/:id` | 删除购物车项 | WxaAuth | — |
| PUT | `/api/v1/cart/batch-select` | 批量选中/取消 | WxaAuth | — |

## 七、Orders 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/logistics-companies` | 物流公司列表 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/logistics-companies` | 创建物流公司 | AdminAuth | AdminAuth |
| PUT | `/admin/v1/mall/logistics-companies/:id` | 编辑物流公司 | AdminAuth | AdminAuth |
| DELETE | `/admin/v1/mall/logistics-companies/:id` | 删除物流公司 | AdminAuth | AdminAuth |
| GET | `/admin/v1/mall/orders` | 后台订单列表 | AdminAuth | AdminAuth |
| GET | `/admin/v1/mall/orders/:id` | 后台订单详情 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/orders/:id/remark` | 添加订单备注 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/orders/:id/ship` | 手动发货 | AdminAuth | AdminAuth |
| GET | `/admin/v1/mall/orders/export` | 导出订单 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/orders/import/ship` | 批量发货导入 | AdminAuth | AdminAuth |
| GET | `/api/v1/wxa/mall/orders` | C端订单列表 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders` | 创建订单 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/orders/:id` | C端订单详情 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders/:id/confirm-receipt` | 确认收货 | WxaAuth | — |

## 八、Payment 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| POST | `/api/v1/wxa/mall/orders/:id/cancel` | 取消订单 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders/:id/pay` | 发起支付 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/orders/:id/pay-status` | 查询支付状态 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders/:id/payment-success` | 支付成功上报 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/orders/:id/query-payment` | 主动查询支付 | WxaAuth | — |
| POST | `/notify/v1/mall/payment/wechat/:mix` | 支付回调通知 | NotifySign | — |

## 九、AfterSale 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/after-sales` | 后台售后列表 | AdminAuth | AdminAuth |
| GET | `/admin/v1/mall/after-sales/:id` | 后台售后详情 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/after-sales/:id/confirm-return` | 确认收到退货 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/after-sales/:id/refund` | 执行退款 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/after-sales/:id/review` | 审核售后单 | AdminAuth | AdminAuth |
| GET | `/admin/v1/mall/refunds` | 退款记录列表 | AdminAuth | AdminAuth |
| GET | `/api/v1/wxa/mall/after-sales` | C端售后列表 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/after-sales` | 提交售后申请 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/after-sales/:id` | C端售后详情 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/after-sales/:id/return-logistics` | 填写退货物流 | WxaAuth | — |

## 十、RefundRules 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/refund-rules` | 退款规则列表 | AdminAuth | `urn:bizmall:refundrule:read` |
| POST | `/admin/v1/mall/refund-rules` | 创建退款规则 | AdminAuth | `urn:bizmall:refundrule:write` |
| GET | `/admin/v1/mall/refund-rules/{id}` | 退款规则详情 | AdminAuth | `urn:bizmall:refundrule:read` |
| PUT | `/admin/v1/mall/refund-rules/{id}` | 更新退款规则 | AdminAuth | `urn:bizmall:refundrule:write` |
| DELETE | `/admin/v1/mall/refund-rules/{id}` | 删除退款规则 | AdminAuth | `urn:bizmall:refundrule:delete` |

## 十一、Coupons 模块

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
| GET | `/api/v1/mall/coupons/available` | 可领取优惠券列表 | — | — |
| GET | `/api/v1/mall/coupons/my` | 我的优惠券列表 | WxaAuth | — |
| POST | `/api/v1/mall/coupons/preview` | 满减试算 | WxaAuth | — |

## 十二、Points 模块

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

## 十三、CMS 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/cms/articles` | 分页查询资讯列表（后台） | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/cms/articles` | 创建资讯 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/cms/articles/{id}` | 查询资讯详情（后台） | AdminAuth | `urn:bizmall:cms:read` |
| PUT | `/admin/v1/cms/articles/{id}` | 编辑资讯 | AdminAuth | `urn:bizmall:cms:write` |
| DELETE | `/admin/v1/cms/articles/{id}` | 删除资讯（软删除） | AdminAuth | `urn:bizmall:cms:delete` |
| PUT | `/admin/v1/cms/articles/{id}/status` | 更新资讯上架/下架状态 | AdminAuth | `urn:bizmall:cms:write` |
| PUT | `/admin/v1/cms/articles/{id}/visibility` | 更新资讯可见性 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/cms/banners` | 分页查询Banner列表（后台） | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/cms/banners` | 创建Banner | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/cms/banners/{id}` | 查询Banner详情（后台） | AdminAuth | `urn:bizmall:cms:read` |
| PUT | `/admin/v1/cms/banners/{id}` | 编辑Banner | AdminAuth | `urn:bizmall:cms:write` |
| DELETE | `/admin/v1/cms/banners/{id}` | 删除Banner（硬删除） | AdminAuth | `urn:bizmall:cms:delete` |
| GET | `/admin/v1/cms/help-categories` | 分页查询帮助分类列表（后台） | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/cms/help-categories` | 创建帮助分类 | AdminAuth | `urn:bizmall:cms:write` |
| PUT | `/admin/v1/cms/help-categories/{id}` | 编辑帮助分类 | AdminAuth | `urn:bizmall:cms:write` |
| DELETE | `/admin/v1/cms/help-categories/{id}` | 删除帮助分类 | AdminAuth | `urn:bizmall:cms:delete` |
| GET | `/admin/v1/cms/helps` | 分页查询帮助文章列表（后台） | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/cms/helps` | 创建帮助文章 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/cms/helps/{id}` | 查询帮助文章详情（后台） | AdminAuth | `urn:bizmall:cms:read` |
| PUT | `/admin/v1/cms/helps/{id}` | 编辑帮助文章 | AdminAuth | `urn:bizmall:cms:write` |
| DELETE | `/admin/v1/cms/helps/{id}` | 删除帮助文章（软删除） | AdminAuth | `urn:bizmall:cms:delete` |
| GET | `/admin/v1/cms/notices` | 分页查询公告列表（后台） | AdminAuth | `urn:bizmall:cms:read` |
| POST | `/admin/v1/cms/notices` | 创建公告 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/admin/v1/cms/notices/{id}` | 查询公告详情（后台） | AdminAuth | `urn:bizmall:cms:read` |
| PUT | `/admin/v1/cms/notices/{id}` | 编辑公告 | AdminAuth | `urn:bizmall:cms:write` |
| DELETE | `/admin/v1/cms/notices/{id}` | 删除公告（软删除） | AdminAuth | `urn:bizmall:cms:delete` |
| PUT | `/admin/v1/cms/notices/{id}/status` | 更新公告上架/下架状态 | AdminAuth | `urn:bizmall:cms:write` |
| PUT | `/admin/v1/cms/notices/{id}/visibility` | 更新公告可见性 | AdminAuth | `urn:bizmall:cms:write` |
| GET | `/api/v1/cms/articles` | 资讯列表（C端） | — | — |
| GET | `/api/v1/cms/articles/{id}` | 资讯详情（C端） | — | — |
| GET | `/api/v1/cms/banners` | Banner列表（C端，仅上架且在有效期内） | — | — |
| GET | `/api/v1/cms/help-categories` | 帮助分类列表（C端，含嵌套文章） | — | — |
| GET | `/api/v1/cms/helps` | 帮助文章列表（C端） | — | — |
| GET | `/api/v1/cms/helps/{id}` | 帮助文章详情（C端） | — | — |
| GET | `/api/v1/cms/notices` | 公告列表（C端） | — | — |

## 十四、Notifications 模块

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

## 十五、Verification 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/mall/verification/records` | 管理员查询核销记录 | AdminAuth | AdminAuth |
| GET | `/admin/v1/mall/verification/records/export` | 管理员导出核销记录 | AdminAuth | AdminAuth |
| GET | `/admin/v1/mall/verification/staff` | 管理员分页查询核销人员列表 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/verification/staff` | 管理员创建核销人员 | AdminAuth | AdminAuth |
| GET | `/admin/v1/mall/verification/staff/:id` | 管理员查询核销人员详情 | AdminAuth | AdminAuth |
| PUT | `/admin/v1/mall/verification/staff/:id` | 管理员编辑核销人员 | AdminAuth | AdminAuth |
| DELETE | `/admin/v1/mall/verification/staff/:id` | 管理员删除核销人员 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/verification/staff/:id/binding-code` | 管理员重新生成绑定码 | AdminAuth | AdminAuth |
| POST | `/admin/v1/mall/verification/staff/:id/unbind` | 管理员解除绑定 | AdminAuth | AdminAuth |
| POST | `/api/v1/wxa/mall/verification/confirm` | 确认核销 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/verification/records` | Wxa已绑定用户查询核销记录 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/verification/scan/:code` | 扫码查询核销信息 | WxaAuth | — |
| POST | `/api/v1/wxa/mall/verification/staff/bind` | 扫码绑定核销人员 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/verification/staff/status` | 查询绑定状态 | WxaAuth | — |
| GET | `/api/v1/wxa/mall/verification/tickets` | C端查询核销码列表 | WxaAuth | — |

## 十六、Upload 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| POST | `/admin/v1/upload/archive` | 上传压缩包（后台） | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/audio` | 上传音频（后台） | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/image` | 上传图片（后台） | AdminAuth | AdminAuth |
| POST | `/admin/v1/upload/video` | 上传视频（后台） | AdminAuth | AdminAuth |
| GET | `/api/v1/wxa/upload/image` | 获取媒体文件 | WxaAuth | — |
| POST | `/api/v1/wxa/upload/image` | 上传图片（C端） | WxaAuth | — |

### 上传模块使用详解

文件上传模块支持**单文件上传**与**分片上传**两种模式，覆盖图片、音频、视频、压缩包四类文件。
所有上传端点均要求 `Content-Type: multipart/form-data`，并在请求头中携带 `Authorization: Bearer <admin_token>`（后台管理鉴权）。

#### 1. 单文件上传

适用于小文件（≤ 各类上限），一次请求完成上传。

**端点：** `POST /admin/v1/upload/{type}`，其中 `{type}` ∈ `{image, audio, video, archive}`

**请求参数（multipart/form-data）：**

| 字段 | 类型 | 必填 | 说明 |
|------|:----:|:----:|------|
| `file` | File | ✅ | 要上传的文件二进制数据 |

**各类型文件限制：**

| 类型 | MIME 白名单 | 扩展名 | 大小上限 | 魔数校验 |
|:----:|------------|--------|:------:|:------:|
| `image` | image/jpeg, png, gif, webp | jpg, jpeg, png, gif, webp | 20MB | ✅ |
| `audio` | audio/mpeg, wav, ogg, aac, flac, mp4 | mp3, wav, ogg, aac, flac, m4a | 100MB | ✅ |
| `video` | video/mp4, webm, quicktime, x-msvideo | mp4, webm, mov, avi | 500MB | ✅ |
| `archive` | application/zip, rar, 7z, gzip, tar | zip, rar, 7z, gz, tar | 200MB | — |

**请求示例（curl）：**

```bash
curl -X POST https://api.example.com/admin/v1/upload/image \
  -H "Authorization: Bearer <admin_token>" \
  -F "file=@/path/to/photo.jpg"
```

**成功响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "url": "https://cdn.example.com/permanent/2026-07/a1b2c3d4.jpg"
  }
}
```

**常见错误码：**

| 错误码 | 含义 |
|:------:|------|
| 7002 | 文件大小超出该类型上限 |
| 7003 | 文件扩展名或 MIME 类型不被允许 |
| 7001 | 上传到 OSS 失败 |

#### 2. 分片上传

适用于大文件（如 GB 级视频）。**Init + Chunk + Complete 三阶段合并为单一 `/chunk` 端点**，按 `chunk_index` 自动分阶段：

- **chunk_index = 0**（首个分片）→ 自动初始化会话，返回 `upload_token`
- **chunk_index = 1..N-2**（中间分片）→ 追加写入 OSS
- **chunk_index = N-1**（末片）→ 追加写入 + 完整性校验 + 返回 CDN URL

**端点：** `POST /admin/v1/upload/{type}/chunk`，其中 `{type}` ∈ `{image, audio, video, archive}`

**请求参数（multipart/form-data）：**

| 字段 | 类型 | 必传阶段 | 说明 |
|------|:----:|:------:|------|
| `file` | File | 始终 | 分片二进制数据 |
| `chunk_index` | int | 始终 | 当前分片序号（从 0 开始） |
| `total_chunks` | int | 始终 | 总分片数，每片需一致 |
| `file_name` | string | chunk 0 | 原始文件名（含扩展名） |
| `file_size` | int64 | chunk 0 | 完整文件预期总大小（字节） |
| `upload_token` | string | chunk > 0 | chunk 0 响应返回的上传令牌 |

**每片大小：** 固定 `10MB`（可通过配置 `chunk_size` 调整）。末片允许小于 10MB，其余各片必须精确等于 10MB。

**分阶段响应格式：**

| 阶段 | 关键响应字段 | 说明 |
|:----:|-------------|------|
| chunk 0（首片） | `upload_token`, `expires_at`, `chunk_index:0`, `received:1` | 获取令牌，有效期 2h |
| chunk 1..N-2（中间） | `chunk_index`, `received`, `total_chunks` | 确认进度 |
| chunk N-1（末片） | `url`, `file_size`, `content_type` | 最终 CDN 地址 |

**请求示例 — 首片初始化（curl）：**

```bash
curl -X POST https://api.example.com/admin/v1/upload/video/chunk \
  -H "Authorization: Bearer <admin_token>" \
  -F "file=@part0.bin" \
  -F "chunk_index=0" \
  -F "total_chunks=5" \
  -F "file_name=video.mp4" \
  -F "file_size=52428800"
```

**请求示例 — 后续分片续传（curl）：**

```bash
curl -X POST https://api.example.com/admin/v1/upload/video/chunk \
  -H "Authorization: Bearer <admin_token>" \
  -F "file=@part1.bin" \
  -F "chunk_index=1" \
  -F "total_chunks=5" \
  -F "upload_token=<chunk_0_response_token>"
```

**首片成功响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "upload_token": "a1b2c3d4e5f6...",
    "chunk_index": 0,
    "received": 1,
    "total_chunks": 5,
    "expires_at": "2026-07-12T14:00:00Z"
  }
}
```

**末片完成响应：**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "url": "https://cdn.example.com/permanent/2026-07/a1b2c3d4.mp4",
    "file_size": 52428800,
    "content_type": "video/mp4",
    "chunk_index": 4,
    "received": 5,
    "total_chunks": 5
  }
}
```

#### 3. 取消分片上传

终止进行中的分片上传，清理 OSS 已追加数据和 Redis 会话。

**端点：** `POST /admin/v1/upload/{type}/chunk/abort`

**请求参数（multipart/form-data）：**

| 字段 | 类型 | 必填 | 说明 |
|------|:----:|:----:|------|
| `upload_token` | string | ✅ | 首片返回的上传令牌 |

**请求示例（curl）：**

```bash
curl -X POST https://api.example.com/admin/v1/upload/video/chunk/abort \
  -H "Authorization: Bearer <admin_token>" \
  -F "upload_token=a1b2c3d4e5f6..."
```

#### 4. 分片上传错误码速查

| 错误码 | 含义 | 触发场景 |
|:------:|------|------|
| 7006 | 上传令牌不存在或已过期 | upload_token 无效 / Redis 中无对应会话 |
| 7007 | 分片序号无效 | chunk_index < 0 或 >= total_chunks，或 total_chunks 中途变更 |
| 7008 | 分片大小不匹配 | 非末片大小 ≠ 10MB，或末片 > 10MB |
| 7009 | 分片需按顺序上传 | chunk_index > next_index（跳过了前面的分片） |
| 7010 | 文件完整性校验失败 | 末片追加后 nextPosition ≠ fileSize |
| 7011 | 上传会话已超时 | Redis 会话超过 2h TTL 未续期 |

#### 5. 关键注意事项

1. **有序性** —— 分片必须按 `chunk_index` 从 0 到 `total_chunks-1` 顺序上传，乱序将返回 7009。
2. **幂等性** —— 已接收的分片重复上传不会重复写入 OSS，直接返回当前进度。网络超时后可从失败的 index 安全重试。
3. **大小约束** —— 非末片大小必须精确等于 10MB。前端分片时应固定 chunk 大小，仅最后一片允许 ≤ 10MB。
4. **会话有效期** —— 上传令牌有效期 2h。超时未完成需从 chunk 0 重新发起。
5. **完整性校验** —— 末片完成后自动校验 `nextPosition == fileSize`，不匹配返回 7010。
6. **鉴权要求** —— 所有上传端点（含分片）均要求 `AdminAuth`（管理员 JWT），无细粒度 URN 要求。
7. **CORS 配置** —— 前端跨域调用时，请勿设置 `withCredentials: true` / `credentials: 'include'`，否则服务端返回 403。
8. **图片保护后缀** —— 开启 `image_protection` 后，图片 CDN URL 末尾带 `/0` 后缀（如 `.../photo.jpg/0`），其他类型不带。
9. **分片大小配置** —— 默认 10MB/片，可通过配置文件 `chunk_size` 调整。计算 `total_chunks = ceil(file_size / chunk_size)`。

## 十七、Audit 模块

| 方法 | 路径 | 摘要 | 认证 | 所需权限 |
|:----:|------|------|:----:|:----:|
| GET | `/admin/v1/logs/audit` | 审计日志列表 | AdminAuth | AdminAuth |
| GET | `/admin/v1/logs/audit/:id` | 审计日志详情 | AdminAuth | AdminAuth |
| POST | `/admin/v1/logs/audit/archive` | 归档日志 | AdminAuth | AdminAuth |
| GET | `/admin/v1/logs/audit/verify` | 验证哈希链完整性 | AdminAuth | AdminAuth |
| GET | `/admin/v1/logs/my` | 我的日志列表 | AdminAuth | AdminAuth |

---

> 本文档由 `go run internal/router/swagger_md_gen.go` 自动生成，与 `swag init` 产出的 OpenAPI 规范同步。
> 修改 API 接口后请重新生成本文档以保持对齐。
