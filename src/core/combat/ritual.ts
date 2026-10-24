import type { ElementId } from '../types.ts';

export type CircleContent = { element: ElementId } | null;

export function detectRitual(
  circles: readonly CircleContent[],
  usedThisCombat: readonly ElementId[],
): ElementId | null {
  // Rule 10: Any other length: throw RangeError
  if (circles.length !== 3) {
    throw new RangeError();
  }

  // Rule 13: If any circle is empty, return null
  for (const circle of circles) {
    if (circle === null) {
      return null;
    }
  }

  // At this point, all circles are guaranteed to have elements due to the above check
  const elements = [circles[0]!.element, circles[1]!.element, circles[2]!.element];

  // Count non-wind elements
  const nonWindElements = elements.filter((el) => el !== 'wiatr');

  let ritualElement: ElementId;

  // Rule 15: none (all three are wind) means the ritual element is 'wiatr'
  if (nonWindElements.length === 0) {
    ritualElement = 'wiatr';
  }
  // Rule 15: all the same element means that element
  else if (nonWindElements.every((el) => el === nonWindElements[0])) {
    ritualElement = nonWindElements[0];
  }
  // Rule 15: two or more different elements mean null
  else {
    return null;
  }

  // Rule 16: If the ritual element is in usedThisCombat, return null; otherwise return it
  if (usedThisCombat.includes(ritualElement)) {
    return null;
  }

  return ritualElement;
}
