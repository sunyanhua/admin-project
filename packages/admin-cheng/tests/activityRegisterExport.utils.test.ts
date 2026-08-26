import { describe, it, expect } from 'vitest';
import { ActivityType } from '@shared/constants';
import type { RegisterRecord } from '@/api/services/activity-v1';
import type { FormField } from '@/components/operation/FormConfigEditor';
import {
  buildProfileUrl,
  splitPhotos,
  PROFILE_H5_URL_PREFIX,
  BASE_HEADERS,
  buildExportHeaders,
  buildRegisterExportSheet,
} from '@/components/operation/activityRegisterExport.utils';

const sampleFormConfig: FormField[] = [{ id: 'f1', label: '健康承诺', type: 'text', required: false }];

const sampleRecord = (overrides: Partial<RegisterRecord> = {}): RegisterRecord => ({
  id: 'r1',
  activity_id: 'a1',
  user_id: 'u1',
  form_data: '{}',
  extra_data: '',
  attachments: [],
  audit_status: 0,
  pay_status: 0,
  gender: 1,
  ...overrides,
});

describe('buildProfileUrl', () => {
  it('按约定格式拼接个人主页地址', () => {
    expect(buildProfileUrl('u_123')).toBe(
      'https://ttfm-h5.liteweb.cn/v5/2025/cheng/h5/index.html#/pages/profile/index?user_id=u_123',
    );
  });

  it('前缀常量与格式一致', () => {
    expect(PROFILE_H5_URL_PREFIX).toBe(
      'https://ttfm-h5.liteweb.cn/v5/2025/cheng/h5/index.html#/pages/profile/index?user_id=',
    );
  });

  it('空 user_id 返回前缀本身', () => {
    expect(buildProfileUrl('')).toBe(PROFILE_H5_URL_PREFIX);
  });
});

describe('splitPhotos', () => {
  it('undefined/null 返回空数组', () => {
    expect(splitPhotos(undefined)).toEqual([]);
    expect(splitPhotos(null)).toEqual([]);
  });

  it('空数组返回空数组', () => {
    expect(splitPhotos([])).toEqual([]);
  });

  it('单张照片返回单元素数组', () => {
    expect(splitPhotos(['https://cdn/a.jpg'])).toEqual(['https://cdn/a.jpg']);
  });

  it('多张照片保持原有顺序', () => {
    expect(splitPhotos(['https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg'])).toEqual([
      'https://cdn/a.jpg',
      'https://cdn/b.jpg',
      'https://cdn/c.jpg',
    ]);
  });

  it('过滤空字符串项', () => {
    expect(splitPhotos(['', 'https://cdn/a.jpg', '  '])).toEqual(['https://cdn/a.jpg']);
  });

  it('过滤非字符串项', () => {
    expect(splitPhotos(['https://cdn/a.jpg', 123 as any, null as any])).toEqual(['https://cdn/a.jpg']);
  });

  it('非数组真值输入返回空数组', () => {
    expect(splitPhotos('x' as any)).toEqual([]);
  });
});

describe('buildExportHeaders', () => {
  it('免费先到先得：照片列 + 报名状态 + 报名时间 + 表单列 + 个人主页', () => {
    expect(buildExportHeaders(ActivityType.FREE_FCFS, sampleFormConfig, 2)).toEqual([
      ...BASE_HEADERS, '照片1', '照片2', '报名状态', '报名时间', '健康承诺', '个人主页',
    ]);
  });

  it('收费先交费先得：支付状态 + 完成时间 + 报名时间', () => {
    expect(buildExportHeaders(ActivityType.PAID_FCFS, [], 1)).toEqual([
      ...BASE_HEADERS, '照片1', '支付状态', '完成时间', '报名时间', '个人主页',
    ]);
  });

  it('免费审核筛选：审核状态 + 拒绝原因 + 报名时间（不重复报名时间）', () => {
    expect(buildExportHeaders(ActivityType.FREE_REVIEW, [], 0)).toEqual([
      ...BASE_HEADERS, '审核状态', '拒绝原因', '报名时间', '个人主页',
    ]);
  });

  it('maxPhotos 为 0 时不产生照片列', () => {
    const headers = buildExportHeaders(ActivityType.FREE_FCFS, [], 0);
    expect(headers.some((h) => h.startsWith('照片'))).toBe(false);
  });
});

describe('buildRegisterExportSheet', () => {
  it.each([ActivityType.FREE_FCFS, ActivityType.PAID_FCFS, ActivityType.FREE_REVIEW])(
    '每种活动类型下行与表头长度一致（activityType=%i）',
    (at) => {
      const sheet = buildRegisterExportSheet([sampleRecord()], {
        activityType: at,
        idCardMap: {},
        formConfig: sampleFormConfig,
      });
      expect(sheet.rows).toHaveLength(1);
      expect(sheet.rows[0]).toHaveLength(sheet.headers.length);
    },
  );

  it('照片列紧随单位之后，数量取全名单最大值，不足用空串补齐', () => {
    const withPhotos = sampleRecord({
      user_match_profile: { photos: ['https://cdn/p1.jpg', 'https://cdn/p2.jpg'] } as any,
    });
    const noPhotos = sampleRecord({ id: 'r2', user_id: 'u2' });
    const sheet = buildRegisterExportSheet([withPhotos, noPhotos], {
      activityType: ActivityType.FREE_FCFS,
      idCardMap: {},
      formConfig: [],
    });
    expect(sheet.photoColStart).toBe(BASE_HEADERS.length);
    expect(sheet.photoColCount).toBe(2);
    expect(sheet.rows[0].slice(sheet.photoColStart, sheet.photoColStart + 2)).toEqual([
      'https://cdn/p1.jpg',
      'https://cdn/p2.jpg',
    ]);
    expect(sheet.rows[1].slice(sheet.photoColStart, sheet.photoColStart + 2)).toEqual(['', '']);
  });

  it('个人主页列在表末且值为约定格式 URL', () => {
    const sheet = buildRegisterExportSheet([sampleRecord()], {
      activityType: ActivityType.FREE_FCFS,
      idCardMap: {},
      formConfig: sampleFormConfig,
    });
    expect(sheet.headers[sheet.profileCol]).toBe('个人主页');
    expect(sheet.rows[0][sheet.profileCol]).toBe(buildProfileUrl('u1'));
  });

  it('user_id 为空时个人主页列为空字符串', () => {
    const sheet = buildRegisterExportSheet([sampleRecord({ user_id: '' })], {
      activityType: ActivityType.FREE_FCFS,
      idCardMap: {},
      formConfig: [],
    });
    expect(sheet.rows[0][sheet.profileCol]).toBe('');
  });

  it('maxPhotos 为 0 时 photoColCount 为 0，行仍与表头等长', () => {
    const sheet = buildRegisterExportSheet([sampleRecord()], {
      activityType: ActivityType.FREE_REVIEW,
      idCardMap: {},
      formConfig: [],
    });
    expect(sheet.photoColCount).toBe(0);
    expect(sheet.rows[0]).toHaveLength(sheet.headers.length);
  });
});
