/**
 * API 接口 Payload 详细测试脚本
 * 记录所有请求的 payload 和响应，用于排查参数问题
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 测试配置
const CONFIG = {
  baseURL: 'https://dazi-test.vbegin.com.cn',
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

// 颜色输出
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

// 测试单个接口（带payload记录）
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
      log(`  Response: ${JSON.stringify(response.data).substring(0, 150)}...`);
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

// 主测试流程
async function runTests() {
  log('\n========== API Payload 详细测试 ==========\n', 'blue');
  log(`测试服务器: ${CONFIG.baseURL}\n`, 'blue');

  // 1. 登录
  log('\n=== 1. 登录相关 ===', 'yellow');

  await testEndpoint('管理员登录', 'POST', '/admin/login',
    { name: CONFIG.username, pass: CONFIG.password },
    '使用账号密码登录');

  // 2. Banner 创建（测试不同payload格式）
  log('\n=== 2. Banner创建测试（多种payload格式） ===', 'yellow');

  // 测试1: 完整字段
  await testEndpoint('Banner创建-完整字段', 'POST', '/admin/v6/banner',
    {
      key: `banner_test_${Date.now()}`,
      title: '测试Banner',
      cover: 'https://example.com/cover.jpg',
      brief: '简介',
      intro: '详细介绍',
      image: '',
      audio: '',
      video: '',
      extra: '',
      linkType: 1,
      linkTags: 0,
      linkData: '/test',
      tags: 0,
      flags: 0,
      arg_0: '', arg_1: '', arg_2: '', arg_3: '', arg_4: '',
      arg_5: '', arg_6: '', arg_7: '', arg_8: '', arg_9: ''
    },
    '使用完整字段创建Banner');

  // 测试2: 最小字段
  await testEndpoint('Banner创建-最小字段', 'POST', '/admin/v6/banner',
    {
      key: `banner_min_${Date.now()}`,
      title: '最小字段测试'
    },
    '仅使用必填字段');

  // 测试3: 字符串数字
  await testEndpoint('Banner创建-字符串数字', 'POST', '/admin/v6/banner',
    {
      key: `banner_str_${Date.now()}`,
      title: '字符串数字测试',
      linkType: '1',
      tags: '0',
      flags: '0'
    },
    '使用字符串形式的数字');

  // 3. 分类创建测试
  log('\n=== 3. 分类创建测试（多种payload格式） ===', 'yellow');

  // 测试1: 完整字段
  await testEndpoint('分类创建-完整字段', 'POST', '/admin/v6/category',
    {
      key: `category_test_${Date.now()}`,
      parent: 0,
      title: '测试分类',
      cover: 'https://example.com/cat.jpg',
      brief: '分类简介',
      intro: '分类介绍',
      image: '',
      audio: '',
      video: '',
      extra: '',
      tags: 0,
      flags: 0,
      arg_0: '', arg_1: '', arg_2: '', arg_3: '', arg_4: '',
      arg_5: '', arg_6: '', arg_7: '', arg_8: '', arg_9: ''
    },
    '使用完整字段创建分类');

  // 测试2: 最小字段
  await testEndpoint('分类创建-最小字段', 'POST', '/admin/v6/category',
    {
      key: `category_min_${Date.now()}`,
      title: '最小字段测试'
    },
    '仅使用必填字段');

  // 测试3: 带parent
  await testEndpoint('分类创建-带子分类', 'POST', '/admin/v6/category',
    {
      key: `category_sub_${Date.now()}`,
      parent: 1,
      title: '子分类测试'
    },
    '创建子分类');

  // 4. 城市创建测试（参考之前成功的）
  log('\n=== 4. 城市创建测试（参考成功格式） ===', 'yellow');

  await testEndpoint('城市创建-标准格式', 'POST', '/admin/v6/city',
    {
      adcode: `9999${Date.now().toString().slice(-4)}`,
      title: '测试城市',
      arg_0: '测试参数'
    },
    '使用之前成功的格式');

  // 5. 管理员创建测试
  log('\n=== 5. 管理员创建测试 ===', 'yellow');

  await testEndpoint('管理员创建-标准格式', 'POST', '/admin/user/0',
    {
      name: `admin_${Date.now()}`,
      pass: 'Test123456',
      role: 1,
      rule: 1
    },
    '创建新管理员');

  // 6. 更新操作测试
  log('\n=== 6. 更新操作测试 ===', 'yellow');

  await testEndpoint('Banner更新-部分字段', 'POST', '/admin/v6/banner/1',
    { title: '更新标题测试' },
    '只更新标题');

  await testEndpoint('Banner更新-空对象', 'POST', '/admin/v6/banner/1',
    {},
    '发送空对象');

  await testEndpoint('分类更新-部分字段', 'POST', '/admin/v6/category/1',
    { title: '分类更新测试' },
    '只更新标题');

  // 7. 状态更新测试
  log('\n=== 7. 状态更新测试 ===', 'yellow');

  await testEndpoint('Banner状态更新-启用', 'POST', '/admin/v6/banner/status',
    { id: 1, status: 0 },
    '启用Banner');

  await testEndpoint('Banner状态更新-禁用', 'POST', '/admin/v6/banner/status',
    { id: 1, status: 1 },
    '禁用Banner');

  await testEndpoint('Banner可见性更新', 'POST', '/admin/v6/banner/visible',
    { id: 1, visible: true },
    '设置可见');

  // 8. 删除测试
  log('\n=== 8. 删除操作测试 ===', 'yellow');

  await testEndpoint('Banner删除', 'POST', '/admin/v6/banner/delete',
    { id: 99999 },
    '删除不存在ID（测试）');

  await testEndpoint('分类删除', 'POST', '/admin/v6/category/delete',
    { id: 99999 },
    '删除不存在ID（测试）');

  // 9. 配置更新测试
  log('\n=== 9. 配置更新测试 ===', 'yellow');

  await testEndpoint('配置更新-字符串值', 'POST', '/admin/v6/config/test_config',
    { value: 'test_value_string' },
    '更新为字符串值');

  await testEndpoint('配置更新-数字值', 'POST', '/admin/v6/config/test_config_num',
    { value: 12345 },
    '更新为数字值');

  await testEndpoint('配置更新-对象值', 'POST', '/admin/v6/config/test_config_obj',
    { value: JSON.stringify({ key: 'value' }) },
    '更新为JSON字符串');

  // 10. 推荐更新测试
  log('\n=== 10. 推荐操作测试 ===', 'yellow');

  await testEndpoint('活动推荐-开启', 'POST', '/admin/v6/event/recom',
    { id: 1, recom: true },
    '推荐活动');

  await testEndpoint('活动推荐-关闭', 'POST', '/admin/v6/event/recom',
    { id: 1, recom: false },
    '取消推荐');

  await testEndpoint('动态推荐-开启', 'POST', '/admin/v6/feed/recom',
    { id: 1, recom: true },
    '推荐动态');

  // 11. 登出
  log('\n=== 11. 登出 ===', 'yellow');
  await testEndpoint('管理员登出', 'POST', '/admin/logout', null, '退出登录');

  // 生成报告
  results.endTime = new Date().toISOString();
  generateReport();
}

// 生成详细报告
function generateReport() {
  log('\n========== 详细测试报告 ==========\n', 'blue');
  log(`总测试数: ${results.total}`, 'blue');
  log(`通过: ${results.passed} ✅`, 'green');
  log(`失败: ${results.failed} ❌`, results.failed > 0 ? 'red' : 'green');
  log(`通过率: ${((results.passed / results.total) * 100).toFixed(2)}%`, 'blue');

  // 保存 JSON 报告
  const timestamp = Date.now();
  const jsonPath = path.join(__dirname, 'reports', `api-payload-test-${timestamp}.json`);

  if (!fs.existsSync(path.dirname(jsonPath))) {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  }

  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  log(`\nJSON 报告: ${jsonPath}`, 'blue');

  // 生成 Markdown 报告
  generateMarkdownReport(timestamp);

  // 分析失败原因
  analyzeFailures();
}

// 分析失败原因
function analyzeFailures() {
  const failures = results.details.filter(d => d.status === 'FAILED');

  if (failures.length === 0) {
    log('\n✅ 所有测试通过，未发现错误！', 'green');
    return;
  }

  log('\n========== 失败分析 ==========\n', 'red');

  failures.forEach(f => {
    log(`[${f.testId}] ${f.name}`, 'red');
    log(`  错误: ${f.error || '响应异常'}`, 'red');
    log(`  Payload: ${JSON.stringify(f.payload)}`, 'yellow');

    if (f.response) {
      const respStr = JSON.stringify(f.response);
      if (respStr.includes('Unable to bind')) {
        log(`  ⚠️  错误类型: 参数绑定失败 (Unable to bind to type)`, 'red');
        log(`  💡 建议: 检查参数名是否正确，参数类型是否匹配`, 'cyan');
      } else if (respStr.includes('required')) {
        log(`  ⚠️  错误类型: 缺少必填字段`, 'red');
        log(`  💡 建议: 添加必填字段`, 'cyan');
      }
    }
    log('');
  });
}

// 生成 Markdown 报告
function generateMarkdownReport(timestamp) {
  const date = new Date().toISOString().split('T')[0];
  const reportDir = path.join(__dirname, '..', 'docs', 'Audit_Report');

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, `api-payload-test-report-${date}.md`);

  let md = `---
title: API Payload 详细测试报告
created: ${results.startTime}
author: Claude Code
category: API-TEST
type: api-payload-audit
status: completed
scope: 重点测试POST接口的payload格式
---

# API Payload 详细测试报告

## 1. 测试概述

| 项目 | 内容 |
|------|------|
| **测试日期** | ${date} |
| **测试目标** | 排查 POST 接口参数绑定问题 |
| **测试服务器** | ${CONFIG.baseURL} |
| **测试总数** | ${results.total} |
| **通过** | ${results.passed} ✅ |
| **失败** | ${results.failed} ❌ |
| **通过率** | ${((results.passed / results.total) * 100).toFixed(2)}% |

## 2. 详细测试结果（含 Payload）

| 序号 | 接口名称 | 方法 | 路径 | 状态 | Payload |
|------|----------|------|------|------|---------|
`;

  results.details.forEach(d => {
    const statusIcon = d.status === 'PASSED' ? '✅' : '❌';
    const payloadStr = d.payload ? JSON.stringify(d.payload).substring(0, 80) + '...' : '-';
    md += `| ${d.testId} | ${d.name} | ${d.method} | \`${d.url}\` | ${statusIcon} | ${payloadStr} |\n`;
  });

  md += `
## 3. 失败的测试详情

`;

  const failures = results.details.filter(d => d.status === 'FAILED');
  if (failures.length === 0) {
    md += '**所有测试通过！**\n\n';
  } else {
    failures.forEach(f => {
      md += `### [${f.testId}] ${f.name}\n\n`;
      md += `- **路径**: ${f.method} ${f.url}\n`;
      md += `- **错误**: ${f.error || '响应异常'}\n`;
      md += `- **Payload**:\n\n`;
      md += '\`\`\`json\n';
      md += JSON.stringify(f.payload, null, 2) + '\n';
      md += '\`\`\`\n\n';

      if (f.response) {
        md += `- **响应**:\n\n`;
        md += '\`\`\`json\n';
        md += JSON.stringify(f.response, null, 2) + '\n';
        md += '\`\`\`\n\n';
      }
    });
  }

  md += `## 4. 建议的正确 Payload 格式

根据测试成功的案例，以下是推荐的参数格式：

### 城市创建（成功示例）
\`\`\`json
{
  "adcode": "99990001",
  "title": "测试城市",
  "arg_0": "测试参数"
}
\`\`\`

### 管理员创建（成功示例）
\`\`\`json
{
  "name": "admin_test",
  "pass": "Test123456",
  "role": 1,
  "rule": 1
}
\`\`\`

### Banner更新（成功示例）
\`\`\`json
{
  "title": "更新后的标题"
}
\`\`\`

### 状态更新（成功示例）
\`\`\`json
{
  "id": 1,
  "status": 0
}
\`\`\`

---
**报告生成时间**: ${results.endTime}
**JSON数据**: tests/reports/api-payload-test-${timestamp}.json
`;

  fs.writeFileSync(reportPath, md, 'utf-8');
  log(`Markdown 报告: ${reportPath}`, 'blue');
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
