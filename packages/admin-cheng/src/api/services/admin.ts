import request from '..';
import type { AdminUserStatus } from '../types/status';
import type {
  AdminUserListItem,
  AdminUserDetailResponse,
  AdminRoleItem,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  RoleListItem,
  RoleDetailResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  RoleAdminListItem,
} from '../types/admin';
import type { PermissionNode } from '../types/permission';
import type { PagedResponse } from '../types/common';

/**
 * 管理员相关API — 严格按照 hsh-swagger 接口文档
 */
export const adminApi = {
  // 管理员列表 — GET /admin/v1/user
  getAdmins: async (params?: { page?: number; size?: number; status?: number; keyword?: string; zone_id?: string }): Promise<AdminUserListItem[]> => {
    return request.get('/admin/v1/user', { params });
  },

  // 管理员详情 — GET /admin/v1/user/:id
  getAdminDetail: async (id: number): Promise<AdminUserDetailResponse> => {
    return request.get(`/admin/v1/user/${id}`);
  },

  // 创建管理员 — POST /admin/v1/user
  createAdmin: async (data: CreateAdminUserRequest) => {
    return request.post('/admin/v1/user', data);
  },

  // 编辑管理员 — PUT /admin/v1/user/:id
  updateAdmin: async (id: number, data: UpdateAdminUserRequest) => {
    return request.put(`/admin/v1/user/${id}`, data);
  },

  // 删除管理员 — DELETE /admin/v1/user/:id
  deleteAdmin: async (id: number) => {
    return request.delete(`/admin/v1/user/${id}`);
  },

  // 角色列表 — GET /admin/v1/role
  getRoles: async (params?: { page?: number; size?: number; keyword?: string; status?: number }): Promise<PagedResponse<RoleListItem[]>> => {
    return request.get('/admin/v1/role', { params });
  },

  // 角色详情 — GET /admin/v1/role/:id
  getRoleDetail: async (id: string | number): Promise<RoleDetailResponse> => {
    return request.get(`/admin/v1/role/${id}`);
  },

  // 创建角色 — POST /admin/v1/role ({ name, permissions, description? })
  createRole: async (data: CreateRoleRequest) => {
    return request.post('/admin/v1/role', data);
  },

  // 更新角色 — PUT /admin/v1/role/:id ({ name?, description?, permissions?, status? })
  updateRole: async (id: string | number, data: UpdateRoleRequest) => {
    return request.put(`/admin/v1/role/${id}`, data);
  },

  // 删除角色 — DELETE /admin/v1/role/:id
  deleteRole: async (id: string | number) => {
    return request.delete(`/admin/v1/role/${id}`);
  },

  // 切换角色状态 — PATCH /admin/v1/role/:id/status ({ status: 0|1 })
  updateRoleStatus: async (id: string | number, status: number) => {
    return request.patch(`/admin/v1/role/${id}/status`, { status });
  },

  // 角色关联管理员列表 — GET /admin/v1/role/:id/users
  getRoleAdmins: async (id: string | number, params?: { page?: number; size?: number }): Promise<PagedResponse<RoleAdminListItem[]>> => {
    return request.get(`/admin/v1/role/${id}/users`, { params });
  },

  // 权限树 — GET /admin/v1/permission/tree
  getPermissions: async (): Promise<PermissionNode[]> => {
    return request.get('/admin/v1/permission/tree');
  },

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
};
