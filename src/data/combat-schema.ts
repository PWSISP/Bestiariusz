import { z } from 'zod';
import { parseSymbolData, SymbolDataError } from './symbol-schema.ts';
import type { CardDef, CombatData, Effect, EnemyDef } from '../core/combat/model.ts';
import type { SymbolData } from '../core/types.ts';

const ROOT_PATH = '(root)';

export interface CombatDataIssue {
  fieldPath: string;
  detail: string;
}

export class CombatDataError extends Error {
  readonly source: string;
  /** Path of the first issue, e.g. "enemies[0].actions[1].effects[0].amount"; "(root)" for the document itself. */
  readonly fieldPath: string;
  readonly issues: readonly CombatDataIssue[];

  constructor(source: string, issues: readonly CombatDataIssue[]) {
    const first = issues[0] ?? { fieldPath: ROOT_PATH, detail: 'invalid data' };
    super(`${source}: ${first.fieldPath} — ${first.detail}`);
    this.name = 'CombatDataError';
    this.source = source;
    this.fieldPath = first.fieldPath;
    this.issues = issues;
  }
}

const id = z.string().regex(/^[a-z][a-z0-9_-]*$/, 'must match ^[a-z][a-z0-9_-]*$');
const positive = z.number().int().min(1);
const nonNegative = z.number().int().min(0);

const effectSchema = z.discriminatedUnion('kind', [
  z
    .object({ kind: z.literal('damage'), amount: positive, pierce: z.boolean().optional() })
    .strict(),
  z.object({ kind: z.literal('block'), amount: positive }).strict(),
  z.object({ kind: z.literal('heal'), amount: positive }).strict(),
  z.object({ kind: z.literal('draw'), count: positive }).strict(),
  z.object({ kind: z.literal('ember'), amount: positive }).strict(),
]);

const cardSchema = z.discriminatedUnion('kind', [
  z
    .object({
      id,
      kind: z.literal('creature'),
      cost: nonNegative,
      creature: z.object({ element: id, form: id, trait: id }).strict(),
    })
    .strict(),
  z
    .object({
      id,
      kind: z.literal('spell'),
      cost: nonNegative,
      element: id.nullable(),
      effects: z.array(effectSchema).min(1),
    })
    .strict(),
  z.object({ id, kind: z.literal('curse') }).strict(),
]);

const enemyEffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('atak'), amount: positive, direct: z.boolean().optional() }).strict(),
  z
    .object({
      type: z.literal('wielokrotny'),
      amount: positive,
      times: positive,
      direct: z.boolean().optional(),
    })
    .strict(),
  z.object({ type: z.literal('tarcza'), amount: positive }).strict(),
  z.object({ type: z.literal('klatwa'), circle: z.number().int().min(0).max(2) }).strict(),
  z.object({ type: z.literal('kradziez') }).strict(),
]);

const conditionSchema = z
  .object({
    when: z.enum(['playerHandAtMost', 'bossHpBelowPct', 'playerCirclesAtLeast']),
    value: z.number().int(),
    bonus: z.number().int(),
  })
  .strict();

const enemyActionSchema = z
  .object({
    id,
    baseWeight: nonNegative,
    conditions: z.array(conditionSchema).optional(),
    cooldown: nonNegative.optional(),
    effects: z.array(enemyEffectSchema).min(1),
  })
  .strict();

const enemySchema = z
  .object({
    id,
    maxHp: positive,
    resist: z.array(id),
    weak: z.array(id),
    actions: z.array(enemyActionSchema).min(1),
  })
  .strict();

const rawSchema = z
  .object({
    symbols: z.unknown(),
    cards: z.array(cardSchema).min(1),
    enemies: z.array(enemySchema).min(1),
    balance: z
      .object({ playerMaxHp: positive, ritual: z.record(id, z.array(effectSchema)) })
      .strict(),
    decks: z.record(id, z.array(id).min(1)),
  })
  .strict();

function formatPath(path: readonly PropertyKey[]): string {
  let out = '';
  for (const key of path) {
    out += typeof key === 'number' ? `[${key}]` : `${out ? '.' : ''}${String(key)}`;
  }
  return out || ROOT_PATH;
}

/** Validates the symbols; returns the issues (with `symbols.` paths) instead of throwing. */
function parseSymbols(raw: unknown, source: string): SymbolData | CombatDataIssue[] {
  try {
    return parseSymbolData(raw, source);
  } catch (error) {
    if (!(error instanceof SymbolDataError)) throw error;
    return error.issues.map((issue) => ({
      fieldPath: issue.fieldPath === ROOT_PATH ? 'symbols' : `symbols.${issue.fieldPath}`,
      detail: issue.detail,
    }));
  }
}

/**
 * Validates raw combat data (the parsed JSON files) and returns it in the shape the reducer
 * uses: cards and enemies as records keyed by id. Throws CombatDataError with the failing field path.
 * Raw shape: { symbols, cards: CardDef[], enemies: EnemyDef[], balance, decks }.
 */
export function parseCombatData(raw: unknown, source = 'combat-data'): CombatData {
  const shape = rawSchema.safeParse(raw);
  if (!shape.success) {
    throw new CombatDataError(
      source,
      shape.error.issues.map((issue) => ({
        fieldPath: formatPath(issue.path),
        detail: issue.message,
      })),
    );
  }
  const value = shape.data;

  const symbols = parseSymbols((raw as { symbols: unknown }).symbols, source);
  if (Array.isArray(symbols)) throw new CombatDataError(source, symbols);

  const issues: CombatDataIssue[] = [];
  const bad = (fieldPath: string, detail: string): void => {
    issues.push({ fieldPath, detail });
  };
  const elementIds = new Set(symbols.elements.map((e) => e.id));
  const formIds = new Set(symbols.forms.map((f) => f.id));
  const traitIds = new Set(symbols.traits.map((t) => t.id));

  const cards: Record<string, CardDef> = {};
  value.cards.forEach((card, i) => {
    if (Object.hasOwn(cards, card.id)) bad(`cards[${i}].id`, `duplicate id "${card.id}"`);
    cards[card.id] = card as CardDef;
    if (card.kind === 'creature') {
      const c = card.creature;
      if (!elementIds.has(c.element))
        bad(`cards[${i}].creature.element`, `unknown element "${c.element}"`);
      if (!formIds.has(c.form)) bad(`cards[${i}].creature.form`, `unknown form "${c.form}"`);
      if (!traitIds.has(c.trait)) bad(`cards[${i}].creature.trait`, `unknown trait "${c.trait}"`);
    } else if (card.kind === 'spell' && card.element !== null && !elementIds.has(card.element)) {
      bad(`cards[${i}].element`, `unknown element "${card.element}"`);
    }
  });

  const enemies: Record<string, EnemyDef> = {};
  let usesCurse = false;
  value.enemies.forEach((enemy, i) => {
    if (Object.hasOwn(enemies, enemy.id)) bad(`enemies[${i}].id`, `duplicate id "${enemy.id}"`);
    enemies[enemy.id] = enemy as EnemyDef;
    enemy.resist.forEach((el, k) => {
      if (!elementIds.has(el)) bad(`enemies[${i}].resist[${k}]`, `unknown element "${el}"`);
    });
    enemy.weak.forEach((el, k) => {
      if (!elementIds.has(el)) bad(`enemies[${i}].weak[${k}]`, `unknown element "${el}"`);
    });
    const seen = new Set<string>();
    enemy.actions.forEach((action, a) => {
      if (seen.has(action.id)) bad(`enemies[${i}].actions[${a}].id`, `duplicate id "${action.id}"`);
      seen.add(action.id);
      if (action.effects.some((fx) => fx.type === 'klatwa')) usesCurse = true;
    });
  });
  // A curse effect puts the card "klatwa" into the discard pile, so the card must exist.
  if (usesCurse && (!Object.hasOwn(cards, 'klatwa') || cards['klatwa']?.kind !== 'curse')) {
    bad('cards', 'an enemy uses a curse, so a card "klatwa" of kind "curse" is required');
  }

  const ritual: Record<string, readonly Effect[]> = value.balance.ritual;
  for (const key of Object.keys(ritual)) {
    if (!elementIds.has(key)) bad(`balance.ritual.${key}`, `unknown element "${key}"`);
  }
  for (const el of elementIds) {
    if (!Object.hasOwn(ritual, el))
      bad('balance.ritual', `missing ritual effect for element "${el}"`);
  }

  for (const [deckId, list] of Object.entries(value.decks)) {
    list.forEach((cardId, k) => {
      const card = Object.hasOwn(cards, cardId) ? cards[cardId] : undefined;
      if (card === undefined) bad(`decks.${deckId}[${k}]`, `unknown card "${cardId}"`);
      else if (card.kind === 'curse')
        bad(`decks.${deckId}[${k}]`, `curse card "${cardId}" cannot start in a deck`);
    });
  }

  if (issues.length > 0) throw new CombatDataError(source, issues);
  return {
    symbols,
    cards,
    enemies,
    balance: { playerMaxHp: value.balance.playerMaxHp, ritual },
    decks: value.decks,
  };
}

const FILES = ['symbols', 'cards', 'enemies', 'balance', 'decks'] as const;

function readJson(
  read: (file: string) => string,
  file: string,
): { value: unknown } | { error: string } {
  try {
    return { value: JSON.parse(read(file)) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Reads symbols.json, cards.json, enemies.json, balance.json and decks.json through `read`
 * (file name in, text out) and validates them with parseCombatData. The caller supplies `read`
 * (fs in tools and tests, a bundler import in the app), so this module stays free of Node APIs.
 * Unreadable or unparsable files are reported as issues with the file name as the field path.
 */
export function loadCombatData(read: (file: string) => string, source = 'src/data'): CombatData {
  const raw: Record<string, unknown> = {};
  const issues: CombatDataIssue[] = [];
  for (const name of FILES) {
    const result = readJson(read, `${name}.json`);
    if ('error' in result) {
      issues.push({
        fieldPath: `${name}.json`,
        detail: `cannot read or parse the file: ${result.error}`,
      });
    } else {
      raw[name] = result.value;
    }
  }
  if (issues.length > 0) throw new CombatDataError(source, issues);
  return parseCombatData(raw, source);
}
