import type { CreatureSpec, SymbolData } from '../../src/core/types.ts';

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
export function legendKey(spec: CreatureSpec): string {
  return `${spec.element}:${spec.form}:${spec.trait}`;
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
  symbols: SymbolData,
  spec: CreatureSpec,
  special: readonly string[],
): Legend {
  if (!symbols.elements.some((e) => e.id === spec.element)) {
    throw new Error(`Unknown element: ${spec.element}`);
  }
  const form = symbols.forms.find((f) => f.id === spec.form);
  if (!form) throw new Error(`Unknown form: ${spec.form}`);
  if (!symbols.traits.some((t) => t.id === spec.trait)) {
    throw new Error(`Unknown trait: ${spec.trait}`);
  }
  if (special.includes(legendKey(spec))) {
    return { key: `legend.special.${spec.element}_${spec.form}_${spec.trait}`, parts: null };
  }
  return {
    key: `legend.born.${form.gender}`,
    parts: {
      adjective: `symbol.trait.${spec.trait}.adjective_${form.gender}`,
      form: `symbol.form.${spec.form}.name`,
      element: `symbol.element.${spec.element}.of`,
    },
  };
}
