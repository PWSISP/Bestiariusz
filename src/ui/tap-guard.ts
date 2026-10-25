// Double-tap guard: a button that changes what is under the finger (Continue switches the screen, End
// turn starts the next turn) must not receive the second tap of a double tap, and neither must whatever
// the new screen has in that place. A press counts as that second tap when it comes soon after the
// marked tap and close to it. Times are the event time stamps (when the finger touched), not the time of
// handling: on a slow device the redraw after the first tap delays the handling of the second.
const WINDOW_MS = 350;
const RADIUS_PX = 24;

let last: { readonly t: number; readonly x: number; readonly y: number } | null = null;

/** Remembers a pointer tap (client coordinates) on a button that changes the screen under the finger. */
export function markTap(e: MouseEvent): void {
  if (e.detail === 0) return; // keyboard or screen reader: no finger to tap twice
  last = { t: e.timeStamp, x: e.clientX, y: e.clientY };
}

/** True when a press is the second tap of a double tap on the marked button. */
export function isSecondTap(e: PointerEvent): boolean {
  if (!last) return false;
  return (
    e.timeStamp - last.t < WINDOW_MS &&
    Math.hypot(e.clientX - last.x, e.clientY - last.y) <= RADIUS_PX
  );
}
