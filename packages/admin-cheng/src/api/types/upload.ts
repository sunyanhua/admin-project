import type { UploadStatus } from './status';

/** 单文件上传结果 — Swagger UploadFileResult */
export interface UploadFileResult {
  file_id: string;
  file_url: string;
}

/** C 端图片上传结果 — Swagger UploadImageResult */
export interface UploadImageResult {
  media_id: string;
  media_url: string;
}

/** 分片上传结果 — Swagger ChunkResult */
export interface ChunkResult {
  file_id: string;
  file_url: string;
  chunk_index: number;
  status: UploadStatus;
}

/** 分片上传初始化结果 — Swagger InitChunkResult */
export interface InitChunkResult {
  chunk_ticket: string;
  file_id: string;
}
