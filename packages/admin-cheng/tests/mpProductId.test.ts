import { describe, it, expect } from 'vitest';
import { buildMpProductId } from '@/utils/mpProductId';

describe('buildMpProductId 充值档位内部唯一标识', () => {
  it('格式：前缀-YYYYMMDD-6位随机', () => {
    expect(buildMpProductId('idv')).toMatch(/^idv-\d{8}-[a-z0-9]{6}$/);
    expect(buildMpProductId('cash')).toMatch(/^cash-\d{8}-[a-z0-9]{6}$/);
  });

  it('连续生成 100 个不重复（6 位随机碰撞可忽略）', () => {
    const ids = new Set(Array.from({ length: 100 }, () => buildMpProductId('idv')));
    expect(ids.size).toBe(100);
  });
});
