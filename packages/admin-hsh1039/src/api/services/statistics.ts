import request from '..';

// 数据统计相关API
export const statisticsApi = {
  // 用户统计
  getUserStatistics: (params?: any) => {
    return request.get('/admin/statistics/users', { params });
  },

  // 活动统计
  getActivityStatistics: (params?: any) => {
    return request.get('/admin/statistics/activities', { params });
  },

  // 动态统计
  getMomentStatistics: (params?: any) => {
    return request.get('/admin/statistics/moments', { params });
  },

  // 访问统计
  getVisitStatistics: (params?: any) => {
    return request.get('/admin/statistics/visits', { params });
  },

  // 来源统计
  getSourceStatistics: (params?: any) => {
    return request.get('/admin/statistics/sources', { params });
  },

  // 综合统计概览
  getOverviewStatistics: () => {
    return request.get('/admin/statistics/overview');
  },

  // 数据看板（用户/活动/动态/收入总数）
  getDatacube: () => {
    return request.get('/admin/v6/datacube');
  },

  // 用户数据统计
  getUserDatacube: () => {
    return request.get('/admin/v6/user/datacube');
  },

  // 用户性别统计
  getUserGender: (params?: any) => {
    return request.get('/admin/v6/user/datacube/gender', { params });
  },

  // 用户年龄统计
  getUserAge: (params?: any) => {
    return request.get('/admin/v6/user/datacube/age', { params });
  },

  // 用户星座统计
  getUserZodiac: (params?: any) => {
    return request.get('/admin/v6/user/datacube/zodiac', { params });
  },

  // 用户MBTI统计
  getUserMbti: (params?: any) => {
    return request.get('/admin/v6/user/datacube/mbti', { params });
  },

  // 用户注册统计
  getUserRegister: (params?: any) => {
    return request.get('/admin/v6/user/datacube/register', { params });
  },

  // 动态总数统计
  getFeedDatacube: () => {
    return request.get('/admin/v6/feed/datacube');
  },

  // 动态每日趋势统计
  getFeedDaily: (params?: any) => {
    return request.get('/admin/v6/feed/datacube/daily', { params });
  },

  // 活动数据统计
  getEventDatacube: (params?: any) => {
    return request.get('/admin/v6/event/datacube', { params });
  },

  // 生成小程序页面路径
  getScene: (data: { appid: string; data: string }) => {
    return request.post('/admin/v6/wxa/app/scene', data);
  },

  // 生成小程序码
  getQrcode: (data: { appid: string; page: string; scene: string; width?: number; check_path?: boolean }) => {
    return request.post('/admin/v6/wxa/app/qrcode', data);
  },

  // 获取用户增长数据
  getUserGrowth: (params?: any) => {
    // 模拟数据支持
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          // 模拟用户增长数据
          const mockGrowthData = [
            { date: '2026-03-01', count: 1200 },
            { date: '2026-03-02', count: 1250 },
            { date: '2026-03-03', count: 1300 },
            { date: '2026-03-04', count: 1350 },
            { date: '2026-03-05', count: 1420 },
            { date: '2026-03-06', count: 1450 },
            { date: '2026-03-07', count: 1500 },
            { date: '2026-03-08', count: 1550 },
            { date: '2026-03-09', count: 1620 },
            { date: '2026-03-10', count: 1680 },
          ];
          resolve({ data: mockGrowthData });
        }, 500);
      });
    }
    return request.get('/admin/statistics/users/growth', { params });
  },

  // 获取用户活跃度数据
  getUserActivity: (params?: any) => {
    return request.get('/admin/statistics/users/activity', { params });
  },

  // 获取用户留存数据
  getUserRetention: (params?: any) => {
    return request.get('/admin/statistics/users/retention', { params });
  },

  // 获取活动参与数据
  getActivityParticipation: (params?: any) => {
    return request.get('/admin/statistics/activities/participation', { params });
  },

  // 获取活动完成率数据
  getActivityCompletion: (params?: any) => {
    return request.get('/admin/statistics/activities/completion', { params });
  },

  // 获取动态互动数据
  getMomentInteraction: (params?: any) => {
    return request.get('/admin/statistics/moments/interaction', { params });
  },

  // 获取访问趋势数据
  getVisitTrend: (params?: any) => {
    return request.get('/admin/statistics/visits/trend', { params });
  },

  // 获取页面访问数据
  getPageViews: (params?: any) => {
    return request.get('/admin/statistics/visits/pages', { params });
  },

  // 获取用户来源分析
  getUserSources: (params?: any) => {
    return request.get('/admin/statistics/sources/analysis', { params });
  },

  // 导出统计数据
  exportStatistics: (type: string, params?: any) => {
    return request.get(`/admin/statistics/export/${type}`, {
      params,
      responseType: 'blob',
    });
  },

  // 访问统计-累计数据
  getVisitTotal: (params?: any) => {
    return request.get('/admin/v6/wxa/app/datacube/daily/visit/total', { params });
  },

  // 访问统计-每日趋势
  getVisitDaily: (params?: any) => {
    return request.get('/admin/v6/wxa/app/datacube/daily/visit', { params });
  },

  // 访问用户统计-留存总数
  getRetainTotal: (params?: any) => {
    return request.get('/admin/v6/wxa/app/datacube/daily/retain/total', { params });
  },

  // 访问用户统计-汇总总数
  getSummaryTotal: (params?: any) => {
    return request.get('/admin/v6/wxa/app/datacube/daily/summary/total', { params });
  },

  // 访问用户统计-留存每日趋势
  getRetainDaily: (params?: any) => {
    return request.get('/admin/v6/wxa/app/datacube/daily/retain', { params });
  },

  // 访问用户统计-汇总每日趋势
  getSummaryDaily: (params?: any) => {
    return request.get('/admin/v6/wxa/app/datacube/daily/summary', { params });
  },
};