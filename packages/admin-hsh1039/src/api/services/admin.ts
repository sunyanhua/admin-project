import request from '..';

// 管理员（与登录返回的 admin 字段结构一致）
export interface AdminUser {
  id: number;
  username: string;
  real_name?: string;
  roles?: string[];
  phone?: string;
  status?: number;   // 0=屏蔽, 1=正常
  created_at?: string;
  last_login_at?: string;
}

// 管理员列表查询参数
export interface AdminListParams {
  page?: number;
  page_size?: number;
  keyword?: string;
}

// 创建管理员参数
export interface CreateAdminData {
  username: string;
  password: string;
  real_name?: string;
  phone?: string;
  role_ids?: number[];
}

// 更新管理员参数
export interface UpdateAdminData {
  passkeyword?: string;
  real_name?: string;
  phone?: string;
  role_ids?: number[];
  status?: number; // 0=启用, 1=禁用
}

// 角色（GET /admin/v1/roles 返回的列表项）
export interface AdminRole {
  id: number;
  name: string;
  code: string;
  description?: string;
}

// 权限节点（GET /admin/v1/permissions 返回的树节点）
export interface PermissionNode {
  id: number;
  name: string;
  urn: string;
  description?: string;
  parent_id?: number;
  children?: PermissionNode[];
}

/**
 * 管理员相关API — 严格按照 hsh-swagger 接口文档
 */
export const adminApi = {
  // 管理员列表 — GET /admin/v1/users
  getAdmins: async (params?: AdminListParams) => {
    return request.get('/admin/v1/users', { params });
  },

  // 管理员详情 — GET /admin/v1/users/:id
  getAdminDetail: async (id: number) => {
    return request.get(`/admin/v1/users/${id}`);
  },

  // 创建管理员 — POST /admin/v1/users
  // Body: { username, password, real_name?, phone?, role_ids? }
  createAdmin: async (data: CreateAdminData) => {
    return request.post('/admin/v1/users', data);
  },

  // 编辑管理员 — PUT /admin/v1/users/:id
  // Body: { password?, real_name?, phone?, role_ids?, status? }
  updateAdmin: async (id: number, data: UpdateAdminData) => {
    return request.put(`/admin/v1/users/${id}`, data);
  },

  // 删除管理员 — DELETE /admin/v1/users/:id
  deleteAdmin: async (id: number) => {
    return request.delete(`/admin/v1/users/${id}`);
  },

  // 角色列表 — GET /admin/v1/roles
  // 服务端返回 {code:0, data: [{...}]}（纯数组，非分页）
  getRoles: async (params?: { page?: number; page_size?: number }): Promise<AdminRole[]> => {
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

  // 权限树 — GET /admin/v1/permissions
  getPermissions: async (): Promise<PermissionNode[]> => {
    return request.get('/admin/v1/permissions');
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

  // 审计日志列表（管理日志） — GET /admin/v1/logs/audit
  getLogs: async (params?: { page?: number; page_size?: number; word?: string }) => {
    return request.get('/admin/v1/logs/audit', { params });
  },
};
