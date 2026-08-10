import request from '..';

// ========================
// 帮助分类（Help Category）
// ========================

export interface HelpCategory {
  id: string;
  name: string;
  parent_id?: string;
  root_id?: string;
  level: number;
  sort_order: number;
  status: number; // 0=启用 1=停用
  created_at?: string;
  updated_at?: string;
}

export interface CreateHelpCategoryRequest {
  name: string;
  parent_id?: string;
  sort_order?: number;
}

export interface UpdateHelpCategoryRequest {
  name?: string;
  sort_order?: number;
}

// ========================
// 帮助条目（Help Entry）
// ========================

export interface HelpEntry {
  id: string;
  question: string;
  answer: string;
  category_id: string;
  category_parent_id?: string;
  category_root_id?: string;
  sort_order: number;
  status: number; // 0=启用 1=停用
  created_at?: string;
  updated_at?: string;
}

export interface CreateHelpEntryRequest {
  question: string;
  answer: string;
  category_id?: string;
  sort_order?: number;
}

export interface UpdateHelpEntryRequest {
  question?: string;
  answer?: string;
  category_id?: string;
  sort_order?: number;
}

export const helpCategoryApi = {
  getList: (params?: { status?: number; keyword?: string; parent_id?: string; level?: number; page?: number; size?: number }) => {
    return request.get('/admin/v1/bizops/cms/help-categories', { params });
  },

  getDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/cms/help-categories/${id}`);
  },

  create: (data: CreateHelpCategoryRequest) => {
    return request.post('/admin/v1/bizops/cms/help-categories', data);
  },

  update: (id: string, data: UpdateHelpCategoryRequest) => {
    return request.patch(`/admin/v1/bizops/cms/help-categories/${id}`, data);
  },

  delete: (id: string) => {
    return request.delete(`/admin/v1/bizops/cms/help-categories/${id}`);
  },

  toggleStatus: (id: string, status: number) => {
    return request.patch(`/admin/v1/bizops/cms/help-categories/${id}/status`, { status });
  },
};

export const helpEntryApi = {
  getList: (params?: { status?: number; keyword?: string; category_id?: string; category_root_id?: string; page?: number; size?: number }) => {
    return request.get('/admin/v1/bizops/cms/helps', { params });
  },

  getDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/cms/helps/${id}`);
  },

  create: (data: CreateHelpEntryRequest) => {
    return request.post('/admin/v1/bizops/cms/helps', data);
  },

  update: (id: string, data: UpdateHelpEntryRequest) => {
    return request.patch(`/admin/v1/bizops/cms/helps/${id}`, data);
  },

  delete: (id: string) => {
    return request.delete(`/admin/v1/bizops/cms/helps/${id}`);
  },

  toggleStatus: (id: string, status: number) => {
    return request.patch(`/admin/v1/bizops/cms/helps/${id}/status`, { status });
  },
};
