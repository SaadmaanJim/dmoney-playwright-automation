import { test as base } from '@playwright/test';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { CashInPage } from '../pages/CashInPage';
import { LoginPage } from '../pages/LoginPage';
import { NavBar } from '../pages/NavBar';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { SelfStatementPage } from '../pages/SelfStatementPage';
import { SignUpPage } from '../pages/SignUpPage';

interface PageFixtures {
  signUpPage: SignUpPage;
  loginPage: LoginPage;
  adminUsersPage: AdminUsersPage;
  cashInPage: CashInPage;
  selfStatementPage: SelfStatementPage;
  navBar: NavBar;
  resetPasswordPage: ResetPasswordPage;
}

export const test = base.extend<PageFixtures>({
  signUpPage: async ({ page }, use) => use(new SignUpPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  adminUsersPage: async ({ page }, use) => use(new AdminUsersPage(page)),
  cashInPage: async ({ page }, use) => use(new CashInPage(page)),
  selfStatementPage: async ({ page }, use) => use(new SelfStatementPage(page)),
  navBar: async ({ page }, use) => use(new NavBar(page)),
  resetPasswordPage: async ({ page }, use) => use(new ResetPasswordPage(page)),
});

export { expect } from '@playwright/test';