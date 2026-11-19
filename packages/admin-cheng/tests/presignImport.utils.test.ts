import { describe, it, expect } from 'vitest';
import { birthDateFromIdCard, rowToImportItem } from '@/components/operation/presignImport.utils';

describe('birthDateFromIdCard 身份证号解析出生日期', () => {
  it('18 位身份证：第 7-14 位解析为 YYYY-MM-DD', () => {
    expect(birthDateFromIdCard('110101199506154321')).toBe('1995-06-15');
  });

  it('18 位身份证：无效日期（月 13）返回 null', () => {
    expect(birthDateFromIdCard('110101199513154321')).toBeNull();
  });

  it('15 位身份证：第 7-12 位 YYMMDD，按 19 世纪前缀解析', () => {
    expect(birthDateFromIdCard('110101950615432')).toBe('1995-06-15');
  });

  it('空串/长度不符/非数字返回 null', () => {
    expect(birthDateFromIdCard('')).toBeNull();
    expect(birthDateFromIdCard('12345')).toBeNull();
    expect(birthDateFromIdCard('abcdefghijklmnopqr')).toBeNull();
  });
});

describe('rowToImportItem 导入行映射', () => {
  it('身份证号有效时，presign_data 中写入出生日期', () => {
    const item = rowToImportItem({
      '姓名': '张三', '手机号': '13800000000', '性别': '男', '身份证号': '110101199506154321',
      '学历': '本科',
    });
    expect(item).not.toBeNull();
    const extra = JSON.parse(item!.presign_data || '{}');
    expect(extra['出生日期']).toBe('1995-06-15');
    expect(extra['学历']).toBe('本科');
  });

  it('身份证号无效时，不写入出生日期，其它列照常打包', () => {
    const item = rowToImportItem({ '姓名': '李四', '手机号': '13800000001', '身份证号': 'abc' });
    expect(item).not.toBeNull();
    const extra = JSON.parse(item!.presign_data || '{}');
    expect(extra['出生日期']).toBeUndefined();
  });

  it('手机号为空返回 null', () => {
    expect(rowToImportItem({ '姓名': '王五' })).toBeNull();
  });
});
