export const SYSTEM_DEPOSIT_TK = 2000;
export const AGENT_TO_CUSTOMER_TK = 500;

// The API docs (Swagger) list a commission on cash-in: 12.5 Tk for a 500 Tk deposit.
export const AGENT_CASH_IN_COMMISSION_TK = 12.5;

export const AGENT_BALANCE_AFTER_CUSTOMER_DEPOSIT_TK =
  SYSTEM_DEPOSIT_TK - AGENT_TO_CUSTOMER_TK + AGENT_CASH_IN_COMMISSION_TK;

export const OUTPUT_DIR = 'output';