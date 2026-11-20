/**
 * 现场编号压实补齐 — 纯逻辑工具
 *
 * 排序后如有人取消报名导致同性别序号出现空缺，把空缺之后的编号依次向前递补，
 * 使 1..N 连续；组CP（已配对）用户的编号冻结不动，其余绕开冻结号补齐。
 */

export interface OnsiteNumberEntry {
  id: string;
  /** 当前现场序号（null=未编号，不参与压实） */
  number: number | null;
  /** 性别（1=男 2=女；其它不参与压实） */
  gender: number;
  /** 组CP冻结：已配对用户编号不可变 */
  frozen: boolean;
}

export interface OnsiteNumberFix {
  id: string;
  number: number;
}

/**
 * 按性别分别压实：冻结用户保持原号，非冻结用户按当前序号从小到大依次
 * 递补到 1..N 中未被冻结占据的号码。返回需要改动的（id, 新号码）列表。
 */
export function compactOnsiteNumbers(entries: OnsiteNumberEntry[]): OnsiteNumberFix[] {
  const fixes: OnsiteNumberFix[] = [];
  for (const gender of [1, 2]) {
    const rows = entries.filter((e) => e.gender === gender && e.number != null);
    const total = rows.length;
    const frozenNums = new Set(rows.filter((r) => r.frozen).map((r) => r.number as number));
    // 空闲号码：1..N 中未被冻结占据的
    const freeNums: number[] = [];
    for (let n = 1; n <= total; n++) {
      if (!frozenNums.has(n)) freeNums.push(n);
    }
    const movable = rows.filter((r) => !r.frozen).sort((a, b) => (a.number as number) - (b.number as number));
    movable.forEach((r, i) => {
      if ((r.number as number) !== freeNums[i]) {
        fixes.push({ id: r.id, number: freeNums[i] });
      }
    });
  }
  return fixes;
}
