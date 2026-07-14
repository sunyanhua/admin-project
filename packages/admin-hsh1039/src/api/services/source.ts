import request from '..';

// 来源类型
export interface Source {
  id: number;
  key: string;
  title: string;
  cover: string;
  brief: string;
  intro: string;
  image: string;
  audio: string;
  video: string;
  extra: string;
  usable: string;
  expiry: string;
  insertat: string;
  updateat: string;
  status: number;
  visible: boolean;
  user_total: number;
  reported_total: number;
}

// 来源管理相关API
export const sourceApi = {
  // 获取来源列表（v6）
  getSources: (params: {
    key?: string;
    status?: number;
    visible?: boolean;
    orderby?: number;
    start?: number;
    length?: number;
    keyword?: string;
  }) => {
    return request.get('/admin/v6/source', { params });
  },

  // 添加来源（v6）- formData格式
  addSource: (data: {
    key?: string;
    title?: string;
    cover?: string;
    brief?: string;
    intro?: string;
    image?: string;
    audio?: string;
    video?: string;
    extra?: string;
    usable?: string;
    expiry?: string;
    status?: number;
    visible?: boolean;
    arg_0?: string;
    arg_1?: string;
    arg_2?: string;
    arg_3?: string;
    arg_4?: string;
    arg_5?: string;
    arg_6?: string;
    arg_7?: string;
    arg_8?: string;
    arg_9?: string;
  }) => {
    const formData = new URLSearchParams();
    if (data.key !== undefined) formData.append('key', data.key);
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.cover !== undefined) formData.append('cover', data.cover);
    if (data.brief !== undefined) formData.append('brief', data.brief);
    if (data.intro !== undefined) formData.append('intro', data.intro);
    if (data.image !== undefined) formData.append('image', data.image);
    if (data.audio !== undefined) formData.append('audio', data.audio);
    if (data.video !== undefined) formData.append('video', data.video);
    if (data.extra !== undefined) formData.append('extra', data.extra);
    if (data.usable !== undefined) formData.append('usable', data.usable);
    if (data.expiry !== undefined) formData.append('expiry', data.expiry);
    if (data.status !== undefined) formData.append('status', String(data.status));
    if (data.visible !== undefined) formData.append('visible', String(data.visible));
    if (data.arg_0 !== undefined) formData.append('arg_0', data.arg_0);
    if (data.arg_1 !== undefined) formData.append('arg_1', data.arg_1);
    if (data.arg_2 !== undefined) formData.append('arg_2', data.arg_2);
    if (data.arg_3 !== undefined) formData.append('arg_3', data.arg_3);
    if (data.arg_4 !== undefined) formData.append('arg_4', data.arg_4);
    if (data.arg_5 !== undefined) formData.append('arg_5', data.arg_5);
    if (data.arg_6 !== undefined) formData.append('arg_6', data.arg_6);
    if (data.arg_7 !== undefined) formData.append('arg_7', data.arg_7);
    if (data.arg_8 !== undefined) formData.append('arg_8', data.arg_8);
    if (data.arg_9 !== undefined) formData.append('arg_9', data.arg_9);
    return request.post('/admin/v6/source', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  // 更新来源（v6）- formData格式
  updateSource: (id: number, data: {
    key?: string;
    title?: string;
    cover?: string;
    brief?: string;
    intro?: string;
    image?: string;
    audio?: string;
    video?: string;
    extra?: string;
    usable?: string;
    expiry?: string;
    status?: number;
    visible?: boolean;
    arg_0?: string;
    arg_1?: string;
    arg_2?: string;
    arg_3?: string;
    arg_4?: string;
    arg_5?: string;
    arg_6?: string;
    arg_7?: string;
    arg_8?: string;
    arg_9?: string;
  }) => {
    const formData = new URLSearchParams();
    if (data.key !== undefined) formData.append('key', data.key);
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.cover !== undefined) formData.append('cover', data.cover);
    if (data.brief !== undefined) formData.append('brief', data.brief);
    if (data.intro !== undefined) formData.append('intro', data.intro);
    if (data.image !== undefined) formData.append('image', data.image);
    if (data.audio !== undefined) formData.append('audio', data.audio);
    if (data.video !== undefined) formData.append('video', data.video);
    if (data.extra !== undefined) formData.append('extra', data.extra);
    if (data.usable !== undefined) formData.append('usable', data.usable);
    if (data.expiry !== undefined) formData.append('expiry', data.expiry);
    if (data.status !== undefined) formData.append('status', String(data.status));
    if (data.visible !== undefined) formData.append('visible', String(data.visible));
    if (data.arg_0 !== undefined) formData.append('arg_0', data.arg_0);
    if (data.arg_1 !== undefined) formData.append('arg_1', data.arg_1);
    if (data.arg_2 !== undefined) formData.append('arg_2', data.arg_2);
    if (data.arg_3 !== undefined) formData.append('arg_3', data.arg_3);
    if (data.arg_4 !== undefined) formData.append('arg_4', data.arg_4);
    if (data.arg_5 !== undefined) formData.append('arg_5', data.arg_5);
    if (data.arg_6 !== undefined) formData.append('arg_6', data.arg_6);
    if (data.arg_7 !== undefined) formData.append('arg_7', data.arg_7);
    if (data.arg_8 !== undefined) formData.append('arg_8', data.arg_8);
    if (data.arg_9 !== undefined) formData.append('arg_9', data.arg_9);
    return request.post(`/admin/v6/source/${id}`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  // 删除来源（v6）
  deleteSource: (id: number) => {
    return request.post('/admin/v6/source/delete', `id=${id}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  // 更新来源状态（v6）
  updateSourceStatus: (id: number, status: number) => {
    return request.post('/admin/v6/source/status', `id=${id}&status=${status}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
};