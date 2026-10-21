import type { Locator, Page } from '@playwright/test';

export class NavBar {
  private readonly userMenuToggle: Locator;
  private readonly logoutMenuItem: Locator;

  constructor(private readonly page: Page) {
   
    this.userMenuToggle = page.getByTestId('KeyboardArrowDownIcon');
    this.logoutMenuItem = page.getByRole('menuitem', { name: '🚪 Logout' });
  }

  async logout(): Promise<void> {
    await this.userMenuToggle.click();
    await this.logoutMenuItem.click();
  }
}