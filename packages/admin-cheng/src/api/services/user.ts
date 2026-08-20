import request from '..';
import type {
  AdminSetMatchProfileRecommendRequest,
  AdminUserDetailResponse,
  AdminUserPrivacyResponse,
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

  /** 用户隐私数据 — POST /admin/v1/bizops/user/privacy/:id（脱敏身份证号，读取留痕；body 传空对象） */
  getUserPrivacy: (id: string | number): Promise<AdminUserPrivacyResponse> => {
    return request.post(`/admin/v1/bizops/user/privacy/${id}`, {});
  },

  /**
   * 批量查询脱敏身份证号 — POST /admin/v1/bizops/user/privacy（ids 筛选）
   * ids 分块请求（每块 50），块内按 size=100 分页，返回 userId → 身份证号 映射。
   * 失败时抛错由调用方处理（避免静默缺失身份证号列）。
   */
  getUserPrivacyBatch: async (ids: (string | number)[]): Promise<Record<string, string>> => {
    const map: Record<string, string> = {};
    const CHUNK_SIZE = 50;
    const PAGE_SIZE = 100;
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE);
      let page = 1;
      while (true) {
        const res: any = await request.post('/admin/v1/bizops/user/privacy', { ids: chunk, page, size: PAGE_SIZE });
        const items: AdminUserPrivacyResponse[] = Array.isArray(res) ? res : (res?.items || []);
        if (!items.length) break;
        for (const it of items) {
          if (it.user_id && it.id_card) map[it.user_id] = it.id_card;
        }
        const total: number = res?.total ?? 0;
        if (items.length < PAGE_SIZE || (total > 0 && page * PAGE_SIZE >= total)) break;
        page++;
      }
    }
    return map;
  },

  /** 修改用户基础资料 — PUT /admin/v1/bizops/user/:id/profile */
  updateBasicProfile: (id: string | number, data: AdminUpdateBasicProfileRequest) => {
    return request.put(`/admin/v1/bizops/user/${id}/profile`, data);
  },

  /** 审核脱单档案 — PUT /admin/v1/bizops/user/match-profile/:id/audit */
  auditMatchProfile: (id: string | number, data: AuditMatchProfileRequest) => {
    return request.put(`/admin/v1/bizops/user/match-profile/${id}/audit`, data);
  },

  /** 设置/取消脱单资料推荐 — PATCH /admin/v1/bizops/user/:id/match-profile/recommend */
  setMatchProfileRecommend: (id: string | number, data: AdminSetMatchProfileRecommendRequest) => {
    return request.patch(`/admin/v1/bizops/user/${id}/match-profile/recommend`, data);
  },

  /** 用户状态切换 — PATCH /admin/v1/bizops/user/:id/status（占位） */
  updateUserStatus: (id: string | number, status: number) => {
    return request.patch(`/admin/v1/bizops/user/${id}/status`, { status });
  },
};
