import request from '..';

export interface SettingItem {
  id: number;
  key: string;
  label?: string;
  value: string;
  type: string;
  group_name?: string;
  description?: string;
  is_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const settingsApi = {
  /** 查询设置项列表 — GET /admin/v1/settings */
  getSettings: (params?: { keyword?: string; page?: number; page_size?: number }) => {
    return request.get('/admin/v1/settings', { params });
  },

  /** 创建设置项 — POST /admin/v1/settings */
  createSetting: (data: {
    key: string;
    type: string;
    value: string;
    label?: string;
    group_name?: string;
    description?: string;
    is_enabled?: boolean;
  }) => {
    return request.post('/admin/v1/settings', data);
  },

  /** 更新设置项 — PUT /admin/v1/settings/{id} */
  updateSetting: (id: number, data: {
    value?: string;
    label?: string;
    group_name?: string;
    description?: string;
    is_enabled?: boolean;
  }) => {
    return request.put(`/admin/v1/settings/${id}`, data);
  },
};
