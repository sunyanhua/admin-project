import request from '..';

export interface LogisticsCompany {
  id: number;
  code: string;
  name: string;
  status: number; // 0=启用, 1=禁用
  sort_order?: number;
  website?: string;
  created_at?: string;
  updated_at?: string;
}

export const logisticsApi = {
  // 物流公司列表 — GET /admin/v1/mall/logistics-companies
  getCompanies: () => {
    return request.get('/admin/v1/mall/logistics-companies');
  },

  // 创建物流公司 — POST /admin/v1/mall/logistics-companies
  createCompany: (data: { code: string; name: string; sort_order?: number; website?: string }) => {
    return request.post('/admin/v1/mall/logistics-companies', data);
  },

  // 编辑物流公司 — PUT /admin/v1/mall/logistics-companies/:id
  updateCompany: (id: number, data: { name?: string; sort_order?: number; status?: number; website?: string }) => {
    return request.put(`/admin/v1/mall/logistics-companies/${id}`, data);
  },

  // 删除物流公司 — DELETE /admin/v1/mall/logistics-companies/:id
  deleteCompany: (id: number) => {
    return request.delete(`/admin/v1/mall/logistics-companies/${id}`);
  },
};
