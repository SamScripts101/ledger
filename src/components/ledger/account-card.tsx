import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

interface AccountCardProps {
  name: string;
  selected: boolean;
  left: string;
  leftNegative: boolean;
  pct: number;
  budgetDisplay: string;
  editable: boolean;
  onSelect: () => void;
  onBudgetChange?: (text: string) => void;
}

export function AccountCard({
  name,
  selected,
  left,
  leftNegative,
  pct,
  budgetDisplay,
  editable,
  onSelect,
  onBudgetChange,
}: AccountCardProps) {
  const fg = selected ? colors.inkOnDark : colors.ink;
  const dim = selected ? colors.onDarkMuted : colors.muted40;
  const leftColor = selected
    ? leftNegative
      ? colors.redLight
      : colors.inkOnDark
    : leftNegative
      ? colors.red
      : colors.ink;
  const trackBg = selected ? colors.onDarkTrack : colors.fill;
  const barColor = leftNegative ? colors.red : selected ? colors.inkOnDark : colors.ink;

  return (
    <Pressable
      onPress={onSelect}
      style={[styles.card, { backgroundColor: selected ? colors.ink : colors.cardBg, borderColor: selected ? colors.ink : colors.cardBorder }]}>
      <Text style={[styles.name, { color: fg }]} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.leftRow}>
        <Text style={[styles.leftAmount, { color: leftColor }]}>{left}</Text>
        <Text style={[styles.leftLabel, { color: dim }]}>left</Text>
      </View>
      <View style={[styles.track, { backgroundColor: trackBg }]}>
        <View style={[styles.bar, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.budgetRow}>
        <Text style={[styles.budgetLabel, { color: dim }]}>budget</Text>
        {editable ? (
          <TextInput
            value={budgetDisplay}
            onChangeText={onBudgetChange}
            inputMode="decimal"
            style={[styles.budgetInput, { color: fg, borderBottomColor: dim }]}
          />
        ) : (
          <Text style={[styles.budgetInput, { color: dim }]}>{budgetDisplay} total</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 118,
    borderRadius: 12,
    paddingTop: 9,
    paddingHorizontal: 11,
    paddingBottom: 10,
    borderWidth: 1.5,
  },
  name: {
    fontFamily: fonts.sans600,
    fontSize: 12,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 5,
  },
  leftAmount: {
    fontFamily: fonts.mono500,
    fontSize: 14,
  },
  leftLabel: {
    fontFamily: fonts.mono400,
    fontSize: 9.5,
  },
  track: {
    height: 3,
    borderRadius: 2,
    marginTop: 7,
    overflow: 'hidden',
  },
  bar: {
    height: 3,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  budgetLabel: {
    fontFamily: fonts.mono400,
    fontSize: 9.5,
  },
  budgetInput: {
    fontFamily: fonts.mono400,
    fontSize: 9.5,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    padding: 0,
    minWidth: 30,
  },
});
