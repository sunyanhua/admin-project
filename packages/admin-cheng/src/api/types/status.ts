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

/** 上传状态 */
export const UploadStatus = {
  /** 上传中（分片未完成或单文件未完成写入） */
  UPLOADING: 0,
  /** 已完成（单文件或最后一个分片写入完毕） */
  COMPLETED: 1,
} as const;
export type UploadStatus = (typeof UploadStatus)[keyof typeof UploadStatus];
