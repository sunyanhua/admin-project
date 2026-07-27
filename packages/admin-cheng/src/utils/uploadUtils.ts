import axios from 'axios';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface ChunkUploadResult {
  file_id: string;
  file_url: string;
}

/**
 * 分片上传（支持音频、视频、压缩包）
 *
 * 3 阶段状态机：
 * - Phase 1 (init): HTTP 201 → 返回 chunk_ticket
 * - Phase 2 (upload): HTTP 202 → 继续上传，可能返回 chunk_ticket
 * - Phase 3 (complete): HTTP 200 → 返回 file_id + file_url
 *
 * @param file 文件对象
 * @param endpoint 分片上传端点，如 /admin/v1/upload/video/chunk
 * @param token Bearer token
 * @param onProgress 进度回调 (0-100)
 */
export async function uploadFileChunked(
  file: File,
  endpoint: string,
  token: string,
  onProgress?: (percent: number) => void,
): Promise<ChunkUploadResult> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let chunkTicket = '';

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunk, file.name);
    if (chunkTicket) {
      formData.append('chunk_ticket', chunkTicket);
    }
    formData.append('chunk_index', String(i));
    formData.append('total_chunks', String(totalChunks));

    const res = await axios.post(`${BASE_URL}${endpoint}`, formData, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = res.data;
    if (data.code !== 0) {
      throw new Error(data.message || '分片上传失败');
    }

    // Phase 1: 201 返回 chunk_ticket（初始化）
    if (res.status === 201 && data.data?.chunk_ticket) {
      chunkTicket = data.data.chunk_ticket;
    }

    // Phase 2/3: 202 继续上传 或 200 完成
    if ((res.status === 200 || res.status === 202) && data.data) {
      if (data.data.chunk_ticket) {
        chunkTicket = data.data.chunk_ticket;
      }
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
    }

    // 最后一片 → 200 返回完整结果
    if (i === totalChunks - 1 && data.code === 0 && data.data?.file_url) {
      return {
        file_id: data.data.file_id,
        file_url: data.data.file_url,
      };
    }
  }

  throw new Error('分片上传未完成');
}
