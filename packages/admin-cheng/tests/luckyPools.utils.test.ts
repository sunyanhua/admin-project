import { describe, it, expect } from 'vitest';
import { buildLuckyPools, pickGenderedWinners, assignGroupRepTargets, LUCKY_GENDER_OPTIONS } from '@/pages/operation/luckyPools.utils';
import type { LuckyGuest } from '@/pages/operation/luckyPools.utils';

const male = (i: number): LuckyGuest => ({ userId: `m${i}`, gender: 'male' });
const female = (i: number): LuckyGuest => ({ userId: `f${i}`, gender: 'female' });
const unknown = (i: number): LuckyGuest => ({ userId: `x${i}`, gender: '' });

describe('buildLuckyPools', () => {
  it('性别=男：全部转轮共用男嘉宾池，人数超过池大小时自动缩减', () => {
    const pools = buildLuckyPools([male(1), male(2), female(1)], 5, 'male');
    expect(pools).toHaveLength(2);
    expect(pools.every((p) => p.length === 2 && p[0]?.gender === 'male')).toBe(true);
  });

  it('性别=女：全部转轮共用女嘉宾池，人数未超池大小时转轮数等于人数', () => {
    const pools = buildLuckyPools([male(1), female(1), female(2), female(3)], 2, 'female');
    expect(pools).toHaveLength(2);
    expect(pools[0]).toHaveLength(3);
  });

  it('性别=不限：全部转轮共用全体嘉宾池（含性别未知嘉宾）', () => {
    const pools = buildLuckyPools([male(1), female(1), unknown(1)], 2, 'any');
    expect(pools).toHaveLength(2);
    expect(pools[0]).toHaveLength(3);
  });

  it('混搭偶数人数：男女名额均分且男女转轮交错排列', () => {
    const pools = buildLuckyPools([male(1), male(2), female(1), female(2)], 2, 'mix');
    expect(pools).toHaveLength(2);
    expect(pools[0]).toEqual([male(1), male(2)]);
    expect(pools[1]).toEqual([female(1), female(2)]);
  });

  it('混搭奇数人数：名额 2+1 分配，哪边多 1 由随机源决定', () => {
    const guests = [male(1), male(2), male(3), female(1), female(2), female(3)];
    // 随机 < 0.5：男方名额取 ceil → 2 男 1 女
    const ceilSide = buildLuckyPools(guests, 3, 'mix', () => 0);
    expect(ceilSide.filter((p) => p[0]?.gender === 'male')).toHaveLength(2);
    expect(ceilSide.filter((p) => p[0]?.gender === 'female')).toHaveLength(1);
    // 随机 ≥ 0.5：男方名额取 floor → 1 男 2 女
    const floorSide = buildLuckyPools(guests, 3, 'mix', () => 0.9);
    expect(floorSide.filter((p) => p[0]?.gender === 'male')).toHaveLength(1);
    expect(floorSide.filter((p) => p[0]?.gender === 'female')).toHaveLength(2);
  });

  it('混搭某性别不足：不足名额让给另一性别', () => {
    const pools = buildLuckyPools([male(1), female(1), female(2), female(3), female(4)], 5, 'mix');
    expect(pools).toHaveLength(5);
    const malePools = pools.filter((p) => p[0]?.gender === 'male').length;
    const femalePools = pools.filter((p) => p[0]?.gender === 'female').length;
    expect(malePools).toBe(1);
    expect(femalePools).toBe(4);
  });

  it('混搭仅剩单性别：全部转轮为该性别', () => {
    const pools = buildLuckyPools([female(1), female(2), female(3)], 3, 'mix');
    expect(pools).toHaveLength(3);
    expect(pools.every((p) => p[0]?.gender === 'female')).toBe(true);
  });

  it('同一用户多份报名记录只保留一份（转轮数不虚增、获奖者不重复）', () => {
    const pools = buildLuckyPools([male(1), male(1), male(2)], 3, 'any');
    expect(pools).toHaveLength(2);
    expect(pools[0]).toHaveLength(2);
    const malePools = buildLuckyPools([male(1), male(1), male(2)], 5, 'male');
    expect(malePools).toHaveLength(2);
  });

  it('人数非法（小于 1 或 NaN）返回空数组', () => {
    expect(buildLuckyPools([male(1)], -1, 'mix')).toEqual([]);
    expect(buildLuckyPools([male(1)], 0, 'mix')).toEqual([]);
    expect(buildLuckyPools([male(1)], NaN, 'mix')).toEqual([]);
  });

  it('无符合条件的嘉宾：返回空数组', () => {
    expect(buildLuckyPools([male(1)], 3, 'female')).toEqual([]);
    expect(buildLuckyPools([], 1, 'any')).toEqual([]);
    expect(buildLuckyPools([], 3, 'mix')).toEqual([]);
  });

  it('性别选项为 男/女/不限/混搭', () => {
    expect(LUCKY_GENDER_OPTIONS.map((o) => o.label)).toEqual(['男', '女', '不限', '混搭']);
  });

  it('pickGenderedWinners any：随机抽取 count 人且不重复', () => {
    const w = pickGenderedWinners([male(1), male(2), male(3), female(1), female(2)], 3, 'any', () => 0.5);
    expect(w).toHaveLength(3);
    expect(new Set(w.map((u) => u.userId)).size).toBe(3);
  });

  it('pickGenderedWinners male/female：只从对应性别中抽取', () => {
    const guests = [male(1), male(2), female(1), female(2)];
    const ms = pickGenderedWinners(guests, 2, 'male', () => 0.5);
    expect(ms).toHaveLength(2);
    expect(ms.every((u) => u.gender === 'male')).toBe(true);
    const fs = pickGenderedWinners(guests, 2, 'female', () => 0.5);
    expect(fs.every((u) => u.gender === 'female')).toBe(true);
  });

  it('pickGenderedWinners mix：男女名额尽量均分，奇数随机哪边多 1', () => {
    const guests = [male(1), male(2), male(3), female(1), female(2)];
    // rng 0.1 < 0.5：奇数时男多 1（3 人 → 男2女1）
    const w = pickGenderedWinners(guests, 3, 'mix', () => 0.1);
    expect(w.filter((u) => u.gender === 'male').length).toBe(2);
    expect(w.filter((u) => u.gender === 'female').length).toBe(1);
    // 偶数：男女各半
    const w2 = pickGenderedWinners(guests, 4, 'mix', () => 0.9);
    expect(w2.filter((u) => u.gender === 'male').length).toBe(2);
    expect(w2.filter((u) => u.gender === 'female').length).toBe(2);
  });

  it('pickGenderedWinners mix：一侧性别不足时名额让给另一侧', () => {
    const guests = [male(1), female(1), female(2)];
    // 想男2女1 但男仅 1 人 → 男1女2
    const w = pickGenderedWinners(guests, 3, 'mix', () => 0.1);
    expect(w.filter((u) => u.gender === 'male').length).toBe(1);
    expect(w.filter((u) => u.gender === 'female').length).toBe(2);
  });

  it('pickGenderedWinners：性别筛选后人数不足按实际返回；count 非法返回空', () => {
    expect(pickGenderedWinners([male(1)], 3, 'female', () => 0.5)).toEqual([]);
    expect(pickGenderedWinners([male(1), female(1)], 0, 'any', () => 0.5)).toEqual([]);
    expect(pickGenderedWinners([], 2, 'mix', () => 0.5)).toEqual([]);
  });
});

describe('assignGroupRepTargets（各组代表性别名额分配）', () => {
  const pools = [
    { male: 2, female: 1 },
    { male: 1, female: 2 },
    { male: 3, female: 0 },
    { male: 0, female: 2 },
  ];

  it('性别=男/女：每组目标该性别（不依赖随机源）', () => {
    expect(assignGroupRepTargets(pools, 'male', () => 0.5)).toEqual(['male', 'male', 'male', 'male']);
    expect(assignGroupRepTargets(pools, 'female', () => 0.5)).toEqual(['female', 'female', 'female', 'female']);
  });

  it('性别=不限：每组任意组员', () => {
    expect(assignGroupRepTargets(pools, 'any', () => 0.5)).toEqual(['any', 'any', 'any', 'any']);
  });

  it('性别=混搭：单一性别组强制该性别，弹性组分配剩余男女名额', () => {
    // rng 0.1：目标男多（4 组 → 男2女2）；纯男组强制 male（mLeft 1），纯女组强制 female（fLeft 1），
    // 剩余男/女名额各 1 落到两个弹性组（随机打乱顺序，不锁定具体组）
    const a = assignGroupRepTargets(pools, 'mix', () => 0.1);
    expect(a).toHaveLength(4);
    expect(a[2]).toBe('male');   // 纯男组强制
    expect(a[3]).toBe('female'); // 纯女组强制
    expect(a.filter((g) => g === 'male').length).toBe(2);
    expect(a.filter((g) => g === 'female').length).toBe(2);
    // 弹性组各分到一男一女
    expect([a[0], a[1]].filter((g) => g === 'male').length).toBe(1);
    expect([a[0], a[1]].filter((g) => g === 'female').length).toBe(1);
  });

  it('性别=混搭：纯男组超过目标男名额时弹性组不再分到男', () => {
    const manyM = [
      { male: 1, female: 0 },
      { male: 1, female: 0 },
      { male: 1, female: 0 },
      { male: 1, female: 1 },
    ];
    // rng 0.9：目标男少（4 组 → 男1女3）；纯男组 3 个都强制 male（mLeft -2），弹性组只能分 female
    const a = assignGroupRepTargets(manyM, 'mix', () => 0.9);
    expect(a.filter((g) => g === 'male').length).toBe(3);
    expect(a[3]).toBe('female');
  });
});
