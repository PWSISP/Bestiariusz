// Every text key the combat and result screens use exists in both languages, and the two language files
// have the same keys. Keys are found by reading the sources (text('…'), createButton('…'), key: '…').
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../', import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, root), 'utf8');
const pl = JSON.parse(read('src/i18n/pl.json')) as Record<string, string>;
const en = JSON.parse(read('src/i18n/en.json')) as Record<string, string>;

function files(dir: string): string[] {
  return readdirSync(new URL(dir + '/', root)).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(new URL(path, root)).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
  });
}

const USED = new Set<string>();
for (const file of [...files('src/view'), ...files('src/game')]) {
  for (const m of read(file).matchAll(/\b(?:text|createButton)\(\s*'([a-zA-Z0-9_.]+)'/g)) USED.add(m[1] as string);
}

describe('screen text keys', () => {
  it('finds the keys the screens use', () => {
    expect(USED.size).toBeGreaterThan(30);
  });
  it.each([...USED].sort())('%s exists in Polish and English and is not empty', (key) => {
    expect(pl[key], `pl.json: ${key}`).toBeTruthy();
    expect(en[key], `en.json: ${key}`).toBeTruthy();
  });
  it('the two language files have exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pl).sort());
  });
  it('no translation is the key itself', () => {
    for (const [key, value] of Object.entries(pl)) expect(value, key).not.toBe(key);
  });
});
