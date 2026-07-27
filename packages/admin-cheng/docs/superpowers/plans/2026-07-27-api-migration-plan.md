# API 接口迁移改造 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将"他俩能成"管理后台 API 层对齐 Swagger 接口文档（cheng-swagger.json），分 5 批完成路径修正、类型生成、C端用户迁移、小程序配置管理、上传增强。

**Architecture:** 渐进式改造。先修路径（auth/admin service），再生成类型文件（Swagger definitions → TS），然后迁移 C 端用户模块（bizops），最后新增小程序配置页面和上传增强。每批独立可验证。

**Tech Stack:** React 18 + TypeScript + Ant Design v5 + Axios

## Global Constraints

- 禁止 `import { message } from 'antd'`，必须使用 `useAppNotification()` hook
- 禁止硬编码状态值，必须使用 `src/shared/constants` 中的枚举
- 表格列宽度按 CLAUDE.md §5 规范：Tag列90~100、Switch列100、日期列120（双行）、头像+昵称140~160、标题不设宽
- 所有带表单的弹窗必须用 `ScrollableModal`，禁止直接 `import { Modal } from 'antd'` 做表单弹窗
- 图片使用 `getAvatarUrl`/`getMediumUrl` 等缩略图工具
- 状态枚举统一：`ENABLED=0, DISABLED=1`
- 关键词搜索参数统一为 `keyword`
- 响应格式 `{ code, message, data }`，拦截器已解包 `code===0` 返回 `data`
- 改造前先 `git commit`（防止 OldSun 自动同步覆盖未提交修改）

---

### Task 0: 改造前提交（必须）

**Files:**
- 无代码变更

- [ ] **Step 1: 确保工作区干净，有未提交修改则先 commit**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git status
# 如果有未提交修改，先 commit
git add -A && git commit -m "chore: 改造前保存工作区状态"
```

---

### Task 1: 修正 auth.ts — changePassword 路径+方法

**Files:**
- Modify: `src/api/services/auth.ts:26-30`

**Interfaces:**
- Produces: `authApi.changePassword` 使用新路径 `PUT /admin/v1/login/change-password`

- [ ] **Step 1: 修改 changePassword 函数**

定位到 `src/api/services/auth.ts` 第 26-30 行，将：
```typescript
  // 修改密码
  // POST /admin/v1/login/pass
  // Body: { old_password, new_password }
  changePassword: (data: { old_password: string; new_password: string }) => {
    return request.post('/admin/v1/login/pass', data);
  },
```
替换为：
```typescript
  // 修改密码
  // PUT /admin/v1/login/change-password
  // Body: { old_password, new_password }
  changePassword: (data: { old_password: string; new_password: string }) => {
    return request.put('/admin/v1/login/change-password', data);
  },
```

- [ ] **Step 2: 修改 getMyLogs 路径**

定位到 `src/api/services/auth.ts` 第 41-43 行，将：
```typescript
  // 获取登录日志列表 (我的日志)
  // GET /admin/v1/logs/my?page={page}&page_size={page_size}&keyword={keyword}
  getMyLogs: (params: { page?: number; page_size?: number; keyword?: string }) => {
    return request.get('/admin/v1/logs/my', { params });
  },
```
替换为：
```typescript
  // 获取我的操作日志
  // GET /admin/v1/login/logs?page={page}&size={size}
  getMyLogs: (params: { page?: number; size?: number; keyword?: string }) => {
    return request.get('/admin/v1/login/logs', { params });
  },
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/api/services/auth.ts
git commit -m "fix: 对齐 Swagger — auth.ts changePassword 路径/方法，getMyLogs 路径"
```

---

### Task 2: 修正 admin.ts — 管理员接口路径（users→user）

**Files:**
- Modify: `src/api/services/admin.ts:62-136`

**Interfaces:**
- Produces: `adminApi` 所有管理员 CRUD 路径从 `/admin/v1/users` 改为 `/admin/v1/user`

- [ ] **Step 1: 修正管理员 CRUD 路径（5 处）**

定位到 `src/api/services/admin.ts`，每处将 `users` 替换为 `user`（仅限 URL 字符串中的 `users`）：

```typescript
// 第 63-64 行
  getAdmins: async (params?: AdminListParams) => {
    return request.get('/admin/v1/user', { params });
  },

// 第 68-69 行
  getAdminDetail: async (id: number) => {
    return request.get(`/admin/v1/user/${id}`);
  },

// 第 74-75 行
  createAdmin: async (data: CreateAdminData) => {
    return request.post('/admin/v1/user', data);
  },

// 第 80-81 行
  updateAdmin: async (id: number, data: UpdateAdminData) => {
    return request.put(`/admin/v1/user/${id}`, data);
  },

// 第 85-86 行
  deleteAdmin: async (id: number) => {
    return request.delete(`/admin/v1/user/${id}`);
  },
```

- [ ] **Step 2: 修正审计日志路径**

将第 133-136 行：
```typescript
  // 审计日志列表（管理日志） — GET /admin/v1/logs/audit
  getLogs: async (params?: { page?: number; page_size?: number; word?: string }) => {
    return request.get('/admin/v1/logs/audit', { params });
  },
```
替换为：
```typescript
  // 全局操作日志审计 — GET /admin/v1/audit/logs?page&size&admin_id&action&start_time&end_time
  getLogs: async (params?: {
    page?: number;
    size?: number;
    admin_id?: string;
    action?: string;
    start_time?: string;
    end_time?: string;
  }) => {
    return request.get('/admin/v1/audit/logs', { params });
  },
```

- [ ] **Step 3: 修正权限树路径**

将第 114-116 行：
```typescript
  // 权限树 — GET /admin/v1/permissions
  getPermissions: async (): Promise<PermissionNode[]> => {
    return request.get('/admin/v1/permissions');
  },
```
替换为：
```typescript
  // 权限树 — GET /admin/v1/permission/tree
  getPermissions: async (): Promise<PermissionNode[]> => {
    return request.get('/admin/v1/permission/tree');
  },
```

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/api/services/admin.ts
git commit -m "fix: 对齐 Swagger — admin.ts 管理员/审计/权限接口路径"
```

---

### Task 3: 第 2 批 — 生成 types/common.ts 和 types/status.ts

**Files:**
- Create: `src/api/types/common.ts`
- Create: `src/api/types/status.ts`

**Interfaces:**
- Produces: `PagedResponse<T>`, `Response<T>`, `Pagination` (common.ts)
- Produces: `AdminUserStatus`, `UserGender`, `ProfileAuditStatus`, `MatchProfileAuditStatus`, `MatchProfileAuditAction`, `UploadStatus` (status.ts)

- [ ] **Step 1: 创建 `src/api/types/common.ts`**

```typescript
/** 分页响应泛型 — Swagger PagedResponse */
export interface PagedResponse<T> {
  code: number;
  message: string;
  data: T;
  pagination: Pagination;
}

/** 分页信息 — Swagger Pagination */
export interface Pagination {
  /** 当前页码（1-based） */
  page: number;
  /** 每页条数 */
  size: number;
  /** 总记录数 */
  total: number;
  /** 是否还有更多页 */
  has_more: boolean;
}

/** 非分页响应泛型 — Swagger Response */
export interface Response<T = unknown> {
  code: number;
  message: string;
  data: T;
}
```

- [ ] **Step 2: 创建 `src/api/types/status.ts`**

```typescript
/** 管理员状态 */
export const AdminUserStatus = {
  /** 启用 */
  ACTIVE: 0,
  /** 停用 */
  DISABLED: 1,
} as const;
export type AdminUserStatus = (typeof AdminUserStatus)[keyof typeof AdminUserStatus];

/** 用户性别 */
export const UserGender = {
  /** 未设置（Register 阶段占位值） */
  UNSET: 0,
  /** 男 */
  MALE: 1,
  /** 女 */
  FEMALE: 2,
} as const;
export type UserGender = (typeof UserGender)[keyof typeof UserGender];

/** 基础资料审核状态 */
export const ProfileAuditStatus = {
  /** 待审核 */
  PENDING: 0,
  /** 审核通过 */
  APPROVED: 1,
  /** 审核拒绝 */
  REJECTED: 2,
} as const;
export type ProfileAuditStatus = (typeof ProfileAuditStatus)[keyof typeof ProfileAuditStatus];

/** 脱单档案审核状态 */
export const MatchProfileAuditStatus = {
  /** 待审核 */
  PENDING: 0,
  /** 审核通过 */
  APPROVED: 1,
  /** 审核拒绝 */
  REJECTED: 2,
  /** 已撤销 */
  REVOKED: 3,
} as const;
export type MatchProfileAuditStatus = (typeof MatchProfileAuditStatus)[keyof typeof MatchProfileAuditStatus];

/** 脱单档案审核动作 */
export const MatchProfileAuditAction = {
  /** 通过 */
  APPROVE: 1,
  /** 拒绝 */
  REJECT: 2,
} as const;
export type MatchProfileAuditAction = (typeof MatchProfileAuditAction)[keyof typeof MatchProfileAuditAction];

/** 上传状态 */
export const UploadStatus = {
  /** 上传中（分片未完成或单文件未完成写入） */
  UPLOADING: 0,
  /** 已完成（单文件或最后一个分片写入完毕） */
  COMPLETED: 1,
} as const;
export type UploadStatus = (typeof UploadStatus)[keyof typeof UploadStatus];
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/api/types/common.ts src/api/types/status.ts
git commit -m "feat: 生成 common/status 类型定义（来自 Swagger）"
```

---

### Task 4: 第 2 批 — 生成 types/auth.ts 和 types/admin.ts

**Files:**
- Create: `src/api/types/auth.ts`
- Create: `src/api/types/admin.ts`

**Interfaces:**
- Produces: `AdminLoginRequest`, `AdminLoginResponse`, `AdminChangePasswordRequest`
- Produces: `AdminUserListItem`, `AdminUserDetailResponse`, `AdminRoleItem`, `CreateAdminUserRequest`, `CreateAdminUserResponse`, `UpdateAdminUserRequest`

- [ ] **Step 1: 创建 `src/api/types/auth.ts`**

```typescript
/** POST /admin/v1/login 请求体 */
export interface AdminLoginRequest {
  username: string;
  password: string;
}

/** POST /admin/v1/login 响应 data */
export interface AdminLoginResponse {
  access_token: string;
  expires_at: string;
  /** Token 签发时间（Unix timestamp） */
  issued_at: number;
  token_type: string;
}

/** PUT /admin/v1/login/change-password 请求体 */
export interface AdminChangePasswordRequest {
  old_password: string;
  new_password: string;
}
```

- [ ] **Step 2: 创建 `src/api/types/admin.ts`**

```typescript
import type { AdminUserStatus } from './status';

/** 管理员列表项 — Swagger AdminUserListItem */
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

/** 管理员详情 — Swagger AdminUserDetailResponse */
export interface AdminUserDetailResponse extends AdminUserListItem {
  roles: AdminRoleItem[];
  /** 权限 URN 列表 */
  permissions: string[];
}

/** 角色 — Swagger AdminRoleItem */
export interface AdminRoleItem {
  id: number;
  name: string;
  description: string;
}

/** POST /admin/v1/user 请求体 */
export interface CreateAdminUserRequest {
  username: string;
  password: string;
  role_ids: number[];
  email?: string;
  phone?: string;
  real_name?: string;
  is_root?: boolean;
}

/** POST /admin/v1/user 响应 data */
export interface CreateAdminUserResponse {
  id: number;
  username: string;
}

/** PUT /admin/v1/user/:id 请求体（全部可选） */
export interface UpdateAdminUserRequest {
  email?: string;
  phone?: string;
  real_name?: string;
  password?: string;
  role_ids?: number[];
  status?: AdminUserStatus;
}
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/api/types/auth.ts src/api/types/admin.ts
git commit -m "feat: 生成 auth/admin 类型定义（来自 Swagger）"
```

---

### Task 5: 第 2 批 — 生成 types/user.ts、permission.ts、upload.ts、wxa.ts

**Files:**
- Create: `src/api/types/user.ts`
- Create: `src/api/types/permission.ts`
- Create: `src/api/types/upload.ts`
- Create: `src/api/types/wxa.ts`

**Interfaces:**
- Produces: `AdminUserListItem` (C端), `AdminUserDetailResponse` (C端), `AdminUserMatchProfileView`, `AuditMatchProfileRequest`, `AdminUpdateBasicProfileRequest`
- Produces: `PermissionNode`
- Produces: `UploadFileResult`, `UploadImageResult`, `ChunkResult`, `InitChunkResult`
- Produces: `CreateWxaAppRequest`, `UpdateWxaAppRequest`, `UpdateWxaAppStatusRequest`

- [ ] **Step 1: 创建 `src/api/types/user.ts`**

```typescript
import type { UserGender, ProfileAuditStatus, MatchProfileAuditStatus } from './status';

/** C 端用户列表项 — Swagger AdminUserListItem */
export interface AdminUserListItem {
  user_id: string;
  nickname: string;
  avatar: string;
  gender: UserGender;
  age: number;
  /** 手机号（脱敏，中间四位隐藏） */
  phone: string;
  profile_audit_status: ProfileAuditStatus;
  match_audit_status: MatchProfileAuditStatus;
  created_at: string;
  last_active_at: string;
}

/** C 端用户详情 — Swagger AdminUserDetailResponse */
export interface AdminUserDetailResponse {
  user_id: string;
  nickname: string;
  avatar: string;
  real_name: string;
  phone: string;
  gender: UserGender;
  birth_date: string;
  zodiac: string;
  cn_zodiac: string;
  profile_audit_status: ProfileAuditStatus;
  match_profile?: AdminUserMatchProfileView;
  created_at: string;
  last_active_at: string;
}

/** 脱单档案视图 — Swagger AdminUserMatchProfileView */
export interface AdminUserMatchProfileView {
  match_code: string;
  marital_status: number;
  education: number;
  profession: string;
  income_range: number;
  height: number;
  weight: number;
  hobby_tags: string[];
  current_city: string;
  hometown: string;
  self_intro: string;
  partner_demand: string;
  audit_status: MatchProfileAuditStatus;
  audit_reason: string;
  audited_at: string;
  audited_by: string;
}

/** 审核脱单档案请求 */
export interface AuditMatchProfileRequest {
  /** 1=通过, 2=拒绝 */
  action: 1 | 2;
  reason: string;
}

/** 管理员修改 C 端用户基础资料请求 */
export interface AdminUpdateBasicProfileRequest {
  real_name: string;
  gender: 1 | 2;
  birth_date: string;
  /** 变更原因（必填） */
  reason: string;
}
```

- [ ] **Step 2: 创建 `src/api/types/permission.ts`**

```typescript
/** 权限树节点 — Swagger PermissionNode */
export interface PermissionNode {
  urn: string;
  description: string;
  children?: PermissionNode[];
}
```

- [ ] **Step 3: 创建 `src/api/types/upload.ts`**

```typescript
import type { UploadStatus } from './status';

/** 单文件上传结果 — Swagger UploadFileResult */
export interface UploadFileResult {
  file_id: string;
  file_url: string;
}

/** C 端图片上传结果 — Swagger UploadImageResult */
export interface UploadImageResult {
  media_id: string;
  media_url: string;
}

/** 分片上传结果 — Swagger ChunkResult */
export interface ChunkResult {
  file_id: string;
  file_url: string;
  chunk_index: number;
  status: UploadStatus;
}

/** 分片上传初始化结果 — Swagger InitChunkResult */
export interface InitChunkResult {
  chunk_ticket: string;
  file_id: string;
}
```

- [ ] **Step 4: 创建 `src/api/types/wxa.ts`**

```typescript
/** POST /admin/v1/wxa/app 请求体 */
export interface CreateWxaAppRequest {
  app_id: string;
  app_name: string;
  app_secret: string;
  app_type: string;
}

/** PUT /admin/v1/wxa/app/:id 请求体 */
export interface UpdateWxaAppRequest {
  id: number;
  app_name?: string;
  app_secret?: string;
  app_type?: string;
  status?: number;
}

/** PATCH /admin/v1/wxa/app/:id/status 请求体 */
export interface UpdateWxaAppStatusRequest {
  id: number;
  status: number;
}
```

- [ ] **Step 5: 创建 `src/api/types/index.ts` 统一导出**

```typescript
export * from './common';
export * from './status';
export * from './auth';
export * from './admin';
export * from './user';
export * from './permission';
export * from './upload';
export * from './wxa';
```

- [ ] **Step 6: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 7: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/api/types/
git commit -m "feat: 生成 user/permission/upload/wxa 类型定义（来自 Swagger）"
```

---

### Task 6: 替换 auth.ts 和 admin.ts 中的手工类型

**Files:**
- Modify: `src/api/services/auth.ts:1-45`
- Modify: `src/api/services/admin.ts:1-58`

**Interfaces:**
- Consumes: `AdminLoginRequest`, `AdminLoginResponse`, `AdminChangePasswordRequest` from `types/auth`
- Consumes: `AdminUserListItem`, `AdminUserDetailResponse`, `AdminRoleItem`, `CreateAdminUserRequest`, `UpdateAdminUserRequest`, `PermissionNode` from `types/admin` + `types/permission`

- [ ] **Step 1: 替换 auth.ts 类型**

删除 `auth.ts` 中原有的所有接口定义（留空，类型从 types 导入），修改函数签名引用新类型。

```typescript
import request, { setTokens } from '..';
import type { AdminLoginRequest, AdminLoginResponse, AdminChangePasswordRequest } from '../types/auth';

export const authApi = {
  // 管理员登录 — POST /admin/v1/login
  login: (data: AdminLoginRequest): Promise<AdminLoginResponse> => {
    return request.post('/admin/v1/login', data);
  },

  // 退出登录 — POST /admin/v1/logout
  logout: () => {
    return request.post('/admin/v1/logout');
  },

  // 获取当前管理员登录状态 — GET /admin/v1/login
  getLoginStatus: () => {
    return request.get('/admin/v1/login');
  },

  // 修改密码 — PUT /admin/v1/login/change-password
  changePassword: (data: AdminChangePasswordRequest) => {
    return request.put('/admin/v1/login/change-password', data);
  },

  // 管理员 Token 续期 — POST /admin/v1/login/refresh
  refreshToken: (data: { refresh_token: string }) => {
    return request.post('/admin/v1/login/refresh', data);
  },

  // 我的操作日志 — GET /admin/v1/login/logs
  getMyLogs: (params: { page?: number; size?: number; keyword?: string }) => {
    return request.get('/admin/v1/login/logs', { params });
  },
};
```

- [ ] **Step 2: 替换 admin.ts 类型**

删除 `admin.ts` 中第 4-56 行的 `AdminUser`、`AdminListParams`、`CreateAdminData`、`UpdateAdminData`、`AdminRole`、`PermissionNode` 接口定义。导入新类型：

```typescript
import request from '..';
import type { AdminUserStatus } from '../types/status';
import type {
  AdminUserListItem,
  AdminUserDetailResponse,
  AdminRoleItem,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from '../types/admin';
import type { PermissionNode } from '../types/permission';
```

修改函数签名以使用新类型：
- `getAdmins` 返回类型标注为 `Promise<AdminUserListItem[]>`
- `getAdminDetail` 返回 `Promise<AdminUserDetailResponse>`
- `createAdmin` 参数类型改为 `CreateAdminUserRequest`
- `updateAdmin` 第二个参数改为 `UpdateAdminUserRequest`
- `getRoles` 返回 `Promise<AdminRoleItem[]>`

无需改动的函数（roles CRUD 保持原样）

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/api/services/auth.ts src/api/services/admin.ts
git commit -m "refactor: auth/admin service 使用 Swagger 生成的类型"
```

---

### Task 7: 第 3 批 — 重写 user.ts service（mall → bizops）

**Files:**
- Modify: `src/api/services/user.ts`（完全重写）

**Interfaces:**
- Consumes: `AdminUserListItem`, `AdminUserDetailResponse`, `AuditMatchProfileRequest`, `AdminUpdateBasicProfileRequest` from `types/user`
- Produces: 新的 `userApi` 函数签名

- [ ] **Step 1: 完全重写 `src/api/services/user.ts`**

```typescript
import request from '..';
import type { AdminUserListItem, AdminUserDetailResponse, AuditMatchProfileRequest, AdminUpdateBasicProfileRequest } from '../types/user';

/** C端用户查询参数 */
export interface UserListParams {
  page?: number;
  size?: number;
  keyword?: string;
  gender?: 1 | 2;
  min_age?: number;
  max_age?: number;
  profile_audit_status?: number;
  match_audit_status?: number;
}

export const userApi = {
  /** 用户列表 — GET /admin/v1/bizops/user */
  getUsers: (params?: UserListParams): Promise<{ list: AdminUserListItem[]; total: number }> => {
    return request.get('/admin/v1/bizops/user', { params }) as any;
  },

  /** 用户详情 — GET /admin/v1/bizops/user/:id */
  getUserDetail: (id: string | number): Promise<AdminUserDetailResponse> => {
    return request.get(`/admin/v1/bizops/user/${id}`);
  },

  /** 修改用户基础资料 — PUT /admin/v1/bizops/user/:id/basic-profile */
  updateBasicProfile: (id: string | number, data: AdminUpdateBasicProfileRequest) => {
    return request.put(`/admin/v1/bizops/user/${id}/basic-profile`, data);
  },

  /** 审核脱单档案 — PUT /admin/v1/bizops/user/match-profile/:id/audit */
  auditMatchProfile: (id: string | number, data: AuditMatchProfileRequest) => {
    return request.put(`/admin/v1/bizops/user/match-profile/${id}/audit`, data);
  },

  /** 状态切换 — PATCH /admin/v1/mall/users/:id/status（Swagger 暂无此接口，保持） */
  updateUserStatus: (id: string | number, status: number) => {
    return request.patch(`/admin/v1/mall/users/${id}/status`, { status });
  },
};
```

注意：`updateUserStatus` 保持原有路径（Swagger 暂无对应接口），v6 旧接口 `updateUserVisible`/`setOfficialUser`/`setRecommendUser` 在此次改造中移除（后续等 Swagger 补充再添加）。

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/api/services/user.ts
git commit -m "refactor: user service 对齐 Swagger bizops 路径 + 新增参数/响应类型"
```

---

### Task 8: 第 3 批 — 改造 UserList 搜索面板 + 新建筛选参数

**Files:**
- Modify: `src/pages/community/UserList.tsx`（搜索面板 + useListPage 参数适配）

**Interfaces:**
- Consumes: `userApi.getUsers` with new `UserListParams`

- [ ] **Step 1: 更新 filters 数组 — 增加新筛选字段**

在 `UserList.tsx` 中，替换现有的 `filters` 数组：

```typescript
import { ProfileAuditStatus, MatchProfileAuditStatus } from '@/api/types/status';

const GENDER_OPTIONS = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
];

const PROFILE_AUDIT_OPTIONS = [
  { label: '待审核', value: ProfileAuditStatus.PENDING },
  { label: '审核通过', value: ProfileAuditStatus.APPROVED },
  { label: '审核拒绝', value: ProfileAuditStatus.REJECTED },
];

const MATCH_AUDIT_OPTIONS = [
  { label: '待审核', value: MatchProfileAuditStatus.PENDING },
  { label: '审核通过', value: MatchProfileAuditStatus.APPROVED },
  { label: '审核拒绝', value: MatchProfileAuditStatus.REJECTED },
  { label: '已撤销', value: MatchProfileAuditStatus.REVOKED },
];

const filters: FilterConfig[] = [
  { name: 'gender', placeholder: '全部性别', type: 'select', options: GENDER_OPTIONS },
  { name: 'profile_audit_status', placeholder: '全部资料审核状态', type: 'select', options: PROFILE_AUDIT_OPTIONS },
  { name: 'match_audit_status', placeholder: '全部档案审核状态', type: 'select', options: MATCH_AUDIT_OPTIONS },
  { name: 'keyword', placeholder: '关键词搜索', type: 'input' },
];
```

注意移除了旧的 `status` 筛选（v6"正常/屏蔽"在新接口中由 `profile_audit_status` 和 `match_audit_status` 替代）。

- [ ] **Step 2: 更新 fetchUsers callback — 适配新的分页参数**

替换 `fetchUsers` 和 `formatUserResponse`：

```typescript
const fetchUsers = useCallback(async (params: any) => {
  // useListPage 内部传 page/page_size，映射到 service 期望的 page/size
  return userApi.getUsers({
    page: params.page,
    size: params.page_size || params.size,
    keyword: params.keyword,
    gender: params.gender,
    profile_audit_status: params.profile_audit_status,
    match_audit_status: params.match_audit_status,
  });
}, []);
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/pages/community/UserList.tsx
git commit -m "feat: UserList 搜索面板新增性别/审核状态筛选（对齐 Swagger）"
```

---

### Task 9: 第 3 批 — 改造 UserList 表格列 + 新增操作按钮

**Files:**
- Modify: `src/pages/community/UserList.tsx`（表格列 + 操作列）

**Interfaces:**
- Consumes: `AdminUserListItem` from `types/user`

- [ ] **Step 1: 替换表格列定义 columns**

用新的 `AdminUserListItem` 字段替换旧的 columns（保留 ActionColumn）：

```typescript
import { UserGender, ProfileAuditStatus, MatchProfileAuditStatus } from '@/api/types/status';
import { getAvatarUrl } from '@/utils/imageUtils';
import { Avatar, Button, Space } from 'antd';

const columns: ColumnsType<any> = [
  {
    title: '用户',
    dataIndex: 'nickname',
    key: 'user',
    width: 160,
    render: (_: string, record: any) => (
      <Space size={4}>
        <Avatar size={40} src={getAvatarUrl(record.avatar)} />
        <Button type="link" onClick={() => handleViewDetail(record)}>
          {record.nickname || '-'}
        </Button>
      </Space>
    ),
  },
  {
    title: '性别',
    dataIndex: 'gender',
    key: 'gender',
    width: 60,
    render: (g: number) => {
      if (g === UserGender.MALE) return '男';
      if (g === UserGender.FEMALE) return '女';
      return '未知';
    },
  },
  {
    title: '年龄',
    dataIndex: 'age',
    key: 'age',
    width: 60,
    render: (v: number) => v ?? '-',
  },
  {
    title: '资料审核',
    dataIndex: 'profile_audit_status',
    key: 'profile_audit_status',
    width: 100,
    render: (s: number) => {
      const map: Record<number, { color: string; text: string }> = {
        [ProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
        [ProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
        [ProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
      };
      const info = map[s] || { color: 'default', text: '未知' };
      return <Tag color={info.color}>{info.text}</Tag>;
    },
  },
  {
    title: '档案审核',
    dataIndex: 'match_audit_status',
    key: 'match_audit_status',
    width: 100,
    render: (s: number) => {
      const map: Record<number, { color: string; text: string }> = {
        [MatchProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
        [MatchProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
        [MatchProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
        [MatchProfileAuditStatus.REVOKED]: { color: 'default', text: '已撤销' },
      };
      const info = map[s] || { color: 'default', text: '未知' };
      return <Tag color={info.color}>{info.text}</Tag>;
    },
  },
  {
    title: '最后活跃',
    dataIndex: 'last_active_at',
    key: 'last_active_at',
    width: 120,
    render: (t: string) => (
      <div style={{ lineHeight: 1.6 }}>
        <div>{formatDate(t)}</div>
        <div style={{ color: '#666', fontSize: 12 }}>{t ? formatDateTime(t).split(' ')[1] : '-'}</div>
      </div>
    ),
  },
  {
    title: '注册时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 120,
    render: (t: string) => (
      <div style={{ lineHeight: 1.6 }}>
        <div>{formatDate(t)}</div>
        <div style={{ color: '#666', fontSize: 12 }}>{t ? formatDateTime(t).split(' ')[1] : '-'}</div>
      </div>
    ),
  },
  ActionColumn({
    onView: handleViewDetail,
    showView: true,
    showEdit: false,
    showDelete: false,
    width: 160,
    render: (record: any) => (
      <Space>
        <Button size="small" type="link" onClick={() => handleViewDetail(record)}>详情</Button>
        <Button size="small" type="link" onClick={() => handleEditProfile(record)}>修改资料</Button>
        {record.match_audit_status === MatchProfileAuditStatus.PENDING && (
          <Button size="small" type="link" onClick={() => handleAuditProfile(record)}>审核档案</Button>
        )}
      </Space>
    ),
  }),
];
```

移除旧的 `userColumn`、`statusSwitchColumn`、`GENDER_MAP`、`getAge`、`CoopRoleTag`、`handleStatusToggle`、`handleStatusChange`、`handleOfficialChange`、`handleRecommendChange` 等不再需要的代码。

- [ ] **Step 2: 添加 handleEditProfile 和 handleAuditProfile 占位函数（后续弹窗任务实现）**

```typescript
const handleEditProfile = (record: any) => {
  // Task 11 实现 UserEditProfileModal
};

const handleAuditProfile = (record: any) => {
  // Task 12 实现 MatchProfileAuditModal
};
```

- [ ] **Step 3: 更新 StandardPage description**

```typescript
description="管理平台的注册用户信息，支持按性别、年龄、审核状态筛选，查看用户基础资料和脱单档案详情，审核脱单档案。"
```

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/pages/community/UserList.tsx
git commit -m "feat: UserList 表格列对齐 Swagger 响应字段 + 新增审核操作按钮"
```

---

### Task 10: 第 3 批 — 新建 UserDetailModal（用户详情弹窗）

**Files:**
- Create: `src/pages/community/UserDetailModal.tsx`
- Modify: `src/pages/community/UserList.tsx`（引入并使用 UserDetailModal）

**Interfaces:**
- Consumes: `AdminUserDetailResponse` from `types/user`

- [ ] **Step 1: 创建 `src/pages/community/UserDetailModal.tsx`**

```typescript
import { Descriptions, Tag, Spin, Image, Typography } from 'antd';
import { ScrollableModal } from '@/components/templates/ScrollableModal';
import type { AdminUserDetailResponse } from '@/api/types/user';
import { UserGender, ProfileAuditStatus, MatchProfileAuditStatus } from '@/api/types/status';
import { getAvatarUrl } from '@/utils/imageUtils';
import { formatDateTime } from '@/utils/format';

const { Text } = Typography;

interface Props {
  open: boolean;
  loading: boolean;
  data: AdminUserDetailResponse | null;
  onClose: () => void;
}

const UserDetailModal: React.FC<Props> = ({ open, loading, data, onClose }) => {
  if (!data) return null;

  const genderLabel = data.gender === UserGender.MALE ? '男' : data.gender === UserGender.FEMALE ? '女' : '未设置';

  const profileAuditMap: Record<number, { color: string; text: string }> = {
    [ProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
    [ProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
    [ProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
  };

  const matchAuditMap: Record<number, { color: string; text: string }> = {
    [MatchProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
    [MatchProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
    [MatchProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
    [MatchProfileAuditStatus.REVOKED]: { color: 'default', text: '已撤销' },
  };

  return (
    <ScrollableModal title="用户详情" open={open} onCancel={onClose} footer={null} width={720}>
      <Spin spinning={loading}>
        <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="头像" span={2}>
            <Image width={80} src={getAvatarUrl(data.avatar)} />
          </Descriptions.Item>
          <Descriptions.Item label="昵称">{data.nickname}</Descriptions.Item>
          <Descriptions.Item label="真实姓名">{data.real_name}</Descriptions.Item>
          <Descriptions.Item label="性别">{genderLabel}</Descriptions.Item>
          <Descriptions.Item label="出生日期">{data.birth_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{data.phone}</Descriptions.Item>
          <Descriptions.Item label="星座">{data.zodiac || '-'} / {data.cn_zodiac || '-'}</Descriptions.Item>
          <Descriptions.Item label="资料审核">
            <Tag color={profileAuditMap[data.profile_audit_status]?.color}>
              {profileAuditMap[data.profile_audit_status]?.text || '未知'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="注册时间">{formatDateTime(data.created_at)}</Descriptions.Item>
          <Descriptions.Item label="最后活跃">{formatDateTime(data.last_active_at)}</Descriptions.Item>
        </Descriptions>

        {data.match_profile && (
          <>
            <Text strong style={{ fontSize: 16, marginBottom: 12, display: 'block' }}>脱单档案</Text>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="匹配码">{data.match_profile.match_code}</Descriptions.Item>
              <Descriptions.Item label="婚姻状况">{data.match_profile.marital_status}</Descriptions.Item>
              <Descriptions.Item label="学历">{data.match_profile.education}</Descriptions.Item>
              <Descriptions.Item label="职业">{data.match_profile.profession || '-'}</Descriptions.Item>
              <Descriptions.Item label="收入范围">{data.match_profile.income_range}</Descriptions.Item>
              <Descriptions.Item label="身高">{data.match_profile.height}cm</Descriptions.Item>
              <Descriptions.Item label="体重">{data.match_profile.weight}kg</Descriptions.Item>
              <Descriptions.Item label="现居城市">{data.match_profile.current_city || '-'}</Descriptions.Item>
              <Descriptions.Item label="家乡">{data.match_profile.hometown || '-'}</Descriptions.Item>
              <Descriptions.Item label="爱好标签" span={2}>
                {data.match_profile.hobby_tags?.length > 0
                  ? data.match_profile.hobby_tags.map((t: string) => <Tag key={t}>{t}</Tag>)
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="自我介绍" span={2}>{data.match_profile.self_intro || '-'}</Descriptions.Item>
              <Descriptions.Item label="择偶要求" span={2}>{data.match_profile.partner_demand || '-'}</Descriptions.Item>
              <Descriptions.Item label="审核状态">
                <Tag color={matchAuditMap[data.match_profile.audit_status]?.color}>
                  {matchAuditMap[data.match_profile.audit_status]?.text || '未知'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Spin>
    </ScrollableModal>
  );
};

export default UserDetailModal;
```

注意：`ScrollableModal` 可能不存在，如果不存在则使用 `Modal`（但项目规范要求用 `ScrollableModal`）。先检查是否存在，不存在则创建或直接用 `Modal`。

- [ ] **Step 2: 在 UserList.tsx 中引入 UserDetailModal**

```typescript
import UserDetailModal from './UserDetailModal';
```

添加状态：
```typescript
const [detailModalOpen, setDetailModalOpen] = useState(false);
const [detailUser, setDetailUser] = useState<AdminUserDetailResponse | null>(null);
```

重写 `handleViewDetail`：
```typescript
const handleViewDetail = async (record: any) => {
  setDetailModalOpen(true);
  setDetailLoading(true);
  try {
    const res = await userApi.getUserDetail(record.user_id || record.id);
    setDetailUser(res as any);
  } catch {
    // error handled by notification
  } finally {
    setDetailLoading(false);
  }
};
```

在 JSX 末尾添加：
```tsx
<UserDetailModal
  open={detailModalOpen}
  loading={detailLoading}
  data={detailUser}
  onClose={() => { setDetailModalOpen(false); setDetailUser(null); }}
/>
```

移除旧的 `DetailModal` 引用（如不再需要 `UserDetailSections`）。

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/pages/community/UserDetailModal.tsx src/pages/community/UserList.tsx
git commit -m "feat: 新建 UserDetailModal 展示基础资料+脱单档案"
```

---

### Task 11: 第 3 批 — 新建 UserEditProfileModal（管理员修改用户资料）

**Files:**
- Create: `src/pages/community/UserEditProfileModal.tsx`
- Modify: `src/pages/community/UserList.tsx`（引入并接入 handleEditProfile）

**Interfaces:**
- Consumes: `userApi.updateBasicProfile`
- Consumes: `AdminUpdateBasicProfileRequest`

- [ ] **Step 1: 创建 `src/pages/community/UserEditProfileModal.tsx`**

```typescript
import { Form, Input, Select, DatePicker, Space } from 'antd';
import { ScrollableModal } from '@/components/templates/ScrollableModal';
import { useAppNotification } from '@/hooks/useAppNotification';
import { userApi } from '@/api/services/user';
import type { AdminUpdateBasicProfileRequest } from '@/api/types/user';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface Props {
  open: boolean;
  user: { id: string; real_name?: string; gender?: number; birth_date?: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const UserEditProfileModal: React.FC<Props> = ({ open, user, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const { success, error } = useAppNotification();

  const handleSubmit = async () => {
    if (!user) return;
    try {
      const values = await form.validateFields();
      const data: AdminUpdateBasicProfileRequest = {
        real_name: values.real_name,
        gender: values.gender,
        birth_date: values.birth_date.format('YYYY-MM-DD'),
        reason: values.reason,
      };
      await userApi.updateBasicProfile(user.id, data);
      success('用户资料修改成功，变更已记录到操作日志');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return; // 表单验证失败，不做提示
      error(err?.response?.data?.message || '修改失败');
    }
  };

  return (
    <ScrollableModal
      title="修改用户基础资料"
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleSubmit}
      okText="确认修改"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          real_name: user?.real_name || '',
          gender: user?.gender,
          birth_date: user?.birth_date ? dayjs(user.birth_date) : undefined,
        }}
      >
        <Form.Item name="real_name" label="真实姓名" rules={[{ required: true, message: '请输入真实姓名' }]}>
          <Input placeholder="请输入真实姓名" />
        </Form.Item>
        <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择性别' }]}>
          <Select placeholder="请选择性别">
            <Select.Option value={1}>男</Select.Option>
            <Select.Option value={2}>女</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="birth_date" label="出生日期" rules={[{ required: true, message: '请选择出生日期' }]}>
          <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
        </Form.Item>
        <Form.Item
          name="reason"
          label="变更原因"
          rules={[{ required: true, message: '请填写变更原因' }]}
        >
          <TextArea rows={3} placeholder="请填写修改用户资料的业务原因，此记录会写入操作日志" />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default UserEditProfileModal;
```

- [ ] **Step 2: 在 UserList.tsx 中接入**

```typescript
import UserEditProfileModal from './UserEditProfileModal';

// 新增状态
const [editProfileOpen, setEditProfileOpen] = useState(false);
const [editProfileUser, setEditProfileUser] = useState<any>(null);

// 实现 handleEditProfile
const handleEditProfile = (record: any) => {
  setEditProfileUser({ id: record.user_id || record.id, real_name: record.real_name, gender: record.gender, birth_date: record.birth_date });
  setEditProfileOpen(true);
};
```

JSX 末尾：
```tsx
<UserEditProfileModal
  open={editProfileOpen}
  user={editProfileUser}
  onClose={() => setEditProfileOpen(false)}
  onSuccess={refresh}
/>
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/pages/community/UserEditProfileModal.tsx src/pages/community/UserList.tsx
git commit -m "feat: 新建 UserEditProfileModal 管理员修改用户基础资料"
```

---

### Task 12: 第 3 批 — 新建 MatchProfileAuditModal（档案审核弹窗）

**Files:**
- Create: `src/pages/community/MatchProfileAuditModal.tsx`
- Modify: `src/pages/community/UserList.tsx`（引入并接入 handleAuditProfile）

**Interfaces:**
- Consumes: `userApi.auditMatchProfile`
- Consumes: `MatchProfileAuditAction` from `types/status`

- [ ] **Step 1: 创建 `src/pages/community/MatchProfileAuditModal.tsx`**

```typescript
import { Form, Radio, Input, Space } from 'antd';
import { ScrollableModal } from '@/components/templates/ScrollableModal';
import { useAppNotification } from '@/hooks/useAppNotification';
import { userApi } from '@/api/services/user';
import { MatchProfileAuditAction } from '@/api/types/status';

const { TextArea } = Input;

interface Props {
  open: boolean;
  user: { id: string; nickname?: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const MatchProfileAuditModal: React.FC<Props> = ({ open, user, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const { success, error } = useAppNotification();

  const handleSubmit = async () => {
    if (!user) return;
    try {
      const values = await form.validateFields();
      await userApi.auditMatchProfile(user.id, {
        action: values.action,
        reason: values.reason || '',
      });
      success(values.action === MatchProfileAuditAction.APPROVE ? '档案审核已通过' : '档案已拒绝');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      error(err?.response?.data?.message || '审核操作失败');
    }
  };

  return (
    <ScrollableModal
      title={`审核脱单档案${user?.nickname ? ` — ${user.nickname}` : ''}`}
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleSubmit}
      okText="确认提交"
    >
      <Form form={form} layout="vertical">
        <Form.Item name="action" label="审核结果" rules={[{ required: true, message: '请选择审核结果' }]}>
          <Radio.Group>
            <Space direction="vertical">
              <Radio value={MatchProfileAuditAction.APPROVE}>
                <span style={{ color: '#52c41a', fontWeight: 500 }}>通过</span> — 档案进入推荐池
              </Radio>
              <Radio value={MatchProfileAuditAction.REJECT}>
                <span style={{ color: '#ff4d4f', fontWeight: 500 }}>拒绝</span> — 用户可修改后重新提交
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>
        <Form.Item name="reason" label="审核意见">
          <TextArea rows={3} placeholder="审核意见将展示给用户，拒绝时建议填写具体原因" />
        </Form.Item>
      </Form>
    </ScrollableModal>
  );
};

export default MatchProfileAuditModal;
```

- [ ] **Step 2: 在 UserList.tsx 中接入**

```typescript
import MatchProfileAuditModal from './MatchProfileAuditModal';

// 新增状态
const [auditProfileOpen, setAuditProfileOpen] = useState(false);
const [auditProfileUser, setAuditProfileUser] = useState<any>(null);

// 实现 handleAuditProfile
const handleAuditProfile = (record: any) => {
  setAuditProfileUser({ id: record.user_id || record.id, nickname: record.nickname });
  setAuditProfileOpen(true);
};
```

JSX 末尾：
```tsx
<MatchProfileAuditModal
  open={auditProfileOpen}
  user={auditProfileUser}
  onClose={() => setAuditProfileOpen(false)}
  onSuccess={refresh}
/>
```

- [ ] **Step 3: 清理 UserList.tsx 中不再使用的代码**

移除：
- `revokeModalVisible` / `revokeModalRecord` / `statusReason` 状态（旧 v6 官方用户取消弹窗）
- `handleStatusChange` / `handleOfficialChange` / `handleRecommendChange` / `handleRevokeConfirm` 函数
- `CoopRoleTag` 组件
- 旧的 `revokeModalVisible` Modal
- 不再使用的 import（`request`、`DetailModal`、`UserDetailSections`、`getAge`、`parseAsLocal`、`isExpired`、GENDER_MAP、STATUS_OPTIONS、statusSwitchColumn、userColumn 等）

- [ ] **Step 4: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/pages/community/
git commit -m "feat: 新建 MatchProfileAuditModal + 清理旧 v6 用户管理弹窗代码"
```

---

### Task 13: 第 4 批 — 新建 wxa.ts service

**Files:**
- Create: `src/api/services/wxa.ts`

**Interfaces:**
- Consumes: `CreateWxaAppRequest`, `UpdateWxaAppRequest`, `UpdateWxaAppStatusRequest` from `types/wxa`

- [ ] **Step 1: 创建 `src/api/services/wxa.ts`**

```typescript
import request from '..';
import type { CreateWxaAppRequest, UpdateWxaAppRequest } from '../types/wxa';

/** 微信小程序配置查询参数 */
export interface WxaAppListParams {
  page?: number;
  size?: number;
  keyword?: string;
}

export const wxaApi = {
  /** 分页列表 — GET /admin/v1/wxa/app */
  getApps: (params?: WxaAppListParams) => {
    return request.get('/admin/v1/wxa/app', { params });
  },

  /** 详情 — GET /admin/v1/wxa/app/:id */
  getAppDetail: (id: number) => {
    return request.get(`/admin/v1/wxa/app/${id}`);
  },

  /** 创建 — POST /admin/v1/wxa/app */
  createApp: (data: CreateWxaAppRequest) => {
    return request.post('/admin/v1/wxa/app', data);
  },

  /** 更新 — PUT /admin/v1/wxa/app/:id */
  updateApp: (id: number, data: UpdateWxaAppRequest) => {
    return request.put(`/admin/v1/wxa/app/${id}`, data);
  },

  /** 软删除 — DELETE /admin/v1/wxa/app/:id */
  deleteApp: (id: number) => {
    return request.delete(`/admin/v1/wxa/app/${id}`);
  },

  /** 强制过期 AccessToken — POST /admin/v1/wxa/app/:id/expire-token */
  expireToken: (id: number) => {
    return request.post(`/admin/v1/wxa/app/${id}/expire-token`);
  },

  /** 状态切换 — PATCH /admin/v1/wxa/app/:id/status */
  updateStatus: (id: number, status: number) => {
    return request.patch(`/admin/v1/wxa/app/${id}/status`, { status });
  },
};
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/api/services/wxa.ts
git commit -m "feat: 新建 wxa service — 小程序配置管理 CRUD + Token 管理"
```

---

### Task 14: 第 4 批 — 新建 WxaAppManagement 页面

**Files:**
- Create: `src/pages/system/WxaAppManagement.tsx`

**Interfaces:**
- Consumes: `wxaApi` from `services/wxa.ts`

- [ ] **Step 1: 创建 `src/pages/system/WxaAppManagement.tsx`**

```typescript
import { useState, useCallback } from 'react';
import { Tag, Space } from 'antd';
import { useListPage } from '@/hooks/useListPage';
import { useAppNotification } from '@/hooks/useAppNotification';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { AddEditModal } from '@/components/templates/AddEditModal';
import { StatusSwitch } from '@/components/templates/StatusSwitch';
import { wxaApi } from '@/api/services/wxa';
import type { AdminUserStatus } from '@/api/types/status';
import { formatDateTime, formatDate } from '@/utils/format';
import { Modal } from 'antd';

const filters: FilterConfig[] = [
  { name: 'keyword', placeholder: '应用名称搜索', type: 'input' },
];

const WxaAppManagement: React.FC = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { success, error: showError } = useAppNotification();

  const fetchApps = useCallback(async (params: any) => {
    return wxaApi.getApps({
      page: params.page,
      size: params.page_size || params.size,
      keyword: params.keyword,
    });
  }, []);

  const formatResponse = useCallback((res: any) => ({
    list: res?.list || [],
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<any>({
    fetchFn: fetchApps,
    formatResponse,
  });

  const handleStatusToggle = async (record: any, checked: boolean) => {
    try {
      await wxaApi.updateStatus(record.id, checked ? 0 : 1);
      success(checked ? '小程序配置已启用' : '小程序配置已停用');
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '操作失败');
    }
  };

  const handleCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setModalOpen(true);
  };

  const handleDelete = (record: any) => {
    confirmDelete({
      title: '确认删除',
      content: `确定要删除小程序配置 "${record.app_name}" 吗？删除后不可恢复。`,
      onOk: async () => {
        await wxaApi.deleteApp(record.id);
        success('已删除');
        refresh();
      },
    });
  };

  const handleExpireToken = (record: any) => {
    Modal.confirm({
      title: '确认过期 Token',
      content: `确定要立即使 "${record.app_name}" 的 AccessToken 过期吗？过期后需要重新获取。`,
      okText: '确认过期',
      okType: 'danger',
      onOk: async () => {
        await wxaApi.expireToken(record.id);
        success('AccessToken 已过期');
        refresh();
      },
    });
  };

  const columns = [
    {
      title: 'AppID',
      dataIndex: 'app_id',
      key: 'app_id',
      render: (v: string) => <span style={{ wordBreak: 'break-word' }}>{v || '-'}</span>,
    },
    {
      title: '应用名称',
      dataIndex: 'app_name',
      key: 'app_name',
      render: (v: string) => <span style={{ wordBreak: 'break-word' }}>{v || '-'}</span>,
    },
    {
      title: '类型',
      dataIndex: 'app_type',
      key: 'app_type',
      width: 90,
      render: (v: string) => (
        <Tag color={v === 'miniapp' ? 'blue' : 'green'}>{v === 'miniapp' ? '小程序' : v === 'official_account' ? '公众号' : v || '-'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_: any, record: any) => (
        <StatusSwitch checked={record.status === 0} onChange={(checked: boolean) => handleStatusToggle(record, checked)} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (t: string) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>{formatDate(t)}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{t ? formatDateTime(t).split(' ')[1] : '-'}</div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: any) => (
        <Space className="action-buttons">
          <a onClick={() => handleEdit(record)}>编辑</a>
          <a onClick={() => handleExpireToken(record)} style={{ color: '#faad14' }}>过期Token</a>
          <a onClick={() => handleDelete(record)} style={{ color: '#ff4d4f' }}>删除</a>
        </Space>
      ),
    },
  ];

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  const handleReset = () => {
    setValues({});
    search({});
  };

  return (
    <>
      <StandardPage
        title="小程序配置管理"
        description="管理微信小程序和公众号的应用配置，包括 AppID、密钥、AccessToken 管理。"
        showRefreshButton
        onRefresh={refresh}
        showAddButton
        addButtonText="新增配置"
        onAdd={handleCreate}
        searchArea={
          <SearchPanel
            filters={filters}
            values={values}
            onChange={handleChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        }
        table={
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={pagination}
            onPageChange={onPageChange}
            scroll={{ x: 800 }}
          />
        }
      />

      <AddEditModal
        title={editingId ? '编辑小程序配置' : '新增小程序配置'}
        open={modalOpen}
        editingId={editingId}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        onSuccess={() => { refresh(); setModalOpen(false); setEditingId(null); }}
        fetchDetail={(id: number) => wxaApi.getAppDetail(id) as any}
        create={(data: any) => wxaApi.createApp(data) as any}
        update={(id: number, data: any) => wxaApi.updateApp(id, data) as any}
        fields={[
          { name: 'app_id', label: 'AppID', required: true, disabled: !!editingId, placeholder: '微信公众平台分配的应用 ID' },
          { name: 'app_name', label: '应用名称', required: true, placeholder: '应用的显示名称' },
          { name: 'app_secret', label: 'AppSecret', required: true, type: 'password', placeholder: editingId ? '留空则不修改' : '微信公众平台分配的应用密钥' },
          { name: 'app_type', label: '应用类型', required: true, type: 'select', options: [{ label: '小程序', value: 'miniapp' }, { label: '公众号', value: 'official_account' }] },
        ]}
      />
    </>
  );
};

export default WxaAppManagement;
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/pages/system/WxaAppManagement.tsx
git commit -m "feat: 新建小程序配置管理页面（列表+CRUD+Token过期）"
```

---

### Task 15: 第 4 批 — 注册路由 + 菜单

**Files:**
- Modify: `src/router/index.tsx:`（新增路由 import 和配置）
- Modify: `src/components/layout/menuConfig.tsx`（新增菜单项）

- [ ] **Step 1: 在 router/index.tsx 中注册路由**

在 import 区域添加：
```typescript
import WxaAppManagement from '@/pages/system/WxaAppManagement';
```

在 `system` children 列表中添加（放在 `admin-logs` 之后）：
```typescript
{ path: 'wxa-apps', element: <WxaAppManagement /> },
```

- [ ] **Step 2: 在 menuConfig.tsx 中添加菜单项**

在 `system` 数组的 `admin-group` 的 children 末尾添加：
```typescript
{ key: '/system/wxa-apps', icon: <TagOutlined />, label: '小程序配置' },
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/router/index.tsx src/components/layout/menuConfig.tsx
git commit -m "feat: 注册小程序配置页面路由 + 菜单（系统管理→管理员管理→小程序配置）"
```

---

### Task 16: 第 5 批 — 扩展 upload.ts 非分片上传

**Files:**
- Modify: `src/api/services/upload.ts`

**Interfaces:**
- Consumes: `UploadFileResult` from `types/upload`

- [ ] **Step 1: 在 upload.ts 中添加音频/视频/压缩包上传**

在现有的 `uploadImage` 函数后添加：

```typescript
import type { UploadFileResult } from '../types/upload';

// 抽取通用上传函数（避免重复）
const uploadFile = (
  file: File,
  endpoint: string,
  onProgress?: (percent: number) => void,
): Promise<UploadFileResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();
  const baseUrl = 'https://cheng-test.vbegin.com.cn';

  return axios.post(`${baseUrl}${endpoint}`, formData, {
    headers: { Authorization: `Bearer ${token}` },
    onUploadProgress: (progressEvent: any) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  }).then((res) => {
    const data = res.data;
    if (data.code === 0) return data.data as UploadFileResult;
    throw new Error(data.message || '上传失败');
  });
};

export const uploadApi = {
  /** 上传图片 */
  uploadImage: (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ url?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getAccessToken();
    return axios.post('https://cheng-test.vbegin.com.cn/admin/v1/upload/image', formData, {
      headers: { Authorization: `Bearer ${token}` },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }).then((res) => {
      const data = res.data;
      if (data.code === 0) return data.data;
      throw new Error(data.message || '上传失败');
    });
  },

  /** 上传音频 */
  uploadAudio: (file: File, onProgress?: (percent: number) => void) =>
    uploadFile(file, '/admin/v1/upload/audio', onProgress),

  /** 上传视频 */
  uploadVideo: (file: File, onProgress?: (percent: number) => void) =>
    uploadFile(file, '/admin/v1/upload/video', onProgress),

  /** 上传压缩包 */
  uploadZipfile: (file: File, onProgress?: (percent: number) => void) =>
    uploadFile(file, '/admin/v1/upload/zipfile', onProgress),
};
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/api/services/upload.ts
git commit -m "feat: upload service 扩展音频/视频/压缩包上传"
```

---

### Task 17: 第 5 批 — 新建 uploadUtils.ts 分片上传工具

**Files:**
- Create: `src/utils/uploadUtils.ts`

- [ ] **Step 1: 创建 `src/utils/uploadUtils.ts`**

```typescript
import axios from 'axios';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const BASE_URL = 'https://cheng-test.vbegin.com.cn';

interface ChunkUploadResult {
  file_id: string;
  file_url: string;
}

/**
 * 分片上传（支持音频、视频、压缩包）
 * @param file 文件对象
 * @param endpoint 分片上传端点，如 /admin/v1/upload/video/chunk
 * @param token Bearer token
 * @param onProgress 进度回调 (0-100)
 */
export async function uploadFileChunked(
  file: File,
  endpoint: string,
  token: string,
  onProgress?: (percent: number) => void,
): Promise<ChunkUploadResult> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let chunkTicket = '';

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunk, file.name);
    if (chunkTicket) {
      formData.append('chunk_ticket', chunkTicket);
    }
    formData.append('chunk_index', String(i));
    formData.append('total_chunks', String(totalChunks));

    const res = await axios.post(`${BASE_URL}${endpoint}`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = res.data;
    if (data.code !== 0) {
      throw new Error(data.message || '分片上传失败');
    }

    // Phase 1: 201 返回 chunk_ticket
    if (res.status === 201 && data.data?.chunk_ticket) {
      chunkTicket = data.data.chunk_ticket;
    }

    // Phase 2/3: 202/200
    if ((res.status === 200 || res.status === 202) && data.data) {
      if (data.data.chunk_ticket) chunkTicket = data.data.chunk_ticket;
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
    }

    // 最后一片 → 200 返回完整结果
    if (i === totalChunks - 1 && data.code === 0 && data.data?.file_url) {
      return { file_id: data.data.file_id, file_url: data.data.file_url };
    }
  }

  throw new Error('分片上传未完成');
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: 提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add src/utils/uploadUtils.ts
git commit -m "feat: 新建 uploadUtils — 分片上传工具（3阶段状态机）"
```

---

### Task 18: 改造后验证 + 最终提交

- [ ] **Step 1: 全量 TypeScript 检查**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng && npx tsc --noEmit 2>&1
```

预期：0 错误。如有个别错误，逐个修复。

- [ ] **Step 2: 检查无 console.log 残留**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
grep -rn 'console\.log' src/api/ src/pages/community/ src/pages/system/WxaAppManagement.tsx 2>/dev/null || echo "无 console.log"
```

- [ ] **Step 3: 检查无硬编码状态值（如 status===1）**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
grep -rn 'status\s*===\s*[01]' src/pages/community/UserList.tsx src/pages/system/WxaAppManagement.tsx 2>/dev/null || echo "无硬编码状态值"
```

- [ ] **Step 4: 检查使用 useAppNotification 而非 message import**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
grep -rn "import.*message.*from 'antd'" src/pages/community/ src/pages/system/WxaAppManagement.tsx 2>/dev/null || echo "无违规 message import"
```

- [ ] **Step 5: 更新 PROGRESS.md**

在 `docs/PROGRESS.md` 的"已完成接口迁移"表中添加：
```
| C端用户管理 | `/admin/v1/bizops/user` | 列表/详情/资料修改/档案审核 |
| 小程序配置 | `/admin/v1/wxa/app` | CRUD + Token 过期 + 状态切换 |
| 文件上传 | `/admin/v1/upload/*` | 新增音频/视频/压缩包 + 分片上传 |
```

更新"最后更新"日期为 `2026-07-27`。

- [ ] **Step 6: 更新 SITEMAP.md**

在站点地图的系统管理→管理员管理中添加：
```
│   └── 小程序配置 #/system/wxa-apps
```

更新 C 端用户的路由接口标注。

更新"最后更新"日期为 `2026-07-27`。

- [ ] **Step 7: 最终提交**

```bash
cd D:/GitHub/admin-project/packages/admin-cheng
git add -A
git commit -m "chore: 改造验证完成，更新 PROGRESS + SITEMAP 文档"
```
