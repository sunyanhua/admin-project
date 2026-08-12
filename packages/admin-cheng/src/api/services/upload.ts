import axios from 'axios';
import { getAccessToken } from '..';
import type { UploadFileResult } from '../types/upload';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

/** 通用非分片上传辅助函数 */
const uploadFile = (
  file: File,
  endpoint: string,
  onProgress?: (percent: number) => void,
): Promise<UploadFileResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();

  return axios.post(`${BASE_URL}${endpoint}`, formData, {
    headers: { Authorization: `Bearer ${token}` },
    onUploadProgress: (progressEvent: any) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  }).then((res) => {
    const data = res.data;
    if (data.code === 0) return data.data as UploadFileResult;
    throw new Error(data.message || '上传失败');
  });
};

export const uploadApi = {
  /**
   * 上传图片（后台）
   * POST /admin/v1/upload/image   Content-Type: multipart/form-data
   * 不走 Vite 代理（代理不支持 multipart 透传），直连服务器
   * 鉴权：Authorization: Bearer <token>（按接口文档 §1.2）
   */
  uploadImage: (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<{ url?: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getAccessToken();

    return axios.post(`${BASE_URL}/admin/v1/upload/image`, formData, {
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

  /** 上传音频 — POST /admin/v1/upload/audio */
  uploadAudio: (file: File, onProgress?: (percent: number) => void) =>
    uploadFile(file, '/admin/v1/upload/audio', onProgress),

  /** 上传视频 — POST /admin/v1/upload/video */
  uploadVideo: (file: File, onProgress?: (percent: number) => void) =>
    uploadFile(file, '/admin/v1/upload/video', onProgress),

  /** 上传压缩包 — POST /admin/v1/upload/zipfile */
  uploadZipfile: (file: File, onProgress?: (percent: number) => void) =>
    uploadFile(file, '/admin/v1/upload/zipfile', onProgress),
};
