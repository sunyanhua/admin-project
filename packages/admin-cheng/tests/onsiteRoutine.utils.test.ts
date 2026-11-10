import { describe, it, expect } from 'vitest';
import {
  parseRoutine,
  findInvalidPersonGroup,
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

  it('单组选人性别（gender）：合法值保留，非法值丢弃', () => {
    const cfg = JSON.stringify({
      routine: [
        { type: 'personDraw', group: '一', count: 2, gender: 'mix' },
        { type: 'personDraw', group: '一', count: 2, gender: 'xx' },
      ],
    });
    expect(parseRoutine(cfg)).toEqual([
      { type: 'personDraw', group: '一', count: 2, gender: 'mix' },
      { type: 'personDraw', group: '一', count: 2 },
    ]);
  });

  it('分组代表性别（gender，2026-11-10 用户定可选）：合法值保留，非法值丢弃', () => {
    const cfg = JSON.stringify({
      routine: [
        { type: 'groupRep', gender: 'male' },
        { type: 'groupRep', gender: 'mix' },
        { type: 'groupRep', gender: 'xx' },
      ],
    });
    expect(parseRoutine(cfg)).toEqual([
      { type: 'groupRep', gender: 'male' },
      { type: 'groupRep', gender: 'mix' },
      { type: 'groupRep' },
    ]);
  });

  it('组中选组指定结果（fixed）：去重去空串，空数组被丢弃，其他类型不保留 fixed', () => {
    const cfg = JSON.stringify({
      routine: [
        { type: 'groupDraw', fixed: ['一', '一', ' 二 ', '', 42, null], count: 5 },
        { type: 'groupDraw', fixed: [], count: 2 },
        { type: 'groupDraw', fixed: '一' },
        { type: 'lucky', fixed: ['一'] },
        { type: 'groupDraw', count: 2, fixed: ['一', '三'] },
      ],
    });
    expect(parseRoutine(cfg)).toEqual([
      { type: 'groupDraw', fixed: ['一', '二'], count: 5 },
      { type: 'groupDraw', count: 2 },
      { type: 'groupDraw' },
      { type: 'lucky' },
      { type: 'groupDraw', count: 2, fixed: ['一', '三'] },
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

  it('步骤类型标签齐全', () => {
    expect(ROUTINE_STEP_TYPE_LABELS.lucky).toBe('幸运之星');
    expect(ROUTINE_STEP_TYPE_LABELS.groupRep).toBe('分组代表');
    expect(ROUTINE_STEP_TYPE_LABELS.groupDraw).toBe('组中选组');
    expect(ROUTINE_STEP_TYPE_LABELS.personDraw).toBe('单组选人');
  });
});
