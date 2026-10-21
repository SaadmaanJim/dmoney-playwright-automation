import { expect, type Locator, type Page } from '@playwright/test';

export class ResetPasswordPage {
  private readonly newPasswordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly resetButton: Locator;
  private readonly successMessage: Locator;

  constructor(private readonly page: Page) {
    this.newPasswordInput = page.getByLabel(/^New Password/).or(page.getByPlaceholder(/^New Password/));
    this.confirmPasswordInput = page
      .getByLabel(/^Confirm New Password/)
      .or(page.getByPlaceholder(/^Confirm New Password/));
    this.resetButton = page.getByRole('button', { name: /Reset Password/ });
    this.successMessage = page.getByText(/password has been reset successfully/i);
  }

 
  async open(resetPath: string): Promise<void> {
    await this.page.goto(resetPath);
  }

  async setNewPassword(password: string): Promise<void> {
    await this.newPasswordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.resetButton.click();
  }

  async expectResetSuccess(): Promise<void> {
    await expect(this.successMessage).toBeVisible();
  }
}