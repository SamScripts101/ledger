import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/lib/theme';

export type TabId = 'ledger' | 'year' | 'share';

const TABS: { id: TabId; name: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'ledger', name: 'Ledger', icon: 'list' },
  { id: 'year', name: 'Year', icon: 'grid' },
  { id: 'share', name: 'Share', icon: 'upload' },
];

interface TabBarProps {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export function TabBar({ active, onSelect }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 9) }]}>
      {TABS.map((t) => {
        const color = active === t.id ? colors.ink : colors.muted35;
        return (
          <Pressable key={t.id} onPress={() => onSelect(t.id)} style={styles.tab}>
            <Feather name={t.icon} size={16} color={color} />
            <Text style={[styles.label, { color }]}>{t.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.hairlineStrong,
    backgroundColor: colors.page,
    paddingTop: 9,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
  },
  label: {
    fontFamily: fonts.sans500,
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
});
