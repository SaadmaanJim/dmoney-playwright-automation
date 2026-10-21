import { expect, type Locator, type Page } from '@playwright/test';
import type { AgentAccount } from '../utils/testData';

export class AdminUsersPage {
  private readonly userListLink: Locator;
  private readonly anyRow: Locator;
  private readonly searchInput: Locator;
  private readonly editUserButton: Locator;
  private readonly pendingStatusDropdown: Locator;
  private readonly activeOption: Locator;
  private readonly saveChangesButton: Locator;

  constructor(private readonly page: Page) {
    this.userListLink = page.getByRole('link', { name: 'User List' });
    this.anyRow = page.getByRole('row').first();
    this.searchInput = page.getByPlaceholder(/search/i).first();
    this.editUserButton = page.getByRole('button', { name: 'Edit User' });
    // The select shows its current value, so we find it by "Pending".
    this.pendingStatusDropdown = page.getByRole('combobox').filter({ hasText: 'Pending' });
    this.activeOption = page.getByRole('option', { name: 'Active' });
    this.saveChangesButton = page.getByRole('button', { name: 'Save Changes' });
  }

  private rowFor(agent: AgentAccount): Locator {
    return this.page.getByRole('row').filter({ hasText: agent.email });
  }

  async openUserList(): Promise<void> {
    await this.userListLink.click();
    await expect(this.anyRow).toBeVisible();
  }

 
  async searchAgent(agent: AgentAccount): Promise<void> {
    await expect(this.anyRow).toBeVisible(); 
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(agent.email);
    }
  }

  async showAgent(agent: AgentAccount): Promise<void> {
    await this.openUserList();
    await this.searchAgent(agent);
  }

  async expectAgentListed(agent: AgentAccount): Promise<void> {
    await expect(this.rowFor(agent)).toBeVisible();
  }

  
  async expectAgentPending(agent: AgentAccount): Promise<void> {
    await expect(this.rowFor(agent).getByText(/^pending$/i)).toBeVisible();
  }

  async expectAgentActive(agent: AgentAccount): Promise<void> {
    await expect(this.rowFor(agent).getByText(/^active$/i)).toBeVisible();
  }

  async activate(agent: AgentAccount): Promise<void> {
    await this.rowFor(agent).getByRole('button', { name: 'View' }).click();
    await this.editUserButton.click();
    await this.pendingStatusDropdown.click(); 
    await this.activeOption.click();
    await this.saveChangesButton.click();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }
}