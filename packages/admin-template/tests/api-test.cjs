/**
 * API 接口测试脚本
 * 测试所有后台管理接口
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
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
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
};

// 日志函数
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
    };

    if (data && method.toUpperCase() === 'POST') {
      config.data = new URLSearchParams(data).toString();
      config.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
      };
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
      status: 'PASSED',
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
      result.status = 'FAILED';
      log(`❌ ${name} - 响应码异常`, 'red');
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
  log('\n========== 后台管理接口测试开始 ==========\n', 'blue');
  log(`测试服务器: ${CONFIG.baseURL}`, 'blue');
  log(`开始时间: ${results.startTime}\n`, 'blue');

  // 1. 登录
  log('\n--- 1. 登录相关接口 ---', 'yellow');

  const loginResult = await testEndpoint(
    '管理员登录',
    'POST',
    '/admin/login',
    { name: CONFIG.username, pass: CONFIG.password },
    '使用账号密码登录'
  );

  if (!loginResult.success) {
    log('登录失败，终止测试', 'red');
    return;
  }

  await testEndpoint('获取登录状态', 'GET', '/admin/login', null, '获取当前登录信息');
  await testEndpoint('获取登录日志', 'GET', '/admin/login/logs', { start: 0, length: 10 }, '分页获取登录日志');

  // 2. 管理员管理
  log('\n--- 2. 管理员管理接口 ---', 'yellow');
  await testEndpoint('获取管理员列表', 'GET', '/admin/user', { start: 0, length: 10 }, '分页获取管理员列表');
  await testEndpoint('获取操作日志', 'GET', '/admin/logs', { start: 0, length: 10 }, '分页获取系统日志');

  // 3. Banner管理
  log('\n--- 3. Banner管理接口 ---', 'yellow');
  await testEndpoint('获取Banner列表', 'GET', '/admin/v6/banner', { start: 0, length: 10 }, '分页获取轮播图列表');

  // 4. 分类管理
  log('\n--- 4. 分类管理接口 ---', 'yellow');
  await testEndpoint('获取分类列表', 'GET', '/admin/v6/category', { start: 0, length: 10 }, '分页获取分类列表');

  // 5. 城市管理
  log('\n--- 5. 城市管理接口 ---', 'yellow');
  await testEndpoint('获取城市列表', 'GET', '/admin/v6/city', { start: 0, length: 10 }, '分页获取城市列表');

  // 6. 配置管理
  log('\n--- 6. 配置管理接口 ---', 'yellow');
  await testEndpoint('获取系统配置', 'GET', '/admin/v6/config/system', null, '获取指定配置');
  await testEndpoint('获取小程序二维码', 'GET', '/admin/v6/wxa/app/qrcode', null, '获取小程序码');
  await testEndpoint('获取小程序场景', 'GET', '/admin/v6/wxa/app/scene', null, '获取场景配置');

  // 7. 用户管理
  log('\n--- 7. 用户管理接口 ---', 'yellow');
  await testEndpoint('获取用户列表', 'GET', '/admin/v6/user', { start: 0, length: 10 }, '分页获取用户列表');
  await testEndpoint('获取实名认证列表', 'GET', '/admin/v6/user/real', { start: 0, length: 10 }, '分页获取实名认证');
  await testEndpoint('获取合作认证列表', 'GET', '/admin/v6/user/coop', { start: 0, length: 10 }, '分页获取合作认证');

  // 8. 钱包提现
  log('\n--- 8. 钱包提现接口 ---', 'yellow');
  await testEndpoint('获取提现列表', 'GET', '/admin/v6/wxa/user/wallet/withdraw', { start: 0, length: 10 }, '分页获取提现申请');

  // 9. 活动管理
  log('\n--- 9. 活动管理接口 ---', 'yellow');
  await testEndpoint('获取活动列表', 'GET', '/admin/v6/event', { start: 0, length: 10 }, '分页获取活动列表');

  // 10. 活动订单
  log('\n--- 10. 活动订单接口 ---', 'yellow');
  await testEndpoint('获取活动订单', 'GET', '/admin/v6/event/order', { start: 0, length: 10 }, '分页获取订单列表');
  await testEndpoint('获取支付记录', 'GET', '/admin/v6/event/order/payment', { start: 0, length: 10 }, '分页获取支付记录');
  await testEndpoint('获取退款记录', 'GET', '/admin/v6/event/order/refund', { start: 0, length: 10 }, '分页获取退款记录');

  // 11. 动态管理
  log('\n--- 11. 动态管理接口 ---', 'yellow');
  await testEndpoint('获取动态列表', 'GET', '/admin/v6/feed', { start: 0, length: 10 }, '分页获取动态列表');

  // 12. 登出
  log('\n--- 12. 登出接口 ---', 'yellow');
  await testEndpoint('管理员登出', 'POST', '/admin/logout', null, '退出登录');

  // 生成报告
  results.endTime = new Date().toISOString();
  generateReport();
}

// 生成测试报告
function generateReport() {
  log('\n========== 测试报告 ==========\n', 'blue');
  log(`总测试数: ${results.total}`, 'blue');
  log(`通过: ${results.passed} ✅`, 'green');
  log(`失败: ${results.failed} ❌`, results.failed > 0 ? 'red' : 'green');
  log(`通过率: ${((results.passed / results.total) * 100).toFixed(2)}%`, 'blue');
  log(`\n开始时间: ${results.startTime}`, 'blue');
  log(`结束时间: ${results.endTime}`, 'blue');

  // 保存 JSON 报告
  const jsonPath = path.join(__dirname, 'reports', `api-test-${Date.now()}.json`);
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

  const reportPath = path.join(reportDir, `api-test-report-${date}.md`);

  let md = `---
title: 后台管理接口测试报告
created: ${results.startTime}
author: Claude Code
category: API-TEST
type: api-audit
status: completed
scope: 全部后台管理接口
---

# 后台管理接口测试报告

## 1. 测试概述

| 项目 | 内容 |
|------|------|
| **测试日期** | ${date} |
| **测试目标** | 验证所有后台管理接口可用性 |
| **测试服务器** | ${CONFIG.baseURL} |
| **测试账号** | ${CONFIG.username} |
| **测试总数** | ${results.total} |
| **通过** | ${results.passed} ✅ |
| **失败** | ${results.failed} ❌ |
| **通过率** | ${((results.passed / results.total) * 100).toFixed(2)}% |

## 2. 测试结果详情

| 序号 | 接口名称 | 方法 | 路径 | 状态 | 耗时 | 说明 |
|------|----------|------|------|------|------|------|
`;

  results.details.forEach((detail, index) => {
    const statusIcon = detail.status === 'PASSED' ? '✅' : '❌';
    md += `| ${index + 1} | ${detail.name} | ${detail.method} | \`${detail.url}\` | ${statusIcon} ${detail.status} | ${detail.duration} | ${detail.description} |\n`;
  });

  md += `
## 3. 失败详情

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
## 4. 问题与建议

### 发现的问题

${failedTests.length > 0 ? '1. 部分接口返回异常，需要进一步排查\n' : '1. 无重大问题\n'}

### 优化建议

1. **接口文档**: 保持 OpenAPI 文档与实际接口同步
2. **错误处理**: 统一错误码和错误信息格式
3. **性能优化**: 大数据量查询建议增加缓存

## 5. 附录

### 测试环境

- **测试工具**: Node.js + Axios
- **测试时间**: ${results.startTime} ~ ${results.endTime}
- **执行方式**: 自动化脚本

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
