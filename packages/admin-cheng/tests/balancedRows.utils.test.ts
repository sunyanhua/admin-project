import { describe, it, expect } from 'vitest';
import { splitBalancedRows, chunkBalancedRows } from '@/utils/balancedRows';

describe('splitBalancedRows', () => {
  it('8 个转轮每行最多 5 个：4+4 两行（非自然换行的 5+3）', () => {
    // Arrange
    const n = 8;
    const cap = 5;

    // Act
    const rows = splitBalancedRows(n, cap);

    // Assert
    expect(rows).toEqual([4, 4]);
  });

  it('6 个转轮每行最多 5 个：3+3 两行（非自然换行的 5+1）', () => {
    expect(splitBalancedRows(6, 5)).toEqual([3, 3]);
  });

  it('13 张人卡每行最多 5 个：5+4+4 三行', () => {
    expect(splitBalancedRows(13, 5)).toEqual([5, 4, 4]);
  });

  it('8 个组块每行最多 6 个：4+4 两行（非自然换行的 6+2）', () => {
    expect(splitBalancedRows(8, 6)).toEqual([4, 4]);
  });

  it('7 个组块每行最多 6 个：4+3 两行', () => {
    expect(splitBalancedRows(7, 6)).toEqual([4, 3]);
  });

  it('行数等于 ceil(总数/每行上限)，且每行数量差不超过 1、各行总和等于总数', () => {
    for (const cap of [5, 6]) {
      for (let n = 1; n <= 60; n++) {
        const rows = splitBalancedRows(n, cap);
        expect(rows.length).toBe(Math.ceil(n / cap));
        expect(rows.reduce((sum, c) => sum + c, 0)).toBe(n);
        expect(Math.max(...rows) - Math.min(...rows)).toBeLessThanOrEqual(1);
        expect(rows.every((c) => c <= cap)).toBe(true);
        // 靠前行多 1（多的卡片放前面）
        const diffIdx = rows.findIndex((c) => c !== rows[0]);
        if (diffIdx !== -1) {
          expect(rows[0] - rows[diffIdx]).toBe(1);
        }
      }
    }
  });

  it('未超过每行上限时只有一行', () => {
    expect(splitBalancedRows(5, 5)).toEqual([5]);
    expect(splitBalancedRows(1, 5)).toEqual([1]);
  });

  it('总数为 0 时返回空数组', () => {
    expect(splitBalancedRows(0, 5)).toEqual([]);
  });

  it('每行上限为 1 时每行 1 个', () => {
    expect(splitBalancedRows(3, 1)).toEqual([1, 1, 1]);
  });

  it('每行上限为 0、负数或非有限数时返回空数组（不崩溃）', () => {
    expect(splitBalancedRows(5, 0)).toEqual([]);
    expect(splitBalancedRows(5, -1)).toEqual([]);
    expect(splitBalancedRows(5, Number.NaN)).toEqual([]);
    expect(splitBalancedRows(5, Number.POSITIVE_INFINITY)).toEqual([]);
  });

  it('每行上限为小数时向下取整，每行不超过取整后的上限', () => {
    const rows = splitBalancedRows(5, 2.5);
    expect(rows.reduce((sum, c) => sum + c, 0)).toBe(5);
    expect(rows.every((c) => c <= 2)).toBe(true);
    expect(rows.length).toBe(3);
  });
});

describe('chunkBalancedRows', () => {
  it('按均衡规则切片：13 个元素每行最多 5 个 → 5+4+4，拼回后与原列表一致', () => {
    const items = Array.from({ length: 13 }, (_, i) => i);
    const rows = chunkBalancedRows(items, 5);
    expect(rows).toEqual([[0, 1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]);
    expect(rows.flat()).toEqual(items);
  });

  it('空列表返回空数组', () => {
    expect(chunkBalancedRows([], 5)).toEqual([]);
  });
});
