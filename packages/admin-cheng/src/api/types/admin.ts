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
