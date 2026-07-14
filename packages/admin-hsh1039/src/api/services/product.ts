import request from '..';

// 商品列表查询参数
export interface ProductListParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  category_id?: number;
  is_listed?: boolean;
  is_visible?: boolean;
  is_virtual?: boolean;
}

// 商品条目
export interface Product {
  id: number;
  title: string;
  sub_title?: string;
  category_id?: number;
  cover_image?: string;
  carousel_images?: string[];
  detail_desc?: string;
  is_virtual?: boolean;
  is_listed?: boolean;
  is_visible?: boolean;
  sort_order?: number;
  keywords?: string;
  brand_id?: number;
  created_at?: string;
  updated_at?: string;
}

// 创建商品参数
export interface CreateProductData {
  title: string;
  sub_title?: string;
  category_id: number;
  cover_image?: string;
  carousel_images?: string[];
  detail_desc?: string;
  is_virtual: boolean;
  is_listed?: boolean;
  is_visible?: boolean;
  sort_order?: number;
  keywords?: string;
  brand_id?: number;
}

// 更新商品参数（全部可选）
export interface UpdateProductData {
  title?: string;
  sub_title?: string;
  category_id?: number;
  cover_image?: string;
  carousel_images?: string[];
  detail_desc?: string;
  is_virtual?: boolean;
  is_listed?: boolean;
  is_visible?: boolean;
  sort_order?: number;
  keywords?: string;
  brand_id?: number;
}

export const productApi = {
  // 分页查询 — GET /admin/v1/mall/products
  getProducts: (params?: ProductListParams) => {
    return request.get('/admin/v1/mall/products', { params });
  },

  // 商品详情 — GET /admin/v1/mall/products/{id}
  getProductDetail: (id: number) => {
    return request.get(`/admin/v1/mall/products/${id}`);
  },

  // 创建 — POST /admin/v1/mall/products
  createProduct: (data: CreateProductData) => {
    return request.post('/admin/v1/mall/products', data);
  },

  // 编辑 — PUT /admin/v1/mall/products/{id}
  updateProduct: (id: number, data: UpdateProductData) => {
    return request.put(`/admin/v1/mall/products/${id}`, data);
  },

  // 删除（软删除） — DELETE /admin/v1/mall/products/{id}
  deleteProduct: (id: number) => {
    return request.delete(`/admin/v1/mall/products/${id}`);
  },

  // 上下架 — PUT /admin/v1/mall/products/{id}/list-status
  updateListStatus: (id: number, is_listed: boolean) => {
    return request.put(`/admin/v1/mall/products/${id}/list-status`, { is_listed });
  },

  // 显隐 — PUT /admin/v1/mall/products/{id}/visibility
  updateVisibility: (id: number, is_visible: boolean) => {
    return request.put(`/admin/v1/mall/products/${id}/visibility`, { is_visible });
  },

  // 排序 — PUT /admin/v1/mall/products/{id}/sort-order
  updateSortOrder: (id: number, sort_order: number) => {
    return request.put(`/admin/v1/mall/products/${id}/sort-order`, { sort_order });
  },

  // ====== Specs ======

  // 查询规格组 — GET /admin/v1/mall/products/{id}/specs
  getSpecs: (productId: number) => {
    return request.get(`/admin/v1/mall/products/${productId}/specs`);
  },

  // 创建规格组 — POST /admin/v1/mall/products/{id}/specs
  // Body: { name, values: [{ value }] }
  createSpec: (productId: number, data: { name: string; values: { value: string }[] }) => {
    return request.post(`/admin/v1/mall/products/${productId}/specs`, data);
  },

  // 编辑规格组 — PUT /admin/v1/mall/products/{id}/specs/{spec_id}
  updateSpec: (productId: number, specId: number, data: { name?: string; values?: { value: string }[] }) => {
    return request.put(`/admin/v1/mall/products/${productId}/specs/${specId}`, data);
  },

  // 删除规格组 — DELETE /admin/v1/mall/products/{id}/specs/{spec_id}
  deleteSpec: (productId: number, specId: number) => {
    return request.delete(`/admin/v1/mall/products/${productId}/specs/${specId}`);
  },

  // ====== SKUs ======

  // 查询SKU列表 — GET /admin/v1/mall/products/{id}/skus
  getSkus: (productId: number) => {
    return request.get(`/admin/v1/mall/products/${productId}/skus`);
  },

  // 批量创建SKU — POST /admin/v1/mall/products/{id}/skus
  // Body: { skus: [{ price, spec_indices, stock?, sku_code? }] }
  batchCreateSkus: (productId: number, skus: {
    price: number; spec_indices: string; stock?: number; sku_code?: string;
  }[]) => {
    return request.post(`/admin/v1/mall/products/${productId}/skus`, { skus });
  },

  // 编辑单个SKU — PUT /admin/v1/mall/products/{id}/skus/{sku_id}
  updateSku: (productId: number, skuId: number, data: {
    price?: number; stock?: number; status?: number; sku_code?: string;
  }) => {
    return request.put(`/admin/v1/mall/products/${productId}/skus/${skuId}`, data);
  },

  // 删除单个SKU — DELETE /admin/v1/mall/products/{id}/skus/{sku_id}
  deleteSku: (productId: number, skuId: number) => {
    return request.delete(`/admin/v1/mall/products/${productId}/skus/${skuId}`);
  },

  // 清空商品全部SKU — DELETE /admin/v1/mall/products/{id}/skus
  clearAllSkus: (productId: number) => {
    return request.delete(`/admin/v1/mall/products/${productId}/skus`);
  },
};
