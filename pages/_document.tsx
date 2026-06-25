// Custom HTML document — sets lang and dark-mode class, matching the
// Tailwind dark-mode configuration (class strategy).
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <meta
          name="description"
          content="Ratio governs AI workload spend by measuring value, not just cost."
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

