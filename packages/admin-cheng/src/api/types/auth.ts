/** POST /admin/v1/login 请求体 */
export interface AdminLoginRequest {
  username: string;
  password: string;
}

/** POST /admin/v1/login 响应 data */
export interface AdminLoginResponse {
  access_token: string;
  expires_at: string;
  /** Token 签发时间（Unix timestamp） */
  issued_at: number;
  token_type: string;
}

/** PUT /admin/v1/login/change-password 请求体 */
export interface AdminChangePasswordRequest {
  old_password: string;
  new_password: string;
}
