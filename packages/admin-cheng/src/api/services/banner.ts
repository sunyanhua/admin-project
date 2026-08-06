import request from '..';
import { BannerStatus, BannerSlotStatus, BannerLinkType } from '@shared/constants';

// ========================
// 广告展示位（Banner Slot）
// ========================

export interface BannerSlot {
  id: string;
  code: string;
  name: string;
  description: string;
  sort_order: number;
  status: number; // 0=启用 1=停用
  created_at?: string;
  updated_at?: string;
}

export interface CreateBannerSlotRequest {
  code: string;
  name: string;
  description?: string;
  sort_order?: number;
}

export interface UpdateBannerSlotRequest {
  name?: string;
  description?: string;
  sort_order?: number;
}

export interface BannerSlotStatusRequest {
  status: BannerSlotStatus;
}

export const bannerSlotApi = {
  /** 分页查询展示位列表 */
  getSlots: (params?: { status?: number; page?: number; size?: number }) => {
    return request.get('/admin/v1/bizops/cms/banner-slots', { params });
  },

  /** 展示位详情 */
  getSlotDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/cms/banner-slots/${id}`);
  },

  /** 创建展示位 */
  createSlot: (data: CreateBannerSlotRequest) => {
    return request.post('/admin/v1/bizops/cms/banner-slots', data);
  },

  /** 编辑展示位（PATCH 部分更新） */
  updateSlot: (id: string, data: UpdateBannerSlotRequest) => {
    return request.patch(`/admin/v1/bizops/cms/banner-slots/${id}`, data);
  },

  /** 删除展示位（软删除） */
  deleteSlot: (id: string) => {
    return request.delete(`/admin/v1/bizops/cms/banner-slots/${id}`);
  },

  /** 切换展示位启用/停用 */
  toggleSlotStatus: (id: string, status: BannerSlotStatus) => {
    return request.patch(`/admin/v1/bizops/cms/banner-slots/${id}/status`, { status });
  },
};

// ========================
// 广告位（Banner）
// ========================

export interface Banner {
  id: string;
  title: string;
  cover: string;
  link_type: number; // 0=无 1=外链 2=内部页
  link_data: string;
  slot_ids: string[];
  sort_order: number;
  status: number; // 0=上线 1=下线
  start_at?: string;
  end_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBannerRequest {
  title: string;
  cover?: string;
  link_type?: number;
  link_data?: string;
  slot_ids?: string[];
  sort_order?: number;
  status?: number;
  start_at?: string;
  end_at?: string;
}

export interface UpdateBannerRequest {
  title?: string;
  cover?: string;
  link_type?: number;
  link_data?: string;
  slot_ids?: string[];
  sort_order?: number;
  start_at?: string;
  end_at?: string;
}

export interface BannerStatusRequest {
  status: BannerStatus;
}

export interface BannerListParams {
  page?: number;
  size?: number;
  status?: number;
}

export const bannerApi = {
  /** 分页查询广告位列表 */
  getBanners: (params?: BannerListParams) => {
    return request.get('/admin/v1/bizops/cms/banners', { params });
  },

  /** 广告位详情 */
  getBannerDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/cms/banners/${id}`);
  },

  /** 创建广告位 */
  createBanner: (data: CreateBannerRequest) => {
    return request.post('/admin/v1/bizops/cms/banners', data);
  },

  /** 编辑广告位（PATCH 部分更新） */
  updateBanner: (id: string, data: UpdateBannerRequest) => {
    return request.patch(`/admin/v1/bizops/cms/banners/${id}`, data);
  },

  /** 删除广告位（软删除） */
  deleteBanner: (id: string) => {
    return request.delete(`/admin/v1/bizops/cms/banners/${id}`);
  },

  /** 上线/下线广告位 */
  toggleBannerStatus: (id: string, status: BannerStatus) => {
    return request.patch(`/admin/v1/bizops/cms/banners/${id}/status`, { status });
  },
};
