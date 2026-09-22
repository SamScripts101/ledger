import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

interface EntryRowProps {
  amount: string;
  negative: boolean;
  note: string;
  account: string;
  held?: boolean;
  onToggleHold: () => void;
  onRemove: () => void;
}

export function EntryRow({ amount, negative, note, account, held, onToggleHold, onRemove }: EntryRowProps) {
  const amountColor = held ? colors.muted45 : negative ? colors.green : colors.ink;
  const noteColor = held ? colors.muted45 : colors.ink;
  const acctColor = held ? colors.muted35 : colors.muted40;

  return (
    <View style={[styles.row, held && styles.rowHeld]}>
      <Text style={[styles.amount, { color: amountColor }, held && styles.amountHeld]}>{amount}</Text>
      <View style={styles.noteCol}>
        <Text style={[styles.note, { color: noteColor }, held && styles.noteHeld]} numberOfLines={2}>
          {note}
        </Text>
        <Text style={[styles.account, { color: acctColor }]}>{account}</Text>
      </View>
      <View style={styles.icons}>
        <Pressable onPress={onToggleHold} hitSlop={8} style={styles.iconBtn}>
          <Text style={[styles.icon, { color: colors.muted28, fontSize: held ? 15 : 13 }]}>{held ? '↩' : '⚑'}</Text>
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={8} style={styles.iconBtn}>
          <Text style={[styles.icon, { color: 'rgba(28,26,23,.25)', fontSize: 15 }]}>×</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'baseline',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowHeld: {
    paddingVertical: 9,
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  amount: {
    width: 96,
    fontFamily: fonts.mono500,
    fontSize: 15,
  },
  amountHeld: {
    fontSize: 14,
    fontFamily: fonts.mono400,
  },
  noteCol: {
    flex: 1,
  },
  note: {
    fontSize: 14.5,
    lineHeight: 19,
  },
  noteHeld: {
    fontSize: 13.5,
  },
  account: {
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  icons: {
    flexDirection: 'row',
    gap: 2,
  },
  iconBtn: {
    paddingHorizontal: 3,
  },
  icon: {
    lineHeight: 15,
  },
});
