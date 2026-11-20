import { describe, it, expect } from 'vitest';
import { compactOnsiteNumbers } from '@/components/operation/onsiteNumbering.utils';

describe('compactOnsiteNumbers 现场编号压实补齐', () => {
  it('无空缺：不产生任何改动', () => {
    const fixes = compactOnsiteNumbers([
      { id: 'a', number: 1, gender: 1, frozen: false },
      { id: 'b', number: 2, gender: 1, frozen: false },
    ]);
    expect(fixes).toEqual([]);
  });

  it('单个空缺：后面的编号依次向前递补', () => {
    const fixes = compactOnsiteNumbers([
      { id: 'a', number: 1, gender: 1, frozen: false },
      { id: 'b', number: 3, gender: 1, frozen: false },
    ]);
    expect(fixes).toEqual([{ id: 'b', number: 2 }]);
  });

  it('多个空缺：全部补齐', () => {
    const fixes = compactOnsiteNumbers([
      { id: 'a', number: 1, gender: 1, frozen: false },
      { id: 'b', number: 4, gender: 1, frozen: false },
      { id: 'c', number: 5, gender: 1, frozen: false },
    ]);
    expect(fixes).toEqual([
      { id: 'b', number: 2 },
      { id: 'c', number: 3 },
    ]);
  });

  it('组CP冻结用户保持原号，其余递补到空位', () => {
    const fixes = compactOnsiteNumbers([
      { id: 'cp-m', number: 2, gender: 1, frozen: true },
      { id: 'x', number: 3, gender: 1, frozen: false },
    ]);
    expect(fixes).toEqual([{ id: 'x', number: 1 }]);
  });

  it('冻结用户占据中段时，其余绕开冻结号补齐', () => {
    const fixes = compactOnsiteNumbers([
      { id: 'a', number: 1, gender: 1, frozen: false },
      { id: 'cp-m', number: 2, gender: 1, frozen: true },
      { id: 'cp-f', number: 4, gender: 1, frozen: true },
      { id: 'b', number: 5, gender: 1, frozen: false },
    ]);
    // 空位 3 由 b 前移补上；冻结的 2/4 不动
    expect(fixes).toEqual([{ id: 'b', number: 3 }]);
  });

  it('男女各自独立压实，互不影响', () => {
    const fixes = compactOnsiteNumbers([
      { id: 'm1', number: 1, gender: 1, frozen: false },
      { id: 'm2', number: 3, gender: 1, frozen: false },
      { id: 'f1', number: 1, gender: 2, frozen: false },
      { id: 'f2', number: 3, gender: 2, frozen: false },
    ]);
    expect(fixes).toEqual([
      { id: 'm2', number: 2 },
      { id: 'f2', number: 2 },
    ]);
  });

  it('未编号（null）与性别未设置的条目不参与压实', () => {
    const fixes = compactOnsiteNumbers([
      { id: 'a', number: null, gender: 1, frozen: false },
      { id: 'b', number: 2, gender: 1, frozen: false },
      { id: 'c', number: 3, gender: 1, frozen: false },
      { id: 'd', number: 9, gender: 0, frozen: false },
    ]);
    expect(fixes).toEqual([{ id: 'b', number: 1 }, { id: 'c', number: 2 }]);
  });
});
