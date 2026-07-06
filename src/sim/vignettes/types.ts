import type { PredicateId } from '../rumors/claim';
import type { Edge } from '../types';

export type VignetteRole = 'a' | 'b';

export type VignetteCondition =
  | { kind: 'mutual-damaging'; minCredence: number }
  | { kind: 'believed-about'; predicate: PredicateId; role: VignetteRole; minHolders: number; minCredence: number }
  | { kind: 'lover-betrayed'; minCredence: number };

export type VignetteConsequence =
  | { kind: 'trust-delta'; from: VignetteRole; to: VignetteRole; delta: number }
  | { kind: 'edge-rekind'; from: VignetteRole; to: VignetteRole; newKind: Edge['kind'] }
  | { kind: 'mint-claim'; predicate: PredicateId; subject: VignetteRole; object: VignetteRole | null;
      severity: 1 | 2 | 3 | 4 | 5; intoMinds: VignetteRole[] }
  | { kind: 'schedule-home'; who: VignetteRole; days: number };

export interface VignetteDef {
  id: string;
  /** Term-registry id (Task 10). */
  term: string;
  /** 'pair' defs bind (a,b); 'solo' defs bind a only (b stays null). */
  binding: 'pair' | 'solo';
  conditions: VignetteCondition[];    // AND
  consequences: VignetteConsequence[];
}
