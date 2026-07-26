import request from '..';
import { TopicStatus } from '@shared/constants/topic.enums';
import { MomentStatus, MomentType, MomentAuditStatus } from '@shared/constants/moment.enums';

// 模拟动态数据
const mockMoments = [
  { id: 1, content: '今天天气真好，适合户外运动！', author: '张三', authorId: 101, type: MomentType.TEXT, status: MomentStatus.NORMAL, auditStatus: MomentAuditStatus.APPROVED, likeCount: 24, commentCount: 5, createdAt: '2024-01-01 10:00:00' },
  { id: 2, content: '分享一张美景照片', author: '李四', authorId: 102, type: MomentType.IMAGE, status: MomentStatus.NORMAL, auditStatus: MomentAuditStatus.APPROVED, likeCount: 56, commentCount: 12, createdAt: '2024-01-02 14:30:00' },
  { id: 3, content: '骑行视频分享', author: '王五', authorId: 103, type: MomentType.VIDEO, status: MomentStatus.HIDDEN, auditStatus: MomentAuditStatus.REJECTED, likeCount: 8, commentCount: 2, createdAt: '2024-01-03 09:15:00' },
  { id: 4, content: '有趣的博客链接', author: '赵六', authorId: 104, type: MomentType.LINK, status: MomentStatus.NORMAL, auditStatus: MomentAuditStatus.PENDING, likeCount: 3, commentCount: 1, createdAt: '2024-01-04 16:45:00' },
  { id: 5, content: '周末徒步计划', author: '钱七', authorId: 105, type: MomentType.TEXT, status: MomentStatus.NORMAL, auditStatus: MomentAuditStatus.APPROVED, likeCount: 42, commentCount: 8, createdAt: '2024-01-05 11:20:00' },
];

// 模拟评论数据
const mockComments = [
  {
    id: 1,
    content: '这个活动看起来很棒，我想参加！',
    author: '张三',
    authorId: 101,
    momentId: 1,
    momentTitle: '今天天气真好，适合户外运动！',
    auditStatus: MomentAuditStatus.PENDING,
    createdAt: '2024-01-10 14:30:00',
    likeCount: 5,
    replyCount: 2,
  },
  {
    id: 2,
    content: '照片拍得真漂亮，景色太美了',
    author: '李四',
    authorId: 102,
    momentId: 2,
    momentTitle: '分享一张美景照片',
    auditStatus: MomentAuditStatus.APPROVED,
    createdAt: '2024-01-11 09:15:00',
    likeCount: 12,
    replyCount: 3,
  },
  {
    id: 3,
    content: '视频内容有点模糊，建议下次改进',
    author: '王五',
    authorId: 103,
    momentId: 3,
    momentTitle: '骑行视频分享',
    auditStatus: MomentAuditStatus.REJECTED,
    createdAt: '2024-01-12 16:45:00',
    likeCount: 2,
    replyCount: 1,
  },
  {
    id: 4,
    content: '链接打不开，请检查一下',
    author: '赵六',
    authorId: 104,
    momentId: 4,
    momentTitle: '有趣的博客链接',
    auditStatus: MomentAuditStatus.PENDING,
    createdAt: '2024-01-13 11:20:00',
    likeCount: 0,
    replyCount: 0,
  },
  {
    id: 5,
    content: '徒步路线看起来不错，周末去试试',
    author: '钱七',
    authorId: 105,
    momentId: 5,
    momentTitle: '周末徒步计划',
    auditStatus: MomentAuditStatus.APPROVED,
    createdAt: '2024-01-14 13:10:00',
    likeCount: 8,
    replyCount: 4,
  },
];

// 模拟话题数据
const mockTopics = [
  { id: 1, name: '周末骑行', description: '分享周末骑行经历和路线', status: TopicStatus.ENABLED, pinned: true, recommended: true, order: 1, createdAt: '2024-01-01 10:00:00' },
  { id: 2, name: '户外徒步', description: '户外徒步爱好者的交流话题', status: TopicStatus.ENABLED, pinned: false, recommended: true, order: 2, createdAt: '2024-01-02 11:00:00' },
  { id: 3, name: '美食探店', description: '分享美食探店体验', status: TopicStatus.ENABLED, pinned: false, recommended: false, order: 3, createdAt: '2024-01-03 12:00:00' },
  { id: 4, name: '摄影技巧', description: '摄影技巧交流与分享', status: TopicStatus.DISABLED, pinned: false, recommended: false, order: 4, createdAt: '2024-01-04 13:00:00' },
  { id: 5, name: '读书分享', description: '好书推荐与阅读心得', status: TopicStatus.ENABLED, pinned: true, recommended: false, order: 5, createdAt: '2024-01-05 14:00:00' },
];

// 动态管理相关API
export const momentApi = {
  // 获取动态列表
  getMoments: (params?: any) => {
    // 模拟数据支持
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          let filteredMoments = [...mockMoments];

          // 模拟筛选逻辑
          if (params?.content) {
            filteredMoments = filteredMoments.filter(moment =>
              moment.content.includes(params.content)
            );
          }
          if (params?.author) {
            filteredMoments = filteredMoments.filter(moment =>
              moment.author.includes(params.author)
            );
          }
          if (params?.type !== undefined && params.type !== '') {
            filteredMoments = filteredMoments.filter(moment =>
              moment.type === Number(params.type)
            );
          }
          if (params?.status !== undefined && params.status !== '') {
            filteredMoments = filteredMoments.filter(moment =>
              moment.status === Number(params.status)
            );
          }
          if (params?.auditStatus !== undefined && params.auditStatus !== '') {
            filteredMoments = filteredMoments.filter(moment =>
              moment.auditStatus === Number(params.auditStatus)
            );
          }

          // 模拟分页
          const page = params?.page || 1;
          const pageSize = params?.pageSize || 10;
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const paginatedMoments = filteredMoments.slice(start, end);

          resolve({
            list: paginatedMoments,
            total: filteredMoments.length,
            page: page,
            pageSize: pageSize
          });
        }, 500);
      });
    }
    return request.get('/admin/moments', { params });
  },

  // 获取动态详情
  getMomentDetail: (id: number) => {
    // 模拟数据支持
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const moment = mockMoments.find(m => m.id === id);
          if (moment) {
            resolve({ data: moment });
          } else {
            resolve({ data: null, message: '动态不存在' });
          }
        }, 300);
      });
    }
    return request.get(`/admin/moments/${id}`);
  },

  // 审核动态
  reviewMoment: (id: number, action: 'approve' | 'reject', reason?: string) => {
    // 模拟数据支持
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const index = mockMoments.findIndex(m => m.id === id);
          if (index !== -1) {
            mockMoments[index].auditStatus = action === 'approve' ? MomentAuditStatus.APPROVED : MomentAuditStatus.REJECTED;
            resolve({ data: mockMoments[index], message: `动态已${action === 'approve' ? '通过' : '拒绝'}` });
          } else {
            resolve({ data: null, message: '动态不存在' });
          }
        }, 300);
      });
    }
    return request.put(`/admin/moments/${id}/review`, { action, reason });
  },

  // 删除动态
  deleteMoment: (id: number) => {
    // 模拟数据支持
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const index = mockMoments.findIndex(m => m.id === id);
          if (index !== -1) {
            mockMoments.splice(index, 1);
            resolve({ message: '删除成功' });
          } else {
            resolve({ message: '动态不存在' });
          }
        }, 300);
      });
    }
    return request.delete(`/admin/moments/${id}`);
  },

  // 获取动态评论列表
  getMomentComments: (momentId: number, params?: any) => {
    // 模拟数据支持
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          let filteredComments = mockComments.filter(comment => comment.momentId === momentId);

          // 模拟筛选逻辑
          if (params?.content) {
            filteredComments = filteredComments.filter(comment =>
              comment.content.includes(params.content)
            );
          }
          if (params?.author) {
            filteredComments = filteredComments.filter(comment =>
              comment.author.includes(params.author)
            );
          }
          if (params?.auditStatus !== undefined && params.auditStatus !== '') {
            filteredComments = filteredComments.filter(comment =>
              comment.auditStatus === Number(params.auditStatus)
            );
          }

          // 模拟分页
          const page = params?.page || 1;
          const pageSize = params?.pageSize || 10;
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const paginatedComments = filteredComments.slice(start, end);

          resolve({
            list: paginatedComments,
            total: filteredComments.length,
            page: page,
            pageSize: pageSize
          });
        }, 300);
      });
    }
    return request.get(`/admin/moments/${momentId}/comments`, { params });
  },

  // 获取评论列表（所有评论）
  getComments: (params?: any) => {
    // 模拟数据支持
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          let filteredComments = [...mockComments];

          // 模拟筛选逻辑
          if (params?.content) {
            filteredComments = filteredComments.filter(comment =>
              comment.content.includes(params.content)
            );
          }
          if (params?.author) {
            filteredComments = filteredComments.filter(comment =>
              comment.author.includes(params.author)
            );
          }
          if (params?.momentTitle) {
            filteredComments = filteredComments.filter(comment =>
              comment.momentTitle.includes(params.momentTitle)
            );
          }
          if (params?.auditStatus !== undefined && params.auditStatus !== '') {
            filteredComments = filteredComments.filter(comment =>
              comment.auditStatus === Number(params.auditStatus)
            );
          }

          // 模拟分页
          const page = params?.page || 1;
          const pageSize = params?.pageSize || 10;
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const paginatedComments = filteredComments.slice(start, end);

          resolve({
            list: paginatedComments,
            total: filteredComments.length,
            page: page,
            pageSize: pageSize
          });
        }, 300);
      });
    }
    return request.get('/admin/comments', { params });
  },

  // 审核评论
  reviewComment: (id: number, action: 'approve' | 'reject', reason?: string) => {
    // 模拟数据支持
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const index = mockComments.findIndex(c => c.id === id);
          if (index !== -1) {
            mockComments[index].auditStatus = action === 'approve' ? MomentAuditStatus.APPROVED : MomentAuditStatus.REJECTED;
            resolve({ data: mockComments[index], message: `评论已${action === 'approve' ? '通过' : '拒绝'}` });
          } else {
            resolve({ data: null, message: '评论不存在' });
          }
        }, 300);
      });
    }
    return request.put(`/admin/comments/${id}/review`, { action, reason });
  },

  // 删除评论
  deleteComment: (id: number) => {
    // 模拟数据支持
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const index = mockComments.findIndex(c => c.id === id);
          if (index !== -1) {
            mockComments.splice(index, 1);
            resolve({ message: '删除成功' });
          } else {
            resolve({ message: '评论不存在' });
          }
        }, 300);
      });
    }
    return request.delete(`/admin/comments/${id}`);
  },

  // 获取话题列表
  getTopics: (params?: any) => {
    return request.get('/admin/v6/topic', { params });
  },

  // 创建话题
  createTopic: (data: any) => {
    return request.post('/admin/v6/topic', data);
  },

  // 更新话题
  updateTopic: (id: number, data: any) => {
    return request.post(`/admin/v6/topic/${id}`, data);
  },

  // 删除话题
  deleteTopic: (id: number) => {
    return request.post('/admin/v6/topic/delete', { id });
  },

  // 设置话题状态
  setTopicStatus: (id: number, status: number) => {
    return request.post('/admin/v6/topic/status', { id, status });
  },

  // 设置话题可见性
  setTopicVisible: (id: number, visible: boolean) => {
    return request.post('/admin/v6/topic/visible', { id, visible });
  },

  // 设置话题排序
  setTopicOrder: (id: number, orderon?: number) => {
    return request.post('/admin/v6/topic/orderon', { id, orderon });
  },
};