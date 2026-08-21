import type { UserGender, ProfileAuditStatus, MatchProfileAuditStatus, IncomeRange } from './status';

// ========== C 端用户列表（社区管理） ==========

/** 用户账户摘要 */
export interface CommunityUserSummary {
  user_id: string;
  phone: string;
  wallet_balance: number;
  credits: number;
  credits_weekly: number;
  credits_weekly_rank: number | null;
  is_migrated: boolean;
  is_activated: boolean;
  activated_at: string | null;
  last_active_at: string | null;
  created_at: string;
  has_profile: boolean;
  has_match_profile: boolean;
  status?: number;
}

/** 用户资料摘要 */
export interface CommunityProfileSummary {
  nickname: string;
  avatar: string;
  gender: UserGender;
  birth_date: string;
  age: number;
  zodiac: string;
  audit_status: ProfileAuditStatus;
  created_at: string;
  updated_at: string;
}

/** 脱单档案摘要 */
export interface CommunityMatchProfileSummary {
  match_code: string;
  popularity: number;
  is_active: boolean;
  visibility: number;
  zone_id: string | null;
  real_name: string;
  cn_zodiac: string;
  marital_status: number;
  education: number;
  profession: string;
  workplace: string;
  hometown: string;
  current_city: string;
  height: number;
  weight: number;
  hobby_tags: string;
  income_range: IncomeRange | null;
  self_intro: string;
  partner_demand: string;
  photos?: string[];
  id_card_tail: string | null;
  /** 是否实名认证 */
  is_real_verified?: boolean;
  /** 是否单位/机构认证 */
  is_org_certified?: boolean;
  /** 毕业学校 */
  graduate?: string;
  /** 运营推荐截止时间（null=未推荐；过期保留展示，是否推荐中需与当前时间比较） */
  recommend_expire_at?: string | null;
  blood_type: number;
  ethnicity: string;
  household_registration: string;
  specialties: string;
  audit_status: MatchProfileAuditStatus;
  audit_reason: string | null;
  audited_by: string | null;
  audited_at: string | null;
  can_modify_at: string | null;
  extra: any;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 钱包摘要 */
export interface CommunityWalletSummary {
  points: number;
  points_earned: number;
  points_spent: number;
  coins: number;
  coins_earned: number;
  coins_spent: number;
  version: number;
  created_at: string;
  updated_at: string;
}

/** 社区用户列表项 */
export interface CommunityUserItem {
  user: CommunityUserSummary;
  profile: CommunityProfileSummary;
  match_profile?: CommunityMatchProfileSummary;
  wallet: CommunityWalletSummary | null;
}

/** 社区用户列表查询参数 */
export interface CommunityUserListParams {
  page?: number;
  size?: number;
  keyword?: string;
  status?: number;
  gender?: number;
  is_migrated?: boolean;
  is_activated?: boolean;
  has_profile?: boolean;
  has_match_profile?: boolean;
  match_audit_status?: number;
  zone_id?: string;
  /** 脱单档案可见范围：1=全开放 2=仅专区 3=全隐藏 */
  visibility?: number;
  /** 脱单档案是否在架（false=已退出） */
  is_active?: boolean;
}

// ========== 旧版（兼容保留） ==========

/** C 端用户列表项 — Swagger AdminUserListItem */
export interface AdminUserListItem {
  user_id: string;
  nickname: string;
  avatar: string;
  gender: UserGender;
  age: number;
  /** 手机号（脱敏，中间四位隐藏） */
  phone: string;
  profile_audit_status: ProfileAuditStatus;
  match_audit_status: MatchProfileAuditStatus;
  created_at: string;
  last_active_at: string;
}

/** C 端用户详情 — Swagger AdminUserDetailResponse（嵌套结构） */
export interface AdminUserDetailResponse {
  user: CommunityUserSummary;
  profile: CommunityProfileSummary;
  match_profile?: CommunityMatchProfileSummary;
  wallet: CommunityWalletSummary | null;
}

/** 脱单档案视图 — Swagger AdminUserMatchProfileView */
export interface AdminUserMatchProfileView {
  match_code: string;
  marital_status: number;
  education: number;
  profession: string;
  income_range: IncomeRange;
  height: number;
  weight: number;
  hobby_tags: string[];
  current_city: string;
  hometown: string;
  self_intro: string;
  partner_demand: string;
  audit_status: MatchProfileAuditStatus;
  audit_reason: string;
  audited_at: string;
  audited_by: string;
}

/** 审核脱单档案请求 */
export interface AuditMatchProfileRequest {
  /** 1=通过, 2=拒绝 */
  action: 1 | 2;
  reason: string;
}

/** 用户隐私数据 — POST /admin/v1/bizops/user/privacy/{id}（带水印审计） */
export interface AdminUserPrivacyResponse {
  user_id: string;
  /** 真实姓名（脱敏） */
  real_name?: string;
  /** 身份证号码（脱敏） */
  id_card?: string;
  id_card_tail?: string;
  /** 手机号（脱敏） */
  phone?: string;
  /** 是否实名认证 */
  is_real_verified?: boolean;
  /** 本次读取水印 ID（审计日志关联） */
  watermark_id?: string;
}

/** 用户隐私数据列表 — POST /admin/v1/bizops/user/privacy */
export interface AdminUserPrivacyListResponse {
  items: AdminUserPrivacyResponse[];
  total: number;
  /** 本次读取水印 ID（审计日志关联） */
  watermark_id?: string;
}

/** 设置/取消脱单资料推荐请求 — PATCH /admin/v1/bizops/user/{id}/match-profile/recommend */
export interface AdminSetMatchProfileRecommendRequest {
  /** 变更原因（必填，写入审计日志） */
  reason: string;
  /** 推荐截止时间 RFC3339；null/省略 = 取消推荐 */
  recommend_expire_at?: string | null;
}

/** 管理员修改 C 端用户基础资料请求 */
export interface AdminUpdateBasicProfileRequest {
  nickname?: string;
  gender?: 1 | 2;
  birth_date?: string;
  zodiac?: string;
  /** 审核状态：1=通过 2=拒绝 */
  audit_status?: 1 | 2;
  /** 变更原因（必填） */
  reason: string;
  real_name?: string; // 保留兼容
}
