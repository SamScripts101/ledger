import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, View } from 'react-native';

import { TabBar, TabId } from '@/components/ledger/tab-bar';
import { colors } from '@/lib/theme';
import { LedgerScreen } from '@/screens/ledger-screen';
import { SettingsScreen } from '@/screens/settings-screen';
import { ShareScreen } from '@/screens/share-screen';
import { YearScreen } from '@/screens/year-screen';

export default function App() {
  const now = new Date();
  const [tab, setTab] = useState<TabId>('ledger');
  const [y, setY] = useState(now.getFullYear());
  const [m, setM] = useState(now.getMonth());
  const [settingsOpen, setSettingsOpen] = useState(false);

  function shiftMonth(delta: number) {
    setM((prevM) => {
      let nextM = prevM + delta;
      let nextY = y;
      if (nextM > 11) {
        nextM = 0;
        nextY += 1;
      } else if (nextM < 0) {
        nextM = 11;
        nextY -= 1;
      }
      setY(nextY);
      return nextM;
    });
  }

  const content = (
    <>
      <StatusBar barStyle="dark-content" />

      {tab === 'ledger' && <LedgerScreen y={y} m={m} onShiftMonth={shiftMonth} />}
      {tab === 'year' && (
        <YearScreen
          y={y}
          onShiftYear={(delta) => setY((prev) => prev + delta)}
          onOpenMonth={(mi) => {
            setM(mi);
            setTab('ledger');
          }}
        />
      )}
      {tab === 'share' && (
        <ShareScreen y={y} m={m} onShiftMonth={shiftMonth} onOpenSettings={() => setSettingsOpen(true)} />
      )}

      <TabBar active={tab} onSelect={setTab} />

      <SettingsScreen visible={settingsOpen} y={y} m={m} onClose={() => setSettingsOpen(false)} />
    </>
  );

  // Browsers already resize the viewport around the on-screen keyboard, so
  // KeyboardAvoidingView is native-only — on web its wrapper view doesn't
  // stretch to fill height, breaking the pinned entry bar / tab bar layout.
  if (Platform.OS === 'web') {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {content}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.page,
  },
});
