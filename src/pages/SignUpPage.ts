import { expect, type Locator, type Page } from '@playwright/test';
import type { AgentAccount } from '../utils/testData';

export class SignUpPage {
  private readonly signUpLink: Locator;
  private readonly fullNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly phoneInput: Locator;
  private readonly nidInput: Locator;
  private readonly roleDropdown: Locator;
  private readonly agentRoleOption: Locator;
  private readonly createAccountButton: Locator;

  constructor(private readonly page: Page) {
    this.signUpLink = page.getByRole('banner').getByRole('link', { name: 'Sign Up' });
    this.fullNameInput = page.getByRole('textbox', { name: 'Full Name' });
    this.emailInput = page.getByRole('textbox', { name: 'Email Address' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.phoneInput = page.getByRole('textbox', { name: 'Phone Number' });
    this.nidInput = page.getByRole('textbox', { name: 'National ID (NID)' });
    this.roleDropdown = page.getByRole('combobox');
    this.agentRoleOption = page.getByRole('option', { name: /Agent/ });
    this.createAccountButton = page.getByRole('button', { name: 'Create Account →' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.signUpLink.click();
  }

  async selectAgentRole(): Promise<void> {
    await this.roleDropdown.click(); 
    await this.agentRoleOption.click();
    await expect(this.roleDropdown).toContainText('Agent');
  }

  async registerAgent(agent: AgentAccount): Promise<void> {
    await this.fullNameInput.fill(agent.fullName);
    await this.emailInput.fill(agent.email);
    await this.passwordInput.fill(agent.password);
    await this.phoneInput.fill(agent.phone);
    await this.nidInput.fill(agent.nid);
    await this.selectAgentRole();
    await this.createAccountButton.click();
  }
async expectRegistrationSuccess(): Promise<void> {
    await expect(this.page.getByText(/approval/i).first()).toBeVisible();
  
}
}