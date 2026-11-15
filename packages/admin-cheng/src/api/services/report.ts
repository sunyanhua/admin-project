import request from '..';

// ========================
// 举报（report）— 管理后台
// ========================

/** 举报处理状态（0=待处理 1=已处理 2=已驳回；与 swagger ReportStatus 一致） */
export enum ReportStatus {
  PENDING = 0,
  HANDLED = 1,
  REJECTED = 2,
}

export const REPORT_STATUS_LABELS: Record<number, string> = {
  [ReportStatus.PENDING]: '待处理',
  [ReportStatus.HANDLED]: '已处理',
  [ReportStatus.REJECTED]: '已驳回',
};

export const REPORT_STATUS_COLORS: Record<number, string> = {
  [ReportStatus.PENDING]: 'orange',
  [ReportStatus.HANDLED]: 'green',
  [ReportStatus.REJECTED]: 'red',
};

/** 举报附件（swagger AttachmentInfo：图片转存 CDN） */
export interface ReportAttachment {
  url?: string;
  media_id?: string;
  file_type?: number;
  random_code?: string;
  tags?: string;
  verify_code?: string;
}

/** 举报/被举报用户卡片 */
export interface AdminReportUserCard {
  user_id: string;
  nickname: string;
  avatar: string;
  gender: number;
  /** 能成号（8 位脱单号） */
  match_code: string;
}

/** 举报列表项 */
export interface AdminReportListItem {
  id: string;
  /** 0=待处理 1=已处理 2=已驳回 */
  status: number;
  content: string;
  created_at: string;
  reporter_id: string;
  target_user_id: string;
  /** 被举报能成号 */
  target_match_code: string;
  reporter: AdminReportUserCard;
  target: AdminReportUserCard;
  handle_remark: string;
  handled_at: string;
  handled_by: string;
}

/** 举报详情（列表项 + 附件） */
export interface AdminReportDetailResponse extends AdminReportListItem {
  attachments: ReportAttachment[];
}

/** 处理举报请求（目标状态仅允许 1=已处理 / 2=已驳回） */
export interface AdminHandleReportRequest {
  status: number;
  remark: string;
}

export const reportApi = {
  /** 举报列表（分页；status=处理状态；target_match_code=被举报能成号；start/end_time=RFC3339） */
  getList: (params?: { page?: number; size?: number; status?: number; target_match_code?: string; start_time?: string; end_time?: string }) => {
    return request.get('/admin/v1/bizops/report', { params });
  },

  /** 举报详情（含举报人/被举报人卡片与附件） */
  getDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/report/${id}`);
  },

  /** 处理举报（status: 1=已处理 2=已驳回；remark 必填） */
  handle: (id: string, data: AdminHandleReportRequest) => {
    return request.patch(`/admin/v1/bizops/report/${id}/handle`, data);
  },
};
