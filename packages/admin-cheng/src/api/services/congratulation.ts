import request from '..';

// ========================
// 报喜（congratulation）— 管理后台
// ========================

/** 附件信息（照片/结婚证通用） */
export interface CongratulationAttachment {
  url?: string;
  file_type?: number;
  media_id?: string;
}

/** 报喜列表条目 */
export interface AdminCongratulationItem {
  id: string;
  /** 0=已提交 1=已通过 2=未通过 */
  status: number;
  created_at?: string;
  approved_at?: string;
  audited_at?: string;
  audited_by?: string;
  audit_reason?: string;
  is_hidden?: boolean;
  is_official_gift?: boolean;
  /** 官方随份子金额（分） */
  gift_amount?: number;
  gift_set_at?: string;
  male_id?: string;
  male_nickname?: string;
  male_avatar?: string;
  female_id?: string;
  female_nickname?: string;
  female_avatar?: string;
  submitter_id?: string;
  submitter_nickname?: string;
  matching?: number;
  couple_id?: string;
  updated_at?: string;
}

/** 报喜详情（含照片、结婚证与双方用户数据） */
export interface AdminCongratulationDetail extends AdminCongratulationItem {
  /** 喜讯内容 */
  message?: string;
  photos?: CongratulationAttachment[];
  marriage_certificate?: CongratulationAttachment[];
  male?: { user?: any; profile?: any; match_profile?: any };
  female?: { user?: any; profile?: any; match_profile?: any };
}

/** 报喜礼物配置条目 */
export interface CongratulationGiftItem {
  id: string;
  name: string;
  image: string;
  /** 金币价格（0=免费） */
  price_coins: number;
  sort_order?: number;
  /** 0=启用 1=停用 */
  status: number;
  /** 可购买窗口（均可空=NULL 不限） */
  valid_from?: string;
  valid_to?: string;
  created_at?: string;
  updated_at?: string;
}

/** 创建/编辑礼物配置请求 */
export interface SaveCongratulationGiftRequest {
  name: string;
  image: string;
  price_coins: number;
  sort_order?: number;
  status?: number;
  valid_from?: string;
  valid_to?: string;
}

export const congratulationApi = {
  /** 报喜列表 */
  getList: (params?: { page?: number; size?: number; status?: number; hidden?: number; keyword?: string }) => {
    return request.get('/admin/v1/bizops/congratulation', { params });
  },

  /** 报喜详情 */
  getDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/congratulation/${id}`);
  },

  /** 审核报喜（通过时可一并提交官方随份子标记与金额，提交后不可变更） */
  audit: (id: string, data: { approved: boolean; reason?: string; is_official_gift?: boolean; gift_amount?: number }) => {
    return request.post(`/admin/v1/bizops/congratulation/${id}/audit`, data);
  },

  /** 设置报喜隐藏标记 */
  setHidden: (id: string, is_hidden: boolean) => {
    return request.patch(`/admin/v1/bizops/congratulation/${id}/hidden`, { is_hidden });
  },

  /** 对已通过的报喜独立设置官方随份子（提交后不可变更） */
  setGift: (id: string, data: { is_official_gift: boolean; gift_amount?: number }) => {
    return request.put(`/admin/v1/bizops/congratulation/${id}/gift`, data);
  },

  /** 报喜礼物配置列表 */
  getGifts: (params?: { page?: number; size?: number; status?: number; keyword?: string }) => {
    return request.get('/admin/v1/bizops/congratulation/gifts', { params });
  },

  /** 创建报喜礼物配置 */
  createGift: (data: SaveCongratulationGiftRequest) => {
    return request.post('/admin/v1/bizops/congratulation/gifts', data);
  },

  /** 编辑报喜礼物配置（PATCH 语义） */
  updateGift: (id: string, data: Partial<SaveCongratulationGiftRequest>) => {
    return request.put(`/admin/v1/bizops/congratulation/gifts/${id}`, data);
  },

  /** 删除报喜礼物配置（软删） */
  deleteGift: (id: string) => {
    return request.delete(`/admin/v1/bizops/congratulation/gifts/${id}`);
  },

  /** 启用/停用报喜礼物配置 */
  toggleGiftStatus: (id: string, status: number) => {
    return request.patch(`/admin/v1/bizops/congratulation/gifts/${id}/status`, { status });
  },
};
