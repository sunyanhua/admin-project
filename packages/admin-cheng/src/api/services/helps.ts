import request from '..';

// 帮助文章实体
export interface Help {
  id: number;
  title: string;
  content?: string;
  category_id: number;
  sort_order?: number;
  status: number;
  is_visible?: boolean;
  created_at?: string;
  updated_at?: string;
}

// 帮助分类实体
export interface HelpCategory {
  id: number;
  name: string;
  sort_order?: number;
  status: number;
}

// 创建帮助文章参数
export interface CreateHelpRequest {
  title: string;
  category_id: number;
  content?: string;
  status?: number;
  is_visible?: boolean;
  sort_order?: number;
}

// 更新帮助文章参数（全可选）
export type UpdateHelpRequest = Partial<CreateHelpRequest>;

export const helpsApi = {
  // 分页查询 — GET /admin/v1/cms/helps
  getHelps: (params?: { page?: number; page_size?: number; keyword?: string; status?: number; category_id?: number }) => {
    return request.get('/admin/v1/cms/helps', { params });
  },

  // 详情 — GET /admin/v1/cms/helps/{id}
  getHelpDetail: (id: number) => {
    return request.get(`/admin/v1/cms/helps/${id}`);
  },

  // 创建 — POST /admin/v1/cms/helps
  createHelp: (data: CreateHelpRequest) => {
    return request.post('/admin/v1/cms/helps', data);
  },

  // 编辑 — PUT /admin/v1/cms/helps/{id}
  updateHelp: (id: number, data: UpdateHelpRequest) => {
    return request.put(`/admin/v1/cms/helps/${id}`, data);
  },

  // 删除 — DELETE /admin/v1/cms/helps/{id}
  deleteHelp: (id: number) => {
    return request.delete(`/admin/v1/cms/helps/${id}`);
  },

  // ====== 分类 ======

  // 分页查询分类 — GET /admin/v1/cms/help-categories
  getCategories: (params?: { page?: number; page_size?: number; keyword?: string }) => {
    return request.get('/admin/v1/cms/help-categories', { params });
  },
};
