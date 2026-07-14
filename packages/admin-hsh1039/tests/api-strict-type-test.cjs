/**
 * API 接口严格类型测试脚本
 * 严格按照 OpenAPI 文档类型定义测试
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  baseURL: 'https://hsh-test.vbegin.com.cn',
  username: 'daziadm',
  password: 'vbegin62266216',
  timeout: 30000,
};

const api = axios.create({
  baseURL: CONFIG.baseURL,
  timeout: CONFIG.timeout,
  withCredentials: true,
});

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [],
  startTime: new Date().toISOString(),
  endTime: null,
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

async function testEndpoint(name, method, url, data = null, description = '') {
  results.total++;
  const startTime = Date.now();
  const testId = results.total;

  log(`\n[${testId}] ${name}`, 'cyan');
  log(`  URL: ${method} ${url}`);
  if (data) {
    log(`  Payload: ${JSON.stringify(data)}`, 'yellow');
  }

  try {
    const config = {
      method: method.toLowerCase(),
      url: url,
      headers: {},
    };

    if (data && method.toUpperCase() === 'POST') {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    } else if (data && method.toUpperCase() === 'GET') {
      config.params = data;
    }

    const response = await api(config);
    const duration = Date.now() - startTime;

    const isSuccess = response.data && (response.data.status === 200 || response.data.code === 0);

    const result = {
      testId,
      name,
      method,
      url,
      description,
      payload: data,
      status: isSuccess ? 'PASSED' : 'FAILED',
      statusCode: response.status,
      duration: `${duration}ms`,
      response: response.data,
      error: null,
    };

    if (isSuccess) {
      results.passed++;
      log(`  ✅ 成功 (${duration}ms)`, 'green');
    } else {
      results.failed++;
      log(`  ❌ 失败 - 响应异常`, 'red');
      log(`  Response: ${JSON.stringify(response.data)}`, 'red');
    }

    results.details.push(result);
    return { success: isSuccess, data: response.data, payload: data };

  } catch (error) {
    const duration = Date.now() - startTime;
    results.failed++;

    const result = {
      testId,
      name,
      method,
      url,
      description,
      payload: data,
      status: 'FAILED',
      statusCode: error.response?.status || 'NETWORK_ERROR',
      duration: `${duration}ms`,
      response: error.response?.data || null,
      error: error.message,
    };

    log(`  ❌ 失败 - ${error.message}`, 'red');
    if (error.response?.data) {
      log(`  Response: ${JSON.stringify(error.response.data)}`, 'red');
    }

    results.details.push(result);
    return { success: false, error: error.message, payload: data };
  }
}

async function runTests() {
  log('\n========== API 严格类型测试 ==========\n', 'blue');
  log(`测试服务器: ${CONFIG.baseURL}\n`, 'blue');

  // 先登录
  await testEndpoint('管理员登录', 'POST', '/admin/login',
    { name: CONFIG.username, pass: CONFIG.password },
    '使用账号密码登录');

  // ==================== Banner 创建测试 - 严格按照文档类型 ====================
  log('\n=== Banner 创建 - 严格按照 OpenAPI 文档类型 ===', 'yellow');

  // 测试1: 只有必填字段（根据之前成功的测试，key和title是必需的）
  await testEndpoint('Banner-只有key和title', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试Banner'
    },
    '最小字段测试');

  // 测试2: 添加 cover (string类型)
  await testEndpoint('Banner-加cover', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试Banner',
      cover: 'https://example.com/cover.jpg'
    },
    '添加封面图');

  // 测试3: 添加 linkType (integer类型)
  await testEndpoint('Banner-加linkType', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试Banner',
      linkType: 1
    },
    '添加链接类型(数字)');

  // 测试4: 添加 linkTags (integer, int64)
  await testEndpoint('Banner-加linkTags', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试Banner',
      linkTags: 123456789
    },
    '添加链接标签(int64)');

  // 测试5: 添加 tags (integer)
  await testEndpoint('Banner-加tags', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试Banner',
      tags: 1
    },
    '添加标签(数字)');

  // 测试6: 添加 flags (integer, int64)
  await testEndpoint('Banner-加flags', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试Banner',
      flags: 1
    },
    '添加标志位(int64)');

  // 测试7: 所有数字字段一起
  await testEndpoint('Banner-所有数字字段', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试Banner',
      linkType: 1,
      linkTags: 0,
      tags: 0,
      flags: 0
    },
    '所有数字字段一起测试');

  // 测试8: 带字符串字段
  await testEndpoint('Banner-字符串字段', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试Banner',
      cover: 'https://example.com/cover.jpg',
      brief: '简介',
      intro: '介绍'
    },
    '添加字符串字段');

  // 测试9: 带 linkData (string)
  await testEndpoint('Banner-加linkData', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试Banner',
      linkType: 1,
      linkData: '/pages/index'
    },
    '添加链接数据');

  // 测试10: 带 arg_x 字段
  await testEndpoint('Banner-加arg字段', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试Banner',
      arg_0: '参数0',
      arg_1: '参数1'
    },
    '添加arg参数字段');

  // ==================== Category 创建测试 ====================
  log('\n=== Category 创建 - 严格按照 OpenAPI 文档类型 ===', 'yellow');

  // 测试1: 只有 key 和 title
  await testEndpoint('Category-只有key和title', 'POST', '/admin/v6/category',
    {
      key: `cat_${Date.now()}`,
      title: '测试分类'
    },
    '最小字段测试');

  // 测试2: 添加 parent (integer)
  await testEndpoint('Category-加parent', 'POST', '/admin/v6/category',
    {
      key: `cat_${Date.now()}`,
      title: '测试分类',
      parent: 0
    },
    '添加parent(数字0)');

  // 测试3: parent = 1 (子分类)
  await testEndpoint('Category-parent=1', 'POST', '/admin/v6/category',
    {
      key: `cat_${Date.now()}`,
      title: '子分类测试',
      parent: 1
    },
    '创建子分类');

  // 测试4: 添加 cover (string)
  await testEndpoint('Category-加cover', 'POST', '/admin/v6/category',
    {
      key: `cat_${Date.now()}`,
      title: '测试分类',
      cover: 'https://example.com/cat.jpg'
    },
    '添加封面图');

  // 测试5: 添加 tags (integer)
  await testEndpoint('Category-加tags', 'POST', '/admin/v6/category',
    {
      key: `cat_${Date.now()}`,
      title: '测试分类',
      tags: 1
    },
    '添加标签');

  // 测试6: 添加 flags (integer, int64)
  await testEndpoint('Category-加flags', 'POST', '/admin/v6/category',
    {
      key: `cat_${Date.now()}`,
      title: '测试分类',
      flags: 1
    },
    '添加标志位(int64)');

  // 测试7: 完整字段（按文档类型）
  await testEndpoint('Category-完整字段(正确类型)', 'POST', '/admin/v6/category',
    {
      key: `cat_${Date.now()}`,
      title: '完整测试分类',
      parent: 0,
      cover: 'https://example.com/cover.jpg',
      brief: '简介',
      intro: '介绍',
      tags: 0,
      flags: 0
    },
    '完整字段正确类型');

  // ==================== 测试空字符串 vs null ====================
  log('\n=== 测试空字符串 vs null ===', 'yellow');

  await testEndpoint('Banner-空字符串cover', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试',
      cover: ''
    },
    'cover为空字符串');

  await testEndpoint('Banner-null值', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试',
      cover: null
    },
    'cover为null');

  await testEndpoint('Banner-undefined值', 'POST', '/admin/v6/banner',
    {
      key: `banner_${Date.now()}`,
      title: '测试',
      cover: undefined
    },
    'cover为undefined');

  // 登出
  await testEndpoint('管理员登出', 'POST', '/admin/logout', null, '退出登录');

  // 生成报告
  results.endTime = new Date().toISOString();
  generateReport();
}

function generateReport() {
  log('\n========== 详细测试报告 ==========\n', 'blue');
  log(`总测试数: ${results.total}`, 'blue');
  log(`通过: ${results.passed} ✅`, 'green');
  log(`失败: ${results.failed} ❌`, results.failed > 0 ? 'red' : 'green');
  log(`通过率: ${((results.passed / results.total) * 100).toFixed(2)}%`, 'blue');

  // 分析失败
  const failures = results.details.filter(d => d.status === 'FAILED');
  if (failures.length > 0) {
    log('\n========== 失败分析 ==========\n', 'red');
    failures.forEach(f => {
      log(`\n[${f.testId}] ${f.name}`, 'red');
      log(`  Payload: ${JSON.stringify(f.payload)}`, 'yellow');
      if (f.response?.error) {
        log(`  Error: ${f.response.error}`, 'red');
      }
    });
  }

  // 保存报告
  const timestamp = Date.now();
  const jsonPath = path.join(__dirname, 'reports', `api-strict-type-test-${timestamp}.json`);
  if (!fs.existsSync(path.dirname(jsonPath))) {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  }
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  log(`\nJSON 报告: ${jsonPath}`, 'blue');
}

runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
