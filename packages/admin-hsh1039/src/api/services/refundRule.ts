import request from '..';

export interface RefundRuleStage {
  days_before: number;
  /** 退款类型: "rate"=按比例退, "fixed"=固定金额退 */
  refund_type: 'rate' | 'fixed';
  refund_value: number;
}

export interface RefundRule {
  id: number;
  name: string;
  description?: string;
  is_system?: boolean;
  is_hidden?: boolean;
  stages?: RefundRuleStage[];
  created_at?: string;
  updated_at?: string;
}

export const refundRuleApi = {
  /** 退款规则列表 — GET /admin/v1/mall/refund-rules */
  getRules: (params?: { page?: number; page_size?: number; is_system?: boolean; is_hidden?: boolean }) => {
    return request.get('/admin/v1/mall/refund-rules', { params });
  },

  /** 退款规则详情 — GET /admin/v1/mall/refund-rules/{id} */
  getRuleDetail: (id: number) => {
    return request.get(`/admin/v1/mall/refund-rules/${id}`);
  },

  /** 创建退款规则 — POST /admin/v1/mall/refund-rules */
  createRule: (data: {
    name: string;
    description?: string;
    is_system?: boolean;
    is_hidden?: boolean;
    stages?: RefundRuleStage[];
  }) => {
    return request.post('/admin/v1/mall/refund-rules', data);
  },

  /** 更新退款规则 — PUT /admin/v1/mall/refund-rules/{id} */
  updateRule: (id: number, data: {
    name?: string;
    description?: string;
    is_system?: boolean;
    is_hidden?: boolean;
    stages?: RefundRuleStage[];
  }) => {
    return request.put(`/admin/v1/mall/refund-rules/${id}`, data);
  },

  /** 删除退款规则 — DELETE /admin/v1/mall/refund-rules/{id} */
  deleteRule: (id: number) => {
    return request.delete(`/admin/v1/mall/refund-rules/${id}`);
  },

  /** 更新隐藏状态 — PUT /admin/v1/mall/refund-rules/{id}/hidden */
  updateRuleHidden: (id: number, is_hidden: boolean) => {
    return request.put(`/admin/v1/mall/refund-rules/${id}/hidden`, { is_hidden });
  },
};
