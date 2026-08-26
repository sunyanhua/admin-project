/**
 * 活动报名名单导出 — 纯逻辑工具
 *
 * 独立于 React 组件，方便单元测试覆盖边界情况。
 */
import type { RegisterRecord } from '@/api/services/activity-v1';
import type { FormField } from './FormConfigEditor';
import {
  ActivityType,
  RegisterGenderLabels,
  FreeFCFSStatusLabels,
  RegisterPayStatusLabels,
  RegisterAuditStatusLabels,
} from '@shared/constants';
import { MaritalStatusLabels, EducationLabels } from '@/api/types/status';

// 通用 URL/照片工具统一放 excelExport.utils（报名名单与专区用户导出共用）
import { PROFILE_H5_URL_PREFIX, buildProfileUrl, splitPhotos } from './excelExport.utils';
export { PROFILE_H5_URL_PREFIX, buildProfileUrl, splitPhotos };

/** 基础信息表头（照片列之前），照片列起始索引即其长度 */
export const BASE_HEADERS = ['用户名', '姓名', '身份证号', '性别', '年龄', '手机号', '婚姻状况', '学历', '户籍', '单位'];

/**
 * 导出表头：基础列 + 照片（仅第一张，全名单有照片时）+ 类型相关状态列 + 表单配置列 + 个人主页
 */
export function buildExportHeaders(activityType: number, formConfig: FormField[], photoCount: number): string[] {
  const headers = [...BASE_HEADERS];
  if (photoCount > 0) headers.push('照片');
  if (activityType === ActivityType.FREE_FCFS) headers.push('报名状态');
  else if (activityType === ActivityType.PAID_FCFS) headers.push('支付状态', '完成时间');
  else if (activityType === ActivityType.FREE_REVIEW) headers.push('审核状态', '拒绝原因', '报名时间');
  if (activityType !== ActivityType.FREE_REVIEW) headers.push('报名时间');
  formConfig.forEach((f) => headers.push(f.label));
  headers.push('个人主页');
  return headers;
}

export interface RegisterExportContext {
  activityType: number;
  idCardMap: Record<string, string>;
  formConfig: FormField[];
}

export interface RegisterExportSheet {
  headers: string[];
  rows: string[][];
  /** 照片列起始索引（= BASE_HEADERS.length） */
  photoColStart: number;
  photoColCount: number;
  /** 个人主页列索引（表末） */
  profileCol: number;
}

/** 组装导出工作表数据：表头 + 全部数据行（每行与表头等长） */
export function buildRegisterExportSheet(items: RegisterRecord[], ctx: RegisterExportContext): RegisterExportSheet {
  // 照片只导出第一张：全名单有照片时才有照片列
  const photoCount = items.some((i) => splitPhotos(i.user_match_profile?.photos).length > 0) ? 1 : 0;
  const headers = buildExportHeaders(ctx.activityType, ctx.formConfig, photoCount);
  const rows = items.map((item) => buildExportRow(item, { ...ctx, photoCount }));
  return {
    headers,
    rows,
    photoColStart: BASE_HEADERS.length,
    photoColCount: photoCount,
    profileCol: headers.length - 1,
  };
}

/** 构建单条报名记录的数据行（长度与表头一致，无照片用空串补齐） */
export function buildExportRow(item: RegisterRecord, ctx: RegisterExportContext & { photoCount: number }): string[] {
  const up = item.user_profile;
  const mp = item.user_match_profile as any;
  const nickname = up?.nickname || item.nickname || item.user_id;
  const name = mp?.real_name || '';
  const gender = up?.gender ?? item.gender;
  const genderLabel = gender != null ? (RegisterGenderLabels[gender] ?? String(gender)) : '';
  const age = up?.age ?? item.age ?? '';
  const phone = (item.user_data as any)?.phone || item.phone || '';
  const marital = mp?.marital_status != null ? (MaritalStatusLabels[mp.marital_status] || String(mp.marital_status)) : '';
  const edu = mp?.education != null ? (EducationLabels[mp.education] || String(mp.education)) : '';
  const household = mp?.household_registration || '';
  const workplace = mp?.workplace || '';
  const createdAt = item.created_at ? item.created_at.replace('T', ' ').substring(0, 19) : '';
  const completedAt = item.completed_at ? item.completed_at.replace('T', ' ').substring(0, 19) : '';
  let formDataMap: Record<string, any> = {};
  try { formDataMap = JSON.parse(item.form_data || '{}'); } catch { /* ignore */ }
  const attsByField: Record<string, string[]> = {};
  for (const att of item.attachments || []) {
    const tag = (att as any).tags || '';
    if (!attsByField[tag]) attsByField[tag] = [];
    attsByField[tag].push(att.url);
  }

  const row = [nickname, name, ctx.idCardMap[item.user_id] || '', genderLabel, String(age), phone, marital, edu, household, workplace];
  // 照片只导出第一张
  const photoUrls = splitPhotos(item.user_match_profile?.photos).slice(0, 1);
  row.push(...photoUrls, ...new Array(Math.max(0, ctx.photoCount - photoUrls.length)).fill(''));
  if (ctx.activityType === ActivityType.FREE_FCFS) { row.push(FreeFCFSStatusLabels[item.pay_status] || String(item.pay_status)); }
  else if (ctx.activityType === ActivityType.PAID_FCFS) { row.push(RegisterPayStatusLabels[item.pay_status] || String(item.pay_status), completedAt); }
  else if (ctx.activityType === ActivityType.FREE_REVIEW) { row.push(RegisterAuditStatusLabels[item.audit_status] || String(item.audit_status), item.audit_reason || '', createdAt); }
  if (ctx.activityType !== ActivityType.FREE_REVIEW) row.push(createdAt);
  ctx.formConfig.forEach((f) => {
    const val = formDataMap[f.id];
    const urls = attsByField[f.id] || [];
    const parts: string[] = [];
    if (val != null) parts.push(String(val));
    parts.push(...urls);
    row.push(parts.join(', '));
  });
  // user_id 为空时不生成死链接
  row.push(item.user_id ? buildProfileUrl(item.user_id) : '');
  return row;
}
