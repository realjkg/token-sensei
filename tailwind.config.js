/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Backgrounds (spec §10.1)
        void: '#05070b',
        deep: '#090c12',
        slab: '#0d1119',
        raised: '#141a26',
        edge: '#1a2235',
        // Text
        txt: '#d0d8ea',
        sub: '#8895ad',
        dim: '#4d5a72',
        // Semantic
        value: '#00e09e',
        cost: '#ff5c72',
        shape: '#ffc44d',
        gate: '#7c8dff',
        unit: '#00ccee',
        purple: '#b490ff',
        // Cloud providers
        aws: '#ff9900',
        azure: '#0078d4',
        gcp: '#4285f4',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        body: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
      },
    },
  },
  plugins: [],
};

