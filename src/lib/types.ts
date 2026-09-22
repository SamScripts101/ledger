export type AccountId = string;

export interface Account {
  id: AccountId;
  name: string;
  archived?: boolean;
}

export interface Entry {
  id: number;
  amt: number;
  note: string;
  acct: AccountId;
  ex?: boolean;
}

export type MonthKey = string; // `${year}-${monthIndex}`

export interface Store {
  accounts: Account[];
  defaultBudgets: Record<AccountId, number>;
  budgets: Record<MonthKey, Record<AccountId, number>>;
  entries: Record<MonthKey, Entry[]>;
  currency: string;
  nextId: number;
}
