import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <title>Ledger</title>

        <link rel="manifest" href="manifest.json" />
        <link rel="icon" href="favicon.png" />
        <link rel="apple-touch-icon" href="apple-touch-icon.png" />

        <meta name="theme-color" content="#f7f5f0" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ledger" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: rootStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const rootStyles = `
  html, body, #root { height: 100%; background-color: #f7f5f0; }
  body { overscroll-behavior: none; }
`;
