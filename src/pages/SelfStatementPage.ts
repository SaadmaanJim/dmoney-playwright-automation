import { expect, type Locator, type Page } from '@playwright/test';
import { amountPattern, parseTk } from '../utils/money';

const MAX_STATEMENT_PAGES = 50; 
const PAGE_SETTLE_MS = 3_000;
const BALANCE_SETTLE_MS = 10_000;
const TRANSACTION_ID_COLUMN = 0;

export interface StatementData {
  headers: string[];
  rows: string[][];
}

interface TransactionCriteria {
  sender: string;
  receiverPhone: string;
  amountTk: number;
}

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim();

export class SelfStatementPage {
  private readonly selfStatementLink: Locator;
  private readonly fromDateInput: Locator;
  private readonly toDateInput: Locator;
  private readonly dateRangeSummary: Locator;
  private readonly currentBalance: Locator;
  private readonly table: Locator;
  private readonly transactionRows: Locator;
  private readonly nextPageButton: Locator;

  constructor(private readonly page: Page) {
    this.selfStatementLink = page.getByRole('link', { name: 'Self Statement' });
    this.fromDateInput = page.getByRole('textbox', { name: 'From Date' });
    this.toDateInput = page.getByRole('textbox', { name: 'To Date' });
    this.dateRangeSummary = page.getByText(/Showing \d+ of \d+ total/);
    this.currentBalance = page.getByText(/Current Balance/i);
    this.table = page.getByRole('table');
    // The empty state is also a row ("No transactions found..."), so exclude it.
    this.transactionRows = this.table
      .getByRole('row')
      .filter({ has: page.getByRole('cell') })
      .filter({ hasNotText: /no transactions found/i });
    this.nextPageButton = page.getByRole('button', { name: /next page/i });
  }

  async open(): Promise<void> {
    await this.selfStatementLink.click();
    await expect(this.table).toBeVisible();
  }

  /** Dates are YYYY-MM-DD. The portal only lists transactions inside this range. */
  async filterByDate(fromIso: string, toIso: string = fromIso): Promise<void> {
    await this.fromDateInput.fill(fromIso);
    await this.toDateInput.fill(toIso);
    await expect(this.dateRangeSummary).toContainText(`from ${fromIso} to ${toIso}`);
  }

  async expectCurrentBalance(expectedTk: number): Promise<void> {
    await expect(async () => {
      expect(parseTk(await this.currentBalance.innerText())).toBe(expectedTk);
    }).toPass({ timeout: BALANCE_SETTLE_MS });
  }

  /** Looks through every page, because rows are oldest-first and 20 fit per page. */
  async expectTransaction(criteria: TransactionCriteria): Promise<void> {
    const matches = this.rowsMatching(criteria);
    for (let pageNumber = 0; pageNumber < MAX_STATEMENT_PAGES; pageNumber++) {
      const foundOnThisPage = await matches
        .first()
        .waitFor({ state: 'visible', timeout: PAGE_SETTLE_MS })
        .then(() => true, () => false);
      if (foundOnThisPage) {
        await expect(matches, 'transaction should be listed exactly once').toHaveCount(1);
        return;
      }
      if (!(await this.goToNextPage())) {
        break;
      }
    }
    await expect(matches, 'transaction record not found on any page').toHaveCount(1);
  }

  /** Reads the whole table (all pages). Rows are de-duplicated by Transaction ID. */
  async extractAll(): Promise<StatementData> {
    await expect(this.transactionRows.first()).toBeVisible();
    const headers = (await this.table.getByRole('columnheader').allInnerTexts()).map(normalize);
    const rowsById = new Map<string, string[]>();
    for (let pageNumber = 0; pageNumber < MAX_STATEMENT_PAGES; pageNumber++) {
      for (const row of await this.readVisibleRows()) {
        rowsById.set(row[TRANSACTION_ID_COLUMN], row);
      }
      if (!(await this.goToNextPage())) {
        break;
      }
    }
    return { headers, rows: Array.from(rowsById.values()) };
  }

  private rowsMatching({ sender, receiverPhone, amountTk }: TransactionCriteria): Locator {
    return this.transactionRows
      .filter({ hasText: sender })
      .filter({ hasText: receiverPhone })
      .filter({ hasText: amountPattern(amountTk) });
  }

  private async readVisibleRows(): Promise<string[][]> {
    const rowCount = await this.transactionRows.count();
    const rows: string[][] = [];
    for (let index = 0; index < rowCount; index++) {
      const cells = await this.transactionRows.nth(index).getByRole('cell').allInnerTexts();
      rows.push(cells.map(normalize));
    }
    return rows;
  }

  private async firstRowText(): Promise<string> {
    return (await this.transactionRows.allInnerTexts())[0] ?? '';
  }

  /** Returns false when there is no further page, or when clicking did not change the table. */
  private async goToNextPage(): Promise<boolean> {
    if ((await this.nextPageButton.count()) === 0 || !(await this.nextPageButton.isEnabled())) {
      return false;
    }
    const firstRowBefore = await this.firstRowText();
    await this.nextPageButton.click();
    try {
      await expect.poll(() => this.firstRowText(), { timeout: PAGE_SETTLE_MS }).not.toBe(firstRowBefore);
      return true;
    } catch {
      return false;
    }
  }
}