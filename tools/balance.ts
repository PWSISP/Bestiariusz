// Win rate of every creature the symbols allow, in a deck with the base deck: npm run balance -- --games 200
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CombatData } from '../src/core/combat/model.ts';
import { balanceToCsv, runBalance, WIN_RATE_MAX, WIN_RATE_MIN } from '../src/core/sim/balance.ts';
import { CombatDataError, loadCombatData } from '../src/data/combat-schema.ts';

interface Options {
  games: number;
  seed: number;
  deck: string;
  enemy: string;
  copies: number;
  out: string | null;
  /** Directory with the combat data files; src/data by default. */
  data: string | null;
}

function fail(message: string): never {
  console.error(`Błąd: ${message}`);
  console.error(
    'Użycie: npm run balance -- [--games 200] [--seed 20261130] [--deck szeptucha] [--enemy leszy] [--copies 1] [--out plik.csv] [--data katalog]',
  );
  process.exit(1);
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    games: 200,
    seed: 20261130,
    deck: 'szeptucha',
    enemy: 'leszy',
    copies: 1,
    out: null,
    data: null,
  };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (value === undefined) fail(`brak wartości po ${key}`);
    if (key === '--games') opts.games = Number(value);
    else if (key === '--seed') opts.seed = Number(value);
    else if (key === '--deck') opts.deck = value;
    else if (key === '--enemy') opts.enemy = value;
    else if (key === '--copies') opts.copies = Number(value);
    else if (key === '--out') opts.out = value;
    else if (key === '--data') opts.data = value;
    else fail(`nieznana opcja ${key}`);
  }
  if (!Number.isInteger(opts.games) || opts.games < 1)
    fail('--games musi być liczbą całkowitą >= 1');
  if (!Number.isInteger(opts.seed) || opts.seed < 0) fail('--seed musi być liczbą całkowitą >= 0');
  if (!Number.isInteger(opts.copies) || opts.copies < 1)
    fail('--copies musi być liczbą całkowitą >= 1');
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
const dataDir =
  opts.data === null ? fileURLToPath(new URL('../src/data/', import.meta.url)) : opts.data;
let data: CombatData;
try {
  data = loadCombatData((file) => fs.readFileSync(path.join(dataDir, file), 'utf8'), dataDir);
} catch (error) {
  if (!(error instanceof CombatDataError)) throw error;
  fail(`błędne dane walki: ${error.issues.map((i) => `${i.fieldPath} — ${i.detail}`).join('; ')}`);
}

if (!Object.hasOwn(data.decks, opts.deck)) {
  fail(`nieznana talia "${opts.deck}" (dostępne: ${Object.keys(data.decks).join(', ')})`);
}
if (!Object.hasOwn(data.enemies, opts.enemy)) {
  fail(`nieznany wróg "${opts.enemy}" (dostępni: ${Object.keys(data.enemies).join(', ')})`);
}
if (data.balance.powerBudget === undefined || !data.balance.workshop) {
  fail('dane nie mają balance.powerBudget i balance.workshop (balance.json)');
}

const started = performance.now();
const rows = runBalance(data, {
  baseDeck: opts.deck,
  enemyId: opts.enemy,
  games: opts.games,
  seed: opts.seed,
  copies: opts.copies,
});
const seconds = (performance.now() - started) / 1000;
const outPath =
  opts.out ?? path.join('sim-results', `balans-${opts.enemy}-${opts.seed}-${opts.games}.csv`);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, balanceToCsv(rows));

const pct = (x: number): string => (x * 100).toFixed(1).replace('.', ',');
const flagged = rows.filter((r) => r.flag !== 'ok');
console.log(
  `Bestiariusz — równowaga istot: ${rows.length} istot, talia ${opts.deck} + ${opts.copies}× badana istota, ${opts.enemy}, ${opts.games} gier każda, ziarno ${opts.seed}`,
);
const mean = rows.reduce((sum, r) => sum + r.winRate, 0) / rows.length;
console.log(
  `Średni odsetek wygranych: ${pct(mean)}% (norma ${pct(WIN_RATE_MIN)}–${pct(WIN_RATE_MAX)}%)`,
);
console.log(`Poza normą: ${flagged.length} z ${rows.length}`);
for (const r of flagged) {
  console.log(
    `  ${r.flag === 'low' ? 'za słaba' : 'za mocna'}: ${r.element}-${r.form}-${r.trait} (${pct(r.winRate)}%)`,
  );
}
console.log(`CSV: ${outPath}`);
console.log(`Czas: ${seconds.toFixed(1).replace('.', ',')} s`);
