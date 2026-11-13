/**
 * 卡片换行均衡分布：行数 = ceil(总数 / 每行上限)，
 * 每行数量相差不超过 1（多出的卡片放靠前的行），返回每行数量列表。
 * 例：8 个卡片每行最多 5 个 → [4, 4]；13 个卡片每行最多 5 个 → [5, 4, 4]。
 * 防御式：cap 向下取整；总数 ≤ 0 或 cap 非正/非有限数时返回空数组（不崩溃）。
 */
export const splitBalancedRows = (n: number, cap: number): number[] => {
  const capInt = Math.floor(cap);
  if (n <= 0 || !Number.isFinite(capInt) || capInt <= 0) return [];
  const rows = Math.ceil(n / capInt);
  const base = Math.floor(n / rows);
  const extra = n % rows;
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
};

/** 按均衡换行规则把列表切成行数组（每行数量差 ≤ 1，元素顺序不变） */
export const chunkBalancedRows = <T,>(items: T[], cap: number): T[][] => {
  let offset = 0;
  return splitBalancedRows(items.length, cap).map((count) => {
    const row = items.slice(offset, offset + count);
    offset += count;
    return row;
  });
};
