import type { ElementId } from '../types.ts';

export type CircleContent = { element: ElementId } | null;

export function detectRitual(
  _circles: readonly CircleContent[],
  _usedThisCombat: readonly ElementId[],
): ElementId | null {
  throw new Error('Not implemented');
}
