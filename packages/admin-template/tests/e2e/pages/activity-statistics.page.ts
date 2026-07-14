import { Page, Locator, expect } from '@playwright/test';

export class ActivityStatisticsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly dateRangePicker: Locator;
  readonly filterButton: Locator;
  readonly exportButton: Locator;
  readonly searchForm: Locator;
  readonly totalActivitiesCard: Locator;
  readonly newActivitiesTodayCard: Locator;
  readonly totalParticipantsCard: Locator;
  readonly avgCompletionRateCard: Locator;
  readonly activityGrowthChart: Locator;
  readonly activityParticipationChart: Locator;
  readonly activityCompletionChart: Locator;
  readonly activityCategoryChart: Locator;
  readonly popularActivitiesTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: '活动统计' });
    this.dateRangePicker = page.locator('.ant-picker-range');
    this.filterButton = page.getByRole('button', { name: '筛选' });
    this.exportButton = page.getByRole('button', { name: '导出数据' });
    this.searchForm = page.locator('form').first();

    // 统计卡片
    this.totalActivitiesCard = page.locator('.ant-card').filter({ hasText: '活动总数' });
    this.newActivitiesTodayCard = page.locator('.ant-card').filter({ hasText: '今日新增' });
    this.totalParticipantsCard = page.locator('.ant-card').filter({ hasText: '参与总人次' });
    this.avgCompletionRateCard = page.locator('.ant-card').filter({ hasText: '平均完成率' });

    // 图表
    this.activityGrowthChart = page.locator('[data-testid="activity-growth-chart"]').or(page.locator('canvas').first());
    this.activityParticipationChart = page.locator('[data-testid="activity-participation-chart"]').or(page.locator('canvas').nth(1));
    this.activityCompletionChart = page.locator('[data-testid="activity-completion-chart"]').or(page.locator('canvas').nth(2));
    this.activityCategoryChart = page.locator('[data-testid="activity-category-chart"]').or(page.locator('canvas').nth(3));

    // 表格
    this.popularActivitiesTable = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/statistics/activities');
    await this.page.waitForLoadState('networkidle');
    await expect(this.pageTitle).toBeVisible();
  }

  async selectDateRange(startDate: string, endDate: string) {
    // 简化实现：实际项目中可能需要更复杂的日期选择逻辑
    await this.dateRangePicker.click();
    // 这里需要更具体的日期选择器实现
    // 暂时留空，因为日期选择器交互较复杂
  }

  async clickFilter() {
    await this.filterButton.click();
  }

  async clickExport() {
    await this.exportButton.click();
  }

  async expectExportSuccess() {
    // 检查是否有成功消息或文件下载
    // 由于导出功能还在开发中，暂时只检查按钮点击
    await expect(this.page.locator('.ant-message-success').filter({ hasText: '导出' })).toBeVisible({ timeout: 10000 });
  }

  async getTotalActivities(): Promise<number> {
    const text = await this.totalActivitiesCard.locator('.ant-statistic-content-value').textContent();
    return parseInt(text?.replace(/,/g, '') || '0');
  }

  async getNewActivitiesToday(): Promise<number> {
    const text = await this.newActivitiesTodayCard.locator('.ant-statistic-content-value').textContent();
    return parseInt(text?.replace(/,/g, '') || '0');
  }

  async getTotalParticipants(): Promise<number> {
    const text = await this.totalParticipantsCard.locator('.ant-statistic-content-value').textContent();
    return parseInt(text?.replace(/,/g, '') || '0');
  }

  async getAvgCompletionRate(): Promise<number> {
    const text = await this.avgCompletionRateCard.locator('.ant-statistic-content-value').textContent();
    return parseFloat(text?.replace(/,/g, '') || '0');
  }

  async expectChartsVisible() {
    // 检查图表是否可见
    await expect(this.activityGrowthChart).toBeVisible();
    await expect(this.activityParticipationChart).toBeVisible();
    await expect(this.activityCompletionChart).toBeVisible();
    await expect(this.activityCategoryChart).toBeVisible();
  }

  async expectTableVisible() {
    await expect(this.popularActivitiesTable).toBeVisible();
  }
}