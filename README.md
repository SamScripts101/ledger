# Handoff: Personal Expense Ledger (Expo, single user, local-only)

## Overview
A month-by-month expense ledger for one person on their own phone. Each month is a list of
transactions entered as a signed amount plus a short description. Positive = money spent,
negative = money added. Entries belong to an account (Checking / Cash / Card); each account
carries a monthly budget that spending deducts from. Entries can be flagged as **exceptions**,
which keeps them recorded and visible but excludes them from every total until resolved.
Three tabs: Ledger (current month), Year (12-month summary), Share (CSV export + email summary).

Scope for v1: **no accounts, no server, no sync.** All data on-device. Email send and true .xlsx
are explicitly out of scope — see "Deliberately fake in the prototype".

## About the design files
`Ledger.dc.html` (+ `ios-frame.jsx`, the device bezel used only for presentation) is a **design
reference built in HTML** — a working prototype of look and behavior, not production code to
paste in. Recreate it as an Expo (React Native) app. The prototype's JavaScript is the best
specification of the arithmetic and state transitions; read it, port the logic, rebuild the UI
with React Native primitives (`View`, `Text`, `TextInput`, `Pressable`, `FlatList`,
`ScrollView`, `SafeAreaView`).

Open `Ledger.dc.html` in a desktop browser to interact with it.

## Fidelity
**High-fidelity.** Colors, type sizes, spacing and copy below are final. Match them closely;
substitute React Native equivalents where CSS features don't exist (no `box-shadow: inset` —
use `borderWidth` + `borderColor`; no `font-variant-numeric` — use a mono font for all numbers).

## Target stack
- Expo SDK (managed workflow), TypeScript.
- `expo-router` or a single-file tab layout — three tabs is small enough for either.
- `@react-native-async-storage/async-storage` for persistence (one JSON blob is plenty at this
  data size; write on every mutation, read once on launch).
- `expo-file-system` + `expo-sharing` for CSV export (write file to cache dir, open share sheet).
- Fonts via `expo-font` + `@expo-google-fonts/instrument-sans` and
  `@expo-google-fonts/ibm-plex-mono`.
- Build to your own phone with `eas build --profile preview` (or Expo Go while iterating).

## Data model

```ts
type AccountId = string;                    // 'checking' | 'cash' | 'card' | user-added

interface Account { id: AccountId; name: string; }

interface Entry {
  id: number;                               // monotonic counter, persisted
  amt: number;                              // POSITIVE = spent, NEGATIVE = money added
  note: string;                             // description; '—' when left blank
  acct: AccountId;
  ex?: boolean;                             // true = exception, held for follow-up
}

interface Store {
  accounts: Account[];                      // default: Checking, Cash, Card
  defaultBudgets: Record<AccountId, number>;              // set in Settings; 2400/300/900
  budgets: Record<string, Record<AccountId, number>>;     // per-month overrides, key `${year}-${monthIndex}`
  entries: Record<string, Entry[]>;         // key = `${year}-${monthIndex}`, monthIndex 0-11
  currency: string;                         // '$' | '£' | '€'
  nextId: number;
}
```

Budget for an account in a month = `budgets[monthKey]?.[acctId] ?? defaultBudgets[acctId] ?? 0`.
The prototype has only the single flat `budgets` map — the two-layer version above supersedes it.

```ts
```

Ephemeral UI state (not persisted): selected tab, selected year/month, account filter
(`'all'` or an id), draft amount / draft note / draft exception flag, export email + range.

## Arithmetic rules (port these exactly)
Let `posted` = entries in the selected month where `ex !== true`, and `shown` = `posted`
filtered by the selected account (`'all'` = no filter).

- `out`  = sum of `amt` in `shown` where `amt > 0`        → displayed as "… out"
- `in`   = sum of `-amt` in `shown` where `amt < 0`       → displayed as "… in"
- `net`  = `out - in`. Negative net flips the label to "Net added this month" and the color to green.
- Account card **spent** = sum of all `amt` in `posted` for that account (income offsets spending).
- Account card **left** = `budget - spent`; negative renders red. Bar fill = `clamp(spent / budget * 100, 0, 100)`.
- "All accounts" card: budget = sum of every account budget; its budget figure is **read-only text**, not an input.
- Year row **net** = same `out - in` over that month, ignoring exceptions; "vs budget" =
  `totalMonthlyBudget - net`, rendered as "over $X" in red when negative.
- Months with zero entries render `—` at 45% opacity and are still tappable (jumps to that month).
- Exceptions never enter any sum, on any screen. They appear only in the dashed
  "Held for follow-up" block and in the CSV (optional, see below).

## Screens

### 1. Ledger (default tab)
Purpose: enter and review a month.
Layout, top to bottom, single column, background `#f7f5f0`:
1. **Header**, `paddingTop` = safe-area top + 12, `paddingHorizontal` 20, `paddingBottom` 14.
   Row: circular 34×34 `‹` button (bg `rgba(28,26,23,.06)`, radius 17) — centered two-line title
   (month + year, Instrument Sans 600, 19px, letterSpacing −0.19) with a mono 10.5px
   uppercase subtitle at 45% opacity ("5 entries · 1 held") — circular `›` button.
2. **Account cards**, horizontal scroll, gap 8, `paddingHorizontal` 20, `paddingBottom` 14.
   Each card 118 wide, radius 12, padding 9/11/10, 1.5px border.
   Unselected: bg `rgba(28,26,23,.04)`, border `rgba(28,26,23,.08)`, ink text.
   Selected: bg `#1c1a17`, text `#f7f5f0`.
   Contents: name (12px/600) · remaining amount (mono 14px/500) + "left" (mono 9.5px, 40–50% opacity) ·
   3px progress track (radius 2) · "budget" + editable numeric field (mono 9.5px, dashed
   1px bottom border). Tapping a card filters the ledger AND sets the draft account.
   First card is "All accounts" (aggregate, non-editable budget).
3. **Column header row**: `96px | 1fr` grid, mono 9.5px uppercase 40% opacity,
   labels "Amount" / "Item", 1px bottom border `rgba(28,26,23,.12)`.
4. **Entry list** (scrolls). Row grid `96px | 1fr | auto`, gap 12, `paddingVertical` 13,
   1px bottom border `rgba(28,26,23,.07)`:
   - amount, mono 15px/500, tabular, ink — or green `oklch(0.52 0.09 155)` ≈ `#3f7a5a` when negative,
     rendered with a Unicode minus `−` and the currency symbol;
   - description 14.5px, lineHeight 1.3, with the account name below in mono 9.5px uppercase 40%;
   - two icon buttons: `⚑` (toggle exception) at 28% opacity, `×` (delete) at 25%.
   Empty state: centered 13.5px 38%-opacity two-liner
   "No entries in this account. / Positive to spend, negative to add."
5. **Held-for-follow-up block**, only when the month has exceptions. Dashed 1px border
   `rgba(28,26,23,.22)`, radius 12, bg `rgba(28,26,23,.025)`, marginTop 18.
   Header row: mono 9.5px uppercase "⚑ Held for follow-up" left, "excluded from totals" right (35%).
   Rows mirror the ledger rows but all text at 42–45% opacity, and the first icon is `↩`
   (move back into the ledger).
6. **Entry bar** (pinned, bg `#f2efe8`, 1px top border): grid `96px | 1fr | auto`, gap 12,
   padding 11/20/0 — numeric input (placeholder `0.00`, mono 15px, white bg, radius 9,
   padding 10/11, 1px border `rgba(28,26,23,.1)`), description input (14.5px, same chrome),
   and a 38×38 circular `+` button (bg `#1c1a17`, text `#f7f5f0`, 19px).
   Below it, a 7px-gap row: account chip (cycles through accounts on tap), `⚑ Exception`
   toggle (bg `#1c1a17` + light text when armed, else `rgba(28,26,23,.07)`), and a right-aligned
   mono 9.5px 35% hint. On mobile replace the "Enter to add" hint with the keyboard's return key.
7. **Total block**, 1px top border, grid `96px | 1fr`, padding 13/20/16: total in mono 22px/500
   (green when negative) next to a 13px/500 label ("Net spent this month") and a mono 10.5px
   45% breakdown ("$235.30 out · $1850.00 in").

Validation: reject empty, non-numeric, and zero amounts (silently — no error copy in v1).
Accept `,` as a decimal separator. Blank description saves as `—`.

### 2. Year
Header shows the year with `‹ ›` stepping by year; subtitle "N months with entries".
Table header `1fr | 74 | 74`: "Month" / "Net" (right) / "vs budget" (right).
Twelve rows, always all twelve, `paddingVertical` 11, 1px bottom border: month name 14px/500
with mono 9.5px 40% meta ("5 entries · 1 held" / "no entries"), net in mono 14px/500 (green when
negative), and vs-budget in mono 11.5px (45% opacity, red when over). Tapping a row opens that
month in the Ledger tab.
Below the table, a white card (radius 12, 1px border `rgba(28,26,23,.08)`, padding 13/14) titled
"By account · year" listing each account's annual spend against `budget × 12`.
Footer block mirrors the Ledger total: year net, label, "out · in" breakdown.

### 3. Share
Scrolling column of three cards, `paddingHorizontal` 20.
1. **Spreadsheet export** (white, radius 14, padding 14): mono 9.5px uppercase title, 13px/1.45
   60%-opacity explainer, then a primary dark button "Export Sep 2026 · .csv" and a secondary
   `rgba(28,26,23,.07)` button "Export 2026 workbook · .csv" (both radius 11, 13px padding,
   left-aligned label, 14px/500 text), then a checkbox "Include held exceptions as flagged rows".
2. **Email summary** (same card style): email `TextInput` (bg `#f7f5f0`, radius 10, padding 12),
   then a range chip that toggles "Sep only" / "Full 2026" and a filling primary button
   "Send summary" → "Sent ✓" with a green background. Below, a mono 10px 40% note that becomes
   "Sent to <email> · csv attached". Send is blocked unless the address matches `/.+@.+\..+/`.
3. **Preview** (dashed border, bg `rgba(28,26,23,.03)`): first five CSV lines, mono 10px,
   lineHeight 1.75, 55% opacity.

### 4. Settings
Purpose: the things you set once. Reached from a gear button at the right of the Share tab's
header (keep the tab bar at three tabs).
Same card vocabulary as Share — white cards, radius 14, padding 14, mono 9.5px uppercase titles.
1. **Default monthly budgets**: one row per account — account name (14px) on the left, a numeric
   field on the right (mono 15px, right-aligned, dashed 1px bottom border, same chrome as the
   inline card fields). These are the *defaults*: a new month starts with these numbers.
   Editing a default does NOT retro-change months that already have their own values.
   Add a plain-text footnote: "New months start from these. Tap a budget on the Ledger to change
   just that month." Plus a low-emphasis text button "Apply defaults to Sep 2026" that
   overwrites the current month on demand.
2. **Accounts**: rename, reorder, add, archive. Archived accounts keep their history and stop
   appearing in the entry-bar cycle. Deleting an account with entries is blocked — offer archive.
3. **Currency**: symbol picker ($ £ €), applied everywhere numbers render.
4. **Data**: "Export everything · .csv" and "Reset all data" (destructive, red, confirm dialog).

This makes the budget model two-layer: `defaultBudgets: Record<AccountId, number>` in settings,
and `budgets: Record<monthKey, Record<AccountId, number>>` per month. Resolution order is
per-month value → default. The inline fields on the Ledger's account cards write to the
per-month layer only. Keep the inline fields — they stay editable exactly as prototyped.

### Tab bar
Three equal columns, 1px top border, bg `#f7f5f0`, padding 9/12 + safe-area bottom.
Each tab is a centered glyph (15px) over a 10.5px/500 label: `▤ Ledger`, `▦ Year`, `↥ Share`.
Active `#1c1a17`, inactive `rgba(28,26,23,.35)`. Replace the glyphs with a real icon set
(`@expo/vector-icons` Feather: `list`, `grid`, `upload`) in the app.

## CSV format
Header: `Month,Amount ($),Description,Account,Account budget,Status`
One row per entry, in entry order; month scope is either the selected month or all twelve.
`Month` = `Sep 2026`; `Amount` = raw signed number with 2 decimals (no symbol);
`Description` is quoted with `"` doubled; `Account budget` = that account's monthly budget;
`Status` = `Posted` or `EXCEPTION — follow up`. Exceptions are included only when the
checkbox is on. File is written UTF-8 **with BOM** (`\ufeff`) so Excel reads accents correctly.
Filenames: `ledger-sep-2026.csv`, `ledger-2026.csv`.
In Expo: `FileSystem.writeAsStringAsync(FileSystem.cacheDirectory + name, csv)` then
`Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' })`.

## Deliberately fake in the prototype
- **Email send** only flips local state. For v1 on your own phone, replace it with
  `expo-mail-composer` (opens the system mail app with the CSV attached) — no backend needed.
- **.xlsx** is not produced; CSV opens in Excel and is the v1 answer.
- No bank import, no receipt photos, no categories beyond accounts, no recurring entries.

## Design tokens
| Token | Value |
|---|---|
| Page background | `#f7f5f0` |
| Pinned bars | `#f2efe8` |
| Ink / primary | `#1c1a17` |
| Ink on dark | `#f7f5f0` |
| Hairline | `rgba(28,26,23,.07)` rows, `rgba(28,26,23,.12)` section borders |
| Fill (chips, buttons) | `rgba(28,26,23,.06–.07)` |
| Muted text | `rgba(28,26,23,.4)` meta, `.45` subtitles, `.55–.6` body |
| Positive/added (green) | `oklch(0.52 0.09 155)` ≈ `#3f7a5a` |
| Over budget (red) | `oklch(0.52 0.11 28)` ≈ `#a24b3c` |
| Radii | 9 inputs, 11–12 buttons/cards, 14 export cards, 17–19 circular |
| Type | Instrument Sans 400/500/600 for UI; IBM Plex Mono 400/500 for every number and eyebrow label |
| Sizes | 19 title · 14.5 body · 13 labels · 15 row amount · 22 totals · 10.5 tabs · 9.5 mono eyebrow |
| Letterspacing | −0.01em on the title; +0.06–0.12em on uppercase mono labels |

## Assets
None. All glyphs are Unicode placeholders in the prototype — swap for `@expo/vector-icons`.
Fonts come from Google Fonts (Instrument Sans, IBM Plex Mono), both available as Expo packages.

## Files in this bundle
- `Ledger.dc.html` — the full interactive prototype (all three tabs, all logic).
- `ios-frame.jsx` — presentation-only iPhone bezel; do not port.

## Suggested build order
1. Store + AsyncStorage persistence + the arithmetic, with the prototype's seed data.
2. Ledger tab: list, entry bar, totals. Live in it for a few days.
3. Account cards and budgets.
4. Exception flag and the held block.
5. Year tab.
6. CSV export + mail composer.
7. Settings (default budgets, accounts, currency, reset).
