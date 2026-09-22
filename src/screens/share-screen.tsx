import { Feather } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Header } from '@/components/ledger/header';
import { shareCsvFile, writeCsvFile } from '@/lib/export';
import { buildCsv, csvFilename, fmt, MONTHS, monthStats, SHORT } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';

interface ShareScreenProps {
  y: number;
  m: number;
  onShiftMonth: (delta: number) => void;
  onOpenSettings: () => void;
}

const EMAIL_RE = /.+@.+\..+/;

export function ShareScreen({ y, m, onShiftMonth, onOpenSettings }: ShareScreenProps) {
  const { store } = useStore();
  const [includeEx, setIncludeEx] = useState(true);
  const [email, setEmail] = useState('');
  const [range, setRange] = useState<'month' | 'year'>('month');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const csvPreview = buildCsv(store, { scope: 'month', y, m, includeEx }).split('\n').slice(0, 5).join('\n');

  async function handleExport(scope: 'month' | 'year') {
    const csv = buildCsv(store, { scope, y, m, includeEx });
    await shareCsvFile(csv, csvFilename({ scope, y, m }));
  }

  async function handleSendEmail() {
    if (!EMAIL_RE.test(email) || sending) return;
    setSending(true);
    try {
      const available = await MailComposer.isAvailableAsync();
      if (!available) {
        Alert.alert('Mail not set up', 'Add a mail account to this device to send from here.');
        return;
      }
      const csv = buildCsv(store, { scope: range, y, m, includeEx });
      const filename = csvFilename({ scope: range, y, m });
      const stats = range === 'year' ? null : monthStats(store, y, m);
      const label = range === 'year' ? String(y) : `${MONTHS[m]} ${y}`;
      const onWeb = Platform.OS === 'web';
      const body = stats
        ? `${label} summary\n\n${fmt(stats.net, store.currency)} net (${fmt(stats.out, store.currency)} out · ${fmt(stats.inn, store.currency)} in)\n\n${onWeb ? 'The matching CSV was downloaded separately — attach it here.' : 'Full detail attached as CSV.'}`
        : `${label} summary.${onWeb ? ' The matching CSV was downloaded separately — attach it here.' : ' Attached as CSV.'}`;
      const { uri } = await writeCsvFile(csv, filename);
      if (onWeb) await shareCsvFile(csv, filename);
      const result = await MailComposer.composeAsync({
        recipients: [email],
        subject: `Ledger summary — ${label}`,
        body,
        attachments: uri ? [uri] : undefined,
      });
      if (result.status !== MailComposer.MailComposerStatus.CANCELLED) setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Header
        title="Share & export"
        subtitle={`${MONTHS[m]} ${y}`}
        onPrev={() => onShiftMonth(-1)}
        onNext={() => onShiftMonth(1)}
        rightIcon={<Feather name="settings" size={16} color={colors.ink} />}
        onRightIconPress={onOpenSettings}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Spreadsheet export</Text>
          <Text style={styles.cardExplainer}>
            Columns: date, amount, description, account, budget, status. Opens in Excel, Numbers or Sheets.
          </Text>
          <View style={styles.buttonCol}>
            <Pressable onPress={() => handleExport('month')} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Export {SHORT[m]} {y} {'·'} .csv</Text>
            </Pressable>
            <Pressable onPress={() => handleExport('year')} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Export {y} workbook {'·'} .csv</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setIncludeEx((v) => !v)} style={styles.checkboxRow}>
            <View style={[styles.checkbox, includeEx && styles.checkboxChecked]}>
              {includeEx && <Feather name="check" size={11} color={colors.inkOnDark} />}
            </View>
            <Text style={styles.checkboxLabel}>Include held exceptions as flagged rows</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Email summary</Text>
          <TextInput
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setSent(false);
            }}
            placeholder="name@email.com"
            placeholderTextColor="rgba(28,26,23,.32)"
            inputMode="email"
            autoCapitalize="none"
            style={styles.emailField}
          />
          <View style={styles.emailRow}>
            <Pressable
              onPress={() => {
                setRange((r) => (r === 'month' ? 'year' : 'month'));
                setSent(false);
              }}
              style={styles.rangeChip}>
              <Text style={styles.rangeChipText}>{range === 'month' ? `${SHORT[m]} only` : `Full ${y}`}</Text>
            </Pressable>
            <Pressable
              onPress={handleSendEmail}
              disabled={!EMAIL_RE.test(email) || sending}
              style={[styles.sendBtn, { backgroundColor: sent ? colors.green : colors.ink, opacity: EMAIL_RE.test(email) ? 1 : 0.5 }]}>
              <Text style={styles.sendBtnText}>{sent ? 'Sent ✓' : sending ? 'Sending…' : 'Send summary'}</Text>
            </Pressable>
          </View>
          <Text style={styles.emailNote}>
            {sent
              ? `Sent to ${email} · csv attached`
              : `Attaches the same .csv plus a plain-text total${includeEx ? ' and the held-exception list.' : '.'}`}
          </Text>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.cardTitle}>Preview {'·'} first rows</Text>
          <Text style={styles.previewText}>{csvPreview}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.page,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
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
  },
  cardExplainer: {
    marginTop: 8,
    marginBottom: 13,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted60,
  },
  buttonCol: {
    gap: 8,
  },
  primaryBtn: {
    borderRadius: 11,
    padding: 13,
    paddingLeft: 15,
    backgroundColor: colors.ink,
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: fonts.sans500,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.muted40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  checkboxLabel: {
    fontSize: 12.5,
    color: colors.muted60,
    flex: 1,
  },
  emailField: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.page,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
  },
  emailRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 9,
  },
  rangeChip: {
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 11,
    backgroundColor: colors.fill,
  },
  rangeChipText: {
    fontFamily: fonts.mono400,
    fontSize: 10.5,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  sendBtn: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: 'center',
  },
  sendBtnText: {
    fontSize: 13.5,
    fontFamily: fonts.sans500,
    color: colors.inkOnDark,
  },
  emailNote: {
    marginTop: 10,
    fontFamily: fonts.mono400,
    fontSize: 10,
    lineHeight: 16,
    color: colors.muted40,
  },
  previewCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.heldBg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(28,26,23,.2)',
  },
  previewText: {
    marginTop: 9,
    fontFamily: fonts.mono400,
    fontSize: 10,
    lineHeight: 17.5,
    color: colors.muted55,
  },
});
