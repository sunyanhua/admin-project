import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { buildProfileCellValue, applyLinkColumns } from '@/components/operation/excelExport.utils';

const PROFILE_URL = 'https://ttfm-h5.liteweb.cn/v5/2025/cheng/h5/index.html#/pages/profile/index?user_id=u1';
const PHOTO_URL = 'https://cdn/p1.jpg';

describe('buildProfileCellValue', () => {
  it('生成 HYPERLINK 公式单元格（完整 URL 内嵌公式字符串）', () => {
    expect(buildProfileCellValue(PROFILE_URL)).toEqual({
      t: 'str',
      v: PROFILE_URL,
      f: `HYPERLINK("${PROFILE_URL}","${PROFILE_URL}")`,
    });
  });
});

describe('applyLinkColumns', () => {
  const buildSheet = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['姓名', '照片', '个人主页'],
      ['张三', PHOTO_URL, PROFILE_URL],
      ['李四', '', ''],
    ]);
    return ws;
  };

  it('照片列单元格设为超链接，个人主页列设为 HYPERLINK 公式', () => {
    const ws = buildSheet();
    applyLinkColumns(ws, {
      headers: ['姓名', '照片', '个人主页'],
      rowsCount: 2,
      photoColStart: 1,
      photoColCount: 1,
      profileCol: 2,
    });
    const photo = ws[XLSX.utils.encode_cell({ r: 1, c: 1 })] as any;
    expect(photo).toEqual({ t: 's', v: PHOTO_URL, l: { Target: PHOTO_URL } });
    const profile = ws[XLSX.utils.encode_cell({ r: 1, c: 2 })] as any;
    expect(profile).toEqual(buildProfileCellValue(PROFILE_URL));
  });

  it('空单元格不生成链接', () => {
    const ws = buildSheet();
    applyLinkColumns(ws, {
      headers: ['姓名', '照片', '个人主页'],
      rowsCount: 2,
      photoColStart: 1,
      photoColCount: 1,
      profileCol: 2,
    });
    const photo = ws[XLSX.utils.encode_cell({ r: 2, c: 1 })] as any;
    expect(photo.l).toBeUndefined();
    expect(photo.f).toBeUndefined();
    const profile = ws[XLSX.utils.encode_cell({ r: 2, c: 2 })] as any;
    expect(profile.l).toBeUndefined();
    expect(profile.f).toBeUndefined();
  });

  it('photoColCount 为 0 时照片列不处理，个人主页仍生效', () => {
    const ws = buildSheet();
    applyLinkColumns(ws, {
      headers: ['姓名', '照片', '个人主页'],
      rowsCount: 2,
      photoColStart: 1,
      photoColCount: 0,
      profileCol: 2,
    });
    expect(ws[XLSX.utils.encode_cell({ r: 1, c: 1 })] as any).toEqual({ t: 's', v: PHOTO_URL });
    const profile = ws[XLSX.utils.encode_cell({ r: 1, c: 2 })] as any;
    expect(profile).toEqual(buildProfileCellValue(PROFILE_URL));
  });

  it('列宽：照片列 40、个人主页列 60、其余 20', () => {
    const ws = buildSheet();
    applyLinkColumns(ws, {
      headers: ['姓名', '照片', '个人主页'],
      rowsCount: 2,
      photoColStart: 1,
      photoColCount: 1,
      profileCol: 2,
    });
    expect(ws['!cols']).toEqual([{ wch: 20 }, { wch: 40 }, { wch: 60 }]);
  });
});
