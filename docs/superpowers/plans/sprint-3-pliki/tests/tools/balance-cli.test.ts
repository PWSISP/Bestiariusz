import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));

function balance(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, ['tools/balance.ts', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('npm run balance (tools/balance.ts)', () => {
  it('rates all 150 creatures, prints the report and writes one CSV line per creature', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bestiariusz-balance-'));
    const out = path.join(dir, 'balans.csv');
    const r = balance('--games', '3', '--out', out);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('150 istot');
    expect(r.stdout).toContain('Poza normą:');
    const lines = fs.readFileSync(out, 'utf8').trim().split('\n');
    expect(lines[0]).toBe('element,form,trait,cost,attack,health,games,wins,win_rate,avg_turns,flag');
    expect(lines).toHaveLength(151);
    expect(lines[1]?.startsWith('ogien,wilk,gniew,10,')).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it.each([
    [['--games', '0'], '--games'],
    [['--games', 'abc'], '--games'],
    [['--seed', '-5'], '--seed'],
    [['--copies', '0'], '--copies'],
    [['--deck', 'nie-ma'], 'szeptucha'],
    [['--deck', 'toString'], 'szeptucha'],
    [['--enemy', 'nie-ma'], 'leszy'],
    [['--enemy', '__proto__'], 'leszy'],
    [['--bogus', '1'], '--bogus'],
    [['--games'], '--games'],
    [['--data', 'tests/no-such-dir'], 'symbols.json'],
  ])('rejects %j with a Polish message and exit code 1, not a stack trace', (args, mention) => {
    const r = balance(...args);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Błąd:');
    expect(r.stderr).toContain(mention);
    expect(r.stderr).not.toContain('    at ');
  });
});
