import request from '..';

// 来源实体（v1）
export interface Source {
  id: number;
  name: string;
  start_time?: string;
  end_time?: string;
  status: number; // 0=启用, 1=禁用
  created_at?: string;
  updated_at?: string;
}

// 来源管理 API（v1）
export const sourceApi = {
  // 分页查询来源列表 — GET /admin/v1/bizops/source
  getSources: (params?: { page?: number; size?: number; keyword?: string; status?: number }) => {
    return request.get('/admin/v1/bizops/source', { params });
  },

  // 查询来源详情 — GET /admin/v1/bizops/source/{id}
  getSourceDetail: (id: number) => {
    return request.get(`/admin/v1/bizops/source/${id}`);
  },

  // 创建来源 — POST /admin/v1/bizops/source
  createSource: (data: { name: string; start_time?: string; end_time?: string }) => {
    return request.post('/admin/v1/bizops/source', data);
  },

  // 编辑来源 — PUT /admin/v1/bizops/source/{id}
  updateSource: (id: number, data: { name?: string; start_time?: string; end_time?: string; status?: number }) => {
    return request.put(`/admin/v1/bizops/source/${id}`, data);
  },

  // 删除来源 — DELETE /admin/v1/bizops/source/{id}
  deleteSource: (id: number) => {
    return request.delete(`/admin/v1/bizops/source/${id}`);
  },

  // 启用/停用 — PATCH /admin/v1/bizops/source/{id}/status
  toggleSourceStatus: (id: number, status: number) => {
    return request.patch(`/admin/v1/bizops/source/${id}/status`, { status });
  },

  // 注册用户按天汇总 — GET /admin/v1/bizops/source/register-stats
  getRegisterStats: (params: { start_date: string; end_date: string }) => {
    return request.get('/admin/v1/bizops/source/register-stats', { params });
  },

  // 上报日志按天汇总 — GET /admin/v1/bizops/source/report-stats
  getReportStats: (params: { start_date: string; end_date: string }) => {
    return request.get('/admin/v1/bizops/source/report-stats', { params });
  },
};
