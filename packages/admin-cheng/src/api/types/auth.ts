/** POST /admin/v1/login 请求体 */
export interface AdminLoginRequest {
  username: string;
  password: string;
}

/** POST /admin/v1/login 响应 data */
export interface AdminLoginResponse {
  access_token: string;
  /** Token 过期时间（Unix timestamp，秒） */
  expires_at: number;
  /** Token 签发时间（Unix timestamp，秒） */
  issued_at: number;
  token_type: string;
}

/** PUT /admin/v1/login/change-password 请求体 */
export interface AdminChangePasswordRequest {
  old_password: string;
  new_password: string;
}

/** 角色简要信息（内嵌在 profile 响应中） */
export interface AdminProfileRole {
  id: string;
  name: string;
  description: string;
}

/** GET /admin/v1/login/profile 响应 data */
export interface AdminProfileResponse {
  id: string;
  username: string;
  real_name: string;
  email: string;
  phone: string;
  is_root: boolean;
  roles: AdminProfileRole[];
  permissions: string[];
  status: number;
  need_change_password: boolean;
  created_at: string;
  updated_at: string;
}
