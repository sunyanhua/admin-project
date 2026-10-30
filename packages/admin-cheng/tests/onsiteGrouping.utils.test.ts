import { describe, it, expect } from 'vitest';
import { parseGroupNames, parseGroupIndex, autoAssignGroups, GROUP_INDEX_KEY, GROUP_NAME_KEY } from '@/components/operation/onsiteGrouping.utils';

const user = (userId: string, gender: 'male' | 'female' | '', number?: number) => ({ userId, gender, number });

describe('parseGroupNames', () => {
  it('按 | 分隔并过滤空段', () => {
    expect(parseGroupNames('A|B|C')).toEqual(['A', 'B', 'C']);
    expect(parseGroupNames('A||B| C ')).toEqual(['A', 'B', 'C']);
    expect(parseGroupNames('')).toEqual([]);
  });
});

describe('parseGroupIndex', () => {
  it('读取 group_index（1 起）', () => {
    expect(parseGroupIndex(JSON.stringify({ [GROUP_INDEX_KEY]: 2, [GROUP_NAME_KEY]: 'B' }))).toBe(2);
  });
  it('空值/非法 JSON/非正整数返回 null', () => {
    expect(parseGroupIndex('')).toBeNull();
    expect(parseGroupIndex('not-json{')).toBeNull();
    expect(parseGroupIndex(JSON.stringify({ [GROUP_INDEX_KEY]: 0 }))).toBeNull();
    expect(parseGroupIndex(JSON.stringify({ [GROUP_INDEX_KEY]: '1' }))).toBeNull();
    expect(parseGroupIndex(JSON.stringify({}))).toBeNull();
  });
});

describe('autoAssignGroups', () => {
  it('所有人被分配到 0..N-1 组', () => {
    const users = [user('m1', 'male', 1), user('m2', 'male', 2), user('f1', 'female', 1), user('f2', 'female', 2)];
    const map = autoAssignGroups(users, 2);
    expect(map.size).toBe(4);
    [...map.values()].forEach((v) => expect([0, 1]).toContain(v));
  });

  it('各组人数平均、男/女在各组间数量平均', () => {
    // 10 男 5 女 → 3 组
    const males = Array.from({ length: 10 }, (_, i) => user(`m${i + 1}`, 'male', i + 1));
    const females = Array.from({ length: 5 }, (_, i) => user(`f${i + 1}`, 'female', i + 1));
    const map = autoAssignGroups([...males, ...females], 3);
    const countOf = (g: number, prefix: string) =>
      [...map.entries()].filter(([uid, v]) => v === g && uid.startsWith(prefix)).length;
    // 各组总人数差 ≤2（除不尽时最平均）
    const totals = [0, 1, 2].map((g) => countOf(g, 'm') + countOf(g, 'f'));
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(2);
    // 同性别在各组间数量差 ≤1（男 10 人 → 4/3/3；女 5 人 → 2/2/1）
    const maleCounts = [0, 1, 2].map((g) => countOf(g, 'm'));
    const femaleCounts = [0, 1, 2].map((g) => countOf(g, 'f'));
    expect(Math.max(...maleCounts) - Math.min(...maleCounts)).toBeLessThanOrEqual(1);
    expect(Math.max(...femaleCounts) - Math.min(...femaleCounts)).toBeLessThanOrEqual(1);
  });

  it('性别未设置用户也分配到组', () => {
    const map = autoAssignGroups([user('x1', '', 1), user('m1', 'male', 2)], 2);
    expect(map.get('x1')).not.toBeUndefined();
  });

  it('组数为 0 返回空分配', () => {
    expect(autoAssignGroups([user('m1', 'male', 1)], 0).size).toBe(0);
  });
});
