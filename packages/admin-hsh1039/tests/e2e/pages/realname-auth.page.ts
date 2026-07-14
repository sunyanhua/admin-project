import { Page, Locator, expect } from '@playwright/test';

export class RealNameAuthPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly searchForm: Locator;
  readonly usernameSearchInput: Locator;
  readonly realNameSearchInput: Locator;
  readonly statusFilter: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly authTable: Locator;
  readonly tableRows: Locator;
  readonly detailButton: (username: string) => Locator;
  readonly approveButton: (username: string) => Locator;
  readonly rejectButton: (username: string) => Locator;
  readonly statusTag: (username: string) => Locator;
  readonly detailModal: Locator;
  readonly detailModalCloseButton: Locator;
  readonly confirmModal: Locator;
  readonly confirmModalOkButton: Locator;
  readonly confirmModalCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: '实名认证审核' });
    this.searchForm = page.locator('form').first();
    this.usernameSearchInput = page.getByPlaceholder('用户名');
    this.realNameSearchInput = page.getByPlaceholder('真实姓名');
    this.statusFilter = page.locator('.ant-select-selector').first();
    this.searchButton = page.getByRole('button', { name: '搜索' });
    this.resetButton = page.getByRole('button', { name: '重置' });
    this.authTable = page.locator('.ant-table');
    this.tableRows = this.authTable.locator('.ant-table-row');

    // 动态定位器函数
    this.detailButton = (username: string) =>
      page.locator(`.ant-table-row:has-text("${username}")`).getByRole('button', { name: '详情' });
    this.approveButton = (username: string) =>
      page.locator(`.ant-table-row:has-text("${username}")`).getByRole('button', { name: '通过' });
    this.rejectButton = (username: string) =>
      page.locator(`.ant-table-row:has-text("${username}")`).getByRole('button', { name: '拒绝' });
    this.statusTag = (username: string) =>
      page.locator(`.ant-table-row:has-text("${username}")`).locator('.ant-tag');

    this.detailModal = page.locator('.ant-modal');
    this.detailModalCloseButton = this.detailModal.getByRole('button', { name: '关闭' });

    this.confirmModal = page.locator('.ant-modal-confirm');
    this.confirmModalOkButton = page.locator('.ant-modal-confirm-btns .ant-btn-primary');
    this.confirmModalCancelButton = page.locator('.ant-modal-confirm-btns .ant-btn-default');
  }

  async goto() {
    await this.page.goto('/users/realname-auth');
    await this.page.waitForLoadState('networkidle');
    await expect(this.pageTitle).toBeVisible();
  }

  async searchAuth(options: { username?: string; realName?: string; status?: string }) {
    if (options.username) {
      await this.usernameSearchInput.fill(options.username);
    }
    if (options.realName) {
      await this.realNameSearchInput.fill(options.realName);
    }
    if (options.status) {
      await this.statusFilter.click();
      const option = this.page.getByText(options.status, { exact: true });
      await option.click();
    }
    await this.searchButton.click();
  }

  async resetSearch() {
    await this.resetButton.click();
  }

  async getAuthStatus(username: string): Promise<string> {
    const tag = this.statusTag(username);
    return await tag.textContent() || '';
  }

  async viewDetail(username: string) {
    const detailBtn = this.detailButton(username);
    await expect(detailBtn).toBeVisible();
    await detailBtn.click();
    await expect(this.detailModal).toBeVisible();
  }

  async approveAuth(username: string) {
    const approveBtn = this.approveButton(username);
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // 处理确认对话框
    await this.handleConfirmModal('确认通过');
  }

  async rejectAuth(username: string) {
    const rejectBtn = this.rejectButton(username);
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();

    await this.handleConfirmModal('拒绝认证');
  }

  private async handleConfirmModal(expectedTitle?: string) {
    await expect(this.confirmModal).toBeVisible();
    if (expectedTitle) {
      const title = this.confirmModal.locator('.ant-modal-confirm-title');
      await expect(title).toContainText(expectedTitle);
    }
    await this.confirmModalOkButton.click();
    await expect(this.confirmModal).not.toBeVisible();
  }

  async closeDetailModal() {
    if (await this.detailModal.isVisible()) {
      await this.detailModalCloseButton.click();
      await expect(this.detailModal).not.toBeVisible();
    }
  }

  async getAuthCount(): Promise<number> {
    return await this.tableRows.count();
  }

  async expectAuthVisible(username: string) {
    await expect(this.page.locator(`.ant-table-row:has-text("${username}")`)).toBeVisible();
  }

  async expectAuthStatus(username: string, expectedStatus: string) {
    const actualStatus = await this.getAuthStatus(username);
    expect(actualStatus).toBe(expectedStatus);
  }
}