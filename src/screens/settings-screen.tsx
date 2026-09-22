import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shareCsvFile } from '@/lib/export';
import { accountName, MONTHS } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

interface SettingsScreenProps {
  visible: boolean;
  y: number;
  m: number;
  onClose: () => void;
}

const CURRENCIES = ['$', '£', '€'];

export function SettingsScreen({ visible, y, m, onClose }: SettingsScreenProps) {
  const {
    store,
    setDefaultBudget,
    applyDefaultsToMonth,
    addAccount,
    renameAccount,
    toggleArchiveAccount,
    moveAccount,
    deleteAccount,
    setCurrency,
    resetAll,
  } = useStore();
  const insets = useSafeAreaInsets();
  const [newAccountName, setNewAccountName] = useState('');

  function handleDelete(id: string) {
    const ok = deleteAccount(id);
    if (!ok) {
      Alert.alert(
        'Has history',
        `${accountName(store, id)} has entries, so it can't be deleted. Archive it instead to keep the history but hide it going forward?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Archive', style: 'destructive', onPress: () => toggleArchiveAccount(id) },
        ],
      );
    }
  }

  function handleReset() {
    Alert.alert('Reset all data', 'This deletes every entry, budget and account permanently. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetAll },
    ]);
  }

  async function handleExportEverything() {
    const cur = store.currency;
    const head = ['Month', `Amount (${cur})`, 'Description', 'Account', 'Account budget', 'Status'];
    const lines = [head.join(',')];
    Object.keys(store.entries)
      .sort()
      .forEach((key) => {
        const [yy, mm] = key.split('-').map(Number);
        (store.entries[key] ?? []).forEach((e) => {
          const bud = store.budgets[key]?.[e.acct] ?? store.defaultBudgets[e.acct] ?? 0;
          lines.push(
            [
              `${MONTHS[mm].slice(0, 3)} ${yy}`,
              e.amt.toFixed(2),
              `"${e.note.replace(/"/g, '""')}"`,
              accountName(store, e.acct),
              Number(bud).toFixed(2),
              e.ex ? 'EXCEPTION — follow up' : 'Posted',
            ].join(','),
          );
        });
      });
    const csv = lines.join('\n');
    await shareCsvFile(csv, 'ledger-everything.csv');
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Feather name="x" size={18} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Default monthly budgets</Text>
            {store.accounts.map((a) => (
              <View key={a.id} style={styles.budgetRow}>
                <Text style={styles.rowName}>{a.name}</Text>
                <TextInput
                  value={String(store.defaultBudgets[a.id] ?? 0)}
                  onChangeText={(t) => setDefaultBudget(a.id, Number(t.replace(/[^\d.]/g, '')) || 0)}
                  inputMode="decimal"
                  style={styles.budgetField}
                />
              </View>
            ))}
            <Text style={styles.footnote}>
              New months start from these. Tap a budget on the Ledger to change just that month.
            </Text>
            <Pressable onPress={() => applyDefaultsToMonth(y, m)} style={styles.textBtn}>
              <Text style={styles.textBtnLabel}>Apply defaults to {MONTHS[m]} {y}</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Accounts</Text>
            {store.accounts.map((a, idx) => (
              <View key={a.id} style={[styles.acctRow, a.archived && styles.acctRowArchived]}>
                <TextInput
                  value={a.name}
                  onChangeText={(t) => renameAccount(a.id, t)}
                  style={styles.acctNameField}
                />
                <View style={styles.acctActions}>
                  <Pressable onPress={() => moveAccount(a.id, -1)} disabled={idx === 0} hitSlop={6}>
                    <Feather name="chevron-up" size={16} color={idx === 0 ? colors.muted28 : colors.muted55} />
                  </Pressable>
                  <Pressable onPress={() => moveAccount(a.id, 1)} disabled={idx === store.accounts.length - 1} hitSlop={6}>
                    <Feather
                      name="chevron-down"
                      size={16}
                      color={idx === store.accounts.length - 1 ? colors.muted28 : colors.muted55}
                    />
                  </Pressable>
                  <Pressable onPress={() => toggleArchiveAccount(a.id)} hitSlop={6}>
                    <Feather name="archive" size={15} color={a.archived ? colors.ink : colors.muted55} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(a.id)} hitSlop={6}>
                    <Feather name="trash-2" size={15} color={colors.muted55} />
                  </Pressable>
                </View>
              </View>
            ))}
            <View style={styles.addAccountRow}>
              <TextInput
                value={newAccountName}
                onChangeText={setNewAccountName}
                placeholder="New account name"
                placeholderTextColor="rgba(28,26,23,.32)"
                style={styles.addAccountField}
                onSubmitEditing={() => {
                  addAccount(newAccountName);
                  setNewAccountName('');
                }}
              />
              <Pressable
                onPress={() => {
                  addAccount(newAccountName);
                  setNewAccountName('');
                }}
                style={styles.addAccountBtn}>
                <Feather name="plus" size={16} color={colors.inkOnDark} />
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Currency</Text>
            <View style={styles.currencyRow}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCurrency(c)}
                  style={[styles.currencyChip, store.currency === c && styles.currencyChipActive]}>
                  <Text style={[styles.currencyChipText, store.currency === c && styles.currencyChipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Data</Text>
            <Pressable onPress={handleExportEverything} style={[styles.secondaryBtn, { marginTop: 12 }]}>
              <Text style={styles.secondaryBtnText}>Export everything {'·'} .csv</Text>
            </Pressable>
            <Pressable onPress={handleReset} style={styles.destructiveBtn}>
              <Text style={styles.destructiveBtnText}>Reset all data</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.page,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: fonts.sans600,
    fontSize: 19,
    letterSpacing: -0.19,
    color: colors.ink,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.fillLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 14,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitle: {
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted45,
    marginBottom: 10,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowName: {
    fontSize: 14,
    color: colors.ink,
  },
  budgetField: {
    fontFamily: fonts.mono500,
    fontSize: 15,
    textAlign: 'right',
    minWidth: 60,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderBottomColor: colors.muted40,
    color: colors.ink,
    paddingVertical: 2,
  },
  footnote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted55,
  },
  textBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  textBtnLabel: {
    fontSize: 12.5,
    fontFamily: fonts.sans500,
    color: colors.muted60,
    textDecorationLine: 'underline',
  },
  acctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  acctRowArchived: {
    opacity: 0.45,
  },
  acctNameField: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 2,
  },
  acctActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  addAccountRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  addAccountField: {
    flex: 1,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.page,
    paddingVertical: 9,
    paddingHorizontal: 11,
    fontSize: 13.5,
    color: colors.ink,
  },
  addAccountBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyChip: {
    width: 44,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyChipActive: {
    backgroundColor: colors.ink,
  },
  currencyChipText: {
    fontSize: 15,
    fontFamily: fonts.sans500,
    color: colors.ink,
  },
  currencyChipTextActive: {
    color: colors.inkOnDark,
  },
  secondaryBtn: {
    borderRadius: 11,
    padding: 13,
    paddingLeft: 15,
    backgroundColor: colors.fill,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: fonts.sans500,
    color: colors.ink,
  },
  destructiveBtn: {
    marginTop: 8,
    borderRadius: 11,
    padding: 13,
    paddingLeft: 15,
  },
  destructiveBtnText: {
    fontSize: 14,
    fontFamily: fonts.sans500,
    color: colors.red,
  },
});
