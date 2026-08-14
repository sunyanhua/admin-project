/**
 * 解析日期字符串为本地时间
 * 服务器返回的 "YYYY-MM-DD HH:mm:ss" 格式会被 new Date() 按 UTC 解析，
 * 导致与本地时间差8小时。这里手工按各字段构造，确保是本地时区。
 */
export function parseAsLocal(dateStr: string): Date | null {
  // 带时区后缀（Z 或 ±hh:mm）→ Date 构造函数正确转换 UTC→本地
  if (/(Z|[+-]\d{2}:\d{2})$/.test(dateStr)) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  // 无时区后缀 → 手工按各字段构造，确保是本地时区
  // 匹配 "YYYY-MM-DD HH:mm:ss" 或 "YYYY-MM-DDTHH:mm:ss" 等变体
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return new Date(
    +m[1],           // year
    +m[2] - 1,       // month (0-based)
    +m[3],           // day
    +m[4],           // hours
    +m[5],           // minutes
    +m[6],           // seconds
  );
}

/**
 * 格式化日期时间
 * 格式：2026/04/08 06:05:08
 */
export const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-';

  try {
    const date = parseAsLocal(dateStr) || new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  } catch {
    return dateStr;
  }
};

import dayjs from 'dayjs';

/**
 * dayjs 安全解析：将 API 返回的日期字符串转为 dayjs 实例（始终按本地时间解析）。
 *
 * 用法：
 *   const d = safeDayjs(activity.start_time);
 *   // 用于 DatePicker value / RangePicker value / 回填 Form 时间字段
 *
 * 说明：项目没有安装 dayjs/plugin/utc，dayjs() 对不同格式的日期串解读不一致，
 * 有的当 UTC 有的当本地，导致与 DatePicker 显示差 8 小时。
 * 此方法强制手动拆解字段，保证 dayjs 实例的分秒与字符串字面值完全一致。
 */
export function safeDayjs(raw?: string | null): dayjs.Dayjs | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return undefined;
  const d = dayjs(new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  return d.isValid() ? d : undefined;
}

/**
 * 通用 API 时间解析：正确处理带时区后缀（Z / +08:00）的字符串。
 *
 * 后端将时间统一转 UTC 存储（如 2026-08-19T16:00:00Z = 本地 8 月 20 日 00:00）。
 * safeDayjs 无视时区后缀、按字面值构造本地时间，会把 Z 串差 8 小时。
 * 带时区后缀的字符串交给 new Date() 解析（自动 UTC→本地），其余走 safeDayjs。
 */
export function parseApiTime(raw?: string | null): dayjs.Dayjs | undefined {
  if (!raw) return undefined;
  if (raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? undefined : dayjs(d);
  }
  return safeDayjs(raw);
}

/**
 * dayjs 转 API 字符串：将 DatePicker 选出的 dayjs 实例格式化为后端传输串。
 *
 * 用法：
 *   const apiPayload = { start_time: dayjsToApi(startDayjs) };
 *
 * 说明：使用 .format('YYYY-MM-DDTHH:mm:ssZ') 动态追加本地时区偏移（如 +08:00）。
 * safeDayjs 通过 new Date(...) 构造，实例始终为本地时间，所以 Z token 始终输出 +08:00。
 * 禁止使用 .toISOString()（会转成 UTC，偏移 8 小时）。
 */
export function dayjsToApi(d?: dayjs.Dayjs | null): string | undefined {
  if (!d) return undefined;
  return d.format('YYYY-MM-DDTHH:mm:ssZ');
}

/**
 * 格式化日期
 * 格式：2026/04/08
 * 请使用日期格式化函数，不要直接操作字符串
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';

  try {
    const date = parseAsLocal(dateStr) || new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}/${month}/${day}`;
  } catch {
    return dateStr;
  }
};
