/** POST /admin/v1/wxa/app 请求体 */
export interface CreateWxaAppRequest {
  app_id: string;
  app_name: string;
  app_secret: string;
  app_type: string;
}

/** PUT /admin/v1/wxa/app/:id 请求体 */
export interface UpdateWxaAppRequest {
  id: number;
  app_name?: string;
  app_secret?: string;
  app_type?: string;
  status?: number;
}

/** PATCH /admin/v1/wxa/app/:id/status 请求体 */
export interface UpdateWxaAppStatusRequest {
  id: number;
  status: number;
}
