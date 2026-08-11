import request from '..';

// ========================
// 广播投稿（Submission）
// ========================

export interface Submission {
  id: string;
  user_id: string;
  nickname: string;
  avatar: string;
  content: string;
  attachments: string[];
  is_public: boolean;
  sort_order: number;
  reward_coins: number;
  audit_status: number; // 0=待审核 1=通过 2=拒绝
  audit_reason: string;
  audited_at?: string;
  approved_at?: string;
  delete_files: boolean;
  created_at?: string;
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

  /** 调整排序 */
  updateSortOrder: (id: string, data: UpdateSortOrderRequest) => {
    return request.patch(`/admin/v1/bizops/submission/${id}/sort-order`, data);
  },
};
