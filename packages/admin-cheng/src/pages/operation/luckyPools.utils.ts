/** 幸运之星抽奖嘉宾（仅需用户标识与性别） */
export interface LuckyGuest {
  userId: string;
  gender: 'male' | 'female' | '';
}

/** 幸运之星性别要求：male=男 female=女 any=不限 mix=混搭 */
export type LuckyGender = 'male' | 'female' | 'any' | 'mix';

export const LUCKY_GENDER_OPTIONS: { value: LuckyGender; label: string }[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'any', label: '不限' },
  { value: 'mix', label: '混搭' },
];

/**
 * 按性别要求分配各转轮的获奖候选池（返回数组长度 = 转轮数，每个元素为该转轮的获奖候选人）：
 * 性别要求只决定最终落定的获奖者——滚动条带始终展示全体嘉宾（各种性别混合），不体现性别要求。
 * - male / female / any → 全部转轮共用对应池（人数超过池大小时自动缩减转轮数）；
 * - mix → 男女名额尽量均分（奇数时随机哪边多 1），某性别人数不足时名额让给另一性别；
 * - 同一用户多份报名记录只保留首个（保证转轮数不虚增、获奖者不重复）；
 * - 人数非法或没有符合条件的嘉宾时返回空数组（界面提示无法抽取）。
 * @param rng 随机源（测试可注入，默认 Math.random）
 */
export function buildLuckyPools<T extends LuckyGuest>(
  guests: T[],
  count: number,
  gender: LuckyGender,
  rng: () => number = Math.random,
): T[][] {
  if (!(count >= 1)) return [];
  const unique = Array.from(new Map(guests.map((g) => [g.userId, g])).values());
  const males = unique.filter((u) => u.gender === 'male');
  const females = unique.filter((u) => u.gender === 'female');
  if (gender === 'male') return Array.from({ length: Math.min(count, males.length) }, () => males);
  if (gender === 'female') return Array.from({ length: Math.min(count, females.length) }, () => females);
  if (gender === 'any') return Array.from({ length: Math.min(count, unique.length) }, () => unique);
  // 混搭：男女名额尽量均分，奇数时随机哪边多 1
  let maleSlots = rng() < 0.5 ? Math.ceil(count / 2) : Math.floor(count / 2);
  let femaleSlots = count - maleSlots;
  maleSlots = Math.min(maleSlots, males.length);
  femaleSlots = Math.min(femaleSlots, females.length);
  // 一侧装不下的名额让给另一侧
  const shortfall = count - maleSlots - femaleSlots;
  if (shortfall > 0) {
    maleSlots = Math.min(males.length, maleSlots + shortfall);
    femaleSlots = Math.min(females.length, count - maleSlots);
  }
  // 男女转轮交错排列（男1、女1、男2…），避免同性别转轮聚在一侧
  const pools: T[][] = [];
  const minN = Math.min(maleSlots, femaleSlots);
  for (let i = 0; i < minN; i++) { pools.push(males, females); }
  for (let i = minN; i < maleSlots; i++) pools.push(males);
  for (let i = minN; i < femaleSlots; i++) pools.push(females);
  return pools;
}
