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

export interface DBAttachment {
  file_type?: string;
  media_id?: string;
  url: string;
}

export interface RegisterRecord {
  id: string;
  activity_id: string;
  user_id: string;
  avatar?: string;
  nickname?: string;
  age?: number;
  phone?: string;
  form_data: string;
  extra_data: string;
  attachments: DBAttachment[];
  audit_status: number;
  pay_status: number;
  gender: number;
  register_status?: number; // 0=已完成 1=已取消（免费 FCFS）
  completed_at?: string;    // 完成时间（付费 FCFS）
  checkin_at?: string;
  created_at?: string;
  updated_at?: string;
}

export const activityApi = {
  /** 分页查询活动列表 */
  getList: (params?: { status?: number; keyword?: string; page?: number; size?: number }) => {
    return request.get('/admin/v1/bizops/activity', { params });
  },

  /** 活动详情 */
  getDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/activity/${id}`);
  },

  /** 创建活动 */
  create: (data: CreateActivityRequest) => {
    return request.post('/admin/v1/bizops/activity', data);
  },

  /** 编辑活动 */
  update: (id: string, data: UpdateActivityRequest) => {
    return request.put(`/admin/v1/bizops/activity/${id}`, data);
  },

  /** 删除活动（软删除） */
  delete: (id: string) => {
    return request.delete(`/admin/v1/bizops/activity/${id}`);
  },

  /** 启用/停用活动 */
  toggleStatus: (id: string, status: number) => {
    return request.patch(`/admin/v1/bizops/activity/${id}/status`, { status });
  },

  /** 调整排序 */
  updateSortOrder: (id: string, sort_order: number) => {
    return request.patch(`/admin/v1/bizops/activity/${id}/sort-order`, { sort_order });
  },

  // ========================
  // 报名记录
  // ========================

  /** 活动报名记录列表 */
  getRegisters: (activityId: string, params?: { page?: number; size?: number; audit_status?: number; pay_status?: number; register_status?: number; gender?: number; keyword?: string }) => {
    return request.get(`/admin/v1/bizops/activity/${activityId}/register`, { params });
  },

  /** 审核报名 */
  auditRegister: (activityId: string, registerId: string, data: { approved: boolean; reason?: string }) => {
    return request.put(`/admin/v1/bizops/activity/${activityId}/register/${registerId}/audit`, data);
  },
};
