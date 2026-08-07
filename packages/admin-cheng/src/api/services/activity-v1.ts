import request from '..';
import { ActivityV1Status } from '@shared/constants';

// ========================
// 活动（Activity v1）
// ========================

export interface Activity {
  id: string;
  title: string;
  cover: string;
  description: string;
  activity_type: number; // 0/1/2
  start_time: string;
  end_time: string;
  register_start: string;
  register_end: string;
  location: string;
  fee: number;
  slots: number;
  form_config: string;
  extra_params: string;
  require_match_profile: boolean;
  sort_order: number;
  status: number; // 0=启用 1=禁用
  registered_count: number;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateActivityRequest {
  title: string;
  cover?: string;
  activity_type?: number;
  description?: string;
  start_time: string;
  end_time: string;
  register_start: string;
  register_end: string;
  location?: string;
  fee?: number;
  slots: number;
  form_config?: string;
  extra_params?: string;
  require_match_profile?: boolean;
  sort_order?: number;
  status?: number;
}

export interface UpdateActivityRequest {
  title?: string;
  cover?: string;
  activity_type?: number;
  description?: string;
  start_time?: string;
  end_time?: string;
  register_start?: string;
  register_end?: string;
  location?: string;
  fee?: number;
  slots?: number;
  form_config?: string;
  extra_params?: string;
  require_match_profile?: boolean;
  sort_order?: number;
  status?: number;
}

export interface ActivitySortOrderRequest {
  sort_order: number;
}

// ========================
// 报名记录
// ========================

export interface RegisterRecord {
  id: string;
  activity_id: string;
  user_id: string;
  form_data: string;
  extra_data: string;
  attachments: string[];
  audit_status: number; // 0=待审核 1=通过 2=拒绝
  pay_status: number; // 0=未支付 1=已支付 2=已退款
  checkin_at?: string;
  created_at?: string;
  updated_at?: string;
}

export const activityApi = {
  /** 分页查询活动列表 */
  getList: (params?: { status?: number; page?: number; size?: number }) => {
    return request.get('/admin/v1/activity', { params });
  },

  /** 创建活动 */
  create: (data: CreateActivityRequest) => {
    return request.post('/admin/v1/activity', data);
  },

  /** 编辑活动（PATCH 指针语义，部分更新） */
  update: (id: string, data: UpdateActivityRequest) => {
    return request.put(`/admin/v1/activity/${id}`, data);
  },

  /** 删除活动（软删除） */
  delete: (id: string) => {
    return request.delete(`/admin/v1/activity/${id}`);
  },

  /** 调整排序 */
  updateSortOrder: (id: string, sort_order: number) => {
    return request.patch(`/admin/v1/activity/${id}/sort-order`, { sort_order });
  },

  // ========================
  // 报名记录
  // ========================

  /** 活动报名记录列表 */
  getRegisters: (activityId: string, params?: { page?: number; size?: number }) => {
    return request.get(`/admin/v1/activity/${activityId}/register`, { params });
  },
};
