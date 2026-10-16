import { describe, it, expect } from 'vitest';
import { isMatchableCp, matchCpPairs } from '@/components/operation/cpMatching.utils';
import type { CpCandidate } from '@/components/operation/cpMatching.utils';

const person = (userId: string, gender: 'male' | 'female', over: Partial<CpCandidate> = {}): CpCandidate => ({
  userId,
  gender,
  age: 28,
  height: 170,
  education: 3,
  ...over,
});

describe('isMatchableCp', () => {
  it('年龄差：男生大 10 岁满足，大 11 岁不满足', () => {
    expect(isMatchableCp(person('m', 'male', { age: 38 }), person('f', 'female', { age: 28 }))).toBe(true);
    expect(isMatchableCp(person('m', 'male', { age: 39 }), person('f', 'female', { age: 28 }))).toBe(false);
  });

  it('年龄差：女生大 5 岁满足，大 6 岁不满足', () => {
    expect(isMatchableCp(person('m', 'male', { age: 28 }), person('f', 'female', { age: 33 }))).toBe(true);
    expect(isMatchableCp(person('m', 'male', { age: 28 }), person('f', 'female', { age: 34 }))).toBe(false);
  });

  it('同龄满足', () => {
    expect(isMatchableCp(person('m', 'male', { age: 28 }), person('f', 'female', { age: 28 }))).toBe(true);
  });

  it('任一方缺年龄不满足', () => {
    expect(isMatchableCp(person('m', 'male', { age: undefined }), person('f', 'female', { age: 28 }))).toBe(false);
    expect(isMatchableCp(person('m', 'male', { age: 28 }), person('f', 'female', { age: undefined }))).toBe(false);
  });

  it('年龄 0 视为未填写不满足（后端可能以 0 表示未填）', () => {
    expect(isMatchableCp(person('m', 'male', { age: 0 }), person('f', 'female', { age: 28 }))).toBe(false);
    expect(isMatchableCp(person('m', 'male', { age: 28 }), person('f', 'female', { age: 0 }))).toBe(false);
  });

  it('身高：女生 ≤ 男生满足，女生 > 男生不满足', () => {
    expect(isMatchableCp(person('m', 'male', { height: 175 }), person('f', 'female', { height: 175 }))).toBe(true);
    expect(isMatchableCp(person('m', 'male', { height: 175 }), person('f', 'female', { height: 176 }))).toBe(false);
  });

  it('任一方缺身高视为满足', () => {
    expect(isMatchableCp(person('m', 'male', { height: undefined }), person('f', 'female', { height: 180 }))).toBe(true);
    expect(isMatchableCp(person('m', 'male', { height: 175 }), person('f', 'female', { height: undefined }))).toBe(true);
  });

  it('身高 0 视为未填写不阻断（后端可能以 0 表示未填）', () => {
    expect(isMatchableCp(person('m', 'male', { height: 0 }), person('f', 'female', { height: 180 }))).toBe(true);
    expect(isMatchableCp(person('m', 'male', { height: 175 }), person('f', 'female', { height: 0 }))).toBe(true);
  });

  it('学历差 ≤2 满足，3 不满足', () => {
    expect(isMatchableCp(person('m', 'male', { education: 5 }), person('f', 'female', { education: 3 }))).toBe(true);
    expect(isMatchableCp(person('m', 'male', { education: 5 }), person('f', 'female', { education: 2 }))).toBe(false);
  });

  it('任一方缺学历视为满足', () => {
    expect(isMatchableCp(person('m', 'male', { education: undefined }), person('f', 'female', { education: 1 }))).toBe(true);
    expect(isMatchableCp(person('m', 'male', { education: 4 }), person('f', 'female', { education: undefined }))).toBe(true);
  });

  it('学历 0 视为未填写不阻断（后端可能以 0 表示未填）', () => {
    expect(isMatchableCp(person('m', 'male', { education: 0 }), person('f', 'female', { education: 4 }))).toBe(true);
    expect(isMatchableCp(person('m', 'male', { education: 4 }), person('f', 'female', { education: 0 }))).toBe(true);
  });
});

describe('matchCpPairs', () => {
  it('全部互相满足：全部配对且每人只出现一次', () => {
    const males = [person('m1', 'male'), person('m2', 'male'), person('m3', 'male')];
    const females = [person('f1', 'female'), person('f2', 'female'), person('f3', 'female')];
    const pairs = matchCpPairs(males, females);
    expect(pairs).toHaveLength(3);
    const ids = pairs.flatMap((p) => [p.male.userId, p.female.userId]);
    expect(new Set(ids).size).toBe(6);
  });

  it('贪心会漏配但最大匹配成功：m1 可配 f1/f2、m2 仅可配 f1 → 2 组', () => {
    // m2 仅满足 f1（f2 身高超标）；m1 两个都满足。贪心先配 m1-f1 会漏掉 m2，增广路可让 m1 改配 f2
    const males = [person('m1', 'male', { height: 185 }), person('m2', 'male', { height: 170 })];
    const females = [person('f1', 'female', { height: 165 }), person('f2', 'female', { height: 180 })];
    const pairs = matchCpPairs(males, females);
    expect(pairs).toHaveLength(2);
    const ids = pairs.flatMap((p) => [p.male.userId, p.female.userId]);
    expect(new Set(ids).size).toBe(4);
  });

  it('男生多于女生：多出的男生不组合', () => {
    const pairs = matchCpPairs([person('m1', 'male'), person('m2', 'male')], [person('f1', 'female')]);
    expect(pairs).toHaveLength(1);
  });

  it('条件均不满足：0 组', () => {
    const pairs = matchCpPairs([person('m1', 'male', { age: 60 })], [person('f1', 'female', { age: 20 })]);
    expect(pairs).toHaveLength(0);
  });

  it('空数组返回空', () => {
    expect(matchCpPairs([], [])).toEqual([]);
    expect(matchCpPairs([person('m1', 'male')], [])).toEqual([]);
  });
});
