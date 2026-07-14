import { test, expect, type Page } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('form', { timeout: 10000 });
  }

  async login(username: string, password: string) {
    // 使用 placeholder 定位输入框
    await this.page.getByPlaceholder('请输入管理员用户名').fill(username);
    await this.page.getByPlaceholder('请输入登录密码').fill(password);
    await this.page.click('button[type="submit"]');
  }
}

export const loginPage = new LoginPage();

test.describe('管理后台登录功能', () => {
  test('应该成功加载登录页面', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('form', { timeout: 15000 });
    await expect(page.locator('form')).toBeVisible();
  });

  test('使用默认管理员账号应该登录成功', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('请输入管理员用户名').fill('admin');
    await page.getByPlaceholder('请输入登录密码').fill('admin123');
    await page.click('button[type="submit"]');
    // 等待登录成功后跳转
    await page.waitForURL('**/', { timeout: 10000 });
  });

  test('使用错误密码应该登录失败', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('请输入管理员用户名').fill('admin');
    await page.getByPlaceholder('请输入登录密码').fill('wrongpassword');
    await page.click('button[type="submit"]');
    // 等待错误提示 - 使用更通用的选择器
    await page.waitForSelector('.ant-message-notice', { timeout: 10000 });
  });

  test('用户名和密码为空时应该显示验证错误', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.click('button[type="submit"]');
    // Ant Design 表单验证会显示错误
    await page.waitForSelector('.ant-form-item-explain-error', { timeout: 5000 });
  });

  test('记住密码复选框默认勾选', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // initialValues remember: true，所以默认勾选
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeChecked();
  });

  test('忘记密码链接应该可见', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // 使用文本定位
    await expect(page.getByText('忘记密码？')).toBeVisible();
  });
});
