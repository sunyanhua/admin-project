import { describe, it, expect } from 'vitest';
import {
  parseQuizValue,
  serializeQuiz,
  reorderQuizQuestions,
  generateQuestionId,
  QUIZ_SETTING_KEY,
  QUIZ_SETTING_GROUP,
  SCORE_RANGE_FIELD,
  QUESTIONS_FIELD,
} from '@/components/operation/quizConfig.utils';
import type { QuizQuestion } from '@/components/operation/quizConfig.utils';

const q = (id: string, text: string): QuizQuestion => ({ id, text });

describe('parseQuizValue', () => {
  it('解析合法 JSON 字符串：正整数分数范围 + 非空题目列表', () => {
    const parsed = parseQuizValue('{"score_range": 100, "questions": ["题目一", "题目二"]}');
    expect(parsed.scoreRange).toBe(100);
    expect(parsed.questions.map((x) => x.text)).toEqual(['题目一', '题目二']);
  });

  it('解析已解析对象（非字符串）同样生效', () => {
    const parsed = parseQuizValue({ score_range: 80, questions: ['A'] });
    expect(parsed.scoreRange).toBe(80);
    expect(parsed.questions).toHaveLength(1);
  });

  it('空值/空字符串返回默认值', () => {
    expect(parseQuizValue(null)).toEqual({ scoreRange: null, questions: [] });
    expect(parseQuizValue(undefined)).toEqual({ scoreRange: null, questions: [] });
    expect(parseQuizValue('')).toEqual({ scoreRange: null, questions: [] });
  });

  it('非法 JSON / 非对象 / 数组输入静默降级默认值', () => {
    expect(parseQuizValue('not-json{')).toEqual({ scoreRange: null, questions: [] });
    expect(parseQuizValue(123)).toEqual({ scoreRange: null, questions: [] });
    expect(parseQuizValue(['a'])).toEqual({ scoreRange: null, questions: [] });
  });

  it('分数范围非法（缺/非整数/非正）时为 null', () => {
    expect(parseQuizValue('{"questions": ["A"]}').scoreRange).toBeNull();
    expect(parseQuizValue('{"score_range": 1.5, "questions": ["A"]}').scoreRange).toBeNull();
    expect(parseQuizValue('{"score_range": 0, "questions": ["A"]}').scoreRange).toBeNull();
    expect(parseQuizValue('{"score_range": -3, "questions": ["A"]}').scoreRange).toBeNull();
    expect(parseQuizValue('{"score_range": "100", "questions": ["A"]}').scoreRange).toBeNull();
  });

  it('题目列表过滤空串与非字符串项', () => {
    const parsed = parseQuizValue('{"score_range": 1, "questions": ["A", "", "  ", 5, null, "B"]}');
    expect(parsed.questions.map((x) => x.text)).toEqual(['A', 'B']);
  });
});

describe('serializeQuiz', () => {
  it('序列化为 { score_range, questions } JSON 字符串且可解析回读', () => {
    const value = serializeQuiz(100, ['题目一', '题目二']);
    const obj = JSON.parse(value);
    expect(obj[SCORE_RANGE_FIELD]).toBe(100);
    expect(obj[QUESTIONS_FIELD]).toEqual(['题目一', '题目二']);
    const parsed = parseQuizValue(value);
    expect(parsed.scoreRange).toBe(100);
    expect(parsed.questions.map((x) => x.text)).toEqual(['题目一', '题目二']);
  });
});

describe('reorderQuizQuestions', () => {
  it('把第 1 项移动到第 3 项位置', () => {
    const list = [q('a', 'A'), q('b', 'B'), q('c', 'C')];
    const next = reorderQuizQuestions(list, 0, 2);
    expect(next.map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(list.map((x) => x.id)).toEqual(['a', 'b', 'c']); // 原数组不变
  });

  it('相同位置 / 越界返回顺序相同的副本', () => {
    const list = [q('a', 'A'), q('b', 'B')];
    expect(reorderQuizQuestions(list, 0, 0).map((x) => x.id)).toEqual(['a', 'b']);
    expect(reorderQuizQuestions(list, 0, 5).map((x) => x.id)).toEqual(['a', 'b']);
    expect(reorderQuizQuestions(list, -1, 0).map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('常量与 id 生成', () => {
  it('setting key 为 activity_test、分组为 activity', () => {
    expect(QUIZ_SETTING_KEY).toBe('activity_test');
    expect(QUIZ_SETTING_GROUP).toBe('activity');
  });

  it('generateQuestionId 生成非空唯一 id', () => {
    const a = generateQuestionId();
    const b = generateQuestionId();
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });
});
