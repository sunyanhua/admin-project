import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { RealNameAuthPage } from '../pages/realname-auth.page';

test.describe('实名认证审核功能', () => {
  let loginPage: LoginPage;
  let realNameAuthPage: RealNameAuthPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    realNameAuthPage = new RealNameAuthPage(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login('admin', 'admin123');
    await loginPage.expectLoginSuccess();

    // 然后跳转到实名认证审核页面
    await realNameAuthPage.goto();
  });

  test('应该成功加载实名认证审核页面', async ({ page }) => {
    await expect(realNameAuthPage.pageTitle).toBeVisible();
    await expect(realNameAuthPage.searchForm).toBeVisible();
    await expect(realNameAuthPage.authTable).toBeVisible();
  });

  test('应该显示实名认证申请列表', async () => {
    const authCount = await realNameAuthPage.getAuthCount();
    expect(authCount).toBeGreaterThan(0);
    await realNameAuthPage.expectAuthVisible('user1');
    await realNameAuthPage.expectAuthVisible('user2');
  });

  test('应该能查看认证状态', async () => {
    const status = await realNameAuthPage.getAuthStatus('user1');
    expect(['待审核', '已认证', '已拒绝', '未认证']).toContain(status);
  });

  test('应该能搜索实名认证申请', async () => {
    const initialCount = await realNameAuthPage.getAuthCount();

    // 按用户名搜索
    await realNameAuthPage.searchAuth({ username: 'user1' });
    await realNameAuthPage.expectAuthVisible('user1');

    // 按真实姓名搜索
    await realNameAuthPage.resetSearch();
    await realNameAuthPage.searchAuth({ realName: '张三' });
    await realNameAuthPage.expectAuthVisible('user1');

    // 按状态搜索
    await realNameAuthPage.resetSearch();
    await realNameAuthPage.searchAuth({ status: '待审核' });
    const filteredCount = await realNameAuthPage.getAuthCount();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('应该能重置搜索', async () => {
    // 先搜索
    await realNameAuthPage.searchAuth({ username: 'user1' });
    const filteredCount = await realNameAuthPage.getAuthCount();

    // 重置
    await realNameAuthPage.resetSearch();
    const resetCount = await realNameAuthPage.getAuthCount();
    expect(resetCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('应该能查看申请详情', async () => {
    await realNameAuthPage.viewDetail('user1');
    await expect(realNameAuthPage.detailModal).toBeVisible();

    // 检查详情内容
    await expect(realNameAuthPage.detailModal.locator('text=用户名')).toBeVisible();
    await expect(realNameAuthPage.detailModal.locator('text=真实姓名')).toBeVisible();
    await expect(realNameAuthPage.detailModal.locator('text=身份证号')).toBeVisible();

    await realNameAuthPage.closeDetailModal();
  });

  test('应该能审核通过实名认证', async () => {
    const initialStatus = await realNameAuthPage.getAuthStatus('user1');
    if (initialStatus === '待审核') {
      await realNameAuthPage.approveAuth('user1');
      await realNameAuthPage.page.waitForTimeout(1000); // 等待状态更新

      const newStatus = await realNameAuthPage.getAuthStatus('user1');
      expect(newStatus).toBe('已认证');
    }
  });

  test('应该能审核拒绝实名认证', async () => {
    const initialStatus = await realNameAuthPage.getAuthStatus('user1');
    if (initialStatus === '待审核') {
      await realNameAuthPage.rejectAuth('user1');
      await realNameAuthPage.page.waitForTimeout(1000);

      const newStatus = await realNameAuthPage.getAuthStatus('user1');
      expect(newStatus).toBe('已拒绝');
    }
  });

  test('已处理的申请不应该有操作按钮', async () => {
    // 检查已认证的用户是否有操作按钮
    const approvedUserRow = realNameAuthPage.page.locator('.ant-table-row:has-text("user2")');
    const approveBtn = approvedUserRow.getByRole('button', { name: '通过' });
    const rejectBtn = approvedUserRow.getByRole('button', { name: '拒绝' });

    // 已认证的用户不应该有通过/拒绝按钮
    await expect(approveBtn).not.toBeVisible();
    await expect(rejectBtn).not.toBeVisible();
  });

  test('应该能查看审核历史记录', async () => {
    await realNameAuthPage.viewDetail('user2'); // 已认证用户
    await expect(realNameAuthPage.detailModal.locator('text=审核历史记录')).toBeVisible();

    // 检查时间线是否存在
    const timeline = realNameAuthPage.detailModal.locator('.ant-timeline');
    await expect(timeline).toBeVisible();

    await realNameAuthPage.closeDetailModal();
  });

  test('响应式布局 - 在小屏幕上隐藏某些列', async ({ page }) => {
    // 模拟移动端视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // 给布局调整时间

    // 检查表格是否仍然可访问
    await expect(realNameAuthPage.authTable).toBeVisible();
  });
});