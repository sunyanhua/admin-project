import request from '..';

// 管理员列表查询参数
export interface AdminListParams {
  start?: number;
  length?: number;
  word?: string;
  role?: number;
}

// 管理员创建/更新参数
export interface AdminSaveData {
  name: string;
  pass?: string;
  role: number;
  rule: number;
}

// 管理员用户
export interface AdminUser {
  id: number;
  name: string;
  role: number;
  rule: number;
  login?: string;
  logip?: string;
}

// 管理员列表响应
interface AdminListResponse {
  start: number;
  length: number;
  word: string | null;
  count: number;
  data: AdminUser[];
}

// 日志条目
export interface LogItem {
  id: number;
  user: number;
  name: string;
  data: string;
  ip: string;
  tick: string;
}

// 日志列表响应
interface LogListResponse {
  start: number;
  length: number;
  word: string | null;
  total: number;
  list: LogItem[];
}

/**
 * 管理员相关API - 严格按照 /admin/user 接口文档
 * 所有接口都需要登录Cookie才能访问
 */
export const adminApi = {
  // 获取管理员列表
  // GET /admin/user?start={start}&length={length}&word={word}
  getAdmins: async (params?: AdminListParams): Promise<AdminListResponse> => {
    const data = await request.get('/admin/user', { params });
    return data as unknown as AdminListResponse;
  },

  // 获取管理员详情
  // GET /admin/user/{id}
  getAdminDetail: async (id: number): Promise<AdminUser> => {
    const data = await request.get(`/admin/user/${id}`);
    return data as unknown as AdminUser;
  },

  // 创建管理员
  // POST /admin/user
  // Body: {name:string, pass:string, role:byte, rule:byte}
  createAdmin: async (data: AdminSaveData): Promise<AdminUser> => {
    const response = await request.post('/admin/user', data);
    return response as unknown as AdminUser;
  },

  // 更新管理员
  // POST /admin/user/{id}
  // Body: {name:string, pass:string, role:byte, rule:byte}
  updateAdmin: async (id: number, data: Partial<AdminSaveData>): Promise<AdminUser> => {
    const response = await request.post(`/admin/user/${id}`, data);
    return response as unknown as AdminUser;
  },

  // 删除管理员
  // POST /admin/user/delete
  // Body: {id:int}
  deleteAdmin: async (id: number): Promise<string> => {
    const response = await request.post('/admin/user/delete', { id });
    return response as unknown as string;
  },

  // 获取操作日志列表
  // GET /admin/logs?start={start}&length={length}&word={word}
  getLogs: async (params?: AdminListParams): Promise<LogListResponse> => {
    const data = await request.get('/admin/logs', { params });
    return data as unknown as LogListResponse;
  },
};
