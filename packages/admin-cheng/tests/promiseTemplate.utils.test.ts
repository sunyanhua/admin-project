import { describe, it, expect } from 'vitest';
import {
  parseStoredValue,
  serializeTemplates,
  generateTemplateId,
  parsePromiseIdsFromExtra,
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