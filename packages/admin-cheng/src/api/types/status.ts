/** 管理员状态 */
export const AdminUserStatus = {
  /** 启用 */
  ACTIVE: 0,
  /** 停用 */
  DISABLED: 1,
} as const;
export type AdminUserStatus = (typeof AdminUserStatus)[keyof typeof AdminUserStatus];

/** 用户性别 */
export const UserGender = {
  /** 未设置（Register 阶段占位值） */
  UNSET: 0,
  /** 男 */
  MALE: 1,
  /** 女 */
  FEMALE: 2,
} as const;
export type UserGender = (typeof UserGender)[keyof typeof UserGender];

/** 用户性别文案（UNSET 不给文案，由调用方兜底为 '-'） */
export const UserGenderLabels: Record<number, string> = {
  [UserGender.MALE]: '男',
  [UserGender.FEMALE]: '女',
};

/** 基础资料审核状态 */
export const ProfileAuditStatus = {
  /** 待审核 */
  PENDING: 0,
  /** 审核通过 */
  APPROVED: 1,
  /** 审核拒绝 */
  REJECTED: 2,
} as const;
export type ProfileAuditStatus = (typeof ProfileAuditStatus)[keyof typeof ProfileAuditStatus];

/** 脱单档案审核状态 */
export const MatchProfileAuditStatus = {
  /** 待审核 */
  PENDING: 0,
  /** 审核通过 */
  APPROVED: 1,
  /** 审核拒绝 */
  REJECTED: 2,
  /** 已撤销 */
  REVOKED: 3,
} as const;
export type MatchProfileAuditStatus = (typeof MatchProfileAuditStatus)[keyof typeof MatchProfileAuditStatus];

/** 脱单档案审核动作 */
export const MatchProfileAuditAction = {
  /** 通过 */
  APPROVE: 1,
  /** 拒绝 */
  REJECT: 2,
} as const;
export type MatchProfileAuditAction = (typeof MatchProfileAuditAction)[keyof typeof MatchProfileAuditAction];

/** 角色状态 */
export const AdminRoleStatus = {
  /** 启用 */
  ACTIVE: 0,
  /** 停用 */
  DISABLED: 1,
} as const;
export type AdminRoleStatus = (typeof AdminRoleStatus)[keyof typeof AdminRoleStatus];

/** 上传状态 */
export const UploadStatus = {
  /** 上传中（分片未完成或单文件未完成写入） */
  UPLOADING: 0,
  /** 已完成（单文件或最后一个分片写入完毕） */
  COMPLETED: 1,
} as const;
export type UploadStatus = (typeof UploadStatus)[keyof typeof UploadStatus];

/** 收入范围 */
export const IncomeRange = {
  /** 5000 以下 */
  BELOW_5K: 1,
  /** 5000–8000 */
  FIVE_K_TO_8K: 2,
  /** 8000–12000 */
  EIGHT_K_TO_12K: 3,
  /** 12000–18000 */
  TWELVE_K_TO_18K: 4,
  /** 18000 以上 */
  ABOVE_18K: 5,
} as const;
export type IncomeRange = (typeof IncomeRange)[keyof typeof IncomeRange];

/** 脱单档案可见范围 */
export const UserVisibility = {
  /** 全开放 — 所有用户可见 */
  FULL: 1,
  /** 仅专区 — 仅配对关系用户可见 */
  ZONE: 2,
  /** 全隐藏 — 不对任何人展示 */
  HIDE: 3,
} as const;
export type UserVisibility = (typeof UserVisibility)[keyof typeof UserVisibility];

/** 婚姻状况 */
export const MaritalStatus = {
  /** 未婚 */
  UNMARRIED: 1,
  /** 离异 */
  DIVORCED: 2,
  /** 丧偶 */
  WIDOWED: 3,
} as const;
export type MaritalStatus = (typeof MaritalStatus)[keyof typeof MaritalStatus];

/** 婚姻状况文案 */
export const MaritalStatusLabels: Record<number, string> = {
  [MaritalStatus.UNMARRIED]: '未婚',
  [MaritalStatus.DIVORCED]: '离异',
  [MaritalStatus.WIDOWED]: '丧偶',
};

/** 学历 */
export const Education = {
  /** 高中及以下 */
  HIGH_SCHOOL: 1,
  /** 大专 */
  ASSOCIATE: 2,
  /** 本科 */
  BACHELOR: 3,
  /** 硕士 */
  MASTER: 4,
  /** 博士及以上 */
  DOCTORATE: 5,
} as const;
export type Education = (typeof Education)[keyof typeof Education];

/** 学历文案 */
export const EducationLabels: Record<number, string> = {
  [Education.HIGH_SCHOOL]: '高中及以下',
  [Education.ASSOCIATE]: '大专',
  [Education.BACHELOR]: '本科',
  [Education.MASTER]: '硕士',
  [Education.DOCTORATE]: '博士及以上',
};
