import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { CombatDataError, loadCombatData, parseCombatData } from '../../src/data/combat-schema.ts';
import { SYMBOLS } from '../combat/fixtures.ts';

const rawOf = () => ({
  symbols: structuredClone(SYMBOLS),
  cards: [
    { id: 'ogien-wilk-gniew', kind: 'creature', cost: 2, creature: { element: 'ogien', form: 'wilk', trait: 'gniew' } },
    { id: 'uderzenie', kind: 'spell', cost: 1, element: null, effects: [{ kind: 'damage', amount: 6 }] },
    { id: 'plomien', kind: 'spell', cost: 2, element: 'ogien', effects: [{ kind: 'damage', amount: 9, pierce: true }] },
    { id: 'klatwa', kind: 'curse' },
  ],
  enemies: [
    {
      id: 'leszy',
      maxHp: 100,
      resist: ['ziemia'],
      weak: ['ogien'],
      actions: [
        { id: 'cios', baseWeight: 5, effects: [{ type: 'atak', amount: 12, direct: true }] },
        {
          id: 'zwod',
          baseWeight: 2,
          cooldown: 3,
          conditions: [{ when: 'playerCirclesAtLeast', value: 3, bonus: 4 }],
          effects: [{ type: 'klatwa', circle: 0 }, { type: 'kradziez' }],
        },
      ],
    },
  ],
  balance: {
    playerMaxHp: 40,
    ritual: {
      ogien: [{ kind: 'damage', amount: 14, pierce: true }],
      woda: [{ kind: 'heal', amount: 10 }],
      ziemia: [{ kind: 'block', amount: 15 }],
      wiatr: [{ kind: 'draw', count: 3 }, { kind: 'ember', amount: 2 }],
      grom: [{ kind: 'damage', amount: 16 }],
    },
  },
  decks: { start: ['ogien-wilk-gniew', 'uderzenie', 'uderzenie', 'plomien'] },
});

type Raw = ReturnType<typeof rawOf>;

function failure(raw: unknown): CombatDataError {
  try {
    parseCombatData(raw, 'combat.json');
  } catch (error) {
    expect(error).toBeInstanceOf(CombatDataError);
    return error as CombatDataError;
  }
  throw new Error('expected parseCombatData to throw');
}

describe('parseCombatData: valid data', () => {
  it('turns the card and enemy lists into records keyed by id', () => {
    const data = parseCombatData(rawOf(), 'combat.json');
    expect(Object.keys(data.cards)).toEqual(['ogien-wilk-gniew', 'uderzenie', 'plomien', 'klatwa']);
    expect(data.cards['plomien']).toEqual(rawOf().cards[2]);
    expect(data.enemies['leszy']?.actions[1]?.effects[1]).toEqual({ type: 'kradziez' });
    expect(data.balance.playerMaxHp).toBe(40);
    expect(data.decks['start']).toHaveLength(4);
  });

  it('does not touch its input', () => {
    const raw = rawOf();
    const copy = structuredClone(raw);
    parseCombatData(raw);
    expect(raw).toEqual(copy);
  });
});

describe('parseCombatData: rejects broken data with the field path', () => {
  const cases: [string, (raw: Raw) => unknown, string][] = [
    ['null root', () => null, '(root)'],
    ['array root', () => [], '(root)'],
    ['unknown top-level key', (r) => ({ ...r, extra: 1 }), '(root)'],
    ['no cards', (r) => ({ ...r, cards: [] }), 'cards'],
    ['no enemies', (r) => ({ ...r, enemies: [] }), 'enemies'],
    ['missing balance', (r) => ({ ...r, balance: undefined }), 'balance'],
    ['unknown card kind', (r) => ({ ...r, cards: [{ id: 'x', kind: 'relic' }] }), 'cards[0].kind'],
    [
      'negative cost',
      (r) => ({ ...r, cards: [{ ...r.cards[1], cost: -1 }] }),
      'cards[0].cost',
    ],
    [
      'fractional damage',
      (r) => ({ ...r, cards: [{ ...r.cards[1], effects: [{ kind: 'damage', amount: 6.5 }] }] }),
      'cards[0].effects[0].amount',
    ],
    [
      'spell without effects',
      (r) => ({ ...r, cards: [{ ...r.cards[1], effects: [] }] }),
      'cards[0].effects',
    ],
    [
      'unknown effect key',
      (r) => ({ ...r, cards: [{ ...r.cards[1], effects: [{ kind: 'block', amount: 3, pierce: true }] }] }),
      'cards[0].effects[0]',
    ],
    [
      'curse circle out of range',
      (r) => ({
        ...r,
        enemies: [{ ...r.enemies[0], actions: [{ id: 'k', baseWeight: 1, effects: [{ type: 'klatwa', circle: 3 }] }] }],
      }),
      'enemies[0].actions[0].effects[0].circle',
    ],
    [
      'zero enemy hp',
      (r) => ({ ...r, enemies: [{ ...r.enemies[0], maxHp: 0 }] }),
      'enemies[0].maxHp',
    ],
    [
      'enemy without actions',
      (r) => ({ ...r, enemies: [{ ...r.enemies[0], actions: [] }] }),
      'enemies[0].actions',
    ],
    [
      'unknown condition',
      (r) => ({
        ...r,
        enemies: [
          {
            ...r.enemies[0],
            actions: [{ id: 'k', baseWeight: 1, conditions: [{ when: 'moon', value: 1, bonus: 1 }], effects: [{ type: 'kradziez' }] }],
          },
        ],
      }),
      'enemies[0].actions[0].conditions[0].when',
    ],
    ['zero player hp', (r) => ({ ...r, balance: { ...r.balance, playerMaxHp: 0 } }), 'balance.playerMaxHp'],
    ['empty deck', (r) => ({ ...r, decks: { start: [] } }), 'decks.start'],
    [
      'broken symbols',
      (r) => ({ ...r, symbols: { ...r.symbols, elements: [{ ...r.symbols.elements[0], cost: 0 }] } }),
      'symbols.elements[0].cost',
    ],
    ['symbols missing', (r) => ({ ...r, symbols: undefined }), 'symbols'],
  ];

  it.each(cases)('%s', (_name, build, fieldPath) => {
    const err = failure(build(rawOf()));
    expect(err.fieldPath).toBe(fieldPath);
    expect(err.message).toContain('combat.json');
    expect(err.message).toContain(fieldPath);
    expect(err.issues.length).toBeGreaterThan(0);
  });
});

describe('parseCombatData: cross-references', () => {
  const cases: [string, (raw: Raw) => unknown, string][] = [
    [
      'creature with an unknown element',
      (r) => ({ ...r, cards: [{ ...r.cards[0], creature: { element: 'lod', form: 'wilk', trait: 'gniew' } }, ...r.cards.slice(1)] }),
      'cards[0].creature.element',
    ],
    [
      'creature with an unknown form',
      (r) => ({ ...r, cards: [{ ...r.cards[0], creature: { element: 'ogien', form: 'smok', trait: 'gniew' } }, ...r.cards.slice(1)] }),
      'cards[0].creature.form',
    ],
    [
      'creature with an unknown trait',
      (r) => ({ ...r, cards: [{ ...r.cards[0], creature: { element: 'ogien', form: 'wilk', trait: 'lek' } }, ...r.cards.slice(1)] }),
      'cards[0].creature.trait',
    ],
    [
      'spell with an unknown element',
      (r) => ({ ...r, cards: [r.cards[0], { ...r.cards[2], element: 'lod' }, r.cards[1], r.cards[3]] }),
      'cards[1].element',
    ],
    ['duplicate card id', (r) => ({ ...r, cards: [...r.cards, { ...r.cards[1] }] }), 'cards[4].id'],
    [
      'enemy resisting an unknown element',
      (r) => ({ ...r, enemies: [{ ...r.enemies[0], resist: ['lod'] }] }),
      'enemies[0].resist[0]',
    ],
    [
      'enemy weak to an unknown element',
      (r) => ({ ...r, enemies: [{ ...r.enemies[0], weak: ['ogien', 'lod'] }] }),
      'enemies[0].weak[1]',
    ],
    ['duplicate enemy id', (r) => ({ ...r, enemies: [r.enemies[0], r.enemies[0]] }), 'enemies[1].id'],
    [
      'duplicate enemy action id',
      (r) => ({
        ...r,
        enemies: [{ ...r.enemies[0], actions: [r.enemies[0]!.actions[0], r.enemies[0]!.actions[0]] }],
      }),
      'enemies[0].actions[1].id',
    ],
    [
      'curse used by an enemy but no "klatwa" card',
      (r) => ({ ...r, cards: r.cards.slice(0, 3) }),
      'cards',
    ],
    [
      'ritual for an unknown element',
      (r) => ({ ...r, balance: { ...r.balance, ritual: { ...r.balance.ritual, lod: [{ kind: 'block', amount: 1 }] } } }),
      'balance.ritual.lod',
    ],
    [
      'an element without a ritual',
      (r) => {
        const { grom: _grom, ...rest } = r.balance.ritual;
        return { ...r, balance: { ...r.balance, ritual: rest } };
      },
      'balance.ritual',
    ],
    ['deck with an unknown card', (r) => ({ ...r, decks: { start: ['uderzenie', 'nie-ma'] } }), 'decks.start[1]'],
    ['deck containing a curse', (r) => ({ ...r, decks: { start: ['uderzenie', 'klatwa'] } }), 'decks.start[1]'],
  ];

  it.each(cases)('%s', (_name, build, fieldPath) => {
    expect(failure(build(rawOf())).fieldPath).toBe(fieldPath);
  });

  it('reports every problem, not only the first', () => {
    const raw = rawOf();
    raw.decks = { start: ['nie-ma', 'tez-nie-ma'] };
    const err = failure(raw);
    expect(err.issues.map((i) => i.fieldPath)).toEqual(['decks.start[0]', 'decks.start[1]']);
  });
});

describe('loadCombatData', () => {
  const files = (): Record<string, string> => {
    const raw = rawOf();
    return {
      'symbols.json': JSON.stringify(raw.symbols),
      'cards.json': JSON.stringify(raw.cards),
      'enemies.json': JSON.stringify(raw.enemies),
      'balance.json': JSON.stringify(raw.balance),
      'decks.json': JSON.stringify(raw.decks),
    };
  };
  const readerOf = (texts: Record<string, string>) => (file: string): string => {
    const text = texts[file];
    if (text === undefined) throw new Error(`ENOENT: ${file}`);
    return text;
  };

  it('reads the five files through the injected reader and validates them', () => {
    const data = loadCombatData(readerOf(files()));
    expect(Object.keys(data.enemies)).toEqual(['leszy']);
    expect(data.decks['start']).toHaveLength(4);
  });

  it('reports a missing file with the file name as the field path', () => {
    const texts = files();
    delete texts['cards.json'];
    let error: unknown;
    try {
      loadCombatData(readerOf(texts), 'test-dir');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CombatDataError);
    expect((error as CombatDataError).fieldPath).toBe('cards.json');
    expect((error as CombatDataError).message).toContain('test-dir');
  });

  it('reports every broken file, and a JSON syntax error as an issue, not a raw SyntaxError', () => {
    const texts = { ...files(), 'decks.json': '{ "start": [', 'enemies.json': '' };
    let error: unknown;
    try {
      loadCombatData(readerOf(texts));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CombatDataError);
    expect((error as CombatDataError).issues.map((i) => i.fieldPath)).toEqual(['enemies.json', 'decks.json']);
  });

  it('still validates the content of well-formed files', () => {
    const texts = { ...files(), 'decks.json': JSON.stringify({ start: ['nie-ma'] }) };
    let error: unknown;
    try {
      loadCombatData(readerOf(texts));
    } catch (e) {
      error = e;
    }
    expect((error as CombatDataError).fieldPath).toBe('decks.start[0]');
  });
});

describe('the shipped data files in src/data', () => {
  const dataDir = new URL('../../src/data/', import.meta.url);
  const data = loadCombatData((file) => fs.readFileSync(new URL(file, dataDir), 'utf8'));

  it('are valid and define the starter deck and the first enemy', () => {
    expect(Object.keys(data.enemies)).toEqual(['leszy']);
    expect(data.decks['szeptucha']).toHaveLength(12);
    expect(data.balance.playerMaxHp).toBeGreaterThan(0); // the value itself is tuned in S02-11
  });

  it('use the symbol costs agreed in S01-11 (Grom 3, Niedźwiedź 4)', () => {
    expect(data.symbols.elements.find((e) => e.id === 'grom')?.cost).toBe(3);
    expect(data.symbols.forms.find((f) => f.id === 'niedzwiedz')?.cost).toBe(4);
  });

  it('every card in the starter deck can be played at least once with 3 ember', () => {
    for (const cardId of data.decks['szeptucha'] ?? []) {
      const card = data.cards[cardId];
      expect(card).toBeDefined();
      if (card && card.kind !== 'curse') expect(card.cost).toBeLessThanOrEqual(3);
    }
  });
});
