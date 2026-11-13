/** 幸运之星抽奖嘉宾（仅需用户标识与性别） */
export interface LuckyGuest {
  userId: string;
  gender: 'male' | 'female' | '';
}

/** 抽取模式性别要求（幸运之星/各组代表/单组选人共用）：male=男 female=女 any=不限 mix=混搭 */
export type LuckyGender = 'male' | 'female' | 'any' | 'mix';

export const LUCKY_GENDER_OPTIONS: { value: LuckyGender; label: string }[] = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'any', label: '不限' },
  { value: 'mix', label: '混搭' },
];

/**
 * 按性别要求抽取一组中奖者（无放回、不重复）：
 * - any → 全体随机抽取 count 人；
 * - male / female → 仅对应性别（不足时按实际人数返回）；
 * - mix → 男女名额尽量均分（奇数时随机哪边多 1），一侧不足名额让给另一侧；
 * - 同一 userId 多份记录只保留首个；count 非法返回空数组。
 * @param rng 随机源（测试可注入，默认 Math.random）
 */
export function pickGenderedWinners<T extends LuckyGuest>(
  guests: T[],
  count: number,
  gender: LuckyGender,
  rng: () => number = Math.random,
): T[] {
  if (!(count >= 1)) return [];
  const unique = Array.from(new Map(guests.map((g) => [g.userId, g])).values());
  const pick = (arr: T[], n: number): T[] => [...arr].sort(() => rng() - 0.5).slice(0, n);
  if (gender === 'any') return pick(unique, count);
  const males = unique.filter((u) => u.gender === 'male');
  const females = unique.filter((u) => u.gender === 'female');
  if (gender === 'male') return pick(males, count);
  if (gender === 'female') return pick(females, count);
  // 混搭：男女名额尽量均分（奇数时随机哪边多 1），一侧不足名额让给另一侧
  let maleSlots = rng() < 0.5 ? Math.ceil(count / 2) : Math.floor(count / 2);
  let femaleSlots = count - maleSlots;
  maleSlots = Math.min(maleSlots, males.length);
  femaleSlots = Math.min(femaleSlots, females.length);
  const shortfall = count - maleSlots - femaleSlots;
  if (shortfall > 0) {
    maleSlots = Math.min(males.length, maleSlots + shortfall);
    femaleSlots = Math.min(females.length, count - maleSlots);
  }
  const mW = pick(males, maleSlots);
  const fW = pick(females, femaleSlots);
  // 男女交错排列（男1、女1、男2…），避免同性别连排
  const mixed: T[] = [];
  const minN = Math.min(mW.length, fW.length);
  for (let i = 0; i < minN; i++) { mixed.push(mW[i], fW[i]); }
  for (let i = minN; i < mW.length; i++) mixed.push(mW[i]);
  for (let i = minN; i < fW.length; i++) mixed.push(fW[i]);
  return mixed;
}

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

/** 候选组是否符合性别要求（male/female 仅含该性别即符合；any/mix 恒符合） */
const poolMatchesGender = <T extends LuckyGuest>(pool: T[], gender: LuckyGender): boolean => {
  if (gender === 'male') return pool.some((u) => u.gender === 'male');
  if (gender === 'female') return pool.some((u) => u.gender === 'female');
  return true;
};

/**
 * 各组代表候选组过滤：male / female 仅保留组内含该性别的组（无符合条件的组不出转轮，
 * 与幸运之星缩减转轮同口径）；any / mix 保留全部非空组。
 */
export function filterGroupRepPools<T extends LuckyGuest>(pools: T[][], gender: LuckyGender): T[][] {
  return pools.filter((p) => poolMatchesGender(p, gender));
}

/** 带组名的候选组（各组代表转轮需在卡片上方显示组名） */
export interface NamedGroupPool<T extends LuckyGuest> {
  name: string;
  pool: T[];
}

/** 各组代表候选组过滤（带组名版）：过滤口径与 filterGroupRepPools 完全一致，保留的组名与池一一对应 */
export function filterGroupRepPoolsWithNames<T extends LuckyGuest>(groups: NamedGroupPool<T>[], gender: LuckyGender): NamedGroupPool<T>[] {
  return groups.filter((g) => poolMatchesGender(g.pool, gender));
}

/**
 * 各组代表性别名额分配（数组长度 = 组数，返回每组的目标性别）：
 * - male / female → 每组目标该性别（组内抽取严格按该性别，无则整组不出转轮——
 *   由 filterGroupRepPools 在进入时过滤）；
 * - any → 每组任意组员；
 * - mix → 组间男女尽量均衡：目标男女名额（男多/女多随机）随机分配到各组，
 *   单一性别组强制该性别。
 * @param rng 随机源（测试可注入，默认 Math.random）
 */
export function assignGroupRepTargets(
  pools: { male: number; female: number }[],
  gender: LuckyGender,
  rng: () => number = Math.random,
): ('male' | 'female' | 'any')[] {
  const n = pools.length;
  if (gender !== 'mix') return pools.map(() => (gender === 'any' ? 'any' : gender));
  const wantM = rng() < 0.5 ? Math.ceil(n / 2) : Math.floor(n / 2);
  let mLeft = wantM;
  let fLeft = n - wantM;
  const assignment: ('male' | 'female' | 'any')[] = pools.map((p) => {
    if (p.male > 0 && p.female === 0) { mLeft--; return 'male'; }
    if (p.female > 0 && p.male === 0) { fLeft--; return 'female'; }
    return 'any';
  });
  // 弹性组（男女皆有）随机打乱后依次分配剩余名额
  const flexible = assignment.map((a, i) => (a === 'any' ? i : -1)).filter((i) => i >= 0);
  for (const gi of [...flexible].sort(() => rng() - 0.5)) {
    if (mLeft > 0) { assignment[gi] = 'male'; mLeft--; }
    else if (fLeft > 0) { assignment[gi] = 'female'; fLeft--; }
    else assignment[gi] = rng() < 0.5 ? 'male' : 'female';
  }
  return assignment;
}
