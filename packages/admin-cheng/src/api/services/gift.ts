import request from '..';
import { GiftStatus } from '@shared/constants';

// ========================
// 礼物（Gift）
// ========================

export interface Gift {
  id: string;
  name: string;
  icon: string;
  gift_type: number; // 1=普通 2=特殊
  popularity: number;
  price_coins: number;
  price_cashs: number; // 分
  free_quota: number;
  sort_order: number;
  redeemed_count: number;
}

export interface CreateGiftRequest {
  name: string;
  gift_type: number;
  icon?: string;
  popularity: number;
  price_coins?: number;
  price_cashs?: number;
  free_quota?: number;
  sort_order?: number;
}

export interface UpdateGiftRequest {
  name?: string;
  gift_type?: number;
  icon?: string;
  popularity?: number;
  price_coins?: number;
  price_cashs?: number;
  free_quota?: number;
  sort_order?: number;
}

export interface GiftStatusRequest {
  status: GiftStatus;
}

export const giftApi = {
  /** 分页查询礼物列表 */
  getList: (params?: { status?: number; keyword?: string; page?: number; size?: number }) => {
    return request.get('/admin/v1/gift', { params });
  },

  /** 礼物详情 */
  getDetail: (id: string) => {
    return request.get(`/admin/v1/gift/${id}`);
  },

  /** 创建礼物 */
  create: (data: CreateGiftRequest) => {
    return request.post('/admin/v1/gift', data);
  },

  /** 编辑礼物 */
  update: (id: string, data: UpdateGiftRequest) => {
    return request.put(`/admin/v1/gift/${id}`, data);
  },

  /** 删除礼物 */
  delete: (id: string) => {
    return request.delete(`/admin/v1/gift/${id}`);
  },

  /** 启用/禁用 */
  toggleStatus: (id: string, status: GiftStatus) => {
    return request.patch(`/admin/v1/gift/${id}/status`, { status });
  },
};
