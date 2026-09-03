import request from '..';
import { ZoneStatus } from '@shared/constants';

// ========================
// 专区（Zone）
// ========================

export interface Zone {
  id: string;
  name: string;
  logo: string;
  banner: string;
  description: string;
  form_config: string;
  agreement: string;
  member_count: number;
  status: number; // 0=启用 1=禁用
  created_at?: string;
  updated_at?: string;
}

export interface CreateZoneRequest {
  name: string;
  logo?: string;
  banner?: string;
  description?: string;
  form_config?: string;
  agreement?: string;
  status?: number;
}

export interface UpdateZoneRequest {
  name?: string;
  logo?: string;
  banner?: string;
  description?: string;
  form_config?: string;
  agreement?: string;
  status?: number;
}

export interface ZoneStatusRequest {
  status: ZoneStatus;
}

// ========================
// 申请（Application）
// ========================

export interface Application {
  id: string;
  zone_id: string;
  user_id: string;
  status: number; // 0=待审核 1=通过 2=拒绝 3=已撤销
  form_data: string;
  attachments: DBAttachment[];
  review_remark: string;
  reviewed_at?: string;
  created_at?: string;
  updated_at?: string;
  user_data?: ApplicationUserData;
  user_profile?: ApplicationUserProfile;
  user_match_profile?: ApplicationUserMatchProfile;
}

export interface DBAttachment {
  file_type?: number;
  media_id?: string;
  url: string;
}

export interface ApplicationUserData {
  user_id: string;
  status: number;
  phone?: string;
  credits: number;
  has_profile: boolean;
  has_match_profile: boolean;
  is_activated: boolean;
  activated_at?: string;
  last_active_at?: string;
  created_at?: string;
}

export interface ApplicationUserProfile {
  nickname: string;
  avatar: string;
  gender: number;
  birth_date?: string;
  age?: number;
  zodiac?: string;
  audit_status: number;
}

export interface ApplicationUserMatchProfile {
  real_name?: string;
  match_code?: string;
  phone?: string;
  gender?: number;
  marital_status?: number;
  education?: number;
  profession?: string;
  workplace?: string;
  hometown?: string;
  current_city?: string;
  height?: number;
  weight?: number;
  is_org_certified?: boolean;
  is_real_verified?: boolean;
  zone_id?: string;
  photos?: string[];
}

export interface ZoneListParams {
  page?: number;
  size?: number;
  status?: number;
  keyword?: string;
}

export const zoneApi = {
  /** 分页查询专区列表 */
  getList: (params?: ZoneListParams) => {
    return request.get('/admin/v1/bizops/zone', { params });
  },

  /** 专区详情 */
  getDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/zone/${id}`);
  },

  /** 创建专区 */
  create: (data: CreateZoneRequest) => {
    return request.post('/admin/v1/bizops/zone', data);
  },

  /** 编辑专区 */
  update: (id: string, data: UpdateZoneRequest) => {
    return request.put(`/admin/v1/bizops/zone/${id}`, data);
  },

  /** 专区基本资料（专区管理员专用路由，权限对 zone admin 友好） */
  getProfile: (id: string) => {
    return request.get(`/admin/v1/bizops/zone/${id}/profile`);
  },

  /** 编辑专区基本资料（专区管理员专用路由） */
  updateProfile: (id: string, data: UpdateZoneRequest) => {
    return request.put(`/admin/v1/bizops/zone/${id}/profile`, data);
  },

  /** 专区申请用户基本资料（基础资料+脱单档案+钱包积分金币） */
  getApplicationUser: (zoneId: string, applicationId: string) => {
    return request.get(`/admin/v1/bizops/zone/${zoneId}/application/${applicationId}/user`);
  },

  /** 专区申请用户隐私资料（脱敏身份证等，读取留痕） */
  getApplicationUserPrivacy: (zoneId: string, applicationId: string) => {
    return request.post(`/admin/v1/bizops/zone/${zoneId}/application/${applicationId}/user/privacy`);
  },

  /** 删除专区（软删除） */
  delete: (id: string) => {
    return request.delete(`/admin/v1/bizops/zone/${id}`);
  },

  /** 启用/停用专区 */
  toggleStatus: (id: string, status: ZoneStatus) => {
    return request.patch(`/admin/v1/bizops/zone/${id}/status`, { status });
  },

  // ========================
  // 申请审核
  // ========================

  /** 专区申请列表 */
  getApplications: (zoneId: string, params?: { page?: number; size?: number; status?: number; keyword?: string }) => {
    return request.get(`/admin/v1/bizops/zone/${zoneId}/application`, { params });
  },

  /** 审核申请（1=通过 2=拒绝） */
  reviewApplication: (zoneId: string, applicationId: string, data: { status: number; review_remark?: string }) => {
    return request.put(`/admin/v1/bizops/zone/${zoneId}/application/${applicationId}`, data);
  },

  /** 撤销审核 */
  revokeApplication: (zoneId: string, applicationId: string) => {
    return request.put(`/admin/v1/bizops/zone/${zoneId}/application/${applicationId}/revoke`);
  },
};
