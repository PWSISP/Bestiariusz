import { describe, expect, it } from 'vitest';
import { parseSymbolData, SymbolDataError } from '../../src/data/symbol-schema.ts';

const element = { id: 'ogien', cost: 3, attackBonus: 1, healthBonus: 0 };
const form = { id: 'wilk', cost: 4, baseAttack: 3, baseHealth: 4, gender: 'm' };
const trait = { id: 'gniew', cost: 3, attackMod: 2, healthMod: 0 };
const valid = { elements: [element], forms: [form], traits: [trait] };

describe('parseSymbolData', () => {
  it('loads one symbol of each kind', () => {
    const data = parseSymbolData(valid, 'test.json');
    expect(data.elements[0]).toEqual(element);
    expect(data.forms[0]).toEqual(form);
    expect(data.traits[0]).toEqual(trait);
  });

  it('does not touch its input', () => {
    const copy = structuredClone(valid);
    parseSymbolData(valid);
    expect(valid).toEqual(copy);
  });

  it.each([
    ['null root', null, '(root)'],
    ['array root', [], '(root)'],
    ['missing forms list', { ...valid, forms: undefined }, 'forms'],
    ['empty elements list', { ...valid, elements: [] }, 'elements'],
    ['cost as string', { ...valid, elements: [{ ...element, cost: '3' }] }, 'elements[0].cost'],
    ['cost zero', { ...valid, elements: [{ ...element, cost: 0 }] }, 'elements[0].cost'],
    ['cost fractional', { ...valid, traits: [{ ...trait, cost: 1.5 }] }, 'traits[0].cost'],
    ['bad gender', { ...valid, forms: [{ ...form, gender: 'x' }] }, 'forms[0].gender'],
    ['id with diacritics', { ...valid, traits: [{ ...trait, id: 'głód' }] }, 'traits[0].id'],
    ['unknown key', { ...valid, elements: [{ ...element, colr: 1 }] }, 'elements[0]'],
    ['duplicate id', { ...valid, elements: [element, { ...element }] }, 'elements[1].id'],
  ])('rejects %s with the field path', (_name, raw, fieldPath) => {
    let error: unknown;
    try {
      parseSymbolData(raw, 'symbols.json');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(SymbolDataError);
    const err = error as SymbolDataError;
    expect(err.fieldPath).toBe(fieldPath);
    expect(err.message).toContain('symbols.json');
    expect(err.message).toContain(fieldPath);
    expect(err.issues.length).toBeGreaterThan(0);
  });
});
