import type { Legend } from '../core/legend.ts';

/** Translates an i18n key; `params` fill the {placeholders} of the text (the app passes its `t`). */
export type Translate = (key: string, params?: Record<string, string>) => string;

/** The one-sentence legend of a creature card: a special legend as it is, a generated one with its words inserted. */
export function renderLegend(legend: Legend, translate: Translate): string {
  if (legend.parts === null) return translate(legend.key);
  return translate(legend.key, {
    adjective: translate(legend.parts.adjective),
    form: translate(legend.parts.form),
    element: translate(legend.parts.element),
  });
}
