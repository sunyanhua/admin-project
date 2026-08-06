import request from '..';

// ========================
// 系统设置（Settings）
// ========================

/** 设置项类型枚举 */
export enum SettingType {
  STRING = 0,
  NUMBER = 1,
  BOOL = 2,
  JSON = 3,
  TEXT = 4,
  IMAGE = 5,
}

export interface SettingItem {
  id: string;
  key: string;
  label?: string;
  value: string;
  type: number; // 0=string 1=number 2=bool 3=json 4=text 5=image
  group_name?: string;
  description?: string;
  status: number; // 0=启用 1=停用
  created_at?: string;
  updated_at?: string;
}

export interface SettingListParams {
  keyword?: string;
  group_name?: string;
  status?: number;
  page?: number;
  size?: number;
}

export interface CreateSettingRequest {
  key: string;
  type: number;
  value?: string;
  label?: string;
  group_name?: string;
  description?: string;
}

export interface UpdateSettingRequest {
  value?: string;
  type?: number;
  label?: string;
  group_name?: string;
  description?: string;
}

export const settingsApi = {
  /** 分页查询设置项列表 */
  getSettings: (params?: SettingListParams) => {
    return request.get('/admin/v1/bizops/settings', { params });
  },

  /** 设置项详情 */
  getSettingDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/settings/${id}`);
  },

  /** 创建设置项 */
  createSetting: (data: CreateSettingRequest) => {
    return request.post('/admin/v1/bizops/settings', data);
  },

  /** 编辑设置项（PATCH 部分更新） */
  updateSetting: (id: string, data: UpdateSettingRequest) => {
    return request.patch(`/admin/v1/bizops/settings/${id}`, data);
  },

  /** 删除设置项（软删除） */
  deleteSetting: (id: string) => {
    return request.delete(`/admin/v1/bizops/settings/${id}`);
  },

  /** 启用/停用设置项 */
  toggleSettingStatus: (id: string, status: number) => {
    return request.patch(`/admin/v1/bizops/settings/${id}/status`, { status });
  },
};
