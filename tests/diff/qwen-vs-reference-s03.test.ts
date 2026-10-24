// Differential test for the Sprint 3 Qwen tasks S03-02, S03-03, S03-04 and S03-06: the shipped
// implementation must agree with the reference implementation (tests/reference/) on thousands of
// random inputs, including inputs the hand-written tests never name. Added after those tasks passed.

import { describe, expect, it } from 'vitest';
import { buildCreature } from '../../src/core/combat/creature.ts';
import * as synergy from '../../src/core/combat/synergy.ts';
import * as code from '../../src/core/creature-code.ts';
import * as creatures from '../../src/core/creatures.ts';
import * as legend from '../../src/core/legend.ts';
import { createRng } from '../../src/core/rng.ts';
import type { Rng } from '../../src/core/rng.ts';
import type { CreatureSpec, SymbolData } from '../../src/core/types.ts';
import { SYMBOLS } from '../combat/fixtures.ts';
import * as refSynergy from '../reference/synergy.ts';
import * as refCode from '../reference/creature-code.ts';
import * as refCreatures from '../reference/creatures.ts';
import * as refLegend from '../reference/legend.ts';

const ROUNDS = 3000;

const copyArg = (value: unknown): unknown => structuredClone(value);

/** Runs an implementation on a deep copy of the input; returns the value or the error class name. */
function outcome<A extends unknown[], R>(fn: (...args: A) => R, args: A): unknown {
  try {
    return { value: fn(...(args.map(copyArg) as A)) };
  } catch (error) {
    return { error: error instanceof Error ? error.constructor.name : String(error) };
  }
}

function sameOutcome<A extends unknown[], R>(
  real: (...args: A) => R,
  ref: (...args: A) => R,
  args: A,
): void {
  expect(outcome(real, args)).toEqual(outcome(ref, args));
}

function randomSymbols(r: Rng, maxEach = 4): SymbolData {
  const count = () => r.int(1, maxEach);
  return {
    elements: Array.from({ length: count() }, (_, i) => ({
      id: `e${i}`,
      cost: r.int(1, 5),
      attackBonus: r.int(-2, 3),
      healthBonus: r.int(-2, 3),
    })),
    forms: Array.from({ length: count() }, (_, i) => ({
      id: `f${i}`,
      cost: r.int(1, 5),
      baseAttack: r.int(0, 6),
      baseHealth: r.int(1, 8),
      gender: r.int(0, 1) === 0 ? ('m' as const) : ('f' as const),
    })),
    traits: Array.from({ length: count() }, (_, i) => ({
      id: `t${i}`,
      cost: r.int(1, 4),
      attackMod: r.int(-3, 3),
      healthMod: r.int(-3, 3),
    })),
  };
}

/** A spec made of ids of `symbols`, with an occasional unknown id. */
function randomSpec(r: Rng, symbols: SymbolData): CreatureSpec {
  const id = (group: readonly { id: string }[], unknown: string): string =>
    r.int(0, 11) === 0 ? unknown : r.pick(group).id;
  return {
    element: id(symbols.elements, 'nope'),
    form: id(symbols.forms, 'nope'),
    trait: id(symbols.traits, 'nope'),
  };
}

describe('differential: creatures (S03-02)', () => {
  it(`evaluateCreature and listValidCreatures agree on ${ROUNDS} random symbol sets`, () => {
    const r = createRng(31);
    for (let i = 0; i < ROUNDS; i++) {
      const symbols = randomSymbols(r);
      const rules = { powerBudget: r.int(3, 14), leftoverHealth: r.int(0, 3) };
      sameOutcome(creatures.evaluateCreature, refCreatures.evaluateCreature, [
        symbols,
        randomSpec(r, symbols),
        rules,
      ]);
      sameOutcome(creatures.listValidCreatures, refCreatures.listValidCreatures, [
        symbols,
        rules.powerBudget,
      ]);
    }
  });

  it('rates every one of the 150 creatures like the combat does (buildCreature)', () => {
    const rules = { powerBudget: 10, leftoverHealth: 1 };
    const list = creatures.listValidCreatures(SYMBOLS, rules.powerBudget);
    expect(list).toHaveLength(150);
    for (const spec of list) {
      const rated = creatures.evaluateCreature(SYMBOLS, spec, rules);
      const built = buildCreature(SYMBOLS, 'x', spec, rules);
      expect([rated.attack, rated.health]).toEqual([built.attack, built.health]);
    }
  });
});

describe('differential: creature code (S03-03)', () => {
  it(`encode and decode agree on ${ROUNDS} random creatures and codes`, () => {
    const r = createRng(32);
    const alphabet = refCode.CODE_ALPHABET + 'oilOIL- \t*U';
    for (let i = 0; i < ROUNDS; i++) {
      const symbols = randomSymbols(r, 18);
      const spec = randomSpec(r, symbols);
      const creature = { ...spec, variant: r.int(-2, 300) };
      sameOutcome(code.encodeCreatureCode, refCode.encodeCreatureCode, [symbols, creature]);

      const valid =
        r.int(0, 1) === 0
          ? refCode.encodeCreatureCode(SYMBOLS, {
              element: r.pick(SYMBOLS.elements).id,
              form: r.pick(SYMBOLS.forms).id,
              trait: r.pick(SYMBOLS.traits).id,
              variant: r.int(0, 255),
            })
          : '';
      const random = Array.from(
        { length: r.int(5, 9) },
        () => alphabet[r.int(0, alphabet.length - 1)],
      ).join('');
      const mutated =
        valid === ''
          ? random
          : valid.slice(0, 3) + alphabet[r.int(0, alphabet.length - 1)] + valid.slice(4);
      for (const text of [valid || random, mutated, random]) {
        sameOutcome(code.decodeCreatureCode, refCode.decodeCreatureCode, [symbols, text]);
        sameOutcome(code.decodeCreatureCode, refCode.decodeCreatureCode, [SYMBOLS, text]);
      }
    }
  });
});

describe('differential: legend (S03-04)', () => {
  it(`legendKey and describeLegend agree on ${ROUNDS} random creatures`, () => {
    const r = createRng(33);
    for (let i = 0; i < ROUNDS; i++) {
      const symbols = randomSymbols(r);
      const spec = randomSpec(r, symbols);
      const special = Array.from({ length: r.int(0, 3) }, () =>
        refLegend.legendKey(randomSpec(r, symbols)),
      );
      sameOutcome(legend.legendKey, refLegend.legendKey, [spec]);
      sameOutcome(legend.describeLegend, refLegend.describeLegend, [symbols, spec, special]);
      sameOutcome(legend.describeLegend, refLegend.describeLegend, [
        symbols,
        spec,
        [refLegend.legendKey(spec)],
      ]);
    }
  });
});

describe('differential: synergy (S03-06)', () => {
  it(`countScope and scaledAmount agree on ${ROUNDS} random boards`, () => {
    const r = createRng(34);
    const scopes = ['self', 'sameElementOthers', 'sameElementAll', 'othersAny', 'bogus'] as const;
    for (let i = 0; i < ROUNDS; i++) {
      const circles = Array.from({ length: r.int(0, 10) === 0 ? r.int(0, 4) : 3 }, () =>
        r.int(0, 3) === 0 ? null : { element: r.pick(['ogien', 'woda', 'wiatr']) },
      );
      const index = r.int(-1, 4);
      const scope = r.pick(scopes);
      sameOutcome(synergy.countScope, refSynergy.countScope, [scope as 'self', circles, index]);
      sameOutcome(synergy.scaledAmount, refSynergy.scaledAmount, [
        { amount: r.int(1, 5), scope: scope as 'self' },
        circles,
        index,
      ]);
    }
  });
});
