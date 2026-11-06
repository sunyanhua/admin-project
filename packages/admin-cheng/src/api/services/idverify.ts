import request from '..';

// ========================
// 实人认证（idverify）
// 接口文档：docs/api/cheng-swagger.json → tag「实人认证管理」
// ========================

/** 价格规则状态（全站统一标准：0=启用 1=停用） */
export enum PriceRuleStatus {
  ENABLED = 0,
  DISABLED = 1,
}

/** 认证记录状态 */
export enum IdVerifyRecordStatus {
  PENDING_PAYMENT = 0, // 待支付
  PENDING_VERIFY = 1, // 待认证/可重试
  PASSED = 2, // 已通过
  EXHAUSTED = 3, // 重试次数耗尽
  CLOSED = 4, // 已关闭/过期
  REFUNDED = 5, // 已退款
}

/** 价格规则列表项（响应经拦截器转换：{ list, total }） */
export interface PriceRule {
  id: string;
  name: string;
  /** 价格（金币），0=免费 */
  price_coins: number;
  /** 原价（金币），0=无原价 */
  original_price_coins: number;
  /** 生效开始时间 */
  start_at: string;
  /** 生效结束时间 */
  end_at: string;
  remark: string;
  status: number;
  created_at: string;
  updated_at: string;
}

/** 认证记录列表项（响应不含真实姓名/身份证号/CertifyUrl） */
export interface IdVerifyRecord {
  id: string;
  user_id: string;
  status: number;
  price_coins: number;
  original_price_coins: number;
  order_id: string;
  certify_id: string;
  attempt_count: number;
  failed_count: number;
  passed: boolean;
  sub_code: string;
  created_at: string;
  expires_at: string;
  verified_at: string;
}

/** 新增价格规则请求（启用规则时间区间不可与其它启用规则重叠 42226） */
export interface CreatePriceRuleRequest {
  name: string;
  start_at: string;
  end_at: string;
  /** 0=免费 */
  price_coins: number;
  /** 0=无原价 */
  original_price_coins?: number;
  remark?: string;
  /** 0=启用 1=停用 */
  status?: number;
}

/** 更新价格规则请求（PATCH 语义：未传字段保持原值） */
export type UpdatePriceRuleRequest = Partial<CreatePriceRuleRequest>;

export const idverifyApi = {
  /** 分页查询价格规则（按生效开始时间倒序） */
  getPriceRules: (params?: { page?: number; size?: number; status?: number; keyword?: string }) => {
    return request.get('/admin/v1/bizops/idverify/price-rules', { params });
  },

  /** 新增价格规则 */
  createPriceRule: (data: CreatePriceRuleRequest) => {
    return request.post('/admin/v1/bizops/idverify/price-rules', data);
  },

  /** 更新价格规则（PATCH 语义） */
  updatePriceRule: (id: string, data: UpdatePriceRuleRequest) => {
    return request.put(`/admin/v1/bizops/idverify/price-rules/${id}`, data);
  },

  /** 分页查询认证记录（按创建时间倒序） */
  getRecords: (params?: { page?: number; size?: number; status?: number; user_id?: string }) => {
    return request.get('/admin/v1/bizops/idverify/records', { params });
  },
};
