import type { AdminUserStatus, AdminRoleStatus } from './status';

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

/** 角色（精简）— Swagger AdminRoleItem */
export interface AdminRoleItem {
  id: number;
  name: string;
  description: string;
}

/** ========== 角色管理（Swagger 新增） ========== */

/** 角色列表项 */
export interface RoleListItem {
  id: string;
  name: string;
  description: string;
  tag?: number;
  status: AdminRoleStatus;
  permission_count: number;
  admin_count: number;
  created_at: string;
}

/** 角色详情 */
export interface RoleDetailResponse {
  id: string;
  name: string;
  description: string;
  tag?: number;
  status: AdminRoleStatus;
  permissions: string[];
  admin_count: number;
  created_at: string;
  updated_at: string;
}

/** 创建角色请求 */
export interface CreateRoleRequest {
  name: string;
  permissions: string[];
  description?: string;
  tag?: number;
}

/** 更新角色请求（全部可选） */
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
  status?: AdminRoleStatus;
  tag?: number;
}

/** 角色关联管理员列表项 */
export interface RoleAdminListItem {
  id: string;
  username: string;
  real_name: string;
  status: AdminUserStatus;
  joined_at: string;
}

/** 状态切换请求（角色 & 小程序配置共用） */
export interface UpdateStatusRequest {
  status: number;
}

/** ========== 管理员 CRUD ========== */

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
