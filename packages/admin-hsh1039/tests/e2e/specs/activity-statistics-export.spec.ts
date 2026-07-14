import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ActivityStatisticsPage } from '../pages/activity-statistics.page';

test.describe('活动统计数据导出功能', () => {
  let loginPage: LoginPage;
  let activityStatisticsPage: ActivityStatisticsPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    activityStatisticsPage = new ActivityStatisticsPage(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login('admin', 'admin123');
    await loginPage.expectLoginSuccess();

    // 然后跳转到活动统计页面
    await activityStatisticsPage.goto();
  });

  test('应该成功加载活动统计页面', async () => {
    await expect(activityStatisticsPage.pageTitle).toBeVisible();
    await expect(activityStatisticsPage.searchForm).toBeVisible();
    await expect(activityStatisticsPage.filterButton).toBeVisible();
    await expect(activityStatisticsPage.exportButton).toBeVisible();
    await expect(activityStatisticsPage.dateRangePicker).toBeVisible();
  });

  test('应该显示统计卡片数据', async () => {
    const totalActivities = await activityStatisticsPage.getTotalActivities();
    expect(totalActivities).toBeGreaterThan(0);

    const newActivitiesToday = await activityStatisticsPage.getNewActivitiesToday();
    expect(newActivitiesToday).toBeGreaterThanOrEqual(0);

    const totalParticipants = await activityStatisticsPage.getTotalParticipants();
    expect(totalParticipants).toBeGreaterThanOrEqual(0);

    const avgCompletionRate = await activityStatisticsPage.getAvgCompletionRate();
    expect(avgCompletionRate).toBeGreaterThanOrEqual(0);
    expect(avgCompletionRate).toBeLessThanOrEqual(100);
  });

  test('应该显示统计图表', async () => {
    await activityStatisticsPage.expectChartsVisible();
  });

  test('应该显示热门活动表格', async () => {
    await activityStatisticsPage.expectTableVisible();
  });

  test('导出按钮应该可点击', async () => {
    await expect(activityStatisticsPage.exportButton).toBeEnabled();

    // 点击导出按钮
    await activityStatisticsPage.clickExport();

    // 由于导出功能还在开发中，我们检查是否有消息提示或按钮点击反馈
    // 这里可以等待一段时间，确保点击事件被处理
    await activityStatisticsPage.page.waitForTimeout(1000);

    // 可以添加更具体的断言，比如检查是否有下载开始或API调用
    // 目前由于功能未完全实现，暂时只测试按钮可点击性
  });

  test('应该能筛选数据后导出', async () => {
    // 先点击筛选按钮（使用默认日期范围）
    await activityStatisticsPage.clickFilter();

    // 等待数据刷新
    await activityStatisticsPage.page.waitForTimeout(2000);

    // 然后点击导出
    await activityStatisticsPage.clickExport();
    await activityStatisticsPage.page.waitForTimeout(1000);
  });
});