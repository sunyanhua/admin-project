/**
 * 充值档位内部唯一标识生成
 *
 * mp_product_id：对账/幂等用的内部档位唯一标识，不传给微信。
 * 格式：业务前缀 + 日期(YYYYMMDD) + 6 位 base36 随机（同日同前缀约 21 亿组合，碰撞可忽略）。
 */

/** 生成充值档位内部唯一标识：前缀-YYYYMMDD-6位随机 */
export function buildMpProductId(prefix: 'idv' | 'cash'): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const rand = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${prefix}-${date}-${rand}`;
}
