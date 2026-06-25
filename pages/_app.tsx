// Global CSS must be imported in _app — nowhere else in the Pages Router.
import '../src/index.css';
import type { AppProps } from 'next/app';

export default function RatioApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

