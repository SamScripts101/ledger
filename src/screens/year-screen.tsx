import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Header } from '@/components/ledger/header';
import { fmt, monthStats, MONTHS, totalDefaultBudget } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

interface YearScreenProps {
  y: number;
  onShiftYear: (delta: number) => void;
  onOpenMonth: (monthIndex: number) => void;
}

export function YearScreen({ y, onShiftYear, onOpenMonth }: YearScreenProps) {
  const { store } = useStore();
  const liveAccounts = store.accounts.filter((a) => !a.archived);
  const totalBudget = totalDefaultBudget(store);

  const stats = MONTHS.map((_, mi) => monthStats(store, y, mi));
  const monthsWithEntries = stats.filter((s) => s.count > 0).length;

  const yOut = stats.reduce((a, s) => a + s.out, 0);
  const yIn = stats.reduce((a, s) => a + s.inn, 0);
  const yearNet = yOut - yIn;

  return (
    <View style={styles.container}>
      <Header
        title={String(y)}
        subtitle={`${monthsWithEntries} months with entries`}
        onPrev={() => onShiftYear(-1)}
        onNext={() => onShiftYear(1)}
      />

      <View style={styles.tableHeader}>
        <Text style={styles.tableHeaderCell}>Month</Text>
        <Text style={[styles.tableHeaderCell, styles.right, styles.colNet]}>Net</Text>
        <Text style={[styles.tableHeaderCell, styles.right, styles.colVs]}>vs budget</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {MONTHS.map((name, mi) => {
          const s = stats[mi];
          const vs = totalBudget - s.net;
          const hasEntries = s.count > 0;
          return (
            <Pressable
              key={name}
              onPress={() => onOpenMonth(mi)}
              style={[styles.row, { opacity: hasEntries ? 1 : 0.45 }]}>
              <View style={styles.monthCol}>
                <Text style={styles.monthName}>{name}</Text>
                <Text style={styles.monthMeta}>
                  {hasEntries ? `${s.count} entries${s.exCount ? ` · ${s.exCount} held` : ''}` : 'no entries'}
                </Text>
              </View>
              <Text style={[styles.netCell, styles.colNet, { color: s.net < 0 ? colors.green : colors.ink }]}>
                {hasEntries ? fmt(s.net, store.currency) : '—'}
              </Text>
              <Text style={[styles.vsCell, styles.colVs, { color: vs < 0 ? colors.red : colors.muted45 }]}>
                {hasEntries ? (vs < 0 ? `over ${fmt(Math.abs(vs), store.currency)}` : fmt(vs, store.currency)) : ''}
              </Text>
            </Pressable>
          );
        })}

        <View style={styles.byAccountCard}>
          <Text style={styles.byAccountTitle}>By account {'·'} year</Text>
          {liveAccounts.map((a) => {
            const spent = MONTHS.reduce(
              (t, _, mi) => t + (store.entries[`${y}-${mi}`] ?? []).filter((e) => !e.ex && e.acct === a.id).reduce((q, e) => q + e.amt, 0),
              0,
            );
            const budget = (store.defaultBudgets[a.id] ?? 0) * 12;
            return (
              <View key={a.id} style={styles.byAccountRow}>
                <Text style={styles.byAccountName}>{a.name}</Text>
                <Text style={styles.byAccountSpent}>{fmt(spent, store.currency)}</Text>
                <Text style={styles.byAccountBudget}>of {fmt(budget, store.currency)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={[styles.footerAmount, { color: yearNet < 0 ? colors.green : colors.ink }]}>
          {fmt(yearNet, store.currency)}
        </Text>
        <View>
          <Text style={styles.footerLabel}>{yearNet < 0 ? `Net added in ${y}` : `Net spent in ${y}`}</Text>
          <Text style={styles.footerBreakdown}>
            {fmt(yOut, store.currency)} out {'·'} {fmt(yIn, store.currency)} in
          </Text>
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
  tableHeader: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineStrong,
  },
  tableHeaderCell: {
    flex: 1,
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted40,
  },
  colNet: {
    width: 88,
    flexGrow: 0,
    flexShrink: 0,
  },
  colVs: {
    width: 88,
    flexGrow: 0,
    flexShrink: 0,
  },
  right: {
    textAlign: 'right',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  monthCol: {
    flex: 1,
  },
  monthName: {
    fontFamily: fonts.sans500,
    fontSize: 14,
    color: colors.ink,
  },
  monthMeta: {
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    color: colors.muted40,
    marginTop: 2,
  },
  netCell: {
    fontFamily: fonts.mono500,
    fontSize: 14,
  },
  vsCell: {
    fontFamily: fonts.mono400,
    fontSize: 11.5,
  },
  byAccountCard: {
    marginTop: 16,
    marginBottom: 8,
    padding: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  byAccountTitle: {
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted45,
    marginBottom: 9,
  },
  byAccountRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 7,
  },
  byAccountName: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
  },
  byAccountSpent: {
    width: 78,
    textAlign: 'right',
    fontFamily: fonts.mono400,
    fontSize: 13,
    color: colors.ink,
  },
  byAccountBudget: {
    width: 78,
    textAlign: 'right',
    fontFamily: fonts.mono400,
    fontSize: 11,
    color: colors.muted45,
  },
  footer: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.hairlineStrong,
    backgroundColor: colors.pinned,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 18,
  },
  footerAmount: {
    fontFamily: fonts.mono500,
    fontSize: 22,
    letterSpacing: -0.44,
  },
  footerLabel: {
    fontFamily: fonts.sans500,
    fontSize: 13,
    color: colors.ink,
  },
  footerBreakdown: {
    fontFamily: fonts.mono400,
    fontSize: 10.5,
    color: colors.muted45,
    marginTop: 2,
  },
});
