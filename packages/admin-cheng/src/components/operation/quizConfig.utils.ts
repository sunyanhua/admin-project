/**
 * 默契问答配置 — 数据序列化/解析工具
 *
 * 持久化结构：setting 接口中 key=activity_test 的 value 为 JSON 字符串，
 * 形如 { "score_range": 100, "questions": ["题目1", "题目2", ...] }。
 *
 * 该文件独立于 React 组件，方便单元测试覆盖边界情况。
 */

export interface QuizQuestion {
  id: string;
  text: string;
}

/** setting 接口的 key */
export const QUIZ_SETTING_KEY = 'activity_test';
/** setting 接口的分组 */
export const QUIZ_SETTING_GROUP = 'activity';

/** 持久化字段名 */
export const SCORE_RANGE_FIELD = 'score_range';
export const QUESTIONS_FIELD = 'questions';

export interface ParsedQuizConfig {
  /** 分数范围（正整数）；持久化值非法时为 null */
  scoreRange: number | null;
  questions: QuizQuestion[];
}

/**
 * 解析 setting 接口返回的 value 字段，提取分数范围与题目列表：
 * - null / undefined / '' → { scoreRange: null, questions: [] }
 * - JSON 字符串或已解析对象 → 读取 score_range（仅正整数合法）与 questions（仅非空字符串）
 * - 解析失败 / 非对象 / 数组 → 静默降级默认值，绝不抛错
 */
export function parseQuizValue(value: unknown): ParsedQuizConfig {
  if (value === null || value === undefined || value === '') return { scoreRange: null, questions: [] };

  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return { scoreRange: null, questions: [] };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { scoreRange: null, questions: [] };
  const obj = parsed as Record<string, unknown>;

  const sr = obj[SCORE_RANGE_FIELD];
  const scoreRange = typeof sr === 'number' && Number.isInteger(sr) && sr > 0 ? sr : null;

  const raw = obj[QUESTIONS_FIELD];
  const questions = Array.isArray(raw)
    ? raw
        .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
        .map((text, i) => ({ id: `q_${i + 1}`, text }))
    : [];

  return { scoreRange, questions };
}

/** 把配置序列化为持久化的 JSON 字符串 */
export function serializeQuiz(scoreRange: number, questions: string[]): string {
  return JSON.stringify({ [SCORE_RANGE_FIELD]: scoreRange, [QUESTIONS_FIELD]: questions });
}

/** 生成题目唯一 id（前端本地生成，不依赖后端） */
export function generateQuestionId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 拖动排序：把 from 位置的元素移动到 to 位置，返回新数组（不可变）。
 * 边界处理：from 与 to 相同 / 越界（含负数）→ 返回顺序相同的副本，不抛错。
 */
export function reorderQuizQuestions(questions: QuizQuestion[], from: number, to: number): QuizQuestion[] {
  if (from === to || from < 0 || to < 0 || from >= questions.length || to >= questions.length) {
    return [...questions];
  }
  const next = [...questions];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
