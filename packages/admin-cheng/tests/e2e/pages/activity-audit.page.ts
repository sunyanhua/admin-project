import { Page, Locator, expect } from '@playwright/test';

export class ActivityAuditPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly categoryFilter: Locator;
  readonly activityTable: Locator;
  readonly tableRows: Locator;
  readonly selectAllCheckbox: Locator;
  readonly batchApproveButton: Locator;
  readonly batchRejectButton: Locator;
  readonly clearSelectionButton: Locator;
  readonly viewDetailButton: (title: string) => Locator;
  readonly approveButton: (title: string) => Locator;
  readonly rejectButton: (title: string) => Locator;
  readonly activityStatusTag: (title: string) => Locator;
  readonly detailModal: Locator;
  readonly detailModalCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: '活动审核' });
    this.categoryFilter = page.locator('.ant-select-selector').first();
    this.activityTable = page.locator('.ant-table');
    this.tableRows = this.activityTable.locator('.ant-table-row');
    this.selectAllCheckbox = page.locator('.ant-checkbox-wrapper').first();
    this.batchApproveButton = page.getByRole('button', { name: '批量通过' });
    this.batchRejectButton = page.getByRole('button', { name: '批量拒绝' });
    this.clearSelectionButton = page.getByRole('button', { name: '取消选择' });

    // 动态定位器函数
    this.viewDetailButton = (title: string) =>
      page.locator(`.ant-table-row:has-text("${title}")`).getByRole('button', { name: '查看详情' });
    this.approveButton = (title: string) =>
      page.locator(`.ant-table-row:has-text("${title}")`).getByRole('button', { name: '通过' });
    this.rejectButton = (title: string) =>
      page.locator(`.ant-table-row:has-text("${title}")`).getByRole('button', { name: '拒绝' });
    this.activityStatusTag = (title: string) =>
      page.locator(`.ant-table-row:has-text("${title}")`).locator('.ant-tag');

    this.detailModal = page.locator('.ant-modal');
    this.detailModalCloseButton = this.detailModal.getByRole('button', { name: '关闭' });
  }

  async goto() {
    await this.page.goto('/activity-audit');
    await this.page.waitForLoadState('networkidle');
    await expect(this.pageTitle).toBeVisible();
  }

  async selectCategory(categoryLabel: string) {
    await this.categoryFilter.click();
    const option = this.page.getByText(categoryLabel, { exact: true });
    await option.click();
  }

  async getActivityStatus(title: string): Promise<string> {
    const tag = this.activityStatusTag(title);
    return await tag.textContent() || '';
  }

  async viewActivityDetail(title: string) {
    const viewBtn = this.viewDetailButton(title);
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();
    await expect(this.detailModal).toBeVisible();
  }

  async approveActivity(title: string) {
    const approveBtn = this.approveButton(title);
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();
    // 等待操作反馈
    await this.page.waitForTimeout(500);
  }

  async rejectActivity(title: string) {
    const rejectBtn = this.rejectButton(title);
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();
    await this.page.waitForTimeout(500);
  }

  async selectActivityByTitle(title: string) {
    const row = this.page.locator(`.ant-table-row:has-text("${title}")`);
    const checkbox = row.locator('.ant-checkbox-wrapper');
    await checkbox.click();
  }

  async getSelectedCount(): Promise<number> {
    const selectedText = await this.page.locator('text=已选择').textContent();
    if (!selectedText) return 0;
    const match = selectedText.match(/已选择\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async batchApproveSelected() {
    await this.batchApproveButton.click();
  }

  async batchRejectSelected() {
    await this.batchRejectButton.click();
  }

  async clearSelection() {
    if (await this.clearSelectionButton.isVisible()) {
      await this.clearSelectionButton.click();
    }
  }

  async expectActivityVisible(title: string) {
    await expect(this.page.locator(`.ant-table-row:has-text("${title}")`)).toBeVisible();
  }

  async expectActivityStatus(title: string, expectedStatus: string) {
    const actualStatus = await this.getActivityStatus(title);
    expect(actualStatus).toBe(expectedStatus);
  }

  async closeDetailModal() {
    if (await this.detailModal.isVisible()) {
      await this.detailModalCloseButton.click();
      await expect(this.detailModal).not.toBeVisible();
    }
  }
}