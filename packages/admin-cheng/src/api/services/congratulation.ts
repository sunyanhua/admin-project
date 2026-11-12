import request from '..';

// ========================
// 报喜（congratulation）— 管理后台
// ========================

/** 提现状态 */
export enum WithdrawStatus {
  PROCESSING = 0, // 处理中
  SUCCESS = 1, // 提现成功
  FAILED = 2, // 提现失败
  PENDING_REVIEW = 3, // 待审核（2026-11-09：申请后须后台审核）
}

/** 提现记录条目 */
export interface WithdrawItem {
  id: string;
  withdraw_no: string;
  wx_transfer_no: string;
  /** 提现金额（分） */
  amount_cents: number;
  status: number;
  /** 需用户确认收款时返回（前端 wx.requestMerchantTransfer 拉起） */
  package_info: string;
  fail_reason: string;
  /** 申请用户简报（后端挂载，可能为 null） */
  user?: {
    user_id?: string;
    nickname?: string;
    avatar?: string;
  } | null;
  created_at: string;
  completed_at: string;
}

/** 随份子类型 */
export enum CongratulationTributeKind {
  GIFT = 1, // 站内礼物
  CASH = 2, // 现金红包
}

/** 随份子状态 */
export enum CongratulationTributeStatus {
  PENDING = 0, // 待支付
  COMPLETED = 1, // 已完成
  REFUNDED = 2, // 已退款
  CLOSED = 3, // 已关闭
}

/** 报喜赠送账单汇总请求（全部可选） */
export interface AdminTributeSummaryRequest {
  /** 报喜 ID */
  congratulation_id?: string;
  /** 礼物配置 ID */
  gift_id?: string;
  /** 赠送人昵称模糊匹配 */
  keyword?: string;
  /** 随份子类型：1=站内礼物 2=现金红包 */
  kind?: CongratulationTributeKind;
  /** 随份子状态：0=待支付 1=已完成 2=已退款 3=已关闭 */
  status?: CongratulationTributeStatus;
  /** 创建时间下界（RFC3339，含） */
  start_at?: string;
  /** 创建时间上界（RFC3339，含） */
  end_at?: string;
  /** 赠送人 ID */
  user_id?: string;
}

/** 赠送账单·类型+礼物分组 */
export interface AdminTributeGroup {
  kind: number;
  gift_id: string;
  gift_name: string;
  gift_image: string;
  count: number;
  coins: number;
  cents: number;
}

/** 赠送账单·状态分布 */
export interface AdminTributeStatusCount {
  status: number;
  count: number;
}

/** 报喜赠送账单汇总响应（金额仅统计已完成记录） */
export interface AdminTributeSummaryResponse {
  /** 符合筛选条件的记录总数（含各状态） */
  total_count: number;
  /** 其中已完成记录数 */
  completed_count: number;
  /** 已完成记录的赠送人去重人数 */
  total_users: number;
  /** 已完成站内礼物的金币合计 */
  total_coins: number;
  /** 已完成现金红包的金额合计（分） */
  total_cents: number;
  /** 状态分布（按状态升序） */
  status_counts: AdminTributeStatusCount[];
  /** 按类型 + 礼物快照分组（记录数降序） */
  groups: AdminTributeGroup[];
}

/** 现金红包档位（随份子金额） */
export interface AdminCashTierItem {
  id: string;
  name: string;
  /** 红包金额（分，100~520） */
  amount_cents: number;
  /** 代币数（与金额等额） */
  coin_amount: number;
  /** 关联充值档位 ID（历史/异常数据可能为 null） */
  recharge_product_id: string | null;
  sort_order: number;
  status: number;
  created_at: string;
  updated_at: string;
}

/** 新增现金红包档位请求（必须关联启用中的等额充值档位，实报实销） */
export interface CreateCashTierRequest {
  name: string;
  /** 红包金额（分，100~520） */
  amount_cents: number;
  /** 代币数（与金额等额） */
  coin_amount: number;
  /** 关联充值档位 v6_pay_coin_product.id */
  recharge_product_id: string;
  sort_order?: number;
  /** 0=启用 1=停用 */
  status?: number;
}

/** 更新现金红包档位请求（PUT 语义：未传字段保持原值） */
export type UpdateCashTierRequest = Partial<CreateCashTierRequest>;

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

  /** 报喜赠送账单汇总（按筛选条件统计；金额仅统计已完成记录） */
  getTributeSummary: (data: AdminTributeSummaryRequest) => {
    return request.post('/admin/v1/bizops/congratulation/finance/summary', data);
  },

  /** 现金红包档位列表（按 sort_order 升序） */
  getCashTiers: (params?: { page?: number; size?: number; status?: number }) => {
    return request.get('/admin/v1/bizops/congratulation/cash-tiers', { params });
  },

  /** 新增现金红包档位（必须关联启用中的等额充值档位） */
  createCashTier: (data: CreateCashTierRequest) => {
    return request.post('/admin/v1/bizops/congratulation/cash-tiers', data);
  },

  /** 编辑现金红包档位 */
  updateCashTier: (id: string, data: UpdateCashTierRequest) => {
    return request.put(`/admin/v1/bizops/congratulation/cash-tiers/${id}`, data);
  },

  /** 报喜详情 */
  getDetail: (id: string) => {
    return request.get(`/admin/v1/bizops/congratulation/${id}`);
  },

  /** 审核报喜（通过时可一并提交官方随份子标记与金额，提交后不可变更；支持重新审核） */
  audit: (id: string, data: { approved: boolean; reason?: string; is_official_gift?: boolean; gift_amount?: number }) => {
    return request.post(`/admin/v1/bizops/congratulation/${id}/audit`, data);
  },

  /** 撤销报喜（任意状态软删，清除双方脱单档案报喜标记；已收随份子保留） */
  revoke: (id: string) => {
    return request.delete(`/admin/v1/bizops/congratulation/${id}`);
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

  /** 提现记录查询（POST 承载以产生审计留痕） */
  getWithdraws: (params: {
    page?: number; size?: number; status?: number; user_id?: string; keyword?: string;
    start_date?: string; end_date?: string;
  }) => {
    return request.post('/admin/v1/bizops/congratulation/withdraws', params);
  },

  /** 提现审核通过（待审核 → 处理中，随后发起商家转账） */
  approveWithdraw: (id: string) => {
    return request.post(`/admin/v1/bizops/congratulation/withdraws/${id}/approve`);
  },

  /** 提现审核拒绝（待审核 → 失败并冲正来源子账） */
  rejectWithdraw: (id: string, reason: string) => {
    return request.post(`/admin/v1/bizops/congratulation/withdraws/${id}/reject`, { reason });
  },
};
