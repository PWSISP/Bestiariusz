// The game data bundled into the app: the same JSON files the tests and tools read from disk, run through
// the same schema, so a broken file fails here with a readable message instead of in the middle of a fight.
import balance from '../data/balance.json';
import cards from '../data/cards.json';
import decks from '../data/decks.json';
import enemies from '../data/enemies.json';
import symbols from '../data/symbols.json';
import type { CombatData } from '../core/combat/model.ts';
import { loadCombatData } from '../data/combat-schema.ts';

const FILES: Readonly<Record<string, unknown>> = {
  'balance.json': balance,
  'cards.json': cards,
  'decks.json': decks,
  'enemies.json': enemies,
  'symbols.json': symbols,
};

export function loadBundledCombatData(): CombatData {
  return loadCombatData((file) => {
    if (!Object.hasOwn(FILES, file)) throw new Error(`Unknown data file: ${file}`);
    return JSON.stringify(FILES[file]);
  }, 'bundled data');
}
