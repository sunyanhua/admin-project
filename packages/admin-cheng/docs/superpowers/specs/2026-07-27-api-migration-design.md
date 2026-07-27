# API 接口迁移改造设计方案

> **状态**: 已确认 | **日期**: 2026-07-27 | **作者**: Claude Code

## 一、背景

### 1.1 当前状态

"他俩能成"管理后台的 API 层同时使用三套接口体系：

| 体系 | 路径前缀 | 状态 | 接口数（代码中） |
|------|---------|------|:---:|
| v1 REST | `/admin/v1/` | 主力接口，标准的 RESTful 风格 | ~150 |
| v6 旧接口 | `/admin/v6/` | 旧系统风格，POST 做一切操作 | ~40 |
| Legacy 无版本 | `/admin/` | 最早期的接口 | ~20 |

总计约 210 个 API 调用点分布在 22 个 service 文件中。

### 1.2 接口文档现状

Swagger 文档 `docs/api/cheng-swagger.json`（Swagger 2.0 格式）包含 **32 个接口**、**28 个定义模型**，覆盖以下后端标签组：

| 标签组 | 接口数 | 覆盖范围 |
|--------|:---:|------|
| 管理后台-认证 | 2 | 登录、修改密码 |
| 管理后台-管理员管理 | 5 | 管理员 CRUD |
| 管理后台-审计 | 1 | 全局操作日志 |
| 管理后台-日志 | 1 | 我的操作日志 |
| 管理后台-权限管理 | 2 | 权限树、权限 URN |
| 管理后台-文件上传 | 7 | 图片/音频/视频/压缩包 + 分片 |
| 管理后台-用户模块 | 4 | C端用户列表/详情/资料修改/档案审核 |
| 管理后台-微信小程序管理 | 7 | 小程序配置 CRUD + Token 管理 |
| C端/小程序接口 | 3 | 微信登录、手机号、上传 |

### 1.3 缺失的接口文档

以下接口在代码中大量使用但**不在当前 Swagger 文档中**，需后端后续补充：

- `/admin/v1/mall/*` — 商城（分类、商品、订单、退款、发票、优惠券、退款规则、用户）
- `/admin/v1/cms/*` — 内容管理（Banner、FAQ/帮助）
- `/admin/v1/roles` — 角色管理
- `/admin/v1/sources` — 来源管理
- `/admin/v1/settings` — 系统设置
- `/admin/v1/logout` — 退出登录
- `/admin/v1/login/refresh` — Token 刷新
- 所有 `/admin/v6/*` 统计接口

### 1.4 决策依据

- **接口来源**：后端会逐步补充 Swagger，当前 32 个接口已是后端线上版本
- **改造策略**：渐进式对齐（方案 A），先以 Swagger 现有接口为准做系统管理层对齐
- **路径确认**：Swagger 文档路径为最终版本，前端直接改代码对齐

## 二、改造总览

```
第1批 路径修正（auth + admin）       ← 立即执行
       ↓
第2批 类型生成（28 个模型 → TS）     ← 可与第1批并行
       ↓
第3批 C端用户模块迁移（mall → bizops）← 依赖第1、2批
       ↓
第4批 小程序配置管理（全新模块）      ← 独立开发
       ↓
第5批 上传模块增强（新增文件类型）    ← 低优先级
```

## 三、第 1 批：路径与方法修正

### 3.1 `src/api/services/auth.ts` 修正

| 函数 | 当前 | 修正为 | 变更类型 |
|------|------|--------|:---:|
| `getMyLogs` | `GET /admin/v1/logs/my` | `GET /admin/v1/login/logs` | 路径 |
| `changePassword` | `POST /admin/v1/login/pass` | `PUT /admin/v1/login/change-password` | 方法+路径 |

**不变**（Swagger 无对应，保持现状）：`login`、`logout`、`getLoginStatus`、`refreshToken`

### 3.2 `src/api/services/admin.ts` 修正

| 函数 | 当前 | 修正为 | 变更类型 |
|------|------|--------|:---:|
| `getAdmins` | `GET /admin/v1/users` | `GET /admin/v1/user` | 路径（复数→单数） |
| `createAdmin` | `POST /admin/v1/users` | `POST /admin/v1/user` | 路径 |
| `getAdminDetail` | `GET /admin/v1/users/:id` | `GET /admin/v1/user/:id` | 路径 |
| `updateAdmin` | `PUT /admin/v1/users/:id` | `PUT /admin/v1/user/:id` | 路径 |
| `deleteAdmin` | `DELETE /admin/v1/users/:id` | `DELETE /admin/v1/user/:id` | 路径 |
| `getLogs` | `GET /admin/v1/logs/audit` | `GET /admin/v1/audit/logs` | 路径 |
| `getPermissions` | `GET /admin/v1/permissions` | `GET /admin/v1/permission/tree` | 路径 |

**不变**（Swagger 无对应）：`roles` CRUD、`role permissions` 分配

### 3.3 分页参数标准化

Swagger 使用 `page`(1-based, 默认1) / `size`(默认20, 最大100)，需检查并统一所有 service 文件的分页参数命名。当前代码混用 `page`/`page_size`，统一为 Swagger 规范的 `page`/`size`。

### 3.4 影响页面

| 页面 | 关联接口 |
|------|------|
| 登录页 | `login` |
| 管理账号 | `getAdmins`, `createAdmin`, `updateAdmin`, `deleteAdmin` |
| 角色管理 | `getPermissions` |
| 管理日志 | `getLogs` |
| 修改密码 | `changePassword` |
| 我的日志 | `getMyLogs` |
| 工作台 | `getLoginStatus` |

## 四、第 2 批：类型生成

### 4.1 文件结构

从 Swagger `definitions` 中提取 28 个模型，生成 TypeScript 类型：

```
src/api/types/
├── common.ts         # PagedResponse<T>, Response<T>, Pagination
├── auth.ts           # AdminLoginRequest, AdminLoginResponse, AdminChangePasswordRequest
├── admin.ts          # AdminUserListItem, AdminUserDetailResponse, AdminRoleItem, etc.
├── user.ts           # AdminUserListItem (C端), AdminUserDetailResponse, AdminUserMatchProfileView, etc.
├── permission.ts     # PermissionNode
├── upload.ts         # UploadFileResult, UploadImageResult, ChunkResult, InitChunkResult
├── wxa.ts            # CreateWxaAppRequest, UpdateWxaAppRequest, UpdateWxaAppStatusRequest
├── status.ts         # AdminUserStatus, UserGender, ProfileAuditStatus, MatchProfileAuditStatus, etc.
└── index.ts          # 统一导出
```

### 4.2 生成规则

1. **去掉 Go 包前缀**：`github_com_vbegin_tlnc_v6_internal_module_admin_model.AdminUserListItem` → `AdminUserListItem`
2. **分页响应泛型化**：`PagedResponse<T>` 与 `Response<T>` 两个泛型，覆盖所有接口
3. **状态枚举**：从 Swagger `x-enum` 元数据提取，使用 `as const` 对象（配合项目中已有的 `src/shared/constants` 模式）
4. **可选字段**：Swagger 未标记 required 的字段设为可选（`?`）

### 4.3 示例

```typescript
// src/api/types/common.ts
export interface PagedResponse<T> {
  code: number;
  message: string;
  data: T;
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  size: number;
  total: number;
  has_more: boolean;
}

export interface Response<T = unknown> {
  code: number;
  message: string;
  data: T;
}

// src/api/types/auth.ts
export interface AdminLoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  access_token: string;
  expires_at: string;
  issued_at: string;
  token_type: string;
}

export interface AdminChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// src/api/types/admin.ts
export interface AdminUserListItem {
  id: number;
  username: string;
  real_name: string;
  email: string;
  phone: string;
  is_root: boolean;
  status: AdminUserStatus;
  need_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserDetailResponse extends AdminUserListItem {
  roles: AdminRoleItem[];
  permissions: string[];
}

export interface AdminRoleItem {
  id: number;
  name: string;
  description: string;
}

// src/api/types/status.ts
/** 管理员状态: 0=启用, 1=停用 */
export const AdminUserStatus = {
  ENABLED: 0,
  DISABLED: 1,
} as const;
export type AdminUserStatus = (typeof AdminUserStatus)[keyof typeof AdminUserStatus];

/** 用户性别: 0=未设置, 1=男, 2=女 */
export const UserGender = {
  UNSET: 0,
  MALE: 1,
  FEMALE: 2,
} as const;
export type UserGender = (typeof UserGender)[keyof typeof UserGender];
```

### 4.4 Service 文件改造

逐步将 22 个 service 文件中的 `any` 和手工类型替换为 `src/api/types/` 中的生成类型：

- **第 2 批范围内**（已有 Swagger 定义）：`auth.ts`、`admin.ts`、`user.ts`、`upload.ts` 全部替换
- **第 2 批范围外**（等后端补充）：继续维持手工类型，但统一放在 `src/api/types/` 中，便于后续替换

## 五、第 3 批：C端用户模块接口迁移

### 5.1 路径迁移

| 功能 | 当前 | 迁移至 | 方法 |
|------|------|--------|:---:|
| 用户列表 | `GET /admin/v1/mall/users` | `GET /admin/v1/bizops/user` | GET |
| 用户详情 | `GET /admin/v1/mall/users/:id` | `GET /admin/v1/bizops/user/:id` | GET |
| 修改基础资料 | ❌ 无 | `PUT /admin/v1/bizops/user/:id/basic-profile` | PUT |
| 审核脱单档案 | ❌ 无 | `PUT /admin/v1/bizops/user/match-profile/:id/audit` | PUT |
| 状态切换 | `PATCH /admin/v1/mall/users/:id/status` | 保持（Swagger 暂无此接口） | PATCH |

### 5.2 参数适配

**新增筛选参数**（Swagger 比当前代码多出的能力）：

```typescript
// src/api/services/user.ts — 新增参数
interface UserListParams {
  page?: number;
  size?: number;
  keyword?: string;              // 已有
  gender?: 1 | 2;                // 新增：性别
  min_age?: number;              // 新增：最小年龄
  max_age?: number;              // 新增：最大年龄
  profile_audit_status?: number; // 新增：基础资料审核状态
  match_audit_status?: number;   // 新增：脱单档案审核状态
}
```

**响应结构变化**：

- `AdminUserListItem`（C端版）新增字段：`age`, `last_active_at`, `match_audit_status`
- `AdminUserDetailResponse` 新增嵌套 `match_profile` 对象（`AdminUserMatchProfileView`）
- 手机号已脱敏返回（中间四位隐藏）

### 5.3 页面改造

**文件**：`src/pages/community/UserList.tsx`

**搜索面板增强**：
- 新增性别下拉筛选（男/女）
- 新增年龄范围输入（最小/最大）
- 新增审核状态下拉（基础资料审核状态、脱单档案审核状态）
- keyword 保持现有关键词搜索

**表格列调整**：
- 头像+昵称列（140px）：`getAvatarUrl()` + `Button type="link"`
- 性别列（60px）：`UserGender` 枚举映射
- 年龄列（60px）
- 审核状态列（100px Tag × 2）：基础资料 + 脱单档案
- 最后活跃列（120px 双行日期）
- 注册时间列（120px 双行日期）
- 操作列：查看详情、修改资料、审核档案

**新增功能组件**：

```typescript
// src/pages/community/
//   ├── UserList.tsx              # 改造（增强筛选 + 新操作按钮）
//   ├── UserDetailModal.tsx       # 新建：用户详情弹窗（基础资料+脱单档案）
//   ├── UserEditProfileModal.tsx  # 新建：管理员修改用户基础资料
//   └── MatchProfileAuditModal.tsx # 新建：脱单档案审核弹窗
```

### 5.4 影响范围

- `src/api/services/user.ts` — 重写
- `src/api/types/user.ts` — 新增
- `src/pages/community/UserList.tsx` — 改造
- 3 个新弹窗组件

## 六、第 4 批：小程序配置管理（全新模块）

### 6.1 接口

```
GET    /admin/v1/wxa/app             分页列表
POST   /admin/v1/wxa/app             创建
GET    /admin/v1/wxa/app/:id         详情
PUT    /admin/v1/wxa/app/:id         更新（app_id 不可变）
DELETE /admin/v1/wxa/app/:id         软删除
POST   /admin/v1/wxa/app/:id/expire-token  强制过期 AccessToken
PATCH  /admin/v1/wxa/app/:id/status        独立切换启用/停用
```

### 6.2 新增文件

```
src/api/services/wxa.ts
src/api/types/wxa.ts
src/pages/system/WxaAppManagement.tsx
```

### 6.3 页面设计

**表格列**：

| 列 | 宽度 | 说明 |
|----|:---:|------|
| AppID | 不设宽 | `wordBreak: 'break-word'`，自动换行 |
| 应用名称 | 不设宽 | 标题列，自动换行 |
| 类型 | 90 | Tag：小程序 / 公众号 |
| 状态 | 100 | Switch，`WxaAppStatus` 枚举 |
| 创建时间 | 120 | 双行日期 |

**操作列**（宽度 160）：编辑、过期 Token（确认弹窗）、删除（`confirmDelete`）

**添加/编辑弹窗**（`AddEditModal`）：
- app_id（创建时可填，编辑时禁用）
- app_name
- app_secret（密码输入框，脱敏显示）
- app_type（下拉：小程序/公众号）

### 6.4 菜单挂载

归入"系统管理 → 小程序配置"，路由 `#/system/wxa-apps`。仅超级管理员可见。

## 七、第 5 批：上传模块增强

### 7.1 新增接口

| 接口 | 说明 |
|------|------|
| `POST /admin/v1/upload/audio` | 上传音频 |
| `POST /admin/v1/upload/video` | 上传视频 |
| `POST /admin/v1/upload/zipfile` | 上传压缩包 |
| `POST /admin/v1/upload/audio/chunk` | 分片上传音频 |
| `POST /admin/v1/upload/video/chunk` | 分片上传视频 |
| `POST /admin/v1/upload/zipfile/chunk` | 分片上传压缩包 |

### 7.2 实现方式

**非分片上传**（仿照现有图片上传模式）：
- `FormData` 包文件
- 直接 `axios.post` 到绝对 URL
- 手动附 Bearer Token
- 支持 `onUploadProgress`

**分片上传**（三阶段状态机）：
```
Phase 1: 首次请求（无 chunk_ticket）
  → 201 { chunk_ticket, file_id }
       ↓
Phase 2: 后续分片（带 chunk_ticket）
  → 202 { file_id, chunk_index, status: 0 }  ← 上传中
       ↓
Phase 3: 最后一片
  → 200 { file_id, file_url, status: 1 }     ← 完成
```

- 抽取公共分片逻辑到 `src/utils/uploadUtils.ts`
- 分片大小默认 5MB

### 7.3 影响范围

- `src/api/services/upload.ts` — 扩展
- `src/utils/uploadUtils.ts` — 新建
- 无页面改动（上传为工具层，由各业务页按需调用）

## 八、不变更 & 不涉及范围

### 8.1 保持不变的接口

以下接口因 Swagger 未覆盖，在本次改造中**不做任何修改**：

| 模块 | 路径前缀 | 保持原因 |
|------|---------|------|
| 商城业务 | `/admin/v1/mall/*` | 等后端补充 Swagger |
| CMS 内容 | `/admin/v1/cms/*` | 等后端补充 Swagger |
| 角色管理 | `/admin/v1/roles` | 等后端补充 Swagger |
| 来源管理 | `/admin/v1/sources` | 等后端补充 Swagger |
| 系统设置 | `/admin/v1/settings` | 等后端补充 Swagger |
| 退出登录 | `/admin/v1/logout` | 等后端补充 Swagger |
| Token 刷新 | `/admin/v1/login/refresh` | 等后端补充 Swagger（拦截器已可用） |
| v6 统计 | `/admin/v6/*` | 等后端提供 v1 替代接口 |
| Legacy 接口 | `/admin/*` | 逐步淘汰，不主动改造 |

### 8.2 不涉及的页面

- 活动管理 / 门票管理 / 商品管理（v1 mall 接口，等后端补充）
- 订单管理 / 退款管理 / 发票管理 / 优惠券管理（同上）
- 轮播图 / FAQ / 协议文档（v1 cms 接口，等后端补充）
- 访问统计 / 用户统计（v6 接口，等 v1 替代）
- 分类管理类页面（v6+mix，等后端补充）

## 九、风险 & 注意事项

### 9.1 路径变更风险

| 风险 | 缓解 |
|------|------|
| 后端新路径未部署到测试环境 | 修改前在测试环境用 curl 验证 |
| 请求/响应格式与现有拦截器不兼容 | 拦截器已按 `{ code, message, data }` 处理，与 Swagger 一致 |
| 分页参数 `page_size` → `size` 导致分页异常 | 全局搜索替换，统一回归测试 |

### 9.2 类型覆盖风险

- Swagger 定义的字段可能和实际线上返回不完全一致（后端可能返回额外字段），生成的类型仅作参考
- 使用 `Partial<T>` 和可选字段防止编译错误

### 9.3 OldSun 自动同步

改造期间修改前务必先 `git commit`（按照项目 CLAUDE.md 规则），防止自动同步覆盖未提交的修改。

## 十、验证标准

每批次完成后验收：

- [ ] 修改的页面在测试环境正常加载，数据正确展示
- [ ] 新增/编辑/删除操作正常
- [ ] 搜索筛选功能正常
- [ ] 分页切换正常
- [ ] 无控制台错误
- [ ] TypeScript 编译无错误
- [ ] 无硬编码状态值，使用枚举
- [ ] 使用 `useAppNotification` 做消息提示
