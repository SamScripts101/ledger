import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/lib/theme';

interface HeaderProps {
  title: string;
  subtitle: string;
  onPrev: () => void;
  onNext: () => void;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Header({ title, subtitle, onPrev, onNext, rightIcon, onRightIconPress }: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Pressable onPress={onPrev} style={styles.circleBtn} hitSlop={6}>
        <Text style={styles.circleGlyph}>‹</Text>
      </Pressable>
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {rightIcon ? (
        <Pressable onPress={onRightIconPress} style={styles.circleBtn} hitSlop={6}>
          {rightIcon}
        </Pressable>
      ) : (
        <Pressable onPress={onNext} style={styles.circleBtn} hitSlop={6}>
          <Text style={styles.circleGlyph}>›</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.fillLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleGlyph: {
    fontSize: 16,
    color: colors.ink,
    lineHeight: 18,
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.sans600,
    fontSize: 19,
    letterSpacing: -0.19,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.mono400,
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.muted45,
    marginTop: 2,
  },
});
