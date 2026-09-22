import { Platform } from 'react-native';

function downloadCsvOnWeb(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Writes the CSV to a local file and returns its uri. Native only — no-op on web. */
export async function writeCsvFile(csv: string, filename: string): Promise<{ uri?: string }> {
  if (Platform.OS === 'web') return {};
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write('﻿' + csv);
  return { uri: file.uri };
}

/** Triggers the platform share sheet (native) or a browser download (web). */
export async function shareCsvFile(csv: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    downloadCsvOnWeb(csv, filename);
    return;
  }
  const { uri } = await writeCsvFile(csv, filename);
  if (!uri) return;
  const Sharing = await import('expo-sharing');
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
  }
}
