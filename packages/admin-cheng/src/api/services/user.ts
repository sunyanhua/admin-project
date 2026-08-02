import request from '..';
import type {
  AdminUserDetailResponse,
  AuditMatchProfileRequest,
  AdminUpdateBasicProfileRequest,
  CommunityUserItem,
  CommunityUserListParams,
} from '../types/user';

export const userApi = {
  /** 社区用户列表 — GET /admin/v1/bizops/user */
  getUsers: (params?: CommunityUserListParams): Promise<{ list: CommunityUserItem[]; total: number }> => {
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

  /** 用户状态切换 — PATCH /admin/v1/bizops/user/:id/status（占位） */
  updateUserStatus: (id: string | number, status: number) => {
    return request.patch(`/admin/v1/bizops/user/${id}/status`, { status });
  },
};
