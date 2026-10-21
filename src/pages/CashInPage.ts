import { expect, type Locator, type Page } from '@playwright/test';

export class CashInPage {
  private readonly cashInLink: Locator;
  private readonly phoneInput: Locator;
  private readonly amountInput: Locator;
  private readonly submitButton: Locator;

  constructor(private readonly page: Page) {
    this.cashInLink = page.getByRole('link', { name: 'Cash In' });
    this.phoneInput = page.getByRole('textbox', { name: 'Customer Phone Number' });
    this.amountInput = page.getByRole('spinbutton', { name: 'Amount (BDT)' });
    this.submitButton = page.getByRole('button', { name: 'Cash In →' });
  }

  async open(): Promise<void> {
    await this.cashInLink.click();
  }

  async cashIn(receiverPhone: string, amountTk: number): Promise<void> {
    await this.phoneInput.fill(receiverPhone);
    await this.amountInput.fill(String(amountTk));
    await this.submitButton.click();
  }

  
  async expectCashInSuccess(): Promise<void> {
    await expect(this.page.getByText(/success/i).first()).toBeVisible();
  }
}