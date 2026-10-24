import { describe, expect, it } from 'vitest';
import { parseSymbolData, SymbolDataError } from '../../src/data/symbol-schema.ts';

const effect = { trigger: 'attack', op: 'strike', amount: 1, scope: 'sameElementOthers', pierce: true };
const element = { id: 'ogien', cost: 3, attackBonus: 1, healthBonus: 0, effects: [effect] };
const form = { id: 'wilk', cost: 4, baseAttack: 3, baseHealth: 4, gender: 'm' };
const trait = { id: 'gniew', cost: 3, attackMod: 2, healthMod: 0 };
const valid = { elements: [element], forms: [form], traits: [trait] };
const withEffect = (patch: Record<string, unknown>) => ({
  ...valid,
  elements: [{ ...element, effects: [{ ...effect, ...patch }] }],
});

describe('effects in symbols.json', () => {
  it('are optional and kept as written', () => {
    const data = parseSymbolData(valid);
    expect(data.elements[0]?.effects).toEqual([effect]);
    expect(data.forms[0]?.effects).toBeUndefined();
    const onForm = parseSymbolData({
      ...valid,
      forms: [{ ...form, effects: [{ trigger: 'summon', op: 'draw', amount: 2, scope: 'self' }] }],
    });
    expect(onForm.forms[0]?.effects).toEqual([
      { trigger: 'summon', op: 'draw', amount: 2, scope: 'self' },
    ]);
  });

  it.each([
    ['unknown trigger', withEffect({ trigger: 'death' }), 'elements[0].effects[0].trigger'],
    ['unknown op', withEffect({ op: 'explode' }), 'elements[0].effects[0].op'],
    ['unknown scope', withEffect({ scope: 'everyone' }), 'elements[0].effects[0].scope'],
    ['amount zero', withEffect({ amount: 0 }), 'elements[0].effects[0].amount'],
    ['amount fractional', withEffect({ amount: 1.5 }), 'elements[0].effects[0].amount'],
    ['pierce on a non-strike', withEffect({ op: 'guard' }), 'elements[0].effects[0].pierce'],
    ['unknown key', withEffect({ colour: 'red' }), 'elements[0].effects[0]'],
    [
      'effects not a list',
      { ...valid, elements: [{ ...element, effects: effect }] },
      'elements[0].effects',
    ],
  ])('reject %s with the field path', (_name, raw, fieldPath) => {
    let error: unknown;
    try {
      parseSymbolData(raw, 'symbols.json');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(SymbolDataError);
    expect((error as SymbolDataError).fieldPath).toBe(fieldPath);
  });
});
