import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ActivityAuditPage } from '../pages/activity-audit.page';

test.describe('活动审核功能', () => {
  let loginPage: LoginPage;
  let activityAuditPage: ActivityAuditPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    activityAuditPage = new ActivityAuditPage(page);

    // 先登录
    await loginPage.goto();
    await loginPage.login('admin', 'admin123');
    await loginPage.expectLoginSuccess();

    // 然后跳转到活动审核页面
    await activityAuditPage.goto();
  });

  test('应该成功加载活动审核页面', async ({ page }) => {
    await expect(activityAuditPage.pageTitle).toBeVisible();
    await expect(activityAuditPage.categoryFilter).toBeVisible();
    await expect(activityAuditPage.activityTable).toBeVisible();
  });

  test('应该显示活动列表', async () => {
    await activityAuditPage.expectActivityVisible('周末骑行活动');
    await activityAuditPage.expectActivityVisible('户外徒步');
  });

  test('应该能查看活动状态', async () => {
    const status = await activityAuditPage.getActivityStatus('周末骑行活动');
    expect(['待审核', '已通过', '已拒绝', '已发布', '已取消', '已完成']).toContain(status);
  });

  test('应该能筛选活动分类', async () => {
    const initialCount = await activityAuditPage.tableRows.count();

    // 选择分类（假设有'户外'分类）
    await activityAuditPage.selectCategory('户外(骑行)');
    await activityAuditPage.page.waitForTimeout(1000); // 等待筛选结果

    const filteredCount = await activityAuditPage.tableRows.count();
    // 筛选后数量应该小于或等于初始数量
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test('应该能查看活动详情', async () => {
    await activityAuditPage.viewActivityDetail('周末骑行活动');
    await expect(activityAuditPage.detailModal).toBeVisible();
    await activityAuditPage.closeDetailModal();
  });

  test('应该能审核通过单个活动', async () => {
    // 先找到状态为"待审核"的活动
    const initialStatus = await activityAuditPage.getActivityStatus('周末骑行活动');
    if (initialStatus === '待审核') {
      await activityAuditPage.approveActivity('周末骑行活动');
      await activityAuditPage.page.waitForTimeout(1000); // 等待状态更新
      const newStatus = await activityAuditPage.getActivityStatus('周末骑行活动');
      expect(newStatus).toBe('已通过');
    }
  });

  test('应该能审核拒绝单个活动', async () => {
    const initialStatus = await activityAuditPage.getActivityStatus('周末骑行活动');
    if (initialStatus === '待审核') {
      await activityAuditPage.rejectActivity('周末骑行活动');
      await activityAuditPage.page.waitForTimeout(1000);
      const newStatus = await activityAuditPage.getActivityStatus('周末骑行活动');
      expect(newStatus).toBe('已拒绝');
    }
  });

  test('应该能批量选择活动', async () => {
    // 选择两个活动
    await activityAuditPage.selectActivityByTitle('周末骑行活动');
    await activityAuditPage.selectActivityByTitle('羽毛球活动');

    const selectedCount = await activityAuditPage.getSelectedCount();
    expect(selectedCount).toBe(2);
  });

  test('应该能批量审核通过活动', async () => {
    // 先选择两个待审核活动
    await activityAuditPage.selectActivityByTitle('周末骑行活动');
    await activityAuditPage.selectActivityByTitle('羽毛球活动');

    const selectedCount = await activityAuditPage.getSelectedCount();
    if (selectedCount > 0) {
      await activityAuditPage.batchApproveButton.click();
      await activityAuditPage.page.waitForTimeout(1000);

      // 检查选择已清空
      const newSelectedCount = await activityAuditPage.getSelectedCount();
      expect(newSelectedCount).toBe(0);
    }
  });

  test('应该能批量审核拒绝活动', async () => {
    await activityAuditPage.selectActivityByTitle('周末骑行活动');
    await activityAuditPage.selectActivityByTitle('羽毛球活动');

    const selectedCount = await activityAuditPage.getSelectedCount();
    if (selectedCount > 0) {
      await activityAuditPage.batchRejectButton.click();
      await activityAuditPage.page.waitForTimeout(1000);

      const newSelectedCount = await activityAuditPage.getSelectedCount();
      expect(newSelectedCount).toBe(0);
    }
  });

  test('应该能取消选择', async () => {
    // 先选择活动
    await activityAuditPage.selectActivityByTitle('周末骑行活动');
    const selectedCount = await activityAuditPage.getSelectedCount();
    expect(selectedCount).toBeGreaterThan(0);

    // 取消选择
    await activityAuditPage.clearSelection();
    const newSelectedCount = await activityAuditPage.getSelectedCount();
    expect(newSelectedCount).toBe(0);
  });

  test('只有待审核活动才能被选择和操作', async () => {
    // 检查已通过活动的操作按钮是否不可见
    const approvedActivityRow = activityAuditPage.page.locator('.ant-table-row:has-text("户外徒步")');
    const approveBtn = approvedActivityRow.getByRole('button', { name: '通过' });
    const rejectBtn = approvedActivityRow.getByRole('button', { name: '拒绝' });

    // 已通过的活动不应该有通过/拒绝按钮
    await expect(approveBtn).not.toBeVisible();
    await expect(rejectBtn).not.toBeVisible();
  });
});