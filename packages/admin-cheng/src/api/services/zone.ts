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
  attachments: string[];
  review_remark: string;
  created_at?: string;
  reviewed_at?: string;
  updated_at?: string;
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
    return request.get('/admin/v1/zone', { params });
  },

  /** 专区详情 */
  getDetail: (id: string) => {
    return request.get(`/admin/v1/zone/${id}`);
  },

  /** 创建专区 */
  create: (data: CreateZoneRequest) => {
    return request.post('/admin/v1/zone', data);
  },

  /** 编辑专区 */
  update: (id: string, data: UpdateZoneRequest) => {
    return request.put(`/admin/v1/zone/${id}`, data);
  },

  /** 删除专区（软删除） */
  delete: (id: string) => {
    return request.delete(`/admin/v1/zone/${id}`);
  },

  /** 启用/停用专区 */
  toggleStatus: (id: string, status: ZoneStatus) => {
    return request.patch(`/admin/v1/zone/${id}/status`, { status });
  },

  // ========================
  // 申请审核
  // ========================

  /** 专区申请列表 */
  getApplications: (zoneId: string, params?: { page?: number; size?: number }) => {
    return request.get(`/admin/v1/zone/${zoneId}/application`, { params });
  },

  /** 审核申请（1=通过 2=拒绝） */
  reviewApplication: (zoneId: string, applicationId: string, data: { status: number; review_remark?: string }) => {
    return request.put(`/admin/v1/zone/${zoneId}/application/${applicationId}`, data);
  },

  /** 撤销审核 */
  revokeApplication: (zoneId: string, applicationId: string) => {
    return request.put(`/admin/v1/zone/${zoneId}/application/${applicationId}/revoke`);
  },
};
