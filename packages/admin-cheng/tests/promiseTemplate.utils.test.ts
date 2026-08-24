import { describe, it, expect } from 'vitest';
import {
  parseStoredValue,
  serializeTemplates,
  generateTemplateId,
  parsePromiseIdsFromExtra,
  reorderTemplates,
  type PromiseTemplate,
} from '@/components/operation/promiseTemplate.utils';

const sample = (): PromiseTemplate[] => [
  { id: 't1', title: '线下聚会承诺书', content: '<p>本人承诺...</p>' },
  { id: 't2', title: '线上活动承诺书', content: '<p>线上承诺...</p>' },
];

describe('parseStoredValue', () => {
  it('空值（null/undefined/空字符串）返回空数组', () => {
    expect(parseStoredValue(null)).toEqual([]);
    expect(parseStoredValue(undefined)).toEqual([]);
    expect(parseStoredValue('')).toEqual([]);
  });

  it('解析 JSON 字符串中 templates 字段', () => {
    const raw = JSON.stringify({ templates: sample() });
    expect(parseStoredValue(raw)).toEqual(sample());
  });

  it('直接传入对象时读取 templates 字段', () => {
    expect(parseStoredValue({ templates: sample() })).toEqual(sample());
  });

  it('兼容老数据：直接传入数组', () => {
    expect(parseStoredValue(sample())).toEqual(sample());
  });

  it('兼容老数据：JSON 字符串本身就是数组', () => {
    const raw = JSON.stringify(sample());
    expect(parseStoredValue(raw)).toEqual(sample());
  });

  it('解析失败时返回空数组（不抛错）', () => {
    expect(parseStoredValue('not a json{')).toEqual([]);
    expect(parseStoredValue('{malformed')).toEqual([]);
  });

  it('过滤非法项：缺少 id/title/content 的元素被丢弃', () => {
    const raw = JSON.stringify({
      templates: [
        { id: 'ok', title: '正常', content: '内容' },
        { id: '', title: '无id', content: '内容' },
        { id: 'no-title', title: '', content: '内容' },
        { id: 'no-content', title: '无内容', content: '' },
        null,
        'not an object',
      ],
    });
    expect(parseStoredValue(raw)).toEqual([
      { id: 'ok', title: '正常', content: '内容' },
    ]);
  });

  it('非对象/非数组输入返回空数组', () => {
    expect(parseStoredValue(123 as any)).toEqual([]);
    expect(parseStoredValue(true as any)).toEqual([]);
  });
});

describe('serializeTemplates', () => {
  it('输出包含 templates 字段的 JSON 字符串', () => {
    const json = serializeTemplates(sample());
    expect(JSON.parse(json)).toEqual({ templates: sample() });
  });

  it('空数组输出 { templates: [] }', () => {
    expect(JSON.parse(serializeTemplates([]))).toEqual({ templates: [] });
  });
});

describe('generateTemplateId', () => {
  it('生成字符串 id', () => {
    const id = generateTemplateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('两次生成不同 id', () => {
    expect(generateTemplateId()).not.toBe(generateTemplateId());
  });
});

describe('reorderTemplates', () => {
  const list4 = (): PromiseTemplate[] => [
    { id: 't1', title: '模版一', content: '内容一' },
    { id: 't2', title: '模版二', content: '内容二' },
    { id: 't3', title: '模版三', content: '内容三' },
    { id: 't4', title: '模版四', content: '内容四' },
  ];

  it('从后往前拖动（from > to）', () => {
    const result = reorderTemplates(list4(), 3, 1);
    expect(result.map((t) => t.id)).toEqual(['t1', 't4', 't2', 't3']);
  });

  it('从前往后拖动（from < to）', () => {
    const result = reorderTemplates(list4(), 0, 2);
    expect(result.map((t) => t.id)).toEqual(['t2', 't3', 't1', 't4']);
  });

  it('拖到开头/末尾', () => {
    expect(reorderTemplates(list4(), 2, 0).map((t) => t.id)).toEqual(['t3', 't1', 't2', 't4']);
    expect(reorderTemplates(list4(), 1, 3).map((t) => t.id)).toEqual(['t1', 't3', 't4', 't2']);
  });

  it('from 与 to 相同时顺序不变', () => {
    const list = list4();
    const result = reorderTemplates(list, 1, 1);
    expect(result).toEqual(list);
    expect(result).not.toBe(list);
  });

  it('越界索引返回原顺序（不抛错）', () => {
    expect(reorderTemplates(list4(), -1, 2)).toEqual(list4());
    expect(reorderTemplates(list4(), 0, 99)).toEqual(list4());
    expect(reorderTemplates(list4(), 99, 0)).toEqual(list4());
  });

  it('返回新数组，不修改原数组', () => {
    const list = list4();
    const result = reorderTemplates(list, 2, 0);
    expect(result).not.toBe(list);
    expect(list.map((t) => t.id)).toEqual(['t1', 't2', 't3', 't4']);
  });

  it('空数组/单元素数组安全', () => {
    expect(reorderTemplates([], 0, 0)).toEqual([]);
    expect(reorderTemplates([list4()[0]], 0, 0)).toEqual([list4()[0]]);
  });
});

describe('parsePromiseIdsFromExtra', () => {
  it('空值（null/undefined/空字符串）返回空数组', () => {
    expect(parsePromiseIdsFromExtra(null)).toEqual([]);
    expect(parsePromiseIdsFromExtra(undefined)).toEqual([]);
    expect(parsePromiseIdsFromExtra('')).toEqual([]);
  });

  it('解析 JSON 字符串中的 promise 数组 id', () => {
    const raw = JSON.stringify({ promise: [{ id: 't1' }, { id: 't2' }, { id: 't3' }] });
    expect(parsePromiseIdsFromExtra(raw)).toEqual(['t1', 't2', 't3']);
  });

  it('直接传入对象时读取 promise 字段', () => {
    expect(parsePromiseIdsFromExtra({ promise: [{ id: 'a' }, { id: 'b' }] })).toEqual(['a', 'b']);
  });

  it('promise 为空数组返回空数组', () => {
    expect(parsePromiseIdsFromExtra({ promise: [] })).toEqual([]);
    expect(parsePromiseIdsFromExtra(JSON.stringify({ promise: [] }))).toEqual([]);
  });

  it('无 promise 字段返回空数组', () => {
    expect(parsePromiseIdsFromExtra({ other: 'x' })).toEqual([]);
    expect(parsePromiseIdsFromExtra(JSON.stringify({ other: 'x' }))).toEqual([]);
  });

  it('非法 JSON 字符串返回空数组（不抛错）', () => {
    expect(parsePromiseIdsFromExtra('not a json{')).toEqual([]);
    expect(parsePromiseIdsFromExtra('{malformed')).toEqual([]);
  });

  it('过滤掉空字符串/非字符串 id', () => {
    const raw = JSON.stringify({
      promise: [{ id: 'ok' }, { id: '' }, { id: null }, { id: 123 }, {}],
    });
    expect(parsePromiseIdsFromExtra(raw)).toEqual(['ok']);
  });

  it('非对象输入返回空数组', () => {
    expect(parsePromiseIdsFromExtra(123 as any)).toEqual([]);
    expect(parsePromiseIdsFromExtra(true as any)).toEqual([]);
  });
});