import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { UserManagementPage } from './pages/user-management.page';
import { ActivityAuditPage } from './pages/activity-audit.page';
import { RealNameAuthPage } from './pages/realname-auth.page';

// 声明自定义fixture类型
interface TestFixtures {
  loginPage: LoginPage;
  userManagementPage: UserManagementPage;
  activityAuditPage: ActivityAuditPage;
  realNameAuthPage: RealNameAuthPage;
  loggedInPage: any; // 已登录的页面对象
}

// 扩展基础test fixture
export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  userManagementPage: async ({ page }, use) => {
    const userManagementPage = new UserManagementPage(page);
    await use(userManagementPage);
  },

  activityAuditPage: async ({ page }, use) => {
    const activityAuditPage = new ActivityAuditPage(page);
    await use(activityAuditPage);
  },

  realNameAuthPage: async ({ page }, use) => {
    const realNameAuthPage = new RealNameAuthPage(page);
    await use(realNameAuthPage);
  },

  // 已登录状态的fixture
  loggedInPage: async ({ page, loginPage }, use) => {
    // 自动登录
    await loginPage.goto();
    await loginPage.login('admin', 'admin123');
    await loginPage.expectLoginSuccess();
    await use(page);
  },
});

export { expect } from '@playwright/test';