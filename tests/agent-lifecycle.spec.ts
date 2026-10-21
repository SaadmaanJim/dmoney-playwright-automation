import { promises as fs } from 'fs';
import path from 'path';
import { test, expect } from '../src/fixtures';
import { env } from '../src/config/env';
import {
  AGENT_BALANCE_AFTER_CUSTOMER_DEPOSIT_TK,
  AGENT_TO_CUSTOMER_TK,
  OUTPUT_DIR,
  SYSTEM_DEPOSIT_TK,
} from '../src/config/constants';
import { writeCsv } from '../src/utils/csv';
import { todayIso } from '../src/utils/date';
import { amountPattern } from '../src/utils/money';
import { countResetLinks, waitForNewResetLink } from '../src/utils/resetLink';
import { buildAgent, buildNewPassword } from '../src/utils/testData';
import type { StatementData } from '../src/pages/SelfStatementPage';

const SMOKE = { tag: '@smoke' };

test.describe('DMoney agent lifecycle', () => {
  
  test.describe.configure({ mode: 'serial' });

  const agent = buildAgent(env.gmail.address);
  const newPassword = buildNewPassword();
  let currentPassword = agent.password; // becomes newPassword after the reset (#16)
  const agentCredentials = () => ({ email: agent.email, password: currentPassword });
  let statement: StatementData;

  test('#1 Agent registration is successful', SMOKE, async ({ signUpPage }) => {
    await signUpPage.goto();
    await signUpPage.registerAgent(agent);
    await signUpPage.expectRegistrationSuccess();
  });

  test('#3 Admin login is successful', SMOKE, async ({ loginPage }) => {
    await loginPage.login(env.admin);
    await loginPage.expectLoginSuccess();
  });

  test.describe('as Admin', () => {
    
    test.beforeEach(async ({ loginPage, adminUsersPage }) => {
      await loginPage.login(env.admin);
      await loginPage.expectLoginSuccess();
      await adminUsersPage.showAgent(agent);
    });

    test('#4 New agent appears in the Admin user list', SMOKE, async ({ adminUsersPage }) => {
      await adminUsersPage.expectAgentListed(agent);
    });

    test('#2 New agent is initially inactive (Pending)', SMOKE, async ({ adminUsersPage }) => {
      await adminUsersPage.expectAgentPending(agent);
    });

    test('#5 Admin can activate the agent', SMOKE, async ({ adminUsersPage }) => {
      await adminUsersPage.activate(agent);
      await adminUsersPage.showAgent(agent);
      await adminUsersPage.expectAgentActive(agent);
    });

    test('#6 Agent remains active after page reload', SMOKE, async ({ adminUsersPage }) => {
      await adminUsersPage.reload();
      await adminUsersPage.searchAgent(agent);
      await adminUsersPage.expectAgentActive(agent);
    });
  });

  test('#7 System login is successful', SMOKE, async ({ loginPage }) => {
    await loginPage.login(env.system);
    await loginPage.expectLoginSuccess();
  });

  test.describe('as System', () => {
    test.beforeEach(async ({ loginPage }) => {
      await loginPage.login(env.system);
      await loginPage.expectLoginSuccess();
    });

    test(`#8 System can deposit ${SYSTEM_DEPOSIT_TK} Tk to the agent`, SMOKE, async ({ cashInPage }) => {
      await cashInPage.open();
      await cashInPage.cashIn(agent.phone, SYSTEM_DEPOSIT_TK);
      await cashInPage.expectCashInSuccess();
    });

    test('#9 System deposit creates the correct transaction record', SMOKE, async ({ selfStatementPage }) => {
      await selfStatementPage.open();
      await selfStatementPage.filterByDate(todayIso());
      await selfStatementPage.expectTransaction({
        sender: 'SYSTEM',
        receiverPhone: agent.phone,
        amountTk: SYSTEM_DEPOSIT_TK,
      });
    });
  });

  test('#10 Agent can log in after activation', SMOKE, async ({ loginPage }) => {
    await loginPage.loginWithOtp(agentCredentials());
    await loginPage.expectLoginSuccess();
  });

  test.describe('as Agent', () => {
    test.beforeEach(async ({ loginPage }) => {
      await loginPage.loginWithOtp(agentCredentials());
      await loginPage.expectLoginSuccess();
    });

    test(`#11 Agent balance is exactly ${SYSTEM_DEPOSIT_TK} Tk`, SMOKE, async ({ selfStatementPage }) => {
      await selfStatementPage.open();
      await selfStatementPage.expectCurrentBalance(SYSTEM_DEPOSIT_TK);
    });

    test(
      `#12 Agent can deposit ${AGENT_TO_CUSTOMER_TK} Tk to an existing customer`,
      SMOKE,
      async ({ cashInPage }) => {
        await cashInPage.open();
        await cashInPage.cashIn(env.customerPhone, AGENT_TO_CUSTOMER_TK);
        await cashInPage.expectCashInSuccess();
      },
    );

    test('#13 Agent balance is updated after the transaction', SMOKE, async ({ selfStatementPage }) => {
      await selfStatementPage.open();
      await selfStatementPage.expectCurrentBalance(AGENT_BALANCE_AFTER_CUSTOMER_DEPOSIT_TK);
    });

    test('#14 Customer deposit appears in the Agent Self Statement', SMOKE, async ({ selfStatementPage }) => {
      await selfStatementPage.open();
      await selfStatementPage.filterByDate(todayIso());
      await selfStatementPage.expectTransaction({
        sender: agent.phone,
        receiverPhone: env.customerPhone,
        amountTk: AGENT_TO_CUSTOMER_TK,
      });
    });

    test('#15 Agent logout works', SMOKE, async ({ navBar, loginPage }) => {
      await navBar.logout();
      await loginPage.expectLoggedOut();
    });
  });

  test.describe('password reset', () => {
    test('#16 Agent password reset works successfully', SMOKE, async ({ loginPage, resetPasswordPage }) => {
      // The portal only prints the reset link in the API log (its email sending fails).
      const linksBefore = await countResetLinks(env.apiLogPath, agent.email);
      await loginPage.requestPasswordReset(agent.email);
      await loginPage.expectResetLinkSent();

      const resetPath = await waitForNewResetLink(env.apiLogPath, agent.email, linksBefore);
      await resetPasswordPage.open(resetPath);
      await resetPasswordPage.setNewPassword(newPassword);
      await resetPasswordPage.expectResetSuccess();
      currentPassword = newPassword;
    });

    // Negative test: deliberately not tagged @smoke.
    test('#17 Login with the old password fails after reset', async ({ loginPage }) => {
      await loginPage.login({ email: agent.email, password: agent.password });
      await loginPage.expectLoginRejected();
    });

    test('#18 Login with the new password succeeds', SMOKE, async ({ loginPage }) => {
      await loginPage.loginWithOtp(agentCredentials());
      await loginPage.expectLoginSuccess();
    });
  });

  test.describe('self statement export', () => {
    test.beforeEach(async ({ loginPage, selfStatementPage }) => {
      await loginPage.loginWithOtp(agentCredentials());
      await loginPage.expectLoginSuccess();
      await selfStatementPage.open();
      await selfStatementPage.filterByDate(todayIso());
    });

    test('#19 Self Statement contains the expected transaction data', SMOKE, async ({ selfStatementPage }) => {
      statement = await selfStatementPage.extractAll();

      expect(statement.headers.length, 'table has headers').toBeGreaterThan(0);
      const rowTexts = statement.rows.map((row) => row.join(' '));
      const hasSystemDeposit = rowTexts.some(
        (text) => text.includes('SYSTEM') && amountPattern(SYSTEM_DEPOSIT_TK).test(text),
      );
      const hasCustomerDeposit = rowTexts.some(
        (text) => text.includes(env.customerPhone) && amountPattern(AGENT_TO_CUSTOMER_TK).test(text),
      );
      expect(hasSystemDeposit, 'the 2000 Tk system deposit is listed').toBe(true);
      expect(hasCustomerDeposit, 'the 500 Tk customer deposit is listed').toBe(true);
    });
  });

  test('#20 Self Statement data is saved to the required CSV file', SMOKE, async () => {
    expect(statement, 'test #19 must run first to extract the data').toBeDefined();

    const filePath = path.join(OUTPUT_DIR, `self_statement_${todayIso()}.csv`);
    await writeCsv(filePath, statement.headers, statement.rows);

    const savedLines = (await fs.readFile(filePath, 'utf8')).trim().split('\n');
    expect(savedLines[0]).toContain(statement.headers[0]);
    expect(savedLines, 'one line per row plus the header').toHaveLength(statement.rows.length + 1);
  });
});