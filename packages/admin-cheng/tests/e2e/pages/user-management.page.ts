import { Page, Locator, expect } from '@playwright/test';

export class UserManagementPage {
  readonly page: Page;
  readonly pageTitle: Locator;
  readonly searchForm: Locator;
  readonly usernameSearchInput: Locator;
  readonly nicknameSearchInput: Locator;
  readonly phoneSearchInput: Locator;
  readonly searchButton: Locator;
  readonly resetButton: Locator;
  readonly addUserButton: Locator;
  readonly userTable: Locator;
  readonly tableRows: Locator;
  readonly statusTag: (status: string) => Locator;
  readonly banButton: (username: string) => Locator;
  readonly unbanButton: (username: string) => Locator;
  readonly viewButton: (username: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = page.getByRole('heading', { name: '用户管理' });
    this.searchForm = page.locator('form').first();
    this.usernameSearchInput = page.getByPlaceholder('用户名');
    this.nicknameSearchInput = page.getByPlaceholder('昵称');
    this.phoneSearchInput = page.getByPlaceholder('手机号');
    this.searchButton = page.getByRole('button', { name: '搜索' });
    this.resetButton = page.getByRole('button', { name: '重置' });
    this.addUserButton = page.getByRole('button', { name: '添加用户' });
    this.userTable = page.locator('.ant-table');
    this.tableRows = this.userTable.locator('.ant-table-row');

    // 动态定位器函数
    this.statusTag = (status: string) => page.locator(`.ant-tag:has-text("${status}")`);
    this.banButton = (username: string) =>
      page.locator(`.ant-table-row:has-text("${username}")`).getByRole('button', { name: '封禁' });
    this.unbanButton = (username: string) =>
      page.locator(`.ant-table-row:has-text("${username}")`).getByRole('button', { name: '解封' });
    this.viewButton = (username: string) =>
      page.locator(`.ant-table-row:has-text("${username}")`).getByRole('button', { name: '查看' });
  }

  async goto() {
    await this.page.goto('/user-management');
    await this.page.waitForLoadState('networkidle');
    await expect(this.pageTitle).toBeVisible();
  }

  async searchUser(options: { username?: string; nickname?: string; phone?: string }) {
    if (options.username) {
      await this.usernameSearchInput.fill(options.username);
    }
    if (options.nickname) {
      await this.nicknameSearchInput.fill(options.nickname);
    }
    if (options.phone) {
      await this.phoneSearchInput.fill(options.phone);
    }
    await this.searchButton.click();
  }

  async resetSearch() {
    await this.resetButton.click();
  }

  async getUserStatus(username: string): Promise<string> {
    const row = this.page.locator(`.ant-table-row:has-text("${username}")`);
    const statusTag = row.locator('.ant-tag');
    return await statusTag.textContent() || '';
  }

  async banUser(username: string) {
    const banBtn = this.banButton(username);
    await expect(banBtn).toBeVisible();
    await banBtn.click();
    // 等待操作反馈
    await this.page.waitForTimeout(500);
  }

  async unbanUser(username: string) {
    const unbanBtn = this.unbanButton(username);
    await expect(unbanBtn).toBeVisible();
    await unbanBtn.click();
    await this.page.waitForTimeout(500);
  }

  async getUserCount(): Promise<number> {
    return await this.tableRows.count();
  }

  async expectUserVisible(username: string) {
    await expect(this.page.locator(`.ant-table-row:has-text("${username}")`)).toBeVisible();
  }

  async expectUserNotVisible(username: string) {
    await expect(this.page.locator(`.ant-table-row:has-text("${username}")`)).not.toBeVisible();
  }
}