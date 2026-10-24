// Reference implementation of ritual, kept only as an oracle for tests/diff/qwen-vs-reference.test.ts.
// Do not import it from src/. Added AFTER the Qwen task so the model never sees it.

import type { ElementId } from '../../src/core/types.ts';

export type CircleContent = { element: ElementId } | null;

export function detectRitual(
  circles: readonly CircleContent[],
  usedThisCombat: readonly ElementId[],
): ElementId | null {
  if (circles.length !== 3) throw new RangeError(`Expected 3 circles, got ${circles.length}`);
  if (circles.some((x) => x === null)) return null;
  const others = new Set<ElementId>();
  for (const x of circles) {
    if (x && x.element !== 'wiatr') others.add(x.element);
  }
  let element: ElementId;
  if (others.size === 0) element = 'wiatr';
  else if (others.size === 1) element = [...others][0] as ElementId;
  else return null;
  return usedThisCombat.includes(element) ? null : element;
}
