import request from '..';
import type { CreateWxaAppRequest, UpdateWxaAppRequest } from '../types/wxa';

/** 微信小程序配置查询参数 */
export interface WxaAppListParams {
  page?: number;
  size?: number;
  keyword?: string;
}

export const wxaApi = {
  /** 分页列表 — GET /admin/v1/wxa/app */
  getApps: (params?: WxaAppListParams) => {
    return request.get('/admin/v1/wxa/app', { params });
  },

  /** 详情 — GET /admin/v1/wxa/app/:id */
  getAppDetail: (id: number) => {
    return request.get(`/admin/v1/wxa/app/${id}`);
  },

  /** 创建 — POST /admin/v1/wxa/app */
  createApp: (data: CreateWxaAppRequest) => {
    return request.post('/admin/v1/wxa/app', data);
  },

  /** 更新 — PUT /admin/v1/wxa/app/:id */
  updateApp: (id: number, data: UpdateWxaAppRequest) => {
    return request.put(`/admin/v1/wxa/app/${id}`, data);
  },

  /** 软删除 — DELETE /admin/v1/wxa/app/:id */
  deleteApp: (id: number) => {
    return request.delete(`/admin/v1/wxa/app/${id}`);
  },

  /** 强制过期 AccessToken — POST /admin/v1/wxa/app/:id/expire-token */
  expireToken: (id: number) => {
    return request.post(`/admin/v1/wxa/app/${id}/expire-token`);
  },

  /** 状态切换 — PATCH /admin/v1/wxa/app/:id/status */
  updateStatus: (id: number, status: number) => {
    return request.patch(`/admin/v1/wxa/app/${id}/status`, { status });
  },

  // ========================
  // 小程序码 & 短链
  // ========================

  /** 生成小程序码 — POST /admin/v1/wxa/app/qrcode */
  createQrcode: (data: {
    appid: string;
    page: string;
    scene: string;
    encode?: boolean;
    width?: number;
    check_path?: boolean;
  }) => {
    return request.post('/admin/v1/wxa/app/qrcode', data);
  },

  /** 独立 scene 转码（返回 32 位短引用） — POST /admin/v1/wxa/app/scenes */
  createScene: (data: { data: string; expiry?: string }) => {
    return request.post('/admin/v1/wxa/app/scenes', data);
  },

  /** 生成小程序短链 — POST /admin/v1/wxa/app/shortlink */
  createShortlink: (data: {
    appid: string;
    page_url: string;
    page_title?: string;
    is_permanent?: boolean;
  }) => {
    return request.post('/admin/v1/wxa/app/shortlink', data);
  },
};
