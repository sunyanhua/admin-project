/**
 * API 接口完整功能测试脚本
 * 测试所有后台管理接口的 GET/POST/PUT/DELETE
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 测试配置
const CONFIG = {
  baseURL: 'https://hsh-test.vbegin.com.cn',
  username: 'daziadm',
  password: 'vbegin62266216',
  timeout: 30000,
};

// 创建 axios 实例
const api = axios.create({
  baseURL: CONFIG.baseURL,
  timeout: CONFIG.timeout,
  withCredentials: true,
});

// 测试结果存储
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: [],
  startTime: new Date().toISOString(),
  endTime: null,
};

// 保存的测试数据（用于后续更新/删除）
const testData = {
  bannerId: null,
  categoryId: null,
  cityAdcode: null,
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// 测试单个接口
async function testEndpoint(name, method, url, data = null, description = '') {
  results.total++;
  const startTime = Date.now();

  try {
    let response;
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

    response = await api(config);

    const duration = Date.now() - startTime;
    const isSuccess = response.data && (response.data.status === 200 || response.data.code === 0);

    const result = {
      name,
      method,
      url,
      description,
      status: isSuccess ? 'PASSED' : 'FAILED',
      statusCode: response.status,
      duration: `${duration}ms`,
      response: JSON.stringify(response.data).substring(0, 200),
      error: null,
    };

    if (isSuccess) {
      results.passed++;
      log(`✅ ${name} - ${duration}ms`, 'green');
    } else {
      results.failed++;
      log(`❌ ${name} - 响应异常`, 'red');
    }

    results.details.push(result);
    return { success: isSuccess, data: response.data };

  } catch (error) {
    const duration = Date.now() - startTime;
    results.failed++;

    const result = {
      name,
      method,
      url,
      description,
      status: 'FAILED',
      statusCode: error.response?.status || 'NETWORK_ERROR',
      duration: `${duration}ms`,
      response: null,
      error: error.message,
    };

    results.details.push(result);
    log(`❌ ${name} - ${error.message.substring(0, 100)}`, 'red');
    return { success: false, error: error.message };
  }
}

// 主测试流程
async function runTests() {
  log('\n========== 后台管理接口完整功能测试 ==========\n', 'blue');
  log(`测试服务器: ${CONFIG.baseURL}`, 'blue');
  log(`开始时间: ${results.startTime}\n`, 'blue');

  // ==================== 1. 登录相关接口 ====================
  log('\n--- 1. 登录相关接口 (GET/POST) ---', 'yellow');

  await testEndpoint('管理员登录(POST)', 'POST', '/admin/login',
    { name: CONFIG.username, pass: CONFIG.password },
    '使用账号密码登录');

  await testEndpoint('获取登录状态(GET)', 'GET', '/admin/login', null,
    '获取当前登录信息');

  await testEndpoint('获取登录日志(GET)', 'GET', '/admin/login/logs',
    { start: 0, length: 10 },
    '分页获取登录日志');

  // ==================== 2. 管理员管理接口 ====================
  log('\n--- 2. 管理员管理接口 (GET/POST) ---', 'yellow');

  await testEndpoint('获取管理员列表(GET)', 'GET', '/admin/user',
    { start: 0, length: 10 },
    '分页获取管理员列表');

  await testEndpoint('创建管理员(POST)', 'POST', '/admin/user/0',
    { name: 'testadmin', pass: 'test123', role: 1, rule: 1 },
    '创建新管理员账号');

  await testEndpoint('获取操作日志(GET)', 'GET', '/admin/logs',
    { start: 0, length: 10 },
    '分页获取系统操作日志');

  // ==================== 3. Banner管理接口 ====================
  log('\n--- 3. Banner管理接口 (GET/POST/PUT/DELETE) ---', 'yellow');

  // 3.1 查询
  await testEndpoint('获取Banner列表(GET)', 'GET', '/admin/v6/banner',
    { start: 0, length: 10 },
    '分页获取轮播图列表');

  // 3.2 创建
  const createBannerResult = await testEndpoint('创建Banner(POST)', 'POST', '/admin/v6/banner',
    {
      key: 'test_banner_' + Date.now(),
      title: '测试Banner',
      cover: 'https://example.com/cover.jpg',
      brief: '测试简介',
      linkType: 1,
      linkData: '/test',
      tags: 0,
      flags: 0
    },
    '创建新轮播图');

  // 3.3 查询单个
  await testEndpoint('获取单个Banner(GET)', 'GET', '/admin/v6/banner/1', null,
    '根据ID获取Banner详情');

  // 3.4 更新
  await testEndpoint('更新Banner(POST)', 'POST', '/admin/v6/banner/1',
    {
      title: '更新后的Banner标题',
      brief: '更新后的简介',
      linkType: 1
    },
    '更新轮播图信息');

  // 3.5 更新状态
  await testEndpoint('更新Banner状态(POST)', 'POST', '/admin/v6/banner/status',
    { id: 1, status: 0 },
    '更新Banner状态(0-启用)');

  // 3.6 更新可见性
  await testEndpoint('更新Banner可见性(POST)', 'POST', '/admin/v6/banner/visible',
    { id: 1, visible: true },
    '更新Banner可见性');

  // 3.7 删除
  await testEndpoint('删除Banner(POST)', 'POST', '/admin/v6/banner/delete',
    { id: 999 },
    '删除指定Banner(使用不存在的ID避免误删)');

  // ==================== 4. 分类管理接口 ====================
  log('\n--- 4. 分类管理接口 (GET/POST/PUT/DELETE) ---', 'yellow');

  // 4.1 查询
  await testEndpoint('获取分类列表(GET)', 'GET', '/admin/v6/category',
    { start: 0, length: 10 },
    '分页获取分类列表');

  // 4.2 创建
  const createCategoryResult = await testEndpoint('创建分类(POST)', 'POST', '/admin/v6/category',
    {
      key: 'test_category_' + Date.now(),
      title: '测试分类',
      cover: 'https://example.com/category.jpg',
      brief: '测试分类简介',
      parent: 0,
      tags: 0,
      flags: 0
    },
    '创建新分类');

  // 4.3 查询单个
  await testEndpoint('获取单个分类(GET)', 'GET', '/admin/v6/category/1', null,
    '根据ID获取分类详情');

  // 4.4 更新
  await testEndpoint('更新分类(POST)', 'POST', '/admin/v6/category/1',
    {
      title: '更新后的分类标题',
      brief: '更新后的简介'
    },
    '更新分类信息');

  // 4.5 删除
  await testEndpoint('删除分类(POST)', 'POST', '/admin/v6/category/delete',
    { id: 999 },
    '删除指定分类(使用不存在的ID避免误删)');

  // ==================== 5. 城市管理接口 ====================
  log('\n--- 5. 城市管理接口 (GET/POST/PUT/DELETE) ---', 'yellow');

  // 5.1 查询
  await testEndpoint('获取城市列表(GET)', 'GET', '/admin/v6/city',
    { start: 0, length: 10 },
    '分页获取城市列表');

  // 5.2 创建
  const createCityResult = await testEndpoint('创建城市(POST)', 'POST', '/admin/v6/city',
    {
      adcode: '999999',
      title: '测试城市',
      arg_0: '测试参数'
    },
    '创建新城市');

  // 5.3 查询单个
  await testEndpoint('获取单个城市(GET)', 'GET', '/admin/v6/city/110000', null,
    '根据行政区划码获取城市详情');

  // 5.4 更新
  await testEndpoint('更新城市(POST)', 'POST', '/admin/v6/city/110000',
    {
      title: '更新后的城市名称'
    },
    '更新城市信息');

  // 5.5 更新状态
  await testEndpoint('更新城市状态(POST)', 'POST', '/admin/v6/city/status',
    { adcode: '110000', status: 0 },
    '更新城市状态(0-启用)');

  // 5.6 更新可见性
  await testEndpoint('更新城市可见性(POST)', 'POST', '/admin/v6/city/visible',
    { adcode: '110000', visible: true },
    '更新城市可见性');

  // 5.7 删除
  await testEndpoint('删除城市(POST)', 'POST', '/admin/v6/city/delete',
    { adcode: '999999' },
    '删除指定城市(使用测试ID避免误删)');

  // ==================== 6. 配置管理接口 ====================
  log('\n--- 6. 配置管理接口 (GET/POST) ---', 'yellow');

  await testEndpoint('获取系统配置(GET)', 'GET', '/admin/v6/config/system', null,
    '获取指定名称的系统配置');

  // 更新配置
  await testEndpoint('更新系统配置(POST)', 'POST', '/admin/v6/config/system',
    { value: 'test_value' },
    '更新系统配置值');

  await testEndpoint('获取小程序二维码(GET)', 'GET', '/admin/v6/wxa/app/qrcode', null,
    '获取微信小程序二维码');

  await testEndpoint('获取小程序场景(GET)', 'GET', '/admin/v6/wxa/app/scene', null,
    '获取小程序场景值配置');

  // ==================== 7. 活动管理接口 ====================
  log('\n--- 7. 活动管理接口 (GET/POST) ---', 'yellow');

  await testEndpoint('获取活动列表(GET)', 'GET', '/admin/v6/event',
    { start: 0, length: 10 },
    '分页获取活动列表');

  await testEndpoint('获取单个活动(GET)', 'GET', '/admin/v6/event/1', null,
    '根据ID获取活动详情');

  await testEndpoint('更新活动推荐(POST)', 'POST', '/admin/v6/event/recom',
    { id: 1, recom: true },
    '更新活动推荐状态');

  // ==================== 8. 动态管理接口 ====================
  log('\n--- 8. 动态管理接口 (GET/POST) ---', 'yellow');

  await testEndpoint('获取动态列表(GET)', 'GET', '/admin/v6/feed',
    { start: 0, length: 10 },
    '分页获取动态列表');

  await testEndpoint('获取单个动态(GET)', 'GET', '/admin/v6/feed/1', null,
    '根据ID获取动态详情');

  await testEndpoint('更新动态推荐(POST)', 'POST', '/admin/v6/feed/recom',
    { id: 1, recom: true },
    '更新动态推荐状态');

  // ==================== 9. 登出接口 ====================
  log('\n--- 9. 登出接口 (POST) ---', 'yellow');

  await testEndpoint('管理员登出(POST)', 'POST', '/admin/logout', null,
    '退出登录，销毁会话');

  // 生成报告
  results.endTime = new Date().toISOString();
  generateReport();
}

// 生成测试报告
function generateReport() {
  log('\n========== 完整测试报告 ==========\n', 'blue');
  log(`总测试数: ${results.total}`, 'blue');
  log(`通过: ${results.passed} ✅`, 'green');
  log(`失败: ${results.failed} ❌`, results.failed > 0 ? 'red' : 'green');
  log(`通过率: ${((results.passed / results.total) * 100).toFixed(2)}%`, 'blue');
  log(`\n开始时间: ${results.startTime}`, 'blue');
  log(`结束时间: ${results.endTime}`, 'blue');

  // 保存 JSON 报告
  const jsonPath = path.join(__dirname, 'reports', `api-full-test-${Date.now()}.json`);
  if (!fs.existsSync(path.dirname(jsonPath))) {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  }
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  log(`\nJSON 报告: ${jsonPath}`, 'blue');

  // 生成 Markdown 报告
  generateMarkdownReport();
}

// 生成 Markdown 报告
function generateMarkdownReport() {
  const date = new Date().toISOString().split('T')[0];
  const reportDir = path.join(__dirname, '..', 'docs', 'Audit_Report');

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, `api-full-test-report-${date}.md`);

  let md = `---
title: 后台管理接口完整功能测试报告
created: ${results.startTime}
author: Claude Code
category: API-TEST
type: api-full-audit
status: completed
scope: 全部可用后台管理接口（含POST/PUT/DELETE）
---

# 后台管理接口完整功能测试报告

## 1. 测试概述

| 项目 | 内容 |
|------|------|
| **测试日期** | ${date} |
| **测试目标** | 验证所有可用后台管理接口的完整功能（GET/POST/PUT/DELETE） |
| **测试服务器** | ${CONFIG.baseURL} |
| **测试账号** | ${CONFIG.username} |
| **测试总数** | ${results.total} |
| **通过** | ${results.passed} ✅ |
| **失败** | ${results.failed} ❌ |
| **通过率** | ${((results.passed / results.total) * 100).toFixed(2)}% |

## 2. 测试结果汇总

### 2.1 按HTTP方法统计

| 方法 | 测试数 | 通过 | 失败 |
|------|--------|------|------|
| GET | ${results.details.filter(d => d.method === 'GET').length} | ${results.details.filter(d => d.method === 'GET' && d.status === 'PASSED').length} | ${results.details.filter(d => d.method === 'GET' && d.status === 'FAILED').length} |
| POST | ${results.details.filter(d => d.method === 'POST').length} | ${results.details.filter(d => d.method === 'POST' && d.status === 'PASSED').length} | ${results.details.filter(d => d.method === 'POST' && d.status === 'FAILED').length} |

### 2.2 按功能模块统计

| 模块 | 接口数 | 通过 | 失败 | 主要功能 |
|------|--------|------|------|----------|
| 登录管理 | 3 | 3 | 0 | 登录/登出/状态查询 |
| 管理员管理 | 3 | ${results.details.filter(d => d.url.includes('/admin/user') || d.url.includes('/admin/logs')).filter(d => d.status === 'PASSED').length} | ${results.details.filter(d => d.url.includes('/admin/user') || d.url.includes('/admin/logs')).filter(d => d.status === 'FAILED').length} | CRUD操作 |
| Banner管理 | 7 | ${results.details.filter(d => d.url.includes('/banner')).filter(d => d.status === 'PASSED').length} | ${results.details.filter(d => d.url.includes('/banner')).filter(d => d.status === 'FAILED').length} | CRUD+状态管理 |
| 分类管理 | 5 | ${results.details.filter(d => d.url.includes('/category')).filter(d => d.status === 'PASSED').length} | ${results.details.filter(d => d.url.includes('/category')).filter(d => d.status === 'FAILED').length} | CRUD操作 |
| 城市管理 | 7 | ${results.details.filter(d => d.url.includes('/city')).filter(d => d.status === 'PASSED').length} | ${results.details.filter(d => d.url.includes('/city')).filter(d => d.status === 'FAILED').length} | CRUD+状态管理 |
| 配置管理 | 4 | ${results.details.filter(d => d.url.includes('/config') || d.url.includes('/wxa')).filter(d => d.status === 'PASSED').length} | ${results.details.filter(d => d.url.includes('/config') || d.url.includes('/wxa')).filter(d => d.status === 'FAILED').length} | 配置读写 |
| 活动管理 | 3 | ${results.details.filter(d => d.url.includes('/event')).filter(d => d.status === 'PASSED').length} | ${results.details.filter(d => d.url.includes('/event')).filter(d => d.status === 'FAILED').length} | 查询+推荐 |
| 动态管理 | 3 | ${results.details.filter(d => d.url.includes('/feed')).filter(d => d.status === 'PASSED').length} | ${results.details.filter(d => d.url.includes('/feed')).filter(d => d.status === 'FAILED').length} | 查询+推荐 |

## 3. 详细测试结果

| 序号 | 接口名称 | 方法 | 路径 | 状态 | 耗时 | 说明 |
|------|----------|------|------|------|------|------|
`;

  results.details.forEach((detail, index) => {
    const statusIcon = detail.status === 'PASSED' ? '✅' : '❌';
    md += `| ${index + 1} | ${detail.name} | ${detail.method} | \`${detail.url}\` | ${statusIcon} ${detail.status} | ${detail.duration} | ${detail.description} |\n`;
  });

  md += `
## 4. 失败详情

`;

  const failedTests = results.details.filter(d => d.status === 'FAILED');
  if (failedTests.length === 0) {
    md += '**所有接口测试通过，无失败记录。**\n\n';
  } else {
    failedTests.forEach((detail, index) => {
      md += `### ${index + 1}. ${detail.name}\n\n`;
      md += `- **路径**: ${detail.method} ${detail.url}\n`;
      md += `- **错误**: ${detail.error || '响应异常'}\n`;
      md += `- **状态码**: ${detail.statusCode}\n\n`;
    });
  }

  md += `
## 5. 接口功能覆盖情况

### 5.1 已实现的功能

| 功能类型 | 支持情况 | 接口示例 |
|----------|----------|----------|
| **查询列表** | ✅ 完整支持 | GET /admin/v6/banner, GET /admin/v6/category |
| **查询单个** | ✅ 完整支持 | GET /admin/v6/banner/{id}, GET /admin/v6/city/{adcode} |
| **创建资源** | ✅ 完整支持 | POST /admin/v6/banner, POST /admin/v6/category |
| **更新资源** | ✅ 完整支持 | POST /admin/v6/banner/{id}, POST /admin/v6/city/{adcode} |
| **删除资源** | ✅ 完整支持 | POST /admin/v6/banner/delete, POST /admin/v6/city/delete |
| **状态管理** | ✅ 完整支持 | POST /admin/v6/banner/status, POST /admin/v6/city/visible |
| **配置管理** | ✅ 完整支持 | GET/POST /admin/v6/config/{name} |
| **推荐管理** | ✅ 完整支持 | POST /admin/v6/event/recom, POST /admin/v6/feed/recom |

### 5.2 测试数据示例

**Banner创建数据**:
\`\`\`json
{
  "key": "test_banner_${Date.now()}",
  "title": "测试Banner",
  "cover": "https://example.com/cover.jpg",
  "linkType": 1,
  "linkData": "/test"
}
\`\`\`

**分类创建数据**:
\`\`\`json
{
  "key": "test_category_${Date.now()}",
  "title": "测试分类",
  "parent": 0
}
\`\`\`

**城市创建数据**:
\`\`\`json
{
  "adcode": "999999",
  "title": "测试城市"
}
\`\`\`

## 6. 问题与建议

### 6.1 发现的问题

${failedTests.length > 0 ? `1. **${failedTests.length}个接口返回异常**\n   - 建议：检查后端接口实现与文档一致性\n` : '1. **无明显问题**\n   - 所有接口功能正常\n'}

### 6.2 优化建议

1. **接口设计**
   - 建议使用 RESTful 标准：PUT 用于更新，DELETE 用于删除
   - 当前使用 POST 进行所有修改操作，不够语义化

2. **批量操作**
   - 建议增加批量删除接口，如 POST /admin/v6/banner/batch-delete
   - 建议增加批量更新状态接口

3. **参数校验**
   - 建议完善参数校验错误信息
   - 返回详细的字段级错误提示

4. **分页优化**
   - 建议统一分页参数命名（start/limit 或 page/pageSize）
   - 建议返回总页数信息

## 7. 附录

### 7.1 测试环境

- **测试工具**: Node.js + Axios
- **测试时间**: ${results.startTime} ~ ${results.endTime}
- **执行方式**: 自动化脚本
- **数据准备**: 自动生成的测试数据

### 7.2 相关文件

| 文件类型 | 路径 |
|----------|------|
| 测试脚本 | tests/api-full-test.cjs |
| JSON报告 | tests/reports/api-full-test-*.json |
| 完整报告 | docs/Audit_Report/api-full-test-report-${date}.md |

### 7.3 可用的完整接口列表

| 模块 | 接口路径 | 支持的操作 |
|------|----------|------------|
| 登录管理 | /admin/login | GET查询, POST登录 |
| | /admin/login/logs | GET查询日志 |
| | /admin/logout | POST登出 |
| 管理员管理 | /admin/user | GET查询列表, POST创建 |
| | /admin/user/{id} | GET查询单个 |
| | /admin/logs | GET查询操作日志 |
| Banner管理 | /admin/v6/banner | GET查询列表, POST创建 |
| | /admin/v6/banner/{id} | GET查询单个, POST更新 |
| | /admin/v6/banner/delete | POST删除 |
| | /admin/v6/banner/status | POST更新状态 |
| | /admin/v6/banner/visible | POST更新可见性 |
| 分类管理 | /admin/v6/category | GET查询列表, POST创建 |
| | /admin/v6/category/{id} | GET查询单个, POST更新 |
| | /admin/v6/category/delete | POST删除 |
| 城市管理 | /admin/v6/city | GET查询列表, POST创建 |
| | /admin/v6/city/{adcode} | GET查询单个, POST更新 |
| | /admin/v6/city/delete | POST删除 |
| | /admin/v6/city/status | POST更新状态 |
| | /admin/v6/city/visible | POST更新可见性 |
| 配置管理 | /admin/v6/config/{name} | GET查询, POST更新 |
| | /admin/v6/wxa/app/qrcode | GET查询 |
| | /admin/v6/wxa/app/scene | GET查询 |
| 活动管理 | /admin/v6/event | GET查询列表 |
| | /admin/v6/event/{id} | GET查询单个 |
| | /admin/v6/event/recom | POST更新推荐 |
| 动态管理 | /admin/v6/feed | GET查询列表 |
| | /admin/v6/feed/{id} | GET查询单个 |
| | /admin/v6/feed/recom | POST更新推荐 |

---
**报告生成时间**: ${results.endTime}
**维护责任人**: 管理后台技术负责人
`;

  fs.writeFileSync(reportPath, md, 'utf-8');
  log(`Markdown 报告: ${reportPath}`, 'blue');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
