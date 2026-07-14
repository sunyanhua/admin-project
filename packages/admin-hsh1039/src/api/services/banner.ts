import request from '..';
import { BannerStatus } from '@shared/constants';

// Banner接口定义
export interface Banner {
  id: number;
  title?: string;
  cover?: string;
  brief?: string;
  intro?: string;
  linkType?: number;
  linkTags?: number;
  linkData?: string;
  orderon?: number;
  status?: BannerStatus;
  usable?: number;
  visible?: number;
  inserton?: string;
  updateon?: string;
}

// 创建/更新Banner请求参数
export interface CreateBannerRequest {
  title?: string;
  cover?: string;
  brief?: string;
  intro?: string;
  linkType?: number;
  linkTags?: number;
  linkData?: string;
  orderon?: number;
  status?: BannerStatus;
  tags?: number;
  flags?: number;
}

// 轮播图相关API
export const bannerApi = {
  // 获取轮播图列表
  getBanners: (params?: {
    page?: number;
    size?: number;
    status?: BannerStatus;
    keyword?: string;
  }) => {
    return request.get('/admin/v6/banner', { params });
  },

  // 获取轮播图详情
  getBannerDetail: (id: number) => {
    return request.get(`/admin/v6/banner/${id}`);
  },

  // 创建轮播图
  createBanner: (data: CreateBannerRequest) => {
    return request.post('/admin/v6/banner', data);
  },

  // 更新轮播图
  updateBanner: (id: number, data: CreateBannerRequest) => {
    return request.post(`/admin/v6/banner/${id}`, data);
  },

  // 更新轮播图排序
  updateBannerOrder: (id: number, orderon?: number) => {
    return request.post('/admin/v6/banner/orderon', { id, orderon });
  },

  // 删除轮播图
  deleteBanner: (id: number) => {
    return request.post('/admin/v6/banner/delete', { id });
  },

  // 更新轮播图状态
  updateBannerStatus: (id: number, status: BannerStatus) => {
    return request.post('/admin/v6/banner/status', { id, status });
  },

  // 更新轮播图可见性
  updateBannerVisible: (id: number, visible: number) => {
    return request.post('/admin/v6/banner/visible', { id, visible });
  },
};
