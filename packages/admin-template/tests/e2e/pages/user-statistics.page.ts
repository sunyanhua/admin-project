import { Page, Locator, expect } from '@playwright/test';

export class UserStatisticsPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly dateRangePicker: Locator;
  readonly filterButton: Locator;
  readonly exportButton: Locator;
  readonly searchForm: Locator;
  readonly totalUsersCard: Locator;
  readonly newUsersTodayCard: Locator;
  readonly activeUsersCard: Locator;
  readonly retentionRateCard: Locator;
  readonly userGrowthChart: Locator;
  readonly userActivityChart: Locator;
  readonly userRetentionChart: Locator;
  readonly userSourceChart: Locator;
  readonly userSourceTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: '用户统计' });
    this.dateRangePicker = page.locator('.ant-picker-range');
    this.filterButton = page.getByRole('button', { name: '筛选' });
    this.exportButton = page.getByRole('button', { name: '导出数据' });
    this.searchForm = page.locator('form').first();

    // 统计卡片
    this.totalUsersCard = page.locator('.ant-card').filter({ hasText: '总用户数' });
    this.newUsersTodayCard = page.locator('.ant-card').filter({ hasText: '今日新增' });
    this.activeUsersCard = page.locator('.ant-card').filter({ hasText: '活跃用户' });
    this.retentionRateCard = page.locator('.ant-card').filter({ hasText: '七日留存率' });

    // 图表
    this.userGrowthChart = page.locator('[data-testid="user-growth-chart"]').or(page.locator('canvas').first());
    this.userActivityChart = page.locator('[data-testid="user-activity-chart"]').or(page.locator('canvas').nth(1));
    this.userRetentionChart = page.locator('[data-testid="user-retention-chart"]').or(page.locator('canvas').nth(2));
    this.userSourceChart = page.locator('[data-testid="user-source-chart"]').or(page.locator('canvas').nth(3));

    // 表格
    this.userSourceTable = page.locator('.ant-table');
  }

  async goto() {
    await this.page.goto('/statistics/users');
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

  async getTotalUsers(): Promise<number> {
    const text = await this.totalUsersCard.locator('.ant-statistic-content-value').textContent();
    return parseInt(text?.replace(/,/g, '') || '0');
  }

  async getNewUsersToday(): Promise<number> {
    const text = await this.newUsersTodayCard.locator('.ant-statistic-content-value').textContent();
    return parseInt(text?.replace(/,/g, '') || '0');
  }

  async getActiveUsers(): Promise<number> {
    const text = await this.activeUsersCard.locator('.ant-statistic-content-value').textContent();
    return parseInt(text?.replace(/,/g, '') || '0');
  }

  async getRetentionRate(): Promise<number> {
    const text = await this.retentionRateCard.locator('.ant-statistic-content-value').textContent();
    return parseFloat(text?.replace(/,/g, '') || '0');
  }

  async expectChartsVisible() {
    // 检查图表是否可见
    await expect(this.userGrowthChart).toBeVisible();
    await expect(this.userActivityChart).toBeVisible();
    await expect(this.userRetentionChart).toBeVisible();
    await expect(this.userSourceChart).toBeVisible();
  }

  async expectTableVisible() {
    await expect(this.userSourceTable).toBeVisible();
  }
}