// Global CSS must be imported in _app — nowhere else in the Pages Router.
import '../src/index.css';
import type { AppProps } from 'next/app';
import { PersonaProvider } from '@/components/PersonaProvider';

export default function RatioApp({ Component, pageProps }: AppProps) {
  // Persona context wraps every page so the active lens (executive default /
  // technical / procurement) is available app-wide.
  return (
    <PersonaProvider>
      <Component {...pageProps} />
    </PersonaProvider>
  );
}

