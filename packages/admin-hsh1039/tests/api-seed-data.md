# API 快捷添加测试数据指南

> 通过 CLI curl 模拟后台操作流程，快速创建活动/票务/商品的完整测试数据。

---

## 前置条件

1. 开发服务器已启动（本地 `http://localhost:3101` 或测试环境 `https://hsh-test.vbegin.com.cn`）
2. 准备登录凭据（用户名 + 密码）

## 步骤 1：获取 Token

```bash
BASE="https://hsh-test.vbegin.com.cn"
TOKEN=$(curl -s -X POST "$BASE/admin/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"你的用户名","password":"你的密码"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")
echo "Token: ${TOKEN:0:20}..."
```

之后所有请求只需替换 `$TOKEN` 变量，或直接拼接 Authorization header。

## 步骤 2：上传图片（可选，但建议先上传再用返回的 URL）

```bash
curl -s -X POST "$BASE/admin/v1/upload/image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/cover.jpg"
# → 返回 { "data": { "url": "https://cdn.vbegin.com.cn/..." } }
```

> 如果没有图片文件，可先用 Python 生成纯色占位图：
> ```bash
> python -c "from PIL import Image;Image.new('RGB',(1280,720),(74,137,160)).save('cover.jpg')"
> ```

## 步骤 3：创建产品

关键差异：

| 参数 | 活动 | 票务 | 商品 |
|------|------|------|------|
| `category_id` | 活动下子分类 ID | 票务下子分类 ID | 商品下子分类 ID |
| `is_virtual` | `true` | `true` | **`false`** |
| `is_listed` | 创建时设 `false`，配完 SKU 后再上架 |

```bash
# 通用模板（把 CAT_ID 替换为实际分类 ID）
curl -s -X POST "$BASE/admin/v1/mall/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '@product.json'
```

**product.json 模板**：
```json
{
  "title":"产品名称",
  "sub_title":"产品简介",
  "category_id":9,
  "is_virtual":true,
  "is_listed":false,
  "is_visible":true,
  "sort_order":1
}
```

> **编码提示**：Windows 终端对中文支持较差，一定要用 `--data-binary @文件.json` 方式传入，不要用 `-d` 行内拼接。JSON 文件保存为 UTF-8 without BOM。

## 步骤 4：创建规格（Specs）

```bash
PID=你的产品ID
curl -s -X POST "$BASE/admin/v1/mall/products/$PID/specs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '@spec.json'
```

**spec.json 模板**：
```json
{
  "name":"规格名称",
  "values":[
    {"value":"选项一"},
    {"value":"选项二"},
    {"value":"选项三"}
  ]
}
```

API 返回每个 value 的 `id`，记下来用于下一步 SKU 的 `spec_indices`。

## 步骤 5：创建 SKU

```bash
curl -s -X POST "$BASE/admin/v1/mall/products/$PID/skus" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '@skus.json'
```

**skus.json 模板**（单规格，每个值一个 SKU）：
```json
{
  "skus":[
    {"spec_indices":"365","price":120,"stock":500},
    {"spec_indices":"366","price":168,"stock":300}
  ]
}
```

- `spec_indices` = 规格值 ID（单规格直接填一个 ID 即可）
- 多规格用 `_` 拼接，如 `"365_368"` 表示笛卡尔积中的一种组合
- 票务模式 `stock` 固定传 `99999`

## 步骤 6：最终更新（封面/详情/退款/上架）

```bash
curl -s -X PUT "$BASE/admin/v1/mall/products/$PID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary '@final.json'
```

**final.json 模板**：
```json
{
  "cover_image":"https://cdn.vbegin.com.cn/...",
  "carousel_images":["https://cdn.vbegin.com.cn/..."],
  "detail_desc":"{\"detail\":\"<p>产品详情 HTML</p>\",\"hasagreement\":false}",
  "refund_type":0,
  "is_listed":true
}
```

### refund_type 对照

| 值 | 含义 |
|:--|------|
| 0 | 不退款 |
| 1 | 随时退 |
| 2 | 指定日期前退 |
| 3 | 阶梯退 |

---

## 完整示例脚本

### 活动：2026 冰丝带汽车生活节

```bash
BASE="https://hsh-test.vbegin.com.cn"
TOKEN=$(...获取token...)
DIR="/tmp"

# 创建产品
echo '{"title":"2026冰丝带汽车生活节","sub_title":"...","category_id":4,"is_virtual":true,"is_listed":false,"is_visible":true,"sort_order":10}' > $DIR/p.json
PID=$(curl -s -X POST "$BASE/admin/v1/mall/products" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json; charset=utf-8" --data-binary "@$DIR/p.json" | python -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")

# 创建规格
echo '{"name":"票种","values":[{"value":"普通票"},{"value":"VIP票"}]}' > $DIR/s.json
curl -s -X POST "$BASE/admin/v1/mall/products/$PID/specs" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json; charset=utf-8" --data-binary "@$DIR/s.json"

# 获取 specs → 得到 value IDs → 创建 SKU
# (实际使用时根据 API 返回的 ID 填入 skus.json)
echo '{"skus":[{"spec_indices":"351","price":99,"stock":100},{"spec_indices":"352","price":199,"stock":50}]}' > $DIR/skus.json
curl -s -X POST "$BASE/admin/v1/mall/products/$PID/skus" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json; charset=utf-8" --data-binary "@$DIR/skus.json"

# 最终更新
echo '{"cover_image":"...","detail_desc":"{\"...\"}","refund_type":0,"is_listed":true}' > $DIR/f.json
curl -s -X PUT "$BASE/admin/v1/mall/products/$PID" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json; charset=utf-8" --data-binary "@$DIR/f.json"
```

### 票务：什刹海摇橹船票

与活动流程完全一致，区别仅在于：
- `category_id` 指向票务分类（9 = 船票）
- `is_virtual: true`（同活动）

### 商品：北京交通广播专属冰箱贴

与活动流程完全一致，区别仅在于：
- `category_id` 指向商品分类（8 = 默认商品分类）
- `is_virtual: false`
- `refund_type: 0`（仅不退款）

---

## 注意事项

1. **编码**：Windows 终端 curl 直接传中文会乱码，务必用 `--data-binary @文件.json` + UTF-8 文件
2. **上架时机**：创建产品时 `is_listed: false`，配完 specs/skus 后 PUT 上架
3. **详情 JSON 嵌套**：`detail_desc` 的值是 JSON 字符串，内部引号需转义 `\"`
4. **Token 有效期**：7200 秒，失效后重新登录获取
5. **分类 ID**：先用 `GET /categories` 确认目标分类 ID
