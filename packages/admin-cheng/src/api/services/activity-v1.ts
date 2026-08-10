import request from '..';

// ========================
// 活动（Activity v1）
// ========================

export interface Activity {
  id: string;
  title: string;
  cover: string;
  image: string; // 活动图片（多图，JSON数组字符串）
  description: string;
  activity_type: number; // 0=免费先到先得 1=收费先交费先得 2=免费审核筛选
  start_time: string;
  end_time: string;
  register_start: string;
  register_end: string;
  location: string; // JSON: {name, coordinate?}
  fee: number; // 分
  slots: number;
  form_config: string;
  extra_params: string;
  agreement: string;
  require_match_profile: boolean;
  zone_id?: string;
  gender_enabled?: boolean;
  male_slots?: number;
  female_slots?: number;
  male_registered_count?: number;
  female_registered_count?: number;
  sort_order: number;
  status: number; // 0=上线 1=下线
  hidden: boolean;
  registered_count: number;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateActivityRequest {
  title: string;
  cover: string;
  image: string;
  activity_type: number;
  description?: string;
  start_time: string;
  end_time: string;
  register_start: string;
  register_end: string;
  location: string;
  fee?: number;
  slots?: number;
  male_slots?: number;
  female_slots?: number;
  form_config?: string;
  extra_params?: string;
  agreement?: string;
  require_match_profile?: boolean;
  zone_id?: string;
  gender_enabled?: boolean;
  sort_order?: number;
  status?: number;
  hidden?: boolean;
}

export interface UpdateActivityRequest {
  title?: string;
  cover?: string;
  image?: string;
  activity_type?: number;
  description?: string;
  start_time?: string;
  end_time?: string;
  register_start?: string;
  register_end?: string;
  location?: string;
  fee?: number;
  slots?: number;
  male_slots?: number;
  female_slots?: number;
  form_config?: string;
  extra_params?: string;
  agreement?: string;
  require_match_profile?: boolean;
  zone_id?: string;
  gender_enabled?: boolean;
  sort_order?: number;
  status?: number;
  hidden?: boolean;
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
  audit_status: number;
  pay_status: number;
  checkin_at?: string;
  created_at?: string;
  updated_at?: string;
}

export const activityApi = {
  /** 分页查询活动列表 */
  getList: (params?: { status?: number; keyword?: string; page?: number; size?: number }) => {
    return request.get('/admin/v1/activity', { params });
  },

  /** 创建活动 */
  create: (data: CreateActivityRequest) => {
    return request.post('/admin/v1/activity', data);
  },

  /** 编辑活动 */
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
