#!/usr/bin/env node
/**
 * 测试活动数据创建脚本
 * 用法:
 *   node scripts/create-test-event.mjs \
 *     --username admin --password xxx \
 *     --title "2026冰丝带汽车生活节"
 *
 * 也支持通过配置文件预定义活动，见本文件下方 PRESET_EVENTS。
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://hsh-test.vbegin.com.cn';
const API = (path) => `${BASE}/admin/v1${path}`;

// ==================== 工具函数 ====================

async function api(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API(path), opts);
  const json = await res.json();
  if (!res.ok || (json.code !== undefined && json.code !== 0)) {
    throw new Error(`${method} ${path} 失败 (${res.status}): ${json.message || JSON.stringify(json)}`);
  }
  return json;
}

async function login(username, password) {
  console.log('[1/7] 登录...');
  const resp = await fetch(API('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const json = await resp.json();
  console.log('   响应:', JSON.stringify({ code: json.code, hasData: !!json.data, dataKeys: json.data ? Object.keys(json.data) : [] }));
  if (!resp.ok || (json.code !== undefined && json.code !== 0)) {
    throw new Error(`登录失败 (${resp.status}): ${json.message || JSON.stringify(json)}`);
  }
  const data = json.data || json;
  const token = data.access_token || data.token;
  console.log(`   ✓ 登录成功，用户: ${data.user?.username || data.user?.real_name || username}`);
  return { token, data };
}

async function createProduct(token, product) {
  console.log('[2/7] 创建活动...');
  const json = await api('POST', '/mall/products', { token, body: product });
  const data = json.data;
  console.log(`   ✓ 活动已创建，ID: ${data.id}`);
  return data;
}

async function createSpecs(token, productId, specs) {
  console.log('[3/7] 创建规格组...');
  const results = [];
  for (const spec of specs) {
    const body = {
      name: spec.name,
      is_time_type: spec.is_time_type || false,
      values: spec.values.map((v) => ({ value: v })),
    };
    const json = await api('POST', `/mall/products/${productId}/specs`, { token, body });
    const data = json.data;
    console.log(`   ✓ 规格 "${spec.name}" 已创建 (ID: ${data.id})`);
    results.push(data);
  }
  return results;
}

async function fetchSpecs(token, productId) {
  const json = await api('GET', `/mall/products/${productId}/specs`, { token });
  return json.data;
}

async function batchCreateSkus(token, productId, skus) {
  console.log('[4/7] 创建 SKU 组合...');
  await api('POST', `/mall/products/${productId}/skus`, {
    token,
    body: {
      skus: skus.map((s) => ({
        price: s.price,
        spec_indices: s.spec_indices,
        stock: s.stock ?? 0,
        status: s.status ?? 1,
        usable: s.usable || undefined,
        expiry: s.expiry || undefined,
      })),
    },
  });
  console.log(`   ✓ ${skus.length} 个 SKU 已创建`);
}

async function setProductTime(token, productId, usable, expiry) {
  console.log('[5/7] 设置报名期限...');
  await api('PUT', `/mall/products/${productId}/usable`, { token, body: { usable } });
  await api('PUT', `/mall/products/${productId}/expiry`, { token, body: { expiry } });
  console.log(`   ✓ 开始: ${usable || '不限'}, 截止: ${expiry || '不限'}`);
}

async function setListStatus(token, productId, isListed) {
  console.log('[6/7] 设置上架状态...');
  await api('PUT', `/mall/products/${productId}/list-status`, { token, body: { is_listed: isListed } });
  console.log(`   ✓ ${isListed ? '已上架' : '已下架'}`);
}

async function getCategories(token) {
  console.log('[0/7] 获取分类列表...');
  const json = await api('GET', '/mall/categories', { token });
  const data = json.data;
  const arr = Array.isArray(data) ? data : (data?.list || []);
  const root = arr.find((c) => c.id === 1);
  const children = root?.children || [];
  console.log(`   ✓ 找到 ${children.length} 个一级分类`);
  for (const c of children) console.log(`     - [${c.id}] ${c.name}`);
  return children;
}

// ==================== 预设活动 ====================

const PRESET_EVENTS = {
  '冰丝带汽车生活节': {
    title: '2026冰丝带汽车生活节',
    sub_title: '驾驭未来，畅享生活——冰丝带首届汽车文化嘉年华，百款新车试驾体验，亲子互动乐园，科技与速度的完美融合',
    detail_desc: JSON.stringify({
      datetime: '2026年7月18日-20日 每天 09:00-21:00',
      detail: `<h2>🚗 活动亮点</h2>
<p><strong>百款新车试驾：</strong>汇聚国内外30+汽车品牌，百余款热门车型现场免费试驾体验，专业教练一对一指导。</p>
<p><strong>新能源科技展：</strong>最新电动、混动车型集中亮相，感受前沿汽车科技魅力。</p>
<p><strong>亲子互动乐园：</strong>儿童卡丁车赛道、汽车模型组装工坊、交通安全知识小课堂。</p>
<p><strong>经典车展：</strong>20台经典老爷车巡展，穿越百年汽车历史。</p>
<h2>📋 活动详情</h2>
<p><strong>地点：</strong>国家速滑馆（冰丝带）南广场及周边场地</p>
<p><strong>时间：</strong>2026年7月18日（周六）- 7月20日（周一），每天09:00-21:00</p>
<p><strong>主办：</strong>北京市体育局 × 冰丝带运营中心 × 中国汽车工业协会</p>
<h2>🎫 票务说明</h2>
<ul>
<li>单人票：含入场手环 + 免费试驾1次 + 纪念品1份</li>
<li>双人票：含入场手环×2 + 免费试驾2次 + 纪念品2份 + 饮品券2张</li>
<li>家庭票（2大1小）：含入场手环×3 + 免费试驾2次 + 纪念品3份 + 亲子乐园通票</li>
</ul>
<p><strong>温馨提示：</strong>请携带有效驾照参与试驾活动。12岁以下儿童需家长陪同。现场提供免费停车。</p>`
    }),
    specs: [
      {
        name: '日期',
        is_time_type: true,
        values: ['2026-07-18', '2026-07-19', '2026-07-20'],
      },
      {
        name: '票种',
        is_time_type: false,
        values: ['单人票', '双人票', '家庭票(2大1小)'],
      },
    ],
    // 笛卡尔积: 3日期 × 3票种 = 9 SKU
    skuPricing: {
      '单人票': { price: 68, stock: 500, status: 1 },
      '双人票': { price: 128, stock: 300, status: 1 },
      '家庭票(2大1小)': { price: 168, stock: 200, status: 1 },
    },
    cover_image: 'https://picsum.photos/640/480?random=1',
    carousel_images: [
      'https://picsum.photos/800/400?random=2',
      'https://picsum.photos/800/400?random=3',
      'https://picsum.photos/800/400?random=4',
    ],
    usable: '2026-07-10T00:00:00+08:00',
    expiry: '2026-07-19T23:59:59+08:00',
    is_listed: true,
    sort_order: 10,
  },
};

// ==================== 主流程 ====================

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const username = getArg('username') || process.env.ADMIN_USERNAME || 'admin';
  const password = getArg('password') || process.env.ADMIN_PASSWORD;
  const presetName = getArg('preset') || Object.keys(PRESET_EVENTS)[0];
  const preset = PRESET_EVENTS[presetName];

  if (!preset) {
    console.error(`未知预设活动: ${presetName}`);
    console.error(`可用预设: ${Object.keys(PRESET_EVENTS).join(', ')}`);
    process.exit(1);
  }

  if (!password) {
    console.error('请提供密码: --password xxx 或设置 ADMIN_PASSWORD 环境变量');
    process.exit(1);
  }

  console.log(`\n📋 创建测试活动: ${preset.title}\n`);

  // 1. 登录
  const loginResult = await login(username, password);
  const token = loginResult.token;
  if (!token) throw new Error('登录未返回 token');

  // 0. 获取分类
  const categories = await getCategories(token);
  // 选第一个分类（或活动分类）
  const eventCategory = categories.find((c) => c.name.includes('活动')) || categories[0];
  if (!eventCategory) { console.error('未找到可用分类'); process.exit(1); }
  const categoryId = Number(getArg('category')) || eventCategory.id;
  console.log(`   使用分类: [${categoryId}] ${eventCategory.name}`);

  // 2. 创建活动
  const product = await createProduct(token, {
    title: preset.title,
    sub_title: preset.sub_title,
    category_id: categoryId,
    cover_image: preset.cover_image || '',
    carousel_images: preset.carousel_images || [],
    detail_desc: preset.detail_desc || '',
    is_virtual: true,
    is_listed: false,
    is_visible: true,
    sort_order: preset.sort_order ?? 0,
  });

  // 确保下架后才能操作 specs
  console.log('   先下架...');
  await api('PUT', `/mall/products/${product.id}/list-status`, { token, body: { is_listed: false } });

  // 3. 创建规格组
  const createdSpecs = await createSpecs(token, product.id, preset.specs);

  // 重新获取 specs 以拿到 value ID
  const freshSpecs = Array.isArray(await fetchSpecs(token, product.id))
    ? await fetchSpecs(token, product.id)
    : [];
  console.log('   规格组数据:', JSON.stringify(freshSpecs.map((s) => ({ name: s.name, values: s.values })), null, 2));

  // 4. 生成笛卡尔积 SKU
  const valueArrays = freshSpecs.map((s) => (s.values || []).map((v) => v.value));
  const cartesian = (arrays) => {
    if (arrays.length === 0) return [[]];
    const [first, ...rest] = arrays;
    return cartesian(rest).flatMap((combo) => first.map((v) => [v, ...combo]));
  };

  const combos = cartesian(valueArrays);
  // 找票种 spec index（非 is_time_type 的那个）
  const ticketSpecIndex = freshSpecs.findIndex((s) => !s.is_time_type);
  const skus = combos.map((combo) => {
    const idParts = freshSpecs.map((s, si) => {
      const vi = s.values.findIndex((v) => v.value === combo[si]);
      const val = s.values[vi >= 0 ? vi : 0];
      return String(val?.id ?? 0);
    });
    const ticketName = combo[ticketSpecIndex];
    const pricing = (preset.skuPricing || {})[ticketName] || { price: 0, stock: 0, status: 1 };
    return {
      spec_indices: idParts.join('_'),
      price: pricing.price || 99,
      stock: pricing.stock ?? 100,
      status: pricing.status ?? 1,
    };
  });

  await batchCreateSkus(token, product.id, skus);

  // 5. 设置报名期限
  await setProductTime(token, product.id, preset.usable || null, preset.expiry || null);

  // 6. 上架
  await setListStatus(token, product.id, preset.is_listed ?? false);

  // 7. 总结
  console.log('\n' + '='.repeat(50));
  console.log(`✅ 活动创建完成！`);
  console.log(`   ID: ${product.id}`);
  console.log(`   标题: ${preset.title}`);
  console.log(`   规格: ${preset.specs.length} 组, ${combos.length} 个 SKU`);
  console.log(`   价格: ${JSON.stringify(preset.skuPricing)}`);
  console.log(`   状态: ${preset.is_listed ? '已上架' : '已下架'}`);
  console.log('='.repeat(50) + '\n');
}

main().catch((err) => {
  console.error('\n❌ 错误:', err.message);
  process.exit(1);
});
