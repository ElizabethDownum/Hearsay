import type { VignetteDef } from '../sim/vignettes/types';

export const STANDARD_VIGNETTES: readonly VignetteDef[] = [
  {
    id: 'public-quarrel', term: 'vignette-public-quarrel', binding: 'pair',
    conditions: [{ kind: 'mutual-damaging', minCredence: 0.5 }],           // STANCE.REPEAT
    consequences: [
      { kind: 'trust-delta', from: 'a', to: 'b', delta: -0.2 },
      { kind: 'trust-delta', from: 'b', to: 'a', delta: -0.2 },
      { kind: 'mint-claim', predicate: 'publicly-quarreled-with', subject: 'a', object: 'b', severity: 2, intoMinds: ['a', 'b'] },
    ],
  },
  {
    id: 'merchant-ruin', term: 'vignette-merchant-ruin', binding: 'solo',
    conditions: [{ kind: 'believed-about', predicate: 'is-bankrupt', role: 'a', minHolders: 3, minCredence: 0.75 }], // STANCE.BELIEVE
    consequences: [
      { kind: 'schedule-home', who: 'a', days: 2 },
      { kind: 'mint-claim', predicate: 'shuttered-the-shop', subject: 'a', object: null, severity: 3, intoMinds: ['a'] },
    ],
  },
  {
    id: 'broken-betrothal', term: 'vignette-broken-betrothal', binding: 'pair',
    conditions: [{ kind: 'lover-betrayed', minCredence: 0.75 }],           // STANCE.BELIEVE
    consequences: [
      { kind: 'edge-rekind', from: 'a', to: 'b', newKind: 'rival' },
      { kind: 'trust-delta', from: 'a', to: 'b', delta: -0.4 },
      { kind: 'mint-claim', predicate: 'broke-a-betrothal', subject: 'b', object: 'a', severity: 3, intoMinds: ['a'] },
    ],
  },
];
