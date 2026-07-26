import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { UserStatisticsPage } from '../pages/user-statistics.page';

test.describe('用户统计数据导出功能', () => {
  let loginPage: LoginPage;
  let userStatisticsPage: UserStatisticsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    userStatisticsPage = new UserStatisticsPage(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login('admin', 'admin123');
    await loginPage.expectLoginSuccess();

    // 然后跳转到用户统计页面
    await userStatisticsPage.goto();
  });

  test('应该成功加载用户统计页面', async () => {
    await expect(userStatisticsPage.pageTitle).toBeVisible();
    await expect(userStatisticsPage.searchForm).toBeVisible();
    await expect(userStatisticsPage.filterButton).toBeVisible();
    await expect(userStatisticsPage.exportButton).toBeVisible();
    await expect(userStatisticsPage.dateRangePicker).toBeVisible();
  });

  test('应该显示统计卡片数据', async () => {
    const totalUsers = await userStatisticsPage.getTotalUsers();
    expect(totalUsers).toBeGreaterThan(0);

    const newUsersToday = await userStatisticsPage.getNewUsersToday();
    expect(newUsersToday).toBeGreaterThanOrEqual(0);

    const activeUsers = await userStatisticsPage.getActiveUsers();
    expect(activeUsers).toBeGreaterThanOrEqual(0);

    const retentionRate = await userStatisticsPage.getRetentionRate();
    expect(retentionRate).toBeGreaterThanOrEqual(0);
    expect(retentionRate).toBeLessThanOrEqual(100);
  });

  test('应该显示统计图表', async () => {
    await userStatisticsPage.expectChartsVisible();
  });

  test('应该显示用户来源表格', async () => {
    await userStatisticsPage.expectTableVisible();
  });

  test('导出按钮应该可点击', async () => {
    await expect(userStatisticsPage.exportButton).toBeEnabled();

    // 点击导出按钮
    await userStatisticsPage.clickExport();

    // 由于导出功能还在开发中，我们检查是否有消息提示或按钮点击反馈
    // 这里可以等待一段时间，确保点击事件被处理
    await userStatisticsPage.page.waitForTimeout(1000);

    // 可以添加更具体的断言，比如检查是否有下载开始或API调用
    // 目前由于功能未完全实现，暂时只测试按钮可点击性
  });

  test('应该能筛选数据后导出', async () => {
    // 先点击筛选按钮（使用默认日期范围）
    await userStatisticsPage.clickFilter();

    // 等待数据刷新
    await userStatisticsPage.page.waitForTimeout(2000);

    // 然后点击导出
    await userStatisticsPage.clickExport();
    await userStatisticsPage.page.waitForTimeout(1000);
  });
});