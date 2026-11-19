/**
 * 预报名导入 — 纯逻辑工具
 *
 * 独立于 React 组件，方便单元测试覆盖（身份证号解析出生日期、行映射）。
 */
import type { ImportPresignItem } from '@/api/services/activity-v1';
import { UserGender } from '@/api/types/status';

/** 导入模版表头（与导入解析共用，前 3 列映射接口字段，其余打包进 presign_data） */
export const TEMPLATE_HEADERS = [
  '姓名', '手机号', '性别', '婚姻状况', '学历', '职业', '工作单位', '身高', '体重',
  '生肖', '血型', '民族', '所在区县', '户籍', '家乡', '毕业学校', '收入范围', '身份证号',
  '兴趣爱好', '才艺特长', '自我介绍', '择偶要求',
] as const;

/** 打包进 presign_data 的列（姓名/手机号/性别之后的所有列） */
export const PRESIGN_DATA_KEYS = TEMPLATE_HEADERS.slice(3);

/** 性别文案 → 接口枚举（男 1 / 女 2 / 其他 0 未设置） */
export function parseGender(v: unknown): number {
  const s = String(v ?? '').trim();
  if (s === '男' || s === '1') return UserGender.MALE;
  if (s === '女' || s === '2') return UserGender.FEMALE;
  return UserGender.UNSET;
}

/** 校验日期段是否合法（月 1-12、日按当月天数） */
function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const days = new Date(year, month, 0).getDate();
  return day <= days;
}

/**
 * 从身份证号解析出生日期（YYYY-MM-DD）：
 * - 18 位：第 7-14 位 YYYYMMDD
 * - 15 位：第 7-12 位 YYMMDD（按 19 世纪前缀）
 * 非法/长度不符返回 null。
 */
export function birthDateFromIdCard(idCard: string): string | null {
  const s = String(idCard ?? '').trim();
  if (!/^\d{15}(\d{2}[\dXx])?$/.test(s)) return null;
  let year: number;
  let month: number;
  let day: number;
  if (s.length === 18) {
    year = Number(s.slice(6, 10));
    month = Number(s.slice(10, 12));
    day = Number(s.slice(12, 14));
  } else {
    year = 1900 + Number(s.slice(6, 8));
    month = Number(s.slice(8, 10));
    day = Number(s.slice(10, 12));
  }
  if (!isValidDate(year, month, day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Excel 行 → 导入条目（手机号空返回 null；身份证号有效时额外写入「出生日期」到 presign_data） */
export function rowToImportItem(row: Record<string, unknown>): ImportPresignItem | null {
  const phone = String(row['手机号'] ?? '').trim();
  if (!phone) return null;
  const extra: Record<string, string> = {};
  for (const key of PRESIGN_DATA_KEYS) {
    const val = String(row[key] ?? '').trim();
    if (val) extra[key] = val;
  }
  // 身份证号 → 出生日期（2026-11-19 用户定：作为字段存入预报名信息）
  const idCard = String(row['身份证号'] ?? '').trim();
  if (idCard) {
    const birth = birthDateFromIdCard(idCard);
    if (birth) extra['出生日期'] = birth;
  }
  const realName = String(row['姓名'] ?? '').trim();
  return {
    phone,
    real_name: realName || undefined,
    gender: parseGender(row['性别']),
    presign_data: Object.keys(extra).length ? JSON.stringify(extra) : undefined,
  };
}
