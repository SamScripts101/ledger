import type { AccountId, Entry, MonthKey, Store } from './types';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function monthKey(y: number, m: number): MonthKey {
  return `${y}-${m}`;
}

export function entriesFor(store: Store, y: number, m: number): Entry[] {
  return store.entries[monthKey(y, m)] ?? [];
}

export function budgetFor(store: Store, y: number, m: number, acctId: AccountId): number {
  const perMonth = store.budgets[monthKey(y, m)]?.[acctId];
  if (perMonth != null) return Number(perMonth) || 0;
  return Number(store.defaultBudgets[acctId]) || 0;
}

export function accountName(store: Store, id: AccountId): string {
  return store.accounts.find((a) => a.id === id)?.name ?? '—';
}

export function fmt(n: number, currency: string): string {
  return (n < 0 ? '−' : '') + currency + Math.abs(n).toFixed(2);
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (!cleaned) return null;
  const amt = parseFloat(cleaned);
  if (isNaN(amt) || amt === 0) return null;
  return amt;
}

export interface MonthStats {
  out: number;
  inn: number;
  net: number;
  count: number;
  exCount: number;
}

// posted = entries where ex !== true; ignores account filter.
export function monthStats(store: Store, y: number, m: number): MonthStats {
  const all = entriesFor(store, y, m);
  const posted = all.filter((e) => !e.ex);
  const out = posted.filter((e) => e.amt > 0).reduce((a, e) => a + e.amt, 0);
  const inn = posted.filter((e) => e.amt < 0).reduce((a, e) => a - e.amt, 0);
  return { out, inn, net: out - inn, count: all.length, exCount: all.filter((e) => e.ex).length };
}

export function totalDefaultBudget(store: Store): number {
  return store.accounts.reduce((a, acct) => a + (Number(store.defaultBudgets[acct.id]) || 0), 0);
}

export function totalMonthBudget(store: Store, y: number, m: number): number {
  return store.accounts.reduce((a, acct) => a + budgetFor(store, y, m, acct.id), 0);
}

export interface CsvOptions {
  scope: 'month' | 'year';
  y: number;
  m: number;
  includeEx: boolean;
}

export function buildCsv(store: Store, opts: CsvOptions): string {
  const cur = store.currency;
  const head = ['Month', `Amount (${cur})`, 'Description', 'Account', 'Account budget', 'Status'];
  const lines = [head.join(',')];
  const months = opts.scope === 'year' ? MONTHS.map((_, i) => i) : [opts.m];
  months.forEach((mi) => {
    entriesFor(store, opts.y, mi).forEach((e) => {
      if (e.ex && !opts.includeEx) return;
      lines.push([
        `${SHORT[mi]} ${opts.y}`,
        e.amt.toFixed(2),
        `"${e.note.replace(/"/g, '""')}"`,
        accountName(store, e.acct),
        budgetFor(store, opts.y, mi, e.acct).toFixed(2),
        e.ex ? 'EXCEPTION — follow up' : 'Posted',
      ].join(','));
    });
  });
  return lines.join('\n');
}

export function csvFilename(opts: { scope: 'month' | 'year'; y: number; m: number }): string {
  return opts.scope === 'year'
    ? `ledger-${opts.y}.csv`
    : `ledger-${SHORT[opts.m].toLowerCase()}-${opts.y}.csv`;
}
