/**
 * Excel 导出 — 通用纯逻辑工具（活动报名名单 / 专区用户等导出共用）
 *
 * 独立于 React 组件，方便单元测试覆盖边界情况。
 */
import * as XLSX from 'xlsx';

/** H5 个人主页地址前缀（用户资料页） */
export const PROFILE_H5_URL_PREFIX =
  'https://ttfm-h5.liteweb.cn/v5/2025/cheng/h5/index.html#/pages/profile/index?user_id=';

/** 按约定格式拼接用户个人主页地址 */
export function buildProfileUrl(userId: string): string {
  return `${PROFILE_H5_URL_PREFIX}${userId}`;
}

/** 脱单资料照片 URL 列表：过滤空项/非字符串项、保持原有顺序（null/undefined 降级为空数组） */
export function splitPhotos(photos: string[] | null | undefined): string[] {
  if (!Array.isArray(photos)) return [];
  return photos.filter((url) => typeof url === 'string' && url.trim().length > 0);
}

/**
 * 个人主页单元格：含 # 片段的 URL 必须用 HYPERLINK 公式承载。
 * xlsx 规范把 # 后片段拆到 location 属性，而 Excel/WPS 读取 location 时会截断片段；
 * 公式方式将完整 URL 内嵌在公式字符串中，Excel/WPS/LibreOffice/Google Sheets 全兼容。
 */
export function buildProfileCellValue(url: string): { t: 'str'; v: string; f: string } {
  return { t: 'str', v: url, f: `HYPERLINK("${url}","${url}")` };
}

export interface LinkColumnOptions {
  headers: string[];
  /** 数据行数（不含表头） */
  rowsCount: number;
  /** 照片列起始索引 */
  photoColStart: number;
  /** 照片列数量（0 或 1，只导出第一张） */
  photoColCount: number;
  /** 个人主页列索引 */
  profileCol: number;
}

/**
 * 统一后处理工作表：照片列/个人主页列列宽适配 + 单元格链接
 *   - 照片列：普通超链接（URL 不含 #）
 *   - 个人主页列：HYPERLINK 公式（含 # 片段）
 */
export function applyLinkColumns(ws: XLSX.WorkSheet, opts: LinkColumnOptions): void {
  const { headers, rowsCount, photoColStart, photoColCount, profileCol } = opts;

  // 列宽：照片列 40、个人主页列 60，其余 20
  ws['!cols'] = headers.map((_h, idx) => {
    if (idx >= photoColStart && idx < photoColStart + photoColCount) return { wch: 40 };
    if (idx === profileCol) return { wch: 60 };
    return { wch: 20 };
  });

  for (let r = 1; r <= rowsCount; r++) {
    for (let c = photoColStart; c < photoColStart + photoColCount; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const v = (ws[addr] as any)?.v;
      if (typeof v === 'string' && v.trim()) ws[addr] = { t: 's', v, l: { Target: v } };
    }
    const pAddr = XLSX.utils.encode_cell({ r, c: profileCol });
    const pv = (ws[pAddr] as any)?.v;
    if (typeof pv === 'string' && pv.trim()) ws[pAddr] = buildProfileCellValue(pv);
  }
}
