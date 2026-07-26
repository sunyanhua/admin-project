# 活动管理信息编辑重构 — 设计文档

**Date**: 2026-07-21
**Status**: approved

## 目标

调整活动管理（EventManagement / EventWizardModal / EventEditModal）中的信息编辑表单，
将主办方、活动时间、活动地点从 `detail_desc` 中分离，组成 JSON 字符串存入新增的 `intro` 字段。

## 背景

- 当前所有扩展信息（活动时间 `datetime` + 活动介绍 `detail` + 报名协议）都拼装在 `detail_desc` JSON 中
- 新需求要求将部分信息拆到 `intro` 字段，`detail_desc` 保持原有 JSON 拼接方式仅存活动介绍和报名协议

## 数据模型

### `intro` 字段（新增，存储在 Product 的 `intro` 列）

格式为 JSON.stringify 的数组：

```json
[
  {"title":"主办方", "content":"主办方填写内容", "showonlist":"false"},
  {"title":"活动时间", "content":"2026年7月15日 14:00-16:00", "showonlist":"true"},
  {"title":"活动地点", "content":"北京市朝阳区", "zuobiao":"39.9,116.4", "showonlist":"true"}
]
```

**规则**：
- title 硬编码，用户不可见不可改
- showonlist 硬编码（主办方 `"false"`，活动时间/地点 `"true"`）
- 主办方(`content`) 非必填，活动时间(`content`) 必填，地点(`content`) 必填，坐标(`zuobiao`) 非必填
- 活动地点特有 `zuobiao` 字段，其他 item 无此字段
- 编辑时从 `intro` JSON 解析回填到表单

### `detail_desc` 字段（保留，内容调整）

格式保持 JSON.stringify：

```json
{"detail": "活动介绍（富文本HTML）", "hasagreement": true, "agreement": "协议内容（富文本HTML）"}
```

移除了 `datetime` 字段 — 活动时间已迁至 `intro`。

## 表单字段排列（自上而下）

| # | 字段 | 组件 | 必填 | 说明 |
|---|------|------|------|------|
| 1 | 活动名称 | Input | 是 | 不变 |
| 2 | 活动简介 | Input | 否 | 不变 |
| 3 | 所属分类 | Select | 是 | 不变 |
| 4 | 活动封面 | CropperImageUpload | 是 | 不变 |
| 5 | 活动图片 | MultiImageUpload | 否 | 不变 |
| 6 | **主办方** | Input | 否 | **新增** |
| 7 | 活动时间 | Input | 是 | 移至 intro，表单位置不变 |
| 8 | **活动地点** | Input + Input + Link | 部分 | **新增** — 两个输入框 |
| 9 | 活动介绍 | RichTextEditor | 是 | 存入 detail_desc.detail |
| 10 | 是否有报名协议 | Switch | 否 | 存入 detail_desc.hasagreement |
| 11 | 报名协议内容 | RichTextEditor | 否 | 条件显示，存入 detail_desc.agreement |
| 12 | 显示/隐藏 | Switch | 否 | 不变 |
| 13 | 权重 | InputNumber | 是 | 不变 |

### 活动地点详解

在同一 Form.Item label="活动地点" 下：
- 第一个 Input：placeholder="请输入地点"，必填
- 第二个 Input：placeholder="请输入坐标"，非必填
- 坐标 Input 后紧跟一个 `<a>` 链接，文字"查询坐标"，`target="_blank"`，href 为 `https://lbs.qq.com/tool/getpoint/index.html`

## 涉及文件与改动

| 文件 | 改动 |
|------|------|
| `src/api/services/product.ts` | `Product` 接口增加 `intro?: string`；`CreateProductData` 增加 `intro?: string`；`UpdateProductData` 增加 `intro?: string` |
| `src/components/operation/EventEditModal.tsx` | 新增主办方/活动地点表单字段；修改 `parseDetailDesc` / `handleSubmit` — 构建 intro JSON 和简化后的 detail_desc；编辑回填解析 intro |
| `src/components/operation/EventWizardModal.tsx` | 同上，创建活动 Step1 表单同步修改（intro + detail_desc 两部分） |

## 数据流

### 创建/编辑提交

```
表单值 → 
  intro: JSON.stringify([
    {title:"主办方", content: values.host, showonlist:"false"},
    {title:"活动时间", content: values.datetime, showonlist:"true"},
    {title:"活动地点", content: values.address, zuobiao: values.coordinate || "", showonlist:"true"}
  ])
  detail_desc: JSON.stringify({
    detail: values.detail,
    hasagreement: values.hasagreement || false,
    agreement: values.agreement || undefined
  })
→ API POST/PUT
```

### 编辑回填

```
API Response →
  intro → JSON.parse → 按 title 匹配填回:
    "主办方" → form host
    "活动时间" → form datetime
    "活动地点" → form address, form coordinate
  detail_desc → JSON.parse → 填回:
    detail → form detail
    hasagreement → form hasagreement
    agreement → form agreement
```

## 兼容性

- `intro` 为空或解析失败时：表单主办方/地点为空，活动时间对应旧 `detail_desc.datetime` 的兼容逻辑（如有旧数据）
- `detail_desc` 仍为 JSON 字符串，解析失败时回退到空对象 `{}`

## TypeScript 类型

```typescript
interface ActivityIntroItem {
  title: '主办方' | '活动时间' | '活动地点';
  content: string;
  showonlist: 'true' | 'false';
  zuobiao?: string; // 仅活动地点有此字段
}
```
