import request from '..';

// ========================
// 通知管理（订阅通知）
// ========================

/** 服务号关注绑定状态汇总（台账行级计数，每行=一次二维码生成请求） */
export interface SubscribeBindSummary {
  /** 待扫码行数（status=pending，含已过期） */
  pending_count: number;
  /** 其中已过期未扫码行数（pending_count 的子集） */
  expired_pending_count: number;
  /** 已绑定行数（status=bound） */
  bound_count: number;
  /** 已解绑行数（status=unbound） */
  unbound_count: number;
  /** 台账总行数 */
  total_count: number;
}

/** 广播批次创建结果 */
export interface TemplateBroadcastResult {
  id: string;
  status?: number;
  success_count?: number;
  fail_count?: number;
  created_at?: string;
}

export const notificationApi = {
  /** 服务号关注绑定状态汇总 — GET /admin/v1/notification/subscribe-bind/summary */
  getSubscribeBindSummary: () => {
    return request.get('/admin/v1/notification/subscribe-bind/summary');
  },

  /**
   * 发布服务号模板消息广播 — POST /admin/v1/notification/service-template/broadcast
   * 向全体已绑定服务号的用户异步广播；创建批次后由异步推送服务独立发送
   */
  broadcastServiceTemplate: (data: { content_thing5: string; content_character: string; page_path?: string }) => {
    return request.post('/admin/v1/notification/service-template/broadcast', data);
  },
};
