import { expect, type Locator, type Page } from '@playwright/test';
import type { Credentials } from '../config/env';
import { latestMailUid, waitForOtp } from '../utils/otp';

const LOGIN_REDIRECT_TIMEOUT_MS = 30_000; // 

export class LoginPage {
  private readonly loginLink: Locator;
  private readonly identifierInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly otpInput: Locator;
  private readonly verifyOtpButton: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly sendResetLinkButton: Locator;
  private readonly goToLoginButton: Locator;
  private readonly loginFailedMessage: Locator;

  constructor(private readonly page: Page) {
    this.loginLink = page.getByRole('banner').getByRole('link', { name: 'Login' });
    this.identifierInput = page.getByRole('textbox', { name: 'Email or Phone Number' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.loginButton = page.getByRole('button', { name: 'Login →' });
    this.otpInput = page.getByRole('textbox', { name: 'Enter 4-Digit OTP' });
    this.verifyOtpButton = page.getByRole('button', { name: 'Verify OTP →' });
    this.forgotPasswordLink = page.getByText('Forgot password?');
    this.sendResetLinkButton = page.getByRole('button', { name: 'Send Reset Link →' });
    this.goToLoginButton = page.getByText(/go to login/i);
    this.loginFailedMessage = page.getByText(/Login failed/i);
  }

 
  async login({ email, password }: Credentials): Promise<void> {
    await this.page.goto('/');
    await this.loginLink.click();
    await this.identifierInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

 
  async loginWithOtp(credentials: Credentials): Promise<void> {
    const lastSeenMailUid = await latestMailUid(credentials.email);
    await this.login(credentials);
    const otp = await waitForOtp(credentials.email, lastSeenMailUid);
    await this.otpInput.fill(otp);
    await this.verifyOtpButton.click();
  }

     async requestPasswordReset(email: string): Promise<void> {
    await this.page.goto('/');
    await this.loginLink.click();
    await this.forgotPasswordLink.click();

    // Wait until the Forgot Password page is really shown before typing.
    await expect(this.page.getByText(/send you a reset link/i)).toBeVisible();

    await expect(async () => {
      await this.identifierInput.fill(email);
      await expect(this.identifierInput).toHaveValue(email);
    }).toPass({ timeout: 10_000 });

    await this.sendResetLinkButton.click();
  }

  async expectResetLinkSent(): Promise<void> {
    await expect(this.goToLoginButton).toBeVisible();
  }

 
  async expectLoginSuccess(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/login/, { timeout: LOGIN_REDIRECT_TIMEOUT_MS });
  }

  async expectLoginRejected(): Promise<void> {
    await expect(this.loginFailedMessage).toBeVisible();
    await expect(this.page).toHaveURL(/\/login/);
  }

  async expectLoggedOut(): Promise<void> {
    await expect(this.identifierInput).toBeVisible();
  }
}