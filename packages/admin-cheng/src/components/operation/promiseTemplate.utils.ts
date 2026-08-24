/**
 * 承诺书模版 — 数据序列化/解析工具
 *
 * 持久化结构：setting 接口中 key=activity_promise 的 value 为 JSON 字符串，
 * 形如 { "templates": [{ id, title, content }, ...] }。
 *
 * 该文件独立于 React 组件，方便单元测试覆盖边界情况。
 */

export interface PromiseTemplate {
  id: string;
  title: string;
  content: string;
}

/** 持久化字段名 */
export const TEMPLATES_FIELD = 'templates';

/** setting 接口的 key */
export const PROMISE_SETTING_KEY = 'activity_promise';
/** setting 接口的分组 */
export const PROMISE_SETTING_GROUP = 'activity';

/**
 * 解析 setting 接口返回的 value 字段，提取模板数组。
 *
 * 兼容多种历史/边界输入：
 *   - null / undefined / '' → []
 *   - JSON 字符串（形如 { templates: [...] } 或 [...]）→ 解析后归一化
 *   - 已解析对象 → 读取 templates 字段
 *   - 已解析数组 → 直接当作模板列表
 *   - 解析失败或非对象输入 → []（静默降级，绝不抛错）
 *
 * 同时过滤掉字段不完整的项（id/title/content 任一为空）。
 */
export function parseStoredValue(value: unknown): PromiseTemplate[] {
  if (value === null || value === undefined || value === '') return [];

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!parsed || typeof parsed !== 'object') return [];

  let list: unknown[];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (Array.isArray((parsed as Record<string, unknown>)[TEMPLATES_FIELD])) {
    list = (parsed as Record<string, unknown>)[TEMPLATES_FIELD] as unknown[];
  } else {
    return [];
  }

  return list.filter(isValidTemplate);
}

function isValidTemplate(item: unknown): item is PromiseTemplate {
  if (!item || typeof item !== 'object') return false;
  const t = item as Record<string, unknown>;
  return (
    typeof t.id === 'string' && t.id.length > 0 &&
    typeof t.title === 'string' && t.title.length > 0 &&
    typeof t.content === 'string' && t.content.length > 0
  );
}

/** 把模板数组序列化为持久化的 JSON 字符串 */
export function serializeTemplates(templates: PromiseTemplate[]): string {
  return JSON.stringify({ [TEMPLATES_FIELD]: templates });
}

/** 生成模板唯一 id（前端本地生成，不依赖后端） */
export function generateTemplateId(): string {
  return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 拖动排序：把 from 位置的元素移动到 to 位置，返回新数组（不可变）。
 *
 * 边界处理：
 *   - from 与 to 相同 → 返回顺序相同的副本
 *   - from / to 越界（含负数）→ 返回顺序相同的副本，不抛错
 */
export function reorderTemplates(templates: PromiseTemplate[], from: number, to: number): PromiseTemplate[] {
  if (from === to || from < 0 || to < 0 || from >= templates.length || to >= templates.length) {
    return [...templates];
  }
  const next = [...templates];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** extra_params 字段中「承诺书」键名 */
export const EXTRA_PROMISE_KEY = 'promise';

/**
 * 从活动的 extra_params（JSON 字符串或对象）中提取已选承诺书的 id 列表。
 *
 * 兼容：
 *   - null / undefined / '' / 非法 JSON → []
 *   - 已是对象 → 直接读取 promise 字段
 *   - 字符串   → JSON.parse 后再读
 *   - 过滤掉非字符串 / 空字符串的 id
 */
export function parsePromiseIdsFromExtra(extra: unknown): string[] {
  if (extra === null || extra === undefined || extra === '') return [];

  let parsed: unknown = extra;
  if (typeof extra === 'string') {
    try {
      parsed = JSON.parse(extra);
    } catch {
      return [];
    }
  }

  if (!parsed || typeof parsed !== 'object') return [];

  const list = (parsed as Record<string, unknown>)[EXTRA_PROMISE_KEY];
  if (!Array.isArray(list)) return [];

  return list
    .map((item: unknown) =>
      item && typeof item === 'object' ? (item as Record<string, unknown>).id : undefined,
    )
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
}