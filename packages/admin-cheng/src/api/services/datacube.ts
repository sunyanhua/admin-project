import request from '..';

// ========================
// 微信数据分析（Datacube）
// ========================

export interface OverviewPortraitItem {
  name: string;
  percentage: number;
  value: number;
}

export interface OverviewPageItem {
  path: string;
  visit_pv: number;
}

export interface OverviewResponse {
  age_distribution: OverviewPortraitItem[];
  avg_stay_time_session: number;
  avg_stay_time_uv: number;
  avg_visit_depth: number;
  days: number;
  end_date: string;
  gender_distribution: OverviewPortraitItem[];
  region_top5: OverviewPortraitItem[];
  share_pv: number;
  share_uv: number;
  start_date: string;
  top_pages: OverviewPageItem[];
  visit_pv: number;
  visit_total: number;
  visit_uv: number;
  visit_uv_new: number;
}

export interface PageRankingItem {
  avg_stay_time_page: number;
  path: string;
  visit_pv: number;
  visit_uv: number;
}

export interface PortraitItem {
  category: string;
  key: number;
  name: string;
  percentage: number;
  value: number;
}

export interface RetainItem {
  key: number;
  value: number;
}

export interface RetainJSON {
  daily: RetainItem[];
  weekly: RetainItem[];
  monthly: RetainItem[];
}

export interface RetainResponse {
  ref_date: string;
  retain_json: RetainJSON;
  visit_uv: number;
  visit_uv_new: number;
}

export interface VisitTrendItem {
  ref_date: string;
  stay_time_session: number;
  stay_time_uv: number;
  visit_depth: number;
  visit_pv: number;
  visit_uv: number;
  visit_uv_new: number;
}

export interface DatacubeParams {
  appid?: string;
  start_date?: string;
  end_date?: string;
}

export const datacubeApi = {
  /** 概览仪表盘 */
  getOverview: (params?: DatacubeParams) => {
    return request.get('/admin/v1/wxa/datacube/overview', { params });
  },

  /** 页面排行 */
  getPageRanking: (params?: DatacubeParams & { path?: string }) => {
    return request.get('/admin/v1/wxa/datacube/page-ranking', { params });
  },

  /** 用户画像分布 */
  getPortrait: (params?: DatacubeParams) => {
    return request.get('/admin/v1/wxa/datacube/portrait', { params });
  },

  /** 用户画像（单维度） */
  getPortraitByKey: (key: number, params?: DatacubeParams) => {
    return request.get(`/admin/v1/wxa/datacube/portrait/${key}`, { params });
  },

  /** 留存概览 */
  getRetain: (params?: DatacubeParams) => {
    return request.get('/admin/v1/wxa/datacube/retain', { params });
  },

  /** 访问趋势 */
  getVisitTrend: (params?: DatacubeParams & { visit_source?: string }) => {
    return request.get('/admin/v1/wxa/datacube/visit-trend', { params });
  },
};
