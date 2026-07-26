import request from '..';
import { SensitiveWordStatus } from '@shared/constants/sensitive.enums';

// 模拟敏感词数据
const mockSensitiveWords = [
  { id: 1, word: '敏感词1', status: SensitiveWordStatus.ENABLED, createdAt: '2024-01-01 10:00:00', remark: '测试敏感词1' },
  { id: 2, word: '敏感词2', status: SensitiveWordStatus.DISABLED, createdAt: '2024-01-02 11:00:00', remark: '测试敏感词2' },
  { id: 3, word: '敏感词3', status: SensitiveWordStatus.ENABLED, createdAt: '2024-01-03 12:00:00', remark: '测试敏感词3' },
  { id: 4, word: '敏感词4', status: SensitiveWordStatus.ENABLED, createdAt: '2024-01-04 13:00:00', remark: '测试敏感词4' },
  { id: 5, word: '敏感词5', status: SensitiveWordStatus.DISABLED, createdAt: '2024-01-05 14:00:00', remark: '测试敏感词5' },
];

// 敏感词相关API
export const sensitiveApi = {
  // 获取敏感词列表
  getSensitiveWords: (params?: any) => {
    // 模拟数据支持
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          let filteredWords = [...mockSensitiveWords];

          // 模拟筛选逻辑
          if (params?.word) {
            filteredWords = filteredWords.filter(word =>
              word.word.includes(params.word)
            );
          }
          if (params?.status !== undefined && params.status !== '') {
            filteredWords = filteredWords.filter(word =>
              word.status === Number(params.status)
            );
          }

          resolve({
            data: filteredWords,
            total: filteredWords.length,
            page: 1,
            pageSize: 10
          });
        }, 500);
      });
    }
    return request.get('/sensitive/words', { params });
  },

  // 获取敏感词详情
  getSensitiveWordDetail: (id: number) => {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const word = mockSensitiveWords.find(w => w.id === id) || null;
          resolve({ data: word });
        }, 300);
      });
    }
    return request.get(`/sensitive/words/${id}`);
  },

  // 创建敏感词
  createSensitiveWord: (data: any) => {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const newWord = {
            id: mockSensitiveWords.length + 1,
            word: data.word,
            status: data.status,
            createdAt: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0],
            remark: data.remark || ''
          };
          mockSensitiveWords.push(newWord);
          resolve({ data: newWord, message: '创建成功' });
        }, 500);
      });
    }
    return request.post('/sensitive/words', data);
  },

  // 更新敏感词
  updateSensitiveWord: (id: number, data: any) => {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const index = mockSensitiveWords.findIndex(w => w.id === id);
          if (index !== -1) {
            mockSensitiveWords[index] = { ...mockSensitiveWords[index], ...data };
          }
          resolve({ data: mockSensitiveWords[index], message: '更新成功' });
        }, 500);
      });
    }
    return request.put(`/sensitive/words/${id}`, data);
  },

  // 删除敏感词
  deleteSensitiveWord: (id: number) => {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const index = mockSensitiveWords.findIndex(w => w.id === id);
          if (index !== -1) {
            mockSensitiveWords.splice(index, 1);
          }
          resolve({ message: '删除成功' });
        }, 500);
      });
    }
    return request.delete(`/sensitive/words/${id}`);
  },

  // 启用/禁用敏感词
  toggleSensitiveWordStatus: (id: number, status: number) => {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return new Promise((resolve) => {
        setTimeout(() => {
          const index = mockSensitiveWords.findIndex(w => w.id === id);
          if (index !== -1) {
            mockSensitiveWords[index].status = status;
          }
          resolve({ data: mockSensitiveWords[index], message: '状态更新成功' });
        }, 500);
      });
    }
    return request.patch(`/sensitive/words/${id}/status`, { status });
  },
};