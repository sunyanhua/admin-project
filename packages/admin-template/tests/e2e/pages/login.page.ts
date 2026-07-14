import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberCheckbox: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly loginForm: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByLabel('用户名');
    this.passwordInput = page.getByLabel('密码');
    this.rememberCheckbox = page.getByRole('checkbox', { name: '记住密码' });
    this.submitButton = page.getByRole('button', { name: '登录系统' });
    this.forgotPasswordLink = page.getByRole('link', { name: '忘记密码？' });
    this.loginForm = page.locator('form[name="login"]');
    this.errorMessage = page.locator('.ant-message-error');
    this.successMessage = page.locator('.ant-message-success');
  }

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
    // 等待表单出现
    await this.page.waitForSelector('form', { timeout: 10000 });
  }

  async login(username: string, password: string, remember = false) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    if (remember) {
      await this.rememberCheckbox.check();
    }
    await this.submitButton.click();
  }

  async expectLoginSuccess() {
    await expect(this.successMessage).toContainText('登录成功');
    await this.page.waitForURL('/');
  }

  async expectLoginError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async isLoggedIn() {
    // 检查是否重定向到首页或其他登录后页面
    return this.page.url().endsWith('/') || await this.page.locator('text=搭子计划').isVisible();
  }
}