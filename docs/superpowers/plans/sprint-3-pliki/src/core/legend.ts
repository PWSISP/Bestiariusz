import type { CreatureSpec, SymbolData } from './types.ts';

/** i18n keys that make the one-sentence legend of a creature card; the UI translates and joins them. */
export interface Legend {
  /** Key of the sentence template, or of the whole text for a special legend. */
  readonly key: string;
  /** Keys of the words the template takes as {adjective}, {form} and {element}; null for a special legend. */
  readonly parts: {
    readonly adjective: string;
    readonly form: string;
    readonly element: string;
  } | null;
}

/** "element:form:trait", e.g. "grom:wilk:gniew". Does not check that the symbols exist. */
export function legendKey(_spec: CreatureSpec): string {
  throw new Error('Not implemented');
}

/**
 * Legend of a creature, as i18n keys (core never builds texts).
 * - An unknown element, form or trait id throws an Error, special legend or not.
 * - When `special` contains legendKey(spec): { key: "legend.special.<element>_<form>_<trait>", parts: null },
 *   e.g. "legend.special.grom_wilk_gniew".
 * - Otherwise key is "legend.born.f" for a feminine form and "legend.born.m" for a masculine one
 *   (the Polish sentence ends differently: zrodzona / zrodzony), and parts are
 *   adjective: "symbol.trait.<trait>.adjective_<m|f>" (the gender of the form),
 *   form: "symbol.form.<form>.name",
 *   element: "symbol.element.<element>.of".
 */
export function describeLegend(
  _symbols: SymbolData,
  _spec: CreatureSpec,
  _special: readonly string[],
): Legend {
  throw new Error('Not implemented');
}
