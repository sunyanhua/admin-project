/** 组CP候选：性别与三项匹配条件字段 */
export interface CpCandidate {
  userId: string;
  gender: 'male' | 'female';
  age?: number;
  height?: number;
  education?: number;
}

export interface CpPair<T extends CpCandidate> {
  male: T;
  female: T;
}

/** 0 与空值同样视为未填写（后端可能以 0 表示未填，与 UserDetailSections 的 truthy 约定一致） */
const filled = (v?: number): number | undefined => (v != null && v > 0 ? v : undefined);

/**
 * 是否满足组CP条件（一男一女）：
 * - 年龄：男生最多比女生大 10 岁、女生最多比男生大 5 岁（任一方缺年龄无法判断 → 不满足）；
 * - 身高：女生不能高于男生（任一方缺身高视为满足，数据未知不阻断）；
 * - 学历：education 值差距 ≤ 2（任一方缺学历视为满足）。
 */
export function isMatchableCp(male: CpCandidate, female: CpCandidate): boolean {
  const maleAge = filled(male.age);
  const femaleAge = filled(female.age);
  if (maleAge == null || femaleAge == null) return false;
  const ageGap = maleAge - femaleAge;
  if (ageGap > 10 || ageGap < -5) return false;
  const maleHeight = filled(male.height);
  const femaleHeight = filled(female.height);
  if (maleHeight != null && femaleHeight != null && femaleHeight > maleHeight) return false;
  const maleEdu = filled(male.education);
  const femaleEdu = filled(female.education);
  if (maleEdu != null && femaleEdu != null && Math.abs(maleEdu - femaleEdu) > 2) return false;
  return true;
}

/**
 * 二分图最大匹配（Kuhn 增广路）：在满足组CP条件的前提下尽可能多组合。
 * 男生按数组顺序逐个尝试；结果确定性与输入顺序相关（调用方按现场序号等稳定排序）。
 */
export function matchCpPairs<T extends CpCandidate>(males: T[], females: T[]): CpPair<T>[] {
  const fCount = females.length;
  /** matchF[fi] = 与女生 fi 配对的男生下标，-1 未配对 */
  const matchF: number[] = Array(fCount).fill(-1);
  const tryAugment = (mi: number, visited: boolean[]): boolean => {
    for (let fi = 0; fi < fCount; fi++) {
      if (visited[fi] || !isMatchableCp(males[mi], females[fi])) continue;
      visited[fi] = true;
      if (matchF[fi] === -1 || tryAugment(matchF[fi], visited)) {
        matchF[fi] = mi;
        return true;
      }
    }
    return false;
  };
  for (let mi = 0; mi < males.length; mi++) tryAugment(mi, Array(fCount).fill(false));
  const pairs: CpPair<T>[] = [];
  for (let fi = 0; fi < fCount; fi++) {
    if (matchF[fi] !== -1) pairs.push({ male: males[matchF[fi]], female: females[fi] });
  }
  return pairs;
}
