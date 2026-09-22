import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AccountCard } from '@/components/ledger/account-card';
import { EntryRow } from '@/components/ledger/entry-row';
import { Header } from '@/components/ledger/header';
import { accountName, budgetFor, entriesFor, fmt, MONTHS, parseAmount, totalMonthBudget } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';
import type { AccountId } from '@/lib/types';

interface LedgerScreenProps {
  y: number;
  m: number;
  onShiftMonth: (delta: number) => void;
}

export function LedgerScreen({ y, m, onShiftMonth }: LedgerScreenProps) {
  const { store, addEntry, toggleException, removeEntry, setMonthBudget } = useStore();
  const liveAccounts = store.accounts.filter((a) => !a.archived);

  const [acct, setAcct] = useState<'all' | AccountId>('all');
  const [draftAccount, setDraftAccount] = useState<AccountId>(liveAccounts[0]?.id ?? 'checking');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [exception, setException] = useState(false);

  const all = entriesFor(store, y, m);
  const posted = all.filter((e) => !e.ex);
  const shown = posted.filter((e) => acct === 'all' || e.acct === acct);
  const exceptions = all.filter((e) => e.ex && (acct === 'all' || e.acct === acct));

  const out = shown.filter((e) => e.amt > 0).reduce((a, e) => a + e.amt, 0);
  const inn = shown.filter((e) => e.amt < 0).reduce((a, e) => a - e.amt, 0);
  const net = out - inn;
  const totalBudget = totalMonthBudget(store, y, m);

  const entryWord = shown.length === 1 ? '1 entry' : `${shown.length} entries`;
  const subtitle = exceptions.length ? `${entryWord} · ${exceptions.length} held` : entryWord;

  function handleAdd() {
    const amt = parseAmount(amount);
    if (amt == null) return;
    addEntry(y, m, { amt, note: note.trim() || '—', acct: draftAccount, ex: exception });
    setAmount('');
    setNote('');
    setException(false);
  }

  function cycleAccount() {
    const idx = liveAccounts.findIndex((a) => a.id === draftAccount);
    setDraftAccount(liveAccounts[(idx + 1) % liveAccounts.length]?.id ?? draftAccount);
  }

  return (
    <View style={styles.container}>
      <Header
        title={`${MONTHS[m]} ${y}`}
        subtitle={subtitle}
        onPrev={() => onShiftMonth(-1)}
        onNext={() => onShiftMonth(1)}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cardsRow}
        style={styles.cardsScroll}>
        <AccountCard
          name="All accounts"
          selected={acct === 'all'}
          left={fmt(totalBudget - posted.reduce((t, e) => t + e.amt, 0), store.currency)}
          leftNegative={totalBudget - posted.reduce((t, e) => t + e.amt, 0) < 0}
          pct={totalBudget > 0 ? Math.max(0, Math.min(100, (posted.reduce((t, e) => t + e.amt, 0) / totalBudget) * 100)) : 0}
          budgetDisplay={totalBudget.toFixed(0)}
          editable={false}
          onSelect={() => setAcct('all')}
        />
        {liveAccounts.map((a) => {
          const bud = budgetFor(store, y, m, a.id);
          const spent = posted.filter((e) => e.acct === a.id).reduce((t, e) => t + e.amt, 0);
          const left = bud - spent;
          const pct = bud > 0 ? Math.max(0, Math.min(100, (spent / bud) * 100)) : 0;
          return (
            <AccountCard
              key={a.id}
              name={a.name}
              selected={acct === a.id}
              left={fmt(left, store.currency)}
              leftNegative={left < 0}
              pct={pct}
              budgetDisplay={String(bud)}
              editable
              onSelect={() => {
                setAcct(a.id);
                setDraftAccount(a.id);
              }}
              onBudgetChange={(text) => {
                const v = text.replace(/[^\d.]/g, '');
                setMonthBudget(y, m, a.id, Number(v) || 0);
              }}
            />
          );
        })}
      </ScrollView>

      <View style={styles.colHeaderRow}>
        <Text style={styles.colHeaderAmount}>Amount</Text>
        <Text style={styles.colHeaderItem}>Item</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {shown.map((e) => (
          <EntryRow
            key={e.id}
            amount={fmt(e.amt, store.currency)}
            negative={e.amt < 0}
            note={e.note}
            account={accountName(store, e.acct)}
            onToggleHold={() => toggleException(y, m, e.id)}
            onRemove={() => removeEntry(y, m, e.id)}
          />
        ))}

        {shown.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No entries in this account.{'\n'}Positive to spend, negative to add.</Text>
          </View>
        )}

        {exceptions.length > 0 && (
          <View style={styles.heldBlock}>
            <View style={styles.heldHeaderRow}>
              <Text style={styles.heldTitle}>{'⚑'} Held for follow-up</Text>
              <Text style={styles.heldNote}>excluded from totals</Text>
            </View>
            {exceptions.map((e) => (
              <EntryRow
                key={e.id}
                held
                amount={fmt(e.amt, store.currency)}
                negative={e.amt < 0}
                note={e.note}
                account={accountName(store, e.acct)}
                onToggleHold={() => toggleException(y, m, e.id)}
                onRemove={() => removeEntry(y, m, e.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.entryBarWrap}>
        <View style={styles.entryBarRow}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor="rgba(28,26,23,.32)"
            inputMode="decimal"
            onSubmitEditing={handleAdd}
            style={[styles.field, styles.amountField]}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Description"
            placeholderTextColor="rgba(28,26,23,.32)"
            onSubmitEditing={handleAdd}
            style={[styles.field, styles.noteField]}
          />
          <Pressable onPress={handleAdd} style={styles.addBtn}>
            <Text style={styles.addBtnGlyph}>+</Text>
          </Pressable>
        </View>
        <View style={styles.entryBarOptions}>
          <Pressable onPress={cycleAccount} style={styles.chip}>
            <Text style={styles.chipText}>{accountName(store, draftAccount)}</Text>
          </Pressable>
          <Pressable
            onPress={() => setException((v) => !v)}
            style={[styles.chip, exception && styles.chipArmed]}>
            <Text style={[styles.chipText, exception && styles.chipTextArmed]}>{'⚑'} Exception</Text>
          </Pressable>
          <Text style={styles.hint}>Enter to add</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={[styles.totalAmount, { color: net < 0 ? colors.green : colors.ink }]}>
            {fmt(net, store.currency)}
          </Text>
          <View>
            <Text style={styles.totalLabel}>{net < 0 ? 'Net added this month' : 'Net spent this month'}</Text>
            <Text style={styles.totalBreakdown}>
              {fmt(out, store.currency)} out {'·'} {fmt(inn, store.currency)} in
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.page,
  },
  cardsScroll: {
    flexGrow: 0,
  },
  cardsRow: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  colHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineStrong,
  },
  colHeaderAmount: {
    width: 96,
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.muted40,
  },
  colHeaderItem: {
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.muted40,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  empty: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13.5,
    color: colors.muted38,
    textAlign: 'center',
    lineHeight: 19,
  },
  heldBlock: {
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.hairlineDashed,
    borderRadius: 12,
    backgroundColor: colors.heldBg,
  },
  heldHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heldTitle: {
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    letterSpacing: 0.95,
    textTransform: 'uppercase',
    color: colors.muted45,
  },
  heldNote: {
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    color: colors.muted35,
  },
  entryBarWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.hairlineStrong,
    backgroundColor: colors.pinned,
  },
  entryBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 11,
  },
  field: {
    backgroundColor: colors.white,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    paddingVertical: 10,
    paddingHorizontal: 11,
    color: colors.ink,
  },
  amountField: {
    width: 96,
    fontFamily: fonts.mono400,
    fontSize: 15,
  },
  noteField: {
    flex: 1,
    fontSize: 14.5,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnGlyph: {
    color: colors.inkOnDark,
    fontSize: 19,
    lineHeight: 21,
  },
  entryBarOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingTop: 9,
    paddingBottom: 11,
  },
  chip: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.fill,
  },
  chipArmed: {
    backgroundColor: colors.ink,
  },
  chipText: {
    fontFamily: fonts.mono400,
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  chipTextArmed: {
    color: colors.inkOnDark,
  },
  hint: {
    marginLeft: 'auto',
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    color: colors.muted35,
  },
  totalRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.fieldBorder,
    paddingHorizontal: 20,
    paddingTop: 13,
    paddingBottom: 16,
    alignItems: 'center',
  },
  totalAmount: {
    minWidth: 96,
    fontFamily: fonts.mono500,
    fontSize: 22,
    letterSpacing: -0.44,
  },
  totalLabel: {
    fontFamily: fonts.sans500,
    fontSize: 13,
    color: colors.ink,
  },
  totalBreakdown: {
    fontFamily: fonts.mono400,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.muted45,
    marginTop: 2,
  },
});
