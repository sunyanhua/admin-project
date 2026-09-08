import request from '..';

// ========================
// 平台数据统计（Datacube v1）
// 接口前缀：/admin/v1/datacube
// ========================

/** 日期范围参数（YYYYMMDD；默认 30 天前~今天；user-cumulative 缺省全历史、显式 ≤366 天） */
export interface DatacubeRangeParams {
  from_date?: string;
  to_date?: string;
}

export interface MatchProfileAuditCounts {
  /** 待审核 */
  pending: number;
  /** 审核通过 */
  approved: number;
  /** 审核拒绝 */
  rejected: number;
  /** 已撤销 */
  revoked: number;
}

/** GET /admin/v1/datacube/user-total — 用户总数卡片 */
export interface UserTotalResponse {
  authorized_user_count: number;
  authorized_wxa_login_count: number;
  registered_total: number;
  match_profile_total: number;
  match_profile_by_audit: MatchProfileAuditCounts;
  exited_match_count: number;
  /** 新注册用户数（is_migrated=false 全量，不受窗口限制） */
  new_registered_count: number;
  /** 新注册且提交脱单档案数（同上全量口径） */
  new_matched_count: number;
  migrated_total: number;
  migrated_activated: number;
  migrated_activated_matched: number;
}

export interface FeelingCounts {
  /** 关注次数 */
  like: number;
  /** 无感次数 */
  dislike: number;
  /** 撤销无感次数 */
  undo: number;
}

export interface OpinionCounts {
  /** 撮合次数 */
  match: number;
  /** 拆散次数 */
  split: number;
}

/** GET /admin/v1/datacube/interaction — 互动操作卡片 */
export interface InteractionTotalResponse {
  feeling: FeelingCounts;
  opinion: OpinionCounts;
  /** 心动总次数 */
  loves: number;
  /** 礼物赠送总次数 */
  gift: number;
  /** 神助攻总次数 */
  divine: number;
}

export interface DistributionItem {
  label: string;
  count: number;
}

/** GET /admin/v1/datacube/match-distribution — 脱单分布（群体=有脱单档案的用户，10 维度） */
export interface MatchDistributionResponse {
  age: DistributionItem[];
  audit_status: DistributionItem[];
  blood_type: DistributionItem[];
  education: DistributionItem[];
  gender: DistributionItem[];
  height: DistributionItem[];
  income_range: DistributionItem[];
  is_active: DistributionItem[];
  marital_status: DistributionItem[];
  zone: DistributionItem[];
}

/** GET /admin/v1/datacube/user-distribution — 注册用户分布（群体=全体用户，9 维度） */
export interface UserDistributionResponse {
  activated: DistributionItem[];
  age: DistributionItem[];
  channel: DistributionItem[];
  gender: DistributionItem[];
  has_match_profile: DistributionItem[];
  has_profile: DistributionItem[];
  migration: DistributionItem[];
  source: DistributionItem[];
  status: DistributionItem[];
}

/** GET /admin/v1/datacube/interaction-trend — 互动操作按日趋势 */
export interface InteractionTrendItem {
  date: string;
  feeling_like: number;
  feeling_dislike: number;
  feeling_undo: number;
  opinion_match: number;
  opinion_split: number;
  loves: number;
  gift: number;
  divine: number;
}

/** GET /admin/v1/datacube/register-trend — 注册 + 脱单资料提交按日趋势 */
export interface RegisterTrendItem {
  date: string;
  register_count: number;
  match_profile_count: number;
}

export interface UserTrendSeries {
  key: string;
  increments: number[];
}

/** GET /admin/v1/datacube/user-trend — 用户按日增量（5 系列） */
export interface UserTrendResponse {
  dates: string[];
  series: UserTrendSeries[];
}

export interface UserCumulativeSeries {
  key: string;
  cumulatives: number[];
}

/** GET /admin/v1/datacube/user-cumulative — 用户按日累计（7 系列 + 退出脱单当前值） */
export interface UserCumulativeResponse {
  dates: string[];
  series: UserCumulativeSeries[];
  exited_match_count: number;
}

/** series key → 中文名（未知 key 回退原文） */
export const USER_SERIES_LABELS: Record<string, string> = {
  wxa_login: '微信授权',
  new_registered: '新注册',
  activated: '老用户激活',
  activated_matched: '老脱单用户激活',
  match_profile: '提交脱单档案',
};

export const platformDatacubeApi = {
  /** 用户总数卡片 */
  getUserTotal: (params?: DatacubeRangeParams) => {
    return request.get('/admin/v1/datacube/user-total', { params });
  },

  /** 互动操作卡片（无参数） */
  getInteraction: () => {
    return request.get('/admin/v1/datacube/interaction');
  },

  /** 脱单分布统计（无参数） */
  getMatchDistribution: () => {
    return request.get('/admin/v1/datacube/match-distribution');
  },

  /** 注册用户分布统计（无参数） */
  getUserDistribution: () => {
    return request.get('/admin/v1/datacube/user-distribution');
  },

  /** 互动操作按日趋势 */
  getInteractionTrend: (params?: DatacubeRangeParams) => {
    return request.get('/admin/v1/datacube/interaction-trend', { params });
  },

  /** 注册 + 脱单资料提交按日趋势 */
  getRegisterTrend: (params?: DatacubeRangeParams) => {
    return request.get('/admin/v1/datacube/register-trend', { params });
  },

  /** 用户按日增量 */
  getUserTrend: (params?: DatacubeRangeParams) => {
    return request.get('/admin/v1/datacube/user-trend', { params });
  },

  /** 用户按日累计 */
  getUserCumulative: (params?: DatacubeRangeParams) => {
    return request.get('/admin/v1/datacube/user-cumulative', { params });
  },
};

export default platformDatacubeApi;
