/**
 * 解析日期字符串为本地时间
 * 服务器返回的 "YYYY-MM-DD HH:mm:ss" 格式会被 new Date() 按 UTC 解析，
 * 导致与本地时间差8小时。这里手工按各字段构造，确保是本地时区。
 */
export function parseAsLocal(dateStr: string): Date | null {
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

/**
 * 格式化日期
 * 格式：2026/04/08
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
