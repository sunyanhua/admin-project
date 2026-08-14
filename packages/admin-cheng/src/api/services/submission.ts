import request from '..';

// ========================
// 广播投稿（Submission）
// ========================

export interface SubmissionAttachment {
  file_type?: number;
  media_id?: string;
  tags?: string;
  url: string;
}

export interface SubmissionUserProfile {
  nickname?: string;
  avatar?: string;
  gender?: number;
  age?: number;
  birth_date?: string;
  zodiac?: string;
  audit_status?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SubmissionUserData {
  phone?: string;
  credits?: number;
  is_activated?: boolean;
  activated_at?: string;
  last_active_at?: string;
  created_at?: string;
}

export interface SubmissionMatchProfile {
  real_name?: string;
  match_code?: string;
  marital_status?: number;
  education?: number;
  profession?: string;
  workplace?: string;
  hometown?: string;
  current_city?: string;
  height?: number;
  weight?: number;
  hobby_tags?: string;
  income_range?: number;
  self_intro?: string;
  partner_demand?: string;
  photos?: string[];
  is_org_certified?: boolean;
  is_real_verified?: boolean;
  zone_id?: string;
}

export interface Submission {
  id: string;
  user_id: string;
  nickname?: string;
  avatar?: string;
  content: string;
  attachments: SubmissionAttachment[];
  is_public: boolean;
  sort_order: number;
  reward_coins: number;
  audit_status: number; // 0=待审核 1=通过 2=拒绝
  audit_reason: string;
  audited_at?: string;
  approved_at?: string;
  delete_files: boolean;
  type?: number;
  created_at?: string;
  user_data?: SubmissionUserData;
  user_profile?: SubmissionUserProfile;
  user_match_profile?: SubmissionMatchProfile;
}

export interface AuditSubmissionRequest {
  action: number; // 1=通过 2=拒绝
  delete_files?: boolean;
  reason?: string;
  reward_coins?: number;
}

export interface UpdateSortOrderRequest {
  sort_order: number;
}

export const submissionApi = {
  /** 投稿列表 */
  getList: (params?: { page?: number; size?: number; status?: number; keyword?: string }) => {
    return request.get('/admin/v1/bizops/submission', { params });
  },

  /** 投稿详情 */
  getDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/submission/${id}`);
  },

  /** 审核投稿 */
  audit: (id: string, data: AuditSubmissionRequest) => {
    return request.post(`/admin/v1/bizops/submission/${id}/audit`, data);
  },

  /** 更新审核通过时间（null 清除；仅审核通过的可改） */
  updateApprovedAt: (id: string, approvedAt: string | null) => {
    return request.patch(`/admin/v1/bizops/submission/${id}/approved-at`, { approved_at: approvedAt });
  },

  /** 调整排序 */
  updateSortOrder: (id: string, data: UpdateSortOrderRequest) => {
    return request.patch(`/admin/v1/bizops/submission/${id}/sort-order`, data);
  },
};
