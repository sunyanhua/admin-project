import request from '..';

export interface Category {
  id: number;
  key: string;
  parent: number;
  title: string;
  cover?: string;
  brief?: string;
  intro?: string;
  tags?: number;
  status?: number;
  visible?: boolean;
}

export interface CategoryListParams {
  start?: number;
  length?: number;
  word?: string;
  parent?: number;
}

export interface CategoryListResponse {
  start: number;
  length: number;
  word: string | null;
  count: number;
  data: Category[];
}

export const categoryApi = {
  // 获取分类列表
  getCategories: async (params?: CategoryListParams): Promise<CategoryListResponse> => {
    const data = await request.get('/admin/v6/category', { params });
    return data as unknown as CategoryListResponse;
  },

  // 获取分类详情
  getCategoryDetail: async (id: number): Promise<Category> => {
    const data = await request.get(`/admin/v6/category/${id}`);
    return data as unknown as Category;
  },

  // 创建分类
  createCategory: async (data: Partial<Category>): Promise<Category> => {
    const response = await request.post('/admin/v6/category', data);
    return response as unknown as Category;
  },

  // 更新分类
  updateCategory: async (id: number, data: Partial<Category>): Promise<Category> => {
    const response = await request.post(`/admin/v6/category/${id}`, data);
    return response as unknown as Category;
  },

  // 删除分类
  deleteCategory: async (id: number): Promise<string> => {
    const response = await request.post('/admin/v6/category/delete', { id });
    return response as unknown as string;
  },

  // 更新状态
  updateStatus: async (id: number, status: number): Promise<void> => {
    await request.post('/admin/v6/category/status', { id, status });
  },

  // 更新可见性
  updateVisible: async (id: number, visible: boolean): Promise<void> => {
    await request.post('/admin/v6/category/visible', { id, visible });
  },

  // 更新排序
  updateOrder: async (id: number, orderon: number): Promise<void> => {
    await request.post('/admin/v6/category/orderon', { id, orderon });
  },
};
