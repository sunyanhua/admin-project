import request from '..';

// 通用上传API
export const uploadApi = {
  /**
   * 通用图片上传接口
   * @param file 图片文件
   * @param onProgress 上传进度回调函数
   * @param options 可选参数: mts_audio, mts_video, mts_snap
   * @returns Promise<{ url: string }>
   */
  uploadImage: (
    file: File,
    onProgress?: (percent: number) => void,
    options?: { mts_audio?: boolean; mts_video?: boolean; mts_snap?: boolean }
  ) => {
    const formData = new FormData();
    // 接口要求字段名为 'upload'，不是 'file'
    formData.append('upload', file);

    // 添加可选参数
    if (options?.mts_audio !== undefined) {
      formData.append('mts_audio', String(options.mts_audio));
    }
    if (options?.mts_video !== undefined) {
      formData.append('mts_video', String(options.mts_video));
    }
    if (options?.mts_snap !== undefined) {
      formData.append('mts_snap', String(options.mts_snap));
    }

    return request.post('/admin/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },
};
