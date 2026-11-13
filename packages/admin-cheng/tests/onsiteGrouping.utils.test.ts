import { describe, it, expect } from 'vitest';
import { parseGroupNames, parseGroupIndex, splitGroupLabel, autoAssignGroups, stripGroupInfo, GROUP_INDEX_KEY, GROUP_NAME_KEY } from '@/components/operation/onsiteGrouping.utils';

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

  it('已组CP的男女分到同一组', () => {
    const users = [
      user('m1', 'male', 1),
      user('f1', 'female', 1),
      user('m2', 'male', 2),
      user('f2', 'female', 2),
      user('m3', 'male', 3),
      user('f3', 'female', 3),
    ];
    const map = autoAssignGroups(users, 3, [
      { maleId: 'm1', femaleId: 'f1' },
      { maleId: 'm2', femaleId: 'f2' },
    ]);
    // 每对 CP 男女同组
    expect(map.get('m1')).toBe(map.get('f1'));
    expect(map.get('m2')).toBe(map.get('f2'));
    // 所有用户都有分配
    expect(map.size).toBe(6);
  });

  it('CP 同组时各组人数仍尽量平均', () => {
    // 3 对 CP + 3 名单身（2 男 1 女）→ 3 组
    const users = [
      user('m1', 'male', 1), user('f1', 'female', 1),
      user('m2', 'male', 2), user('f2', 'female', 2),
      user('m3', 'male', 3), user('f3', 'female', 3),
      user('m4', 'male', 4), user('m5', 'male', 5), user('f4', 'female', 4),
    ];
    const map = autoAssignGroups(users, 3, [
      { maleId: 'm1', femaleId: 'f1' },
      { maleId: 'm2', femaleId: 'f2' },
      { maleId: 'm3', femaleId: 'f3' },
    ]);
    const totals = [0, 1, 2].map((g) => [...map.values()].filter((v) => v === g).length);
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(1);
  });

  it('CP 同组 + 人数平均 + 男女平均综合场景', () => {
    // 2 对 CP + 7 单身（4 男 3 女）→ 4 组，总人数 11 人
    const users = [
      user('m1', 'male', 1), user('f1', 'female', 1),
      user('m2', 'male', 2), user('f2', 'female', 2),
      user('m3', 'male', 3), user('m4', 'male', 4), user('m5', 'male', 5), user('m6', 'male', 6),
      user('f3', 'female', 3), user('f4', 'female', 4), user('f5', 'female', 5),
    ];
    const map = autoAssignGroups(users, 4, [
      { maleId: 'm1', femaleId: 'f1' },
      { maleId: 'm2', femaleId: 'f2' },
    ]);
    // CP 同组
    expect(map.get('m1')).toBe(map.get('f1'));
    expect(map.get('m2')).toBe(map.get('f2'));
    // 全部分配
    expect(map.size).toBe(11);
    // 人数平均：11 人 4 组 → 3/3/3/2
    const totals = [0, 1, 2, 3].map((g) => [...map.values()].filter((v) => v === g).length);
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(1);
    // 男女平均：男 6 人 → 2/2/1/1，女 5 人 → 2/1/1/1
    const countOf = (g: number, prefix: string) =>
      [...map.entries()].filter(([uid, v]) => v === g && uid.startsWith(prefix)).length;
    const maleCounts = [0, 1, 2, 3].map((g) => countOf(g, 'm'));
    const femaleCounts = [0, 1, 2, 3].map((g) => countOf(g, 'f'));
    expect(Math.max(...maleCounts) - Math.min(...maleCounts)).toBeLessThanOrEqual(1);
    expect(Math.max(...femaleCounts) - Math.min(...femaleCounts)).toBeLessThanOrEqual(1);
  });

  it('stripGroupInfo 移除分组键并保留其他内容', () => {
    const stripped = stripGroupInfo(JSON.stringify({ foo: 'bar', [GROUP_INDEX_KEY]: 1, [GROUP_NAME_KEY]: 'A' }));
    expect(JSON.parse(stripped)).toEqual({ foo: 'bar' });
    // 仅剩分组键时得到空对象
    expect(JSON.parse(stripGroupInfo(JSON.stringify({ [GROUP_INDEX_KEY]: 2 })))).toEqual({});
    // 非法 JSON 不抛错
    expect(JSON.parse(stripGroupInfo('not-json{'))).toEqual({});
  });
});

describe('splitGroupLabel 组中抽组组名折行', () => {
  it('1~3 字单行显示', () => {
    expect(splitGroupLabel('一')).toEqual(['一']);
    expect(splitGroupLabel('动作')).toEqual(['动作']);
    expect(splitGroupLabel('动作片')).toEqual(['动作片']);
  });

  it('4 字两行每行 2 字', () => {
    expect(splitGroupLabel('动画电影')).toEqual(['动画', '电影']);
  });

  it('5~6 字两行，第一行 3 字', () => {
    expect(splitGroupLabel('动作喜剧片')).toEqual(['动作喜', '剧片']);
    expect(splitGroupLabel('动作喜剧电影')).toEqual(['动作喜', '剧电影']);
  });

  it('7~9 字三行每行 ≤3 字', () => {
    expect(splitGroupLabel('一二三四五六七')).toEqual(['一二三', '四五六', '七']);
    expect(splitGroupLabel('一二三四五六七八')).toEqual(['一二三', '四五六', '七八']);
    expect(splitGroupLabel('一二三四五六七八九')).toEqual(['一二三', '四五六', '七八九']);
  });

  it('10 字以上每行 ≤4 字、最多 4 行', () => {
    expect(splitGroupLabel('一二三四五六七八九十')).toEqual(['一二三四', '五六七八', '九十']);
    expect(splitGroupLabel('一二三四五六七八九十一二三四五六')).toEqual(['一二三四', '五六七八', '九十一二', '三四五六']);
  });

  it('有「+」以 + 拆分为准，段内不按字数再折', () => {
    expect(splitGroupLabel('动作+电影')).toEqual(['动作', '电影']);
    expect(splitGroupLabel('动作电影+奇幻')).toEqual(['动作电影', '奇幻']);
    expect(splitGroupLabel('动作电影 + 奇幻电影')).toEqual(['动作电影', '奇幻电影']);
  });

  it('空串与非字符串防御', () => {
    expect(splitGroupLabel('')).toEqual([]);
    expect(splitGroupLabel('+')).toEqual(['+']);
  });
});
