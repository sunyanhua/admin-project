// 话题相关类型定义

import { TopicStatus } from '@shared/constants/topic.enums';

// 话题基础信息
export interface Topic {
  id: number;
  name: string;
  description: string;
  status: TopicStatus;
  pinned: boolean;
  recommended: boolean;
  order: number;
  createdAt: string;
  // 可选字段，根据API响应扩展
  updatedAt?: string;
  coverImage?: string; // 话题封面图
  participantCount?: number; // 参与人数
  momentCount?: number; // 动态数量
}

// 话题列表查询参数
export interface TopicQueryParams {
  name?: string;
  status?: TopicStatus | '';
  pinned?: boolean | '';
  recommended?: boolean | '';
  page?: number;
  pageSize?: number;
}

// 话题创建/更新参数
export interface TopicFormData {
  name: string;
  description: string;
  status: TopicStatus;
  order: number;
  pinned: boolean;
  recommended: boolean;
  coverImage?: string;
}

// 话题列表响应
export interface TopicListResponse {
  list: Topic[];
  total: number;
  page: number;
  pageSize: number;
}

// 话题统计信息
export interface TopicStatistics {
  totalTopics: number;
  enabledTopics: number;
  disabledTopics: number;
  pinnedTopics: number;
  recommendedTopics: number;
  totalParticipants: number;
  totalMoments: number;
}