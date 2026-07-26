# 活动管理信息编辑重构 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将活动管理表单中的主办方、活动时间、活动地点从 `detail_desc` JSON 分离，组成新的 `intro` JSON 字符串字段存储；`detail_desc` 保留活动介绍 + 报名协议。

**Architecture:** 三文件修改 — `product.ts`（API 类型）、`EventEditModal.tsx`（编辑弹窗）、`EventWizardModal.tsx`（向导创建弹窗），两个弹窗组件共享相同的 intro JSON 构建/解析逻辑。

**Tech Stack:** React + TypeScript + Ant Design v5+

## Global Constraints

- 禁止 `import { message } from 'antd'`，必须用 `useAppNotification`
- 弹窗必须用 `ScrollableModal`
- 枚举不能硬编码，title/showonlist 为硬编码常量（按需求允许）
- 禁止 mutation，使用不可变模式
- `intro` JSON 数组字段：`title`/`content`/`showonlist` 固定，"活动地点"额外含 `zuobiao`

---

### Task 1: Product API 类型增加 intro 字段

**Files:**
- Modify: `src/api/services/product.ts`

**Interfaces:**
- Produces: `Product.intro?: string`, `CreateProductData.intro?: string`, `UpdateProductData.intro?: string`

- [ ] **Step 1: 在 Product 接口增加 intro 字段**

在 `Product` 接口中 `detail_desc?: string;` 下一行添加：

```typescript
  intro?: string;
```

`Product` 接口位置约在第 23 行 `detail_desc` 后。

- [ ] **Step 2: 在 CreateProductData 接口增加 intro 字段**

在 `CreateProductData` 接口中 `detail_desc?: string;` 下一行添加：

```typescript
  intro?: string;
```

- [ ] **Step 3: 在 UpdateProductData 接口增加 intro 字段**

在 `UpdateProductData` 接口中 `detail_desc?: string;` 下一行添加：

```typescript
  intro?: string;
```

- [ ] **Step 4: Commit**

```bash
git add src/api/services/product.ts
git commit -m "feat: product API types 增加 intro 字段"
```

---

### Task 2: EventEditModal 表单重构（intro + detail_desc）

**Files:**
- Modify: `src/components/operation/EventEditModal.tsx`

**Interfaces:**
- Consumes: `Product.intro?: string`, `CreateProductData.intro?: string`, `UpdateProductData.intro?: string` (from Task 1)
- Produces: 表单新增 host/address/coordinate 字段，构建 intro 和 detail_desc JSON

- [ ] **Step 1: 更新 EventDetailDesc 接口、添加 IntroItem 类型和解析函数**

替换文件顶部的 `EventDetailDesc` 和 `parseDetailDesc` 为以下代码：

```typescript
interface EventDetailDesc {
  detail?: string;
  hasagreement?: boolean;
  agreement?: string;
}

interface ActivityIntroItem {
  title: string;
  content: string;
  showonlist: string;
  zuobiao?: string;
}

function parseDetailDesc(json?: string): EventDetailDesc {
  if (!json) return {};
  let decoded = json;
  decoded = decoded.replace(/&(?:#34|quot);/g, '"');
  decoded = decoded.replace(/\\\\"/g, '\\"');
  try { return JSON.parse(decoded); } catch { return {}; }
}

function parseIntro(json?: string): ActivityIntroItem[] {
  if (!json) return [];
  let decoded = json;
  decoded = decoded.replace(/&(?:#34|quot);/g, '"');
  decoded = decoded.replace(/\\\\"/g, '\\"');
  try { return JSON.parse(decoded); } catch { return []; }
}
```

删除原来文件顶部的 `EventDetailDesc` 接口（含 `datetime`）和 `parseDetailDesc` 函数。

- [ ] **Step 2: 更新 useEffect 编辑回填逻辑**

替换 `useEffect` 内部的回填逻辑（约第 53-76 行）：

```typescript
useEffect(() => {
    if (visible) {
      if (event && !isCreate) {
        const desc = parseDetailDesc(event.detail_desc);
        const introItems = parseIntro(event.intro);
        setHasAgreement(desc.hasagreement || false);
        form.setFieldsValue({
          title: event.title || '',
          sub_title: event.sub_title || '',
          category_id: event.category_id ?? undefined,
          cover_image: event.cover_image || '',
          carousel_images: event.carousel_images || [],
          host: introItems.find((i: ActivityIntroItem) => i.title === '主办方')?.content || '',
          datetime: introItems.find((i: ActivityIntroItem) => i.title === '活动时间')?.content || '',
          address: introItems.find((i: ActivityIntroItem) => i.title === '活动地点')?.content || '',
          coordinate: introItems.find((i: ActivityIntroItem) => i.title === '活动地点')?.zuobiao || '',
          detail: desc.detail || '',
          hasagreement: desc.hasagreement || false,
          agreement: desc.agreement || '',
          is_visible: event.is_visible !== false,
          sort_order: event.sort_order ?? 0,
        });
      } else {
        form.resetFields();
        setHasAgreement(false);
        form.setFieldsValue({ is_visible: true, sort_order: 0 });
      }
    }
  }, [visible, event, isCreate, form]);
```

- [ ] **Step 3: 更新 handleSubmit 构建 intro 和 detail_desc**

替换 `handleSubmit` 函数体内的 detailDesc 构建逻辑（约第 82-90 行）：

```typescript
const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      const introItems: ActivityIntroItem[] = [
        { title: '主办方', content: values.host || '', showonlist: 'false' },
        { title: '活动时间', content: values.datetime || '', showonlist: 'true' },
        { title: '活动地点', content: values.address || '', zuobiao: values.coordinate || '', showonlist: 'true' },
      ];
      const intro = JSON.stringify(introItems);

      const detailDesc: EventDetailDesc = {
        detail: values.detail || undefined,
        hasagreement: values.hasagreement || false,
      };
      if (values.hasagreement && values.agreement) {
        detailDesc.agreement = values.agreement;
      }
      const detail_desc = JSON.stringify(detailDesc);

      if (isCreate) {
        await productApi.createProduct({
          title: values.title,
          sub_title: values.sub_title || undefined,
          category_id: values.category_id,
          cover_image: values.cover_image || undefined,
          carousel_images: values.carousel_images?.length > 0 ? values.carousel_images : undefined,
          intro,
          detail_desc,
          is_virtual: true,
          is_listed: false,
          is_visible: values.is_visible ?? true,
          sort_order: values.sort_order ?? 0,
        });
        success('活动创建成功');
      } else {
        if (!event) return;
        await productApi.updateProduct(event.id, {
          title: values.title,
          sub_title: values.sub_title || undefined,
          category_id: values.category_id,
          cover_image: values.cover_image || undefined,
          carousel_images: values.carousel_images?.length > 0 ? values.carousel_images : undefined,
          intro,
          detail_desc,
          is_visible: values.is_visible,
          sort_order: values.sort_order ?? undefined,
        });
        success('活动更新成功');
      }
      form.resetFields();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || (isCreate ? '创建失败' : '更新失败'));
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 4: 更新 JSX 表单字段 — 在活动图片后面、活动时间前面添加主办方**

在 `<Form.Item label="活动时间" ...>` 之前插入：

```tsx
        <Form.Item label="主办方" name="host"
          rules={[{ max: 128, message: '最多128个字符' }]}>
          <Input placeholder="请输入主办方（选填）" />
        </Form.Item>
```

- [ ] **Step 5: 更新活动时间字段（保持位置但在其后添加活动地点）**

将活动时间的 `Form.Item` 后的位置，插入活动地点字段。当前活动时间字段在约 172 行：

保持原有活动时间字段不变，在其后（活动介绍字段前）添加：

```tsx
        <Form.Item label="活动地点" required>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name="address" noStyle
              rules={[{ required: true, message: '请输入活动地点' }]}>
              <Input placeholder="请输入地点" />
            </Form.Item>
            <Space>
              <Form.Item name="coordinate" noStyle>
                <Input placeholder="请输入坐标" style={{ width: 300 }} />
              </Form.Item>
              <a href="https://lbs.qq.com/tool/getpoint/index.html" target="_blank" rel="noopener noreferrer">
                查询坐标
              </a>
            </Space>
          </Space>
        </Form.Item>
```

- [ ] **Step 6: 验证文件无语法错误**

```bash
npx tsc --noEmit --pretty src/components/operation/EventEditModal.tsx 2>&1 | head -20
```

Expected: no errors or only pre-existing project-level errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/operation/EventEditModal.tsx
git commit -m "feat: EventEditModal 增加主办方/活动地点，重构 intro 和 detail_desc 提交"
```

---

### Task 3: EventWizardModal 表单重构（intro + detail_desc）

**Files:**
- Modify: `src/components/operation/EventWizardModal.tsx`

**Interfaces:**
- Consumes: `Product.intro?: string`, `CreateProductData.intro?: string` (from Task 1)
- Produces: Wizard Step1 表单新增 host/address/coordinate 字段，构建 intro 和 detail_desc

- [ ] **Step 1: 更新 EventDetailDesc 接口，添加 Intro 解析类型和辅助函数**

替换文件顶部的 `EventDetailDesc` 接口（约第 14-16 行）：

```typescript
interface EventDetailDesc {
  detail?: string; hasagreement?: boolean; agreement?: string;
}

interface ActivityIntroItem {
  title: string;
  content: string;
  showonlist: string;
  zuobiao?: string;
}
```

- [ ] **Step 2: 更新 handleStep1 函数中的 detailDesc 构建**

替换 `handleStep1` 函数内构造 detailDesc 和调用 createProduct 的部分（约第 62-82 行）：

```typescript
      const introItems: ActivityIntroItem[] = [
        { title: '主办方', content: values.host || '', showonlist: 'false' },
        { title: '活动时间', content: values.datetime || '', showonlist: 'true' },
        { title: '活动地点', content: values.address || '', zuobiao: values.coordinate || '', showonlist: 'true' },
      ];
      const intro = JSON.stringify(introItems);

      const detailDesc: EventDetailDesc = {
        detail: values.detail || undefined,
        hasagreement: values.hasagreement || false,
      };
      if (values.hasagreement && values.agreement) {
        detailDesc.agreement = values.agreement;
      }

      const res: any = await productApi.createProduct({
        title: values.title,
        sub_title: values.sub_title || undefined,
        category_id: values.category_id,
        cover_image: values.cover_image || undefined,
        carousel_images: values.carousel_images?.length > 0 ? values.carousel_images : undefined,
        intro,
        detail_desc: JSON.stringify(detailDesc),
        is_virtual: true,
        is_listed: false,
        is_visible: values.is_visible ?? true,
        sort_order: values.sort_order ?? 0,
      });
```

- [ ] **Step 3: 更新 Step1 JSX — 在活动图片后活动时间前添加主办方字段**

在 `step1Content` 中，`MultiImageUpload` 的 `</Form.Item>` 之后、活动时间的 `<Form.Item label="活动时间"` 之前插入：

```tsx
      <Form.Item label="主办方" name="host" rules={[{ max: 128, message: '最多128个字符' }]}>
        <Input placeholder="请输入主办方（选填）" />
      </Form.Item>
```

- [ ] **Step 4: 在活动时间字段后、活动介绍前添加活动地点字段**

在 `step1Content` 中，活动时间的 `</Form.Item>` 之后、活动介绍的 `<Form.Item label="活动介绍"` 之前插入：

```tsx
      <Form.Item label="活动地点" required>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item name="address" noStyle
            rules={[{ required: true, message: '请输入活动地点' }]}>
            <Input placeholder="请输入地点" />
          </Form.Item>
          <Space>
            <Form.Item name="coordinate" noStyle>
              <Input placeholder="请输入坐标" style={{ width: 300 }} />
            </Form.Item>
            <a href="https://lbs.qq.com/tool/getpoint/index.html" target="_blank" rel="noopener noreferrer">
              查询坐标
            </a>
          </Space>
        </Space>
      </Form.Item>
```

- [ ] **Step 5: 验证文件无语法错误**

```bash
npx tsc --noEmit --pretty src/components/operation/EventWizardModal.tsx 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/operation/EventWizardModal.tsx
git commit -m "feat: EventWizardModal Step1 增加主办方/活动地点，intro + detail_desc 重构提交"
```

---

## Verification

- [ ] 测试创建活动：向导填写主办方、活动时间、活动地点（有坐标和无坐标两种情况），验证 `intro` 和 `detail_desc` 字段正确保存
- [ ] 测试编辑活动：编辑已有活动，验证 `intro` 字段正确解析回填到表单各字段
- [ ] 测试必填校验：不填活动时间和活动地点时，表单阻止提交
- [ ] 测试非必填项：主办方和坐标留空可正常提交
- [ ] 测试"查询坐标"链接在新窗口打开正确 URL
- [ ] 测试报名协议：开启报名协议并填写内容，验证 `detail_desc` 中 `agreement` 正确保存
