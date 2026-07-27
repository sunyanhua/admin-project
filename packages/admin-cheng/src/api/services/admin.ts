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

/**
 * 管理员相关API — 严格按照 hsh-swagger 接口文档
 */
export const adminApi = {
  // 管理员列表 — GET /admin/v1/user
  getAdmins: async (params?: { page?: number; page_size?: number; keyword?: string }): Promise<AdminUserListItem[]> => {
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

  // 角色列表 — GET /admin/v1/roles
  // 服务端返回 {code:0, data: [{...}]}（纯数组，非分页）
  getRoles: async (params?: { page?: number; page_size?: number }): Promise<AdminRoleItem[]> => {
    const res: any = await request.get('/admin/v1/roles', { params });
    // 拦截器解包后可能是数组或 {list: [...]}
    return Array.isArray(res) ? res : (res?.list || []);
  },

  // 创建角色 — POST /admin/v1/roles
  // Body: { code, name, description? }
  createRole: async (data: { code: string; name: string; description?: string }) => {
    return request.post('/admin/v1/roles', data);
  },

  // 编辑角色 — PUT /admin/v1/roles/:id
  // Body: { name?, description? }
  updateRole: async (id: number, data: { name?: string; description?: string }) => {
    return request.put(`/admin/v1/roles/${id}`, data);
  },

  // 删除角色 — DELETE /admin/v1/roles/:id
  deleteRole: async (id: number) => {
    return request.delete(`/admin/v1/roles/${id}`);
  },

  // 权限树 — GET /admin/v1/permission/tree
  getPermissions: async (): Promise<PermissionNode[]> => {
    return request.get('/admin/v1/permission/tree');
  },

  // 查询角色已分配的权限 — GET /admin/v1/roles/:id/permissions
  // 返回 { permission_ids: number[] }
  getRolePermissions: async (roleId: number): Promise<{ permission_ids: number[] }> => {
    return request.get(`/admin/v1/roles/${roleId}/permissions`);
  },

  // 为角色分配权限 — PUT /admin/v1/roles/:id/permissions
  // Body: { permission_ids: number[] }
  setRolePermissions: async (roleId: number, permissionIds: number[]) => {
    return request.put(`/admin/v1/roles/${roleId}/permissions`, {
      permission_ids: permissionIds,
    });
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
