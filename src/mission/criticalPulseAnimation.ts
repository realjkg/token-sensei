// Critical-mission alert animation (Lottie / bodymovin v5 schema). A red ring
// that expands and fades over a looping pulse with a steady centre dot, keyed to
// the cost token (#ff5c72). Authored inline so the Mission Board stays fully
// offline — no remote asset fetch. Rendered by lottie-react for `critical` status.

export const criticalPulseAnimation = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 60,
  w: 64,
  h: 64,
  nm: 'critical-pulse',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'ring',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [90], h: 0, i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } },
            { t: 60, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            {
              t: 0,
              s: [40, 40, 100],
              h: 0,
              i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] },
              o: { x: [0.5, 0.5, 0.5], y: [0, 0, 0] },
            },
            { t: 60, s: [120, 120, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [40, 40] }, nm: 'ring-el' },
            {
              ty: 'st',
              c: { a: 0, k: [1, 0.361, 0.447, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 4 },
              lc: 2,
              lj: 1,
              nm: 'ring-stroke',
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'ring-group',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'dot',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [32, 32, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [16, 16] }, nm: 'dot-el' },
            {
              ty: 'fl',
              c: { a: 0, k: [1, 0.361, 0.447, 1] },
              o: { a: 0, k: 100 },
              nm: 'dot-fill',
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
            },
          ],
          nm: 'dot-group',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
};

