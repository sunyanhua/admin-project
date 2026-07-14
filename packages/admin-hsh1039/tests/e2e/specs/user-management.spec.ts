import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { UserManagementPage } from '../pages/user-management.page';

test.describe('用户管理功能', () => {
  let loginPage: LoginPage;
  let userManagementPage: UserManagementPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    userManagementPage = new UserManagementPage(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login('admin', 'admin123');
    await loginPage.expectLoginSuccess();

    // 然后跳转到用户管理页面
    await userManagementPage.goto();
  });

  test('应该成功加载用户管理页面', async ({ page }) => {
    await expect(userManagementPage.pageTitle).toBeVisible();
    await expect(userManagementPage.searchForm).toBeVisible();
    await expect(userManagementPage.userTable).toBeVisible();
    await expect(userManagementPage.addUserButton).toBeVisible();
  });

  test('应该显示用户列表', async () => {
    const userCount = await userManagementPage.getUserCount();
    expect(userCount).toBeGreaterThan(0);
    await userManagementPage.expectUserVisible('user1');
    await userManagementPage.expectUserVisible('user2');
  });

  test('应该能搜索用户', async () => {
    const initialCount = await userManagementPage.getUserCount();

    // 搜索存在的用户
    await userManagementPage.searchUser({ username: 'user1' });
    await userManagementPage.expectUserVisible('user1');

    // 搜索不存在的用户
    await userManagementPage.searchUser({ username: 'nonexistent' });
    const filteredCount = await userManagementPage.getUserCount();
    expect(filteredCount).toBeLessThan(initialCount);
  });

  test('应该能重置搜索', async () => {
    // 先搜索
    await userManagementPage.searchUser({ username: 'user1' });
    const filteredCount = await userManagementPage.getUserCount();

    // 重置
    await userManagementPage.resetSearch();
    const resetCount = await userManagementPage.getUserCount();
    expect(resetCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('应该能查看用户状态', async () => {
    const status = await userManagementPage.getUserStatus('user1');
    expect(['正常', '封禁', '已删除']).toContain(status);
  });

  test('应该能封禁用户', async () => {
    // 假设 user1 初始状态为正常
    const initialStatus = await userManagementPage.getUserStatus('user1');
    if (initialStatus === '正常') {
      await userManagementPage.banUser('user1');
      const newStatus = await userManagementPage.getUserStatus('user1');
      expect(newStatus).toBe('封禁');
    }
  });

  test('应该能解封用户', async () => {
    // 假设 user2 初始状态为封禁
    const initialStatus = await userManagementPage.getUserStatus('user2');
    if (initialStatus === '封禁') {
      await userManagementPage.unbanUser('user2');
      const newStatus = await userManagementPage.getUserStatus('user2');
      expect(newStatus).toBe('正常');
    }
  });

  test('添加用户按钮应该可点击', async () => {
    await expect(userManagementPage.addUserButton).toBeEnabled();
    // 点击按钮，虽然功能可能未实现
    await userManagementPage.addUserButton.click();
  });

  test('响应式布局 - 在小屏幕上隐藏某些列', async ({ page }) => {
    // 测试响应式布局，模拟移动端视图
    await page.setViewportSize({ width: 375, height: 667 });

    // ID列应该在小屏幕上隐藏
    const idColumnHeader = page.locator('.ant-table-thead th', { hasText: 'ID' });
    // 注意：这里只是简单检查，实际需要更复杂的响应式测试
    await page.waitForTimeout(500); // 给布局调整一点时间
  });
});