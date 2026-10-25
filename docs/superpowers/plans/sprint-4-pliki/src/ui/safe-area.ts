// Safe-area insets (notches, rounded corners, gesture bars) in CSS pixels, read through a CSS probe
// because `env()` is not available to scripts.
import type { Insets } from '../view/geometry.ts';

export function readSafeArea(doc: Document): Insets {
  const probe = doc.createElement('div');
  probe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  doc.body.append(probe);
  const style = doc.defaultView?.getComputedStyle(probe);
  const px = (value: string | undefined): number => {
    const n = Number.parseFloat(value ?? '');
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const insets: Insets = {
    top: px(style?.paddingTop),
    right: px(style?.paddingRight),
    bottom: px(style?.paddingBottom),
    left: px(style?.paddingLeft),
  };
  probe.remove();
  return insets;
}
