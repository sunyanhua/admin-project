import { describe, it, expect } from 'vitest';
import {
  parseRoutine,
  findInvalidPersonGroup,
  routineStepSummary,
  ROUTINE_STEP_TYPE_LABELS,
} from '@/components/operation/onsiteRoutine.utils';

describe('onsiteRoutine.utils', () => {
  it('解析 onsite_config.routine：合法步骤完整保留（备注去首尾空格）', () => {
    const cfg = JSON.stringify({
      bg_screen: 'https://cdn.example.com/bg.png',
      groups: '一|二',
      routine: [
        { type: 'lucky', count: 3, gender: 'mix', note: '第1轮' },
        { type: 'groupRep', note: ' 各组代表亮相 ' },
        { type: 'groupDraw', count: 2 },
        { type: 'personDraw', group: '一', count: 2, note: '第一组出2人' },
      ],
    });
    expect(parseRoutine(cfg)).toEqual([
      { type: 'lucky', count: 3, gender: 'mix', note: '第1轮' },
      { type: 'groupRep', note: '各组代表亮相' },
      { type: 'groupDraw', count: 2 },
      { type: 'personDraw', group: '一', count: 2, note: '第一组出2人' },
    ]);
  });

  it('无 routine 键 / 非数组 / 非法 JSON / 空值 均返回空数组', () => {
    expect(parseRoutine('{}')).toEqual([]);
    expect(parseRoutine(JSON.stringify({ routine: 'x' }))).toEqual([]);
    expect(parseRoutine(JSON.stringify({ routine: { type: 'lucky' } }))).toEqual([]);
    expect(parseRoutine('not json')).toEqual([]);
    expect(parseRoutine('')).toEqual([]);
    expect(parseRoutine(null)).toEqual([]);
    expect(parseRoutine(undefined)).toEqual([]);
  });

  it('未知类型与非法条目被丢弃，非法字段被清洗（count 取整且 ≥1）', () => {
    const cfg = JSON.stringify({
      routine: [
        { type: 'unknown' },
        'junk',
        null,
        42,
        { type: 'lucky', count: -1, gender: 'xx', note: '  ' },
        { type: 'lucky', count: 2.7 },
        { type: 'personDraw', group: '  ', count: 1 },
      ],
    });
    expect(parseRoutine(cfg)).toEqual([
      { type: 'lucky' },
      { type: 'lucky', count: 2 },
      { type: 'personDraw', count: 1 },
    ]);
  });

  it('findInvalidPersonGroup：返回第一个引用无效分组的步骤下标，全部有效返回 -1', () => {
    const steps = [
      { type: 'lucky' as const, count: 1 },
      { type: 'personDraw' as const, group: '三', count: 1 },
      { type: 'personDraw' as const, count: 1 },
      { type: 'personDraw' as const, group: '一', count: 2 },
    ];
    expect(findInvalidPersonGroup(steps, ['一', '二'])).toBe(1);
    expect(findInvalidPersonGroup([{ type: 'lucky' as const }], ['一'])).toBe(-1);
    expect(findInvalidPersonGroup([{ type: 'personDraw' as const, group: '一' }], ['一'])).toBe(-1);
    expect(findInvalidPersonGroup([], [])).toBe(-1);
  });

  it('routineStepSummary：步骤摘要（进度条展示用）', () => {
    expect(routineStepSummary({ type: 'lucky', count: 3, gender: 'mix' })).toBe('幸运之星 · 3人 · 混搭');
    expect(routineStepSummary({ type: 'lucky', count: 1 })).toBe('幸运之星 · 1人 · 不限');
    expect(routineStepSummary({ type: 'groupRep' })).toBe('分组代表');
    expect(routineStepSummary({ type: 'groupDraw', count: 2 })).toBe('组中选组 · 抽2组');
    expect(routineStepSummary({ type: 'personDraw', group: '一', count: 2 })).toBe('单组选人 · 一组 · 2人');
    expect(routineStepSummary({ type: 'personDraw', count: 1 })).toBe('单组选人 · 未选组 · 1人');
  });

  it('步骤类型标签齐全', () => {
    expect(ROUTINE_STEP_TYPE_LABELS.lucky).toBe('幸运之星');
    expect(ROUTINE_STEP_TYPE_LABELS.groupRep).toBe('分组代表');
    expect(ROUTINE_STEP_TYPE_LABELS.groupDraw).toBe('组中选组');
    expect(ROUTINE_STEP_TYPE_LABELS.personDraw).toBe('单组选人');
  });
});
