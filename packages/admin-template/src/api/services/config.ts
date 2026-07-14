import request from '..';

// 系统配置相关API
export const configApi = {
  // 获取配置（v6）
  getConfig: (name: string) => {
    return request.get(`/admin/v6/config/${encodeURIComponent(name)}`);
  },

  // 更新配置（v6）
  setConfig: (name: string, data: any) => {
    return request.post(`/admin/v6/config/${encodeURIComponent(name)}`, data);
  },

  // 获取旧版系统配置
  getSystemConfig: () => {
    return request.get('/admin/config');
  },

  // 更新旧版系统配置
  updateConfig: (data: any) => {
    return request.put('/admin/config', data);
  },

  // 获取活动类型配置
  getActivityTypes: () => {
    return request.get('/admin/config/activity-types');
  },

  // 更新活动类型配置
  updateActivityTypes: (types: string[]) => {
    return request.put('/admin/config/activity-types', { types });
  },

  // 获取积分规则
  getPointRules: () => {
    return request.get('/admin/config/point-rules');
  },

  // 更新积分规则
  updatePointRules: (rules: any) => {
    return request.put('/admin/config/point-rules', rules);
  },

  // 获取费率配置
  getFeeConfig: () => {
    return request.get('/admin/v6/config/fee');
  },

  // 更新费率配置
  updateFeeConfig: (config: any) => {
    return request.post('/admin/v6/config/fee', config);
  },

  // 获取社区积分配置（v6）
  getRewardConfig: (params: { name?: string; status?: number; start?: number; length?: number; word?: string }) => {
    return request.get('/admin/v6/reward', { params });
  },

  // 更新社区积分配置（v6）- 使用 formData 格式
  // 如果传了 id 则编辑 /admin/v6/reward/{id}，否则新增 /admin/v6/reward
  updateRewardConfig: (data: {
    id?: number;
    name: string;
    title?: string;
    points?: number;
    daily_limit?: number | null;
    weekly_limit?: number | null;
    monthly_limit?: number | null;
    yearly_limit?: number | null;
    usable?: string;
    expiry?: string;
    status?: number;
    arg_0?: string;
    arg_1?: string;
    arg_2?: string;
    arg_3?: string;
    arg_4?: string;
    arg_5?: string;
    arg_6?: string;
    arg_7?: string;
    arg_8?: string;
    arg_9?: string;
  }) => {
    const formData = new URLSearchParams();
    formData.append('name', data.name);
    if (data.title !== undefined && data.title !== null) formData.append('title', data.title);
    if (data.points !== undefined && data.points !== null) formData.append('points', String(data.points));
    if (data.daily_limit !== undefined && data.daily_limit !== null) formData.append('daily_limit', String(data.daily_limit));
    if (data.weekly_limit !== undefined && data.weekly_limit !== null) formData.append('weekly_limit', String(data.weekly_limit));
    if (data.monthly_limit !== undefined && data.monthly_limit !== null) formData.append('monthly_limit', String(data.monthly_limit));
    if (data.yearly_limit !== undefined && data.yearly_limit !== null) formData.append('yearly_limit', String(data.yearly_limit));
    if (data.usable !== undefined && data.usable !== null) formData.append('usable', data.usable);
    if (data.expiry !== undefined && data.expiry !== null) formData.append('expiry', data.expiry);
    if (data.status !== undefined && data.status !== null) formData.append('status', String(data.status));
    if (data.arg_0 !== undefined && data.arg_0 !== null) formData.append('arg_0', data.arg_0);
    if (data.arg_1 !== undefined && data.arg_1 !== null) formData.append('arg_1', data.arg_1);
    if (data.arg_2 !== undefined && data.arg_2 !== null) formData.append('arg_2', data.arg_2);
    if (data.arg_3 !== undefined && data.arg_3 !== null) formData.append('arg_3', data.arg_3);
    if (data.arg_4 !== undefined && data.arg_4 !== null) formData.append('arg_4', data.arg_4);
    if (data.arg_5 !== undefined && data.arg_5 !== null) formData.append('arg_5', data.arg_5);
    if (data.arg_6 !== undefined && data.arg_6 !== null) formData.append('arg_6', data.arg_6);
    if (data.arg_7 !== undefined && data.arg_7 !== null) formData.append('arg_7', data.arg_7);
    if (data.arg_8 !== undefined && data.arg_8 !== null) formData.append('arg_8', data.arg_8);
    if (data.arg_9 !== undefined && data.arg_9 !== null) formData.append('arg_9', data.arg_9);

    const url = data.id ? `/admin/v6/reward/${data.id}` : '/admin/v6/reward';
    return request.post(url, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  // 获取社区设置（v6）
  getCommunitySettings: (params: { name?: string; start?: number; length?: number; word?: string }) => {
    return request.get('/admin/v6/setting', { params });
  },

  // 更新社区设置（v6）- 使用 formData 格式
  updateCommunitySettings: (data: { name?: string; value?: string; value_type?: number; description?: string }) => {
    const formData = new URLSearchParams();
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.value !== undefined) formData.append('value', data.value);
    if (data.value_type !== undefined) formData.append('value_type', String(data.value_type));
    if (data.description !== undefined) formData.append('description', data.description);
    return request.post('/admin/v6/setting', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
};