import request from '..';

export const feedApi = {
  getFeeds: (params?: {
    start?: number;
    length?: number;
    keyword?: string;
    recom_tags?: number;
    status?: number;
    visible?: number;
  }) => {
    return request.get('/admin/v6/feed', { params });
  },

  getFeedDetail: (id: number) => {
    return request.get(`/admin/v6/feed/${id}`);
  },

  setFeedRecom: (id: number, recomTags: number) => {
    return request.post('/admin/v6/feed/recom', { id, recom_tags: recomTags });
  },

  setFeedRecomFlags: (id: number, recomFlags: number[]) => {
    return request.post('/admin/v6/feed/recom', { id, recom_flags: recomFlags });
  },

  deleteFeed: (id: number) => {
    return request.delete(`/admin/v6/feed/${id}`);
  },

  // 审核动态（通过/屏蔽）
  auditFeed: (id: number, status: number, inbox?: boolean, inboxTitle?: string, inboxIntro?: string) => {
    return request.post('/admin/v6/feed/status', { id, status, inbox, inbox_title: inboxTitle, inbox_intro: inboxIntro });
  },

  // 批量审核动态
  batchAuditFeed: (ids: number[], status: number) => {
    return request.post('/admin/v6/feed/batch/status', { ids, status });
  },

  // 获取评论列表
  getComments: (params?: {
    start?: number;
    length?: number;
    keyword?: string;
    feed_id?: number;
    status?: number;
  }) => {
    return request.get('/admin/v6/feed/comment', { params });
  },

  // 获取评论详情
  getCommentDetail: (id: number) => {
    return request.get(`/admin/v6/feed/comment/${id}`);
  },

  // 审核评论（通过/屏蔽）
  auditComment: (id: number, status: number) => {
    return request.post('/admin/v6/feed/comment/status', { id, status });
  },

  // 删除评论
  deleteComment: (id: number) => {
    return request.delete(`/admin/v6/feed/comment/${id}`);
  },
};
