import request from '..';
import type { AdminUserListItem, AdminUserDetailResponse, AuditMatchProfileRequest, AdminUpdateBasicProfileRequest } from '../types/user';

/** C端用户查询参数 */
export interface UserListParams {
  page?: number;
  size?: number;
  keyword?: string;
  gender?: 1 | 2;
  min_age?: number;
  max_age?: number;
  profile_audit_status?: number;
  match_audit_status?: number;
}

export const userApi = {
  /** 用户列表 — GET /admin/v1/bizops/user */
  getUsers: (params?: UserListParams): Promise<{ list: AdminUserListItem[]; total: number }> => {
    return request.get('/admin/v1/bizops/user', { params }) as any;
  },

  /** 用户详情 — GET /admin/v1/bizops/user/:id */
  getUserDetail: (id: string | number): Promise<AdminUserDetailResponse> => {
    return request.get(`/admin/v1/bizops/user/${id}`);
  },

  /** 修改用户基础资料 — PUT /admin/v1/bizops/user/:id/basic-profile */
  updateBasicProfile: (id: string | number, data: AdminUpdateBasicProfileRequest) => {
    return request.put(`/admin/v1/bizops/user/${id}/basic-profile`, data);
  },

  /** 审核脱单档案 — PUT /admin/v1/bizops/user/match-profile/:id/audit */
  auditMatchProfile: (id: string | number, data: AuditMatchProfileRequest) => {
    return request.put(`/admin/v1/bizops/user/match-profile/${id}/audit`, data);
  },

  /** 状态切换 — PATCH /admin/v1/mall/users/:id/status（Swagger 暂无此接口，保持） */
  updateUserStatus: (id: string | number, status: number) => {
    return request.patch(`/admin/v1/mall/users/${id}/status`, { status });
  },
};
