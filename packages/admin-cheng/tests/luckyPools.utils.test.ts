import { describe, it, expect } from 'vitest';
import { buildLuckyPools, LUCKY_GENDER_OPTIONS } from '@/pages/operation/luckyPools.utils';
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
});
