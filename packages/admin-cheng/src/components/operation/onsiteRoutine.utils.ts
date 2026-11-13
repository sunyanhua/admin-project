import { LuckyGender } from '@/pages/operation/luckyPools.utils';

/** 编排步骤类型：与现场大屏四种抽取模式一一对应 */
export type RoutineStepType = 'lucky' | 'groupRep' | 'groupDraw' | 'personDraw';

/** 编排步骤（存 onsite_config.routine，服务端透明存储） */
export interface RoutineStep {
  type: RoutineStepType;
  /** 幸运之星/组中选组/单组选人：抽取人数（组数），≥1 */
  count?: number;
  /** 幸运之星/各组代表/单组选人：性别要求（仅控制结果，默认混搭） */
  gender?: LuckyGender;
  /** 单组选人：指定组名（对应 onsite_config.groups 中的一段） */
  group?: string;
  /** 组中选组：指定抽中的组名（按序落地，数量即抽组数）；缺省则随机抽取 */
  fixed?: string[];
  /** 流程名称（填写后大屏环节名显示该名称，缺省显示默认环节名） */
  name?: string;
  /** 现场备注（大屏进度条展示） */
  note?: string;
}

export const ROUTINE_STEP_TYPE_LABELS: Record<RoutineStepType, string> = {
  lucky: '幸运之星',
  groupRep: '分组代表',
  groupDraw: '组中选组',
  personDraw: '单组选人',
};

const LUCKY_GENDERS: LuckyGender[] = ['male', 'female', 'any', 'mix'];

/** 单步清洗：丢弃非法字段（count 取整且 ≥1；性别须为合法值；group/note 去首尾空格且非空） */
const sanitizeStep = (raw: Record<string, unknown>): RoutineStep => {
  const step: RoutineStep = { type: raw.type as RoutineStepType };
  if (typeof raw.count === 'number' && raw.count >= 1) step.count = Math.floor(raw.count);
  if ((step.type === 'lucky' || step.type === 'groupRep' || step.type === 'personDraw') && LUCKY_GENDERS.includes(raw.gender as LuckyGender)) step.gender = raw.gender as LuckyGender;
  if (step.type === 'personDraw' && typeof raw.group === 'string' && raw.group.trim()) step.group = raw.group.trim();
  if (step.type === 'groupDraw' && Array.isArray(raw.fixed)) {
    const fixed = [...new Set(raw.fixed.filter((g): g is string => typeof g === 'string').map((g) => g.trim()).filter((g) => g))];
    if (fixed.length) step.fixed = fixed;
  }
  if (typeof raw.name === 'string' && raw.name.trim()) step.name = raw.name.trim();
  if (typeof raw.note === 'string' && raw.note.trim()) step.note = raw.note.trim();
  return step;
};

/**
 * 解析 onsite_config.routine（原对象透传存储）：
 * 无 routine 键 / 非数组 / JSON 非法均返回空数组；逐条清洗并丢弃未知类型与非法条目。
 */
export const parseRoutine = (onsiteConfig?: string | null): RoutineStep[] => {
  try {
    const obj = JSON.parse(onsiteConfig || '{}');
    const raw: unknown = obj && typeof obj === 'object' ? obj.routine : undefined;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && !Array.isArray(s))
      .filter((s) => typeof s.type === 'string' && s.type in ROUTINE_STEP_TYPE_LABELS)
      .map((s) => sanitizeStep(s));
  } catch { return []; }
};

/** 校验单组选人步骤引用的分组：返回第一个引用无效分组（缺失或不在分组名称中）的步骤下标，全部有效返回 -1 */
export const findInvalidPersonGroup = (steps: RoutineStep[], groupNames: string[]): number =>
  steps.findIndex((s) => s.type === 'personDraw' && (!s.group || !groupNames.includes(s.group)));
