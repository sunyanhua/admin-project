import axios from 'axios';
import { getAccessToken } from '..';

/**
 * 上传图片（后台）
 * POST /admin/v1/upload/image   Content-Type: multipart/form-data
 * 不走 Vite 代理（代理不支持 multipart 透传），直连服务器
 * 鉴权：Authorization: Bearer <token>（按接口文档 §1.2）
 */
export const uploadApi = {
  uploadImage: (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ url?: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAccessToken();

    return axios.post('https://hsh-test.vbegin.com.cn/admin/v1/upload/image', formData, {
      headers: { Authorization: `Bearer ${token}` },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }).then((res) => {
      const data = res.data;
      if (data.code === 0) return data.data;
      throw new Error(data.message || '上传失败');
    });
  },
};
