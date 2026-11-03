/**
 * 现场分组管理 — 纯逻辑工具
 *
 * 分组名称：onsite_config.groups（"|" 分隔字符串，如 "A|B|C"）。
 * 用户分组：报名记录 extra_data（JSONB 透传）顶层键 group_index（1 起）+ group_name。
 */

/** extra_data 中分组信息的键 */
export const GROUP_INDEX_KEY = 'group_index';
export const GROUP_NAME_KEY = 'group_name';

/** 解析分组名称（"A|B|C" → ['A','B','C']；过滤空段） */
export function parseGroupNames(raw: string): string[] {
  return String(raw || '')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 从报名记录 extra_data 读取分组序号（1 起），未分组/非法返回 null */
export function parseGroupIndex(extraData?: string): number | null {
  if (!extraData) return null;
  try {
    const obj = JSON.parse(extraData);
    if (obj && typeof obj === 'object' && Number.isInteger(obj[GROUP_INDEX_KEY]) && obj[GROUP_INDEX_KEY] >= 1) {
      return obj[GROUP_INDEX_KEY];
    }
  } catch { /* 非法 JSON 视为未分组 */ }
  return null;
}

/** 按现场序号稳定排序（未分配序号排后，userId 兜底） */
const byNumber = <T extends { userId: string; number?: number | null }>(a: T, b: T): number =>
  (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER) || a.userId.localeCompare(b.userId);

/**
 * 自动分组：把所有用户分配到各组的序号（0 起）。
 * - 已组CP的男女必须分到同一组（pairs 按顺序轮询分配，组CP男女同组）；
 * - 未配对用户：男女分别按现场序号排序后轮询分配——各组人数平均、各组男女人数平均；
 *   女方从末组反向轮询，使两性余数落在不同组，总人数差异最小。
 * 性别未设置的用户按顺序轮询分配。
 */
export function autoAssignGroups<T extends { userId: string; gender: 'male' | 'female' | ''; number?: number | null }>(
  users: T[],
  groupCount: number,
  pairs: { maleId: string; femaleId: string }[] = [],
): Map<string, number> {
  const result = new Map<string, number>();
  if (groupCount < 1) return result;
  // 组CP男女同组：配对单元按顺序轮询分配
  const malePairIdx = new Map(pairs.map((p, i) => [p.maleId, i]));
  const femalePairIdx = new Map(pairs.map((p, i) => [p.femaleId, i]));
  pairs.forEach((p, i) => {
    const g = i % groupCount;
    result.set(p.maleId, g);
    result.set(p.femaleId, g);
  });
  // 未配对用户：男女分别轮询；起始组偏移配对数量，使余数不与配对余数聚在同组
  const maleStart = pairs.length % groupCount;
  const femaleStart = (groupCount - 1 - (pairs.length % groupCount) + groupCount) % groupCount;
  const males = users.filter((u) => u.gender === 'male' && !malePairIdx.has(u.userId)).sort(byNumber);
  const females = users.filter((u) => u.gender === 'female' && !femalePairIdx.has(u.userId)).sort(byNumber);
  const others = users.filter((u) => u.gender !== 'male' && u.gender !== 'female').sort(byNumber);
  males.forEach((u, i) => result.set(u.userId, (maleStart + i) % groupCount));
  females.forEach((u, i) => result.set(u.userId, (femaleStart + i) % groupCount));
  others.forEach((u, i) => result.set(u.userId, i % groupCount));
  return result;
}

/** 移除 extra_data 中的分组信息，返回新 JSON 字符串（保留其他键；无剩余键时返回空对象 JSON） */
export function stripGroupInfo(extraData: string): string {
  let obj: Record<string, any> = {};
  try {
    const parsed = JSON.parse(extraData || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = parsed;
  } catch { /* 原值非法则从空对象开始 */ }
  delete obj[GROUP_INDEX_KEY];
  delete obj[GROUP_NAME_KEY];
  return JSON.stringify(obj);
}
