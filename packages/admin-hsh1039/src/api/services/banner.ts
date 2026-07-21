import request from '..';
import { BannerStatus } from '@shared/constants';

// Banner 实体（v1 CMS）
export interface Banner {
  id: number;
  title: string;
  image_url: string;
  link_url?: string;
  position: string;
  sort_order?: number;
  status: number;
  start_time?: string;
  end_time?: string;
  created_at?: string;
  updated_at?: string;
}

// 创建 Banner 请求参数
export interface CreateBannerRequest {
  title: string;
  image_url: string;
  link_url?: string;
  position?: string;
  sort_order?: number;
  status?: number;
  start_time?: string;
  end_time?: string;
}

// 更新 Banner 请求参数（全可选）
export type UpdateBannerRequest = Partial<CreateBannerRequest>;

// Banner 分页查询参数
export interface BannerListParams {
  page?: number;
  page_size?: number;
  status?: BannerStatus;
  position?: string;
  keyword?: string;
}

export const bannerApi = {
  // 分页查询 — GET /admin/v1/cms/banners
  getBanners: (params?: BannerListParams) => {
    return request.get('/admin/v1/cms/banners', { params });
  },

  // 详情 — GET /admin/v1/cms/banners/{id}
  getBannerDetail: (id: number) => {
    return request.get(`/admin/v1/cms/banners/${id}`);
  },

  // 创建 — POST /admin/v1/cms/banners
  createBanner: (data: CreateBannerRequest) => {
    return request.post('/admin/v1/cms/banners', data);
  },

  // 编辑 — PUT /admin/v1/cms/banners/{id}
  updateBanner: (id: number, data: UpdateBannerRequest) => {
    return request.put(`/admin/v1/cms/banners/${id}`, data);
  },

  // 删除（硬删除） — DELETE /admin/v1/cms/banners/{id}
  deleteBanner: (id: number) => {
    return request.delete(`/admin/v1/cms/banners/${id}`);
  },
};
