import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));

function sim(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ['tools/sim.ts', ...args], { cwd: root, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('npm run sim (tools/sim.ts)', () => {
  it('plays the games, prints the report and writes one CSV line per game', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bestiariusz-sim-'));
    const out = path.join(dir, 'wynik.csv');
    const r = sim('--games', '20', '--out', out);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Wygrane:');
    expect(r.stdout).toContain('Średnia liczba tur:');
    const lines = fs.readFileSync(out, 'utf8').trim().split('\n');
    expect(lines[0]).toBe('seed,won,turns,hp_left,ritual,reason');
    expect(lines).toHaveLength(21);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('--enemy-hp overrides the enemy health for the run', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bestiariusz-sim-'));
    const r = sim('--games', '20', '--enemy-hp', '1', '--out', path.join(dir, 'a.csv'));
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Wygrane:\s+20 \(100,0%\)/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it.each([
    [['--games', '0'], '--games'],
    [['--games', 'abc'], '--games'],
    [['--seed', '-5'], '--seed'],
    [['--enemy-hp', '0'], '--enemy-hp'],
    [['--deck', 'nie-ma'], 'szeptucha'],
    [['--enemy', 'nie-ma'], 'leszy'],
    [['--bogus', '1'], '--bogus'],
    [['--games'], '--games'],
  ])('rejects %j with a Polish message and exit code 1, not a stack trace', (args, mention) => {
    const r = sim(...args);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Błąd:');
    expect(r.stderr).toContain(mention);
    expect(r.stderr).not.toContain('    at ');
  });
});
