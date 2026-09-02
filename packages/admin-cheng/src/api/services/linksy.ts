import axios from 'axios';

/**
 * Linksy 图片分辨率改版接口（AI 图片调整尺寸）
 * 文档：D:\GitHub\Linksy\docs\open-api.md
 *
 * 流程：POST 提交图片+目标宽高 → 秒回 job_id → 轮询 GET → 完成后响应体即图片字节
 *
 * 鉴权说明（两种模式，由环境变量切换）：
 * - 网关模式（目标态）：VITE_LINKSY_BASE_URL=/linksy-api，同域请求由网关注入 X-API-Key，
 *   前端不持有密钥
 * - 直连模式（临时回退）：VITE_LINKSY_BASE_URL 为完整 Linksy 地址并配置 VITE_LINKSY_API_KEY，
 *   前端携带密钥直接请求（密钥暴露于浏览器）；服务器网关配置好后恢复网关模式
 */

const BASE_URL = (import.meta.env.VITE_LINKSY_BASE_URL || '/linksy-api').replace(/\/+$/, '');
/** 直连模式时前端携带的密钥；网关模式下为空，不携带 */
const API_KEY = import.meta.env.VITE_LINKSY_API_KEY || '';
const authHeaders = API_KEY ? { 'X-API-Key': API_KEY } : undefined;

/** 轮询间隔（毫秒），文档建议 5-10 秒 */
const POLL_INTERVAL_MS = 5000;
/** 最大轮询次数：72 次 × 5 秒 = 6 分钟（文档说明出图约 30-90 秒，高峰排队可能更久） */
const MAX_POLL_COUNT = 72;

export interface ResizeProgress {
  /** 当前阶段：received（排队中）/ drawing（AI绘制中） */
  status: string;
  /** 已轮询次数 */
  polled: number;
}

const isImageContentType = (contentType: string) =>
  contentType.toLowerCase().startsWith('image/');

/** 解析轮询返回的 JSON 状态（received / drawing） */
const parseStatus = (data: ArrayBuffer): string => {
  try {
    const text = new TextDecoder('utf-8').decode(data);
    const parsed = JSON.parse(text);
    return parsed?.status || 'received';
  } catch {
    return 'received';
  }
};

/**
 * AI 图片改尺寸：提交 → 轮询 → 返回结果图片 Blob
 * @param file 源图片文件（png/jpg/webp，≤15MB）
 * @param targetWidth 目标宽度 64-10000
 * @param targetHeight 目标高度 64-10000
 * @param onProgress 轮询进度回调（供 UI 展示状态文案）
 */
export const linksyResizeImage = async (
  file: File,
  targetWidth: number,
  targetHeight: number,
  onProgress?: (progress: ResizeProgress) => void,
): Promise<Blob> => {
  // ---- 1. 提交任务 ----
  const formData = new FormData();
  formData.append('image', file);
  formData.append('target_width', String(targetWidth));
  formData.append('target_height', String(targetHeight));

  let jobId: string;
  try {
    const submitRes = await axios.post(`${BASE_URL}/open/v1/image-resize`, formData, {
      headers: authHeaders,
    });
    jobId = submitRes.data?.job_id;
    if (!jobId) {
      throw new Error('AI 接口未返回任务 ID');
    }
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) throw new Error('AI 接口代理密钥未正确配置，请联系管理员');
    if (status === 429) throw new Error('AI 接口调用过于频繁，请稍后再试');
    if (status === 400) throw new Error('图片参数不合法（宽高 64-10000，图片 ≤15MB，支持 png/jpg/webp）');
    throw new Error(err?.response?.data?.message || err?.message || 'AI 接口提交失败');
  }

  // ---- 2. 轮询直到返回图片字节 ----
  for (let i = 1; i <= MAX_POLL_COUNT; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    let res: any;
    try {
      res = await axios.get(`${BASE_URL}/open/v1/image-resize/${jobId}`, {
        responseType: 'arraybuffer',
        headers: authHeaders,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) throw new Error('AI 任务已过期，请重新生成');
      if (status === 429) throw new Error('AI 接口轮询过于频繁，请稍后再试');
      throw new Error(err?.response?.data?.message || err?.message || 'AI 接口查询失败');
    }

    const contentType = String(res.headers?.['content-type'] || '');
    if (isImageContentType(contentType)) {
      return new Blob([res.data], { type: contentType });
    }

    const status = parseStatus(res.data);
    onProgress?.({ status, polled: i });
  }

  throw new Error('AI 生成超时（6 分钟），请重试');
};

export default linksyResizeImage;
