// Simulates bot-versus-enemy combats and writes a CSV: npm run sim -- --games 1000
import fs from 'node:fs';
import path from 'node:path';
import type { CombatData } from '../src/core/combat/model.ts';
import { runGames, summarize, toCsv } from '../src/core/sim/simulate.ts';
import { loadCombatData } from '../src/data/combat-schema.ts';

interface Options {
  games: number;
  seed: number;
  deck: string;
  enemy: string;
  /** Overrides the enemy's maximum health for this run (balancing experiments). */
  enemyHp: number | null;
  /** Overrides the player's maximum health for this run. */
  playerHp: number | null;
  out: string | null;
}

function fail(message: string): never {
  console.error(`Błąd: ${message}`);
  console.error(
    'Użycie: npm run sim -- [--games 1000] [--seed 20261102] [--deck szeptucha] [--enemy leszy] [--enemy-hp N] [--player-hp N] [--out plik.csv]',
  );
  process.exit(1);
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    games: 1000,
    seed: 20261102,
    deck: 'szeptucha',
    enemy: 'leszy',
    enemyHp: null,
    playerHp: null,
    out: null,
  };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (value === undefined) fail(`brak wartości po ${key}`);
    if (key === '--games') opts.games = Number(value);
    else if (key === '--seed') opts.seed = Number(value);
    else if (key === '--deck') opts.deck = value;
    else if (key === '--enemy') opts.enemy = value;
    else if (key === '--enemy-hp') opts.enemyHp = Number(value);
    else if (key === '--player-hp') opts.playerHp = Number(value);
    else if (key === '--out') opts.out = value;
    else fail(`nieznana opcja ${key}`);
  }
  if (!Number.isInteger(opts.games) || opts.games < 1)
    fail('--games musi być liczbą całkowitą >= 1');
  if (!Number.isInteger(opts.seed) || opts.seed < 0) fail('--seed musi być liczbą całkowitą >= 0');
  for (const [name, value] of [
    ['--enemy-hp', opts.enemyHp],
    ['--player-hp', opts.playerHp],
  ] as const) {
    if (value !== null && (!Number.isInteger(value) || value < 1))
      fail(`${name} musi być liczbą całkowitą >= 1`);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const dataDir = new URL('../src/data/', import.meta.url);
const loaded = loadCombatData((file) => fs.readFileSync(new URL(file, dataDir), 'utf8'));
const enemyDef = loaded.enemies[opts.enemy];
const data: CombatData = {
  ...loaded,
  enemies:
    enemyDef && opts.enemyHp !== null
      ? { ...loaded.enemies, [opts.enemy]: { ...enemyDef, maxHp: opts.enemyHp } }
      : loaded.enemies,
  balance:
    opts.playerHp !== null ? { ...loaded.balance, playerMaxHp: opts.playerHp } : loaded.balance,
};
const deck = data.decks[opts.deck];
if (!deck) fail(`nieznana talia "${opts.deck}" (dostępne: ${Object.keys(data.decks).join(', ')})`);
if (!data.enemies[opts.enemy]) {
  fail(`nieznany wróg "${opts.enemy}" (dostępni: ${Object.keys(data.enemies).join(', ')})`);
}

const started = performance.now();
const results = runGames(data, { deck, enemyId: opts.enemy }, opts.games, opts.seed);
const seconds = (performance.now() - started) / 1000;
const s = summarize(results);
const num = (x: number, digits = 1): string => x.toFixed(digits).replace('.', ',');
const outPath =
  opts.out ?? path.join('sim-results', `${opts.deck}-${opts.enemy}-${opts.seed}-${opts.games}.csv`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, toCsv(results));

console.log(
  `Bestiariusz — symulacja: ${opts.deck} kontra ${opts.enemy}, ${s.games} gier, ziarno ${opts.seed}`,
);
console.log(
  `Zdrowie: gracz ${data.balance.playerMaxHp}, ${opts.enemy} ${data.enemies[opts.enemy]?.maxHp ?? '?'}`,
);
console.log(`Wygrane:                      ${s.wins} (${num(s.winRate * 100)}%)`);
console.log(`Średnia liczba tur:           ${num(s.avgTurns)}`);
console.log(`Średnie zdrowie po wygranej:  ${num(s.avgHpLeftOnWin)}`);
console.log(`Walki z Obrzędem:             ${num(s.ritualRate * 100, 0)}%`);
console.log(`Przerwane (limit tur):        ${s.turnLimit}`);
console.log(`CSV: ${outPath}`);
console.log(`Czas: ${num(seconds)} s`);
