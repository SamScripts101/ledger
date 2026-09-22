import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { monthKey } from './logic';
import type { Account, AccountId, Entry, Store } from './types';

const STORAGE_KEY = 'ledger-store-v1';

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'checking', name: 'Checking' },
  { id: 'cash', name: 'Cash' },
  { id: 'card', name: 'Card' },
];

const DEFAULT_BUDGETS: Record<AccountId, number> = { checking: 2400, cash: 300, card: 900 };

function seedStore(): Store {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const prevM = m === 0 ? 11 : m - 1;
  const prevY = m === 0 ? y - 1 : y;
  return {
    accounts: DEFAULT_ACCOUNTS,
    defaultBudgets: DEFAULT_BUDGETS,
    budgets: {},
    currency: '$',
    nextId: 9,
    entries: {
      [monthKey(y, m)]: [
        { id: 1, amt: 62.4, note: 'Groceries — Saturday market', acct: 'cash' },
        { id: 2, amt: 14, note: 'Coffee beans', acct: 'cash' },
        { id: 3, amt: -1850, note: 'Paycheck', acct: 'checking' },
        { id: 4, amt: 38.9, note: 'Train ticket', acct: 'card' },
        { id: 5, amt: 120, note: 'Electricity bill', acct: 'checking' },
        { id: 6, amt: 249, note: 'Conference ticket — reimbursable?', acct: 'card', ex: true },
      ],
      [monthKey(prevY, prevM)]: [
        { id: 7, amt: 410.2, note: 'Rent share', acct: 'checking' },
        { id: 8, amt: -1850, note: 'Paycheck', acct: 'checking' },
      ],
    },
  };
}

function emptyStore(): Store {
  return {
    accounts: DEFAULT_ACCOUNTS,
    defaultBudgets: DEFAULT_BUDGETS,
    budgets: {},
    entries: {},
    currency: '$',
    nextId: 1,
  };
}

interface StoreContextValue {
  store: Store;
  hydrated: boolean;
  addEntry: (y: number, m: number, entry: Omit<Entry, 'id'>) => void;
  toggleException: (y: number, m: number, id: number) => void;
  removeEntry: (y: number, m: number, id: number) => void;
  setMonthBudget: (y: number, m: number, acctId: AccountId, value: number) => void;
  setDefaultBudget: (acctId: AccountId, value: number) => void;
  applyDefaultsToMonth: (y: number, m: number) => void;
  addAccount: (name: string) => void;
  renameAccount: (id: AccountId, name: string) => void;
  toggleArchiveAccount: (id: AccountId) => void;
  moveAccount: (id: AccountId, dir: -1 | 1) => void;
  deleteAccount: (id: AccountId) => boolean;
  setCurrency: (symbol: string) => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store>(seedStore);
  const [hydrated, setHydrated] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setStore(JSON.parse(raw));
      } finally {
        loadedRef.current = true;
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store)).catch(() => {});
  }, [store]);

  const addEntry = useCallback((y: number, m: number, entry: Omit<Entry, 'id'>) => {
    setStore((s) => {
      const key = monthKey(y, m);
      const e: Entry = { ...entry, id: s.nextId };
      return {
        ...s,
        nextId: s.nextId + 1,
        entries: { ...s.entries, [key]: [...(s.entries[key] ?? []), e] },
      };
    });
  }, []);

  const patchEntries = useCallback((y: number, m: number, fn: (list: Entry[]) => Entry[]) => {
    setStore((s) => {
      const key = monthKey(y, m);
      return { ...s, entries: { ...s.entries, [key]: fn(s.entries[key] ?? []) } };
    });
  }, []);

  const toggleException = useCallback(
    (y: number, m: number, id: number) =>
      patchEntries(y, m, (list) => list.map((e) => (e.id === id ? { ...e, ex: !e.ex } : e))),
    [patchEntries],
  );

  const removeEntry = useCallback(
    (y: number, m: number, id: number) => patchEntries(y, m, (list) => list.filter((e) => e.id !== id)),
    [patchEntries],
  );

  const setMonthBudget = useCallback((y: number, m: number, acctId: AccountId, value: number) => {
    setStore((s) => {
      const key = monthKey(y, m);
      return { ...s, budgets: { ...s.budgets, [key]: { ...(s.budgets[key] ?? {}), [acctId]: value } } };
    });
  }, []);

  const setDefaultBudget = useCallback((acctId: AccountId, value: number) => {
    setStore((s) => ({ ...s, defaultBudgets: { ...s.defaultBudgets, [acctId]: value } }));
  }, []);

  const applyDefaultsToMonth = useCallback((y: number, m: number) => {
    setStore((s) => {
      const key = monthKey(y, m);
      const next: Record<AccountId, number> = {};
      s.accounts.forEach((a) => {
        next[a.id] = Number(s.defaultBudgets[a.id]) || 0;
      });
      return { ...s, budgets: { ...s.budgets, [key]: next } };
    });
  }, []);

  const addAccount = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStore((s) => {
      const id = `${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
      return {
        ...s,
        accounts: [...s.accounts, { id, name: trimmed }],
        defaultBudgets: { ...s.defaultBudgets, [id]: 0 },
      };
    });
  }, []);

  const renameAccount = useCallback((id: AccountId, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStore((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, name: trimmed } : a)),
    }));
  }, []);

  const toggleArchiveAccount = useCallback((id: AccountId) => {
    setStore((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, archived: !a.archived } : a)),
    }));
  }, []);

  const moveAccount = useCallback((id: AccountId, dir: -1 | 1) => {
    setStore((s) => {
      const idx = s.accounts.findIndex((a) => a.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= s.accounts.length) return s;
      const accounts = s.accounts.slice();
      [accounts[idx], accounts[target]] = [accounts[target], accounts[idx]];
      return { ...s, accounts };
    });
  }, []);

  const deleteAccount = useCallback(
    (id: AccountId) => {
      const hasEntries = Object.values(store.entries).some((list) => list.some((e) => e.acct === id));
      if (hasEntries) return false;
      setStore((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));
      return true;
    },
    [store.entries],
  );

  const setCurrency = useCallback((symbol: string) => {
    setStore((s) => ({ ...s, currency: symbol }));
  }, []);

  const resetAll = useCallback(() => {
    setStore(emptyStore());
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      store,
      hydrated,
      addEntry,
      toggleException,
      removeEntry,
      setMonthBudget,
      setDefaultBudget,
      applyDefaultsToMonth,
      addAccount,
      renameAccount,
      toggleArchiveAccount,
      moveAccount,
      deleteAccount,
      setCurrency,
      resetAll,
    }),
    [
      store,
      hydrated,
      addEntry,
      toggleException,
      removeEntry,
      setMonthBudget,
      setDefaultBudget,
      applyDefaultsToMonth,
      addAccount,
      renameAccount,
      toggleArchiveAccount,
      moveAccount,
      deleteAccount,
      setCurrency,
      resetAll,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
