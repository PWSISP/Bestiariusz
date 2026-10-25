import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

async function ruleIds(code: string, file: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.resolve(file) });
  return (result?.messages ?? []).map((m) => m.ruleId ?? 'parse-error');
}

describe('architecture guards', () => {
  it('forbids Math.random anywhere in src', async () => {
    expect(await ruleIds('export const x = Math.random();', 'src/game/a.ts')).toContain(
      'no-restricted-properties',
    );
  });
  it('forbids Date.now in src/core but allows it in src/platform', async () => {
    expect(await ruleIds('export const x = Date.now();', 'src/core/a.ts')).toContain(
      'no-restricted-properties',
    );
    expect(await ruleIds('export const x = Date.now();', 'src/platform/a.ts')).toEqual([]);
  });
  it('forbids new Date() in src/core', async () => {
    expect(await ruleIds('export const x = new Date();', 'src/core/a.ts')).toContain(
      'no-restricted-syntax',
    );
  });
  it.each(['pixi.js', 'i18next', '@capacitor/core', '../ui/dom.ts', '../app/app.ts'])(
    'forbids importing %s from src/core',
    async (spec) => {
      const code = `import { x } from '${spec}'; export const y = x;`;
      expect(await ruleIds(code, 'src/core/a.ts')).toContain('no-restricted-imports');
    },
  );
  it('forbids the clock and randomness in src/view', async () => {
    expect(await ruleIds('export const x = Date.now();', 'src/view/a.ts')).toContain(
      'no-restricted-properties',
    );
    expect(await ruleIds('export const x = new Date();', 'src/view/a.ts')).toContain(
      'no-restricted-syntax',
    );
    expect(await ruleIds('export const x = Math.random();', 'src/view/a.ts')).toContain(
      'no-restricted-properties',
    );
  });
  it.each([
    'pixi.js',
    'i18next',
    '@capacitor/core',
    '../ui/dom.ts',
    '../game/game.ts',
    '../app/app.ts',
    '../platform/seed.ts',
  ])('forbids importing %s from src/view', async (spec) => {
    const code = `import { x } from '${spec}'; export const y = x;`;
    expect(await ruleIds(code, 'src/view/a.ts')).toContain('no-restricted-imports');
  });
  it('allows src/view to import core and data', async () => {
    const code =
      "import type { CombatState } from '../core/combat/model.ts'; export type S = CombatState;";
    expect(await ruleIds(code, 'src/view/a.ts')).toEqual([]);
  });
  it('forbids Node built-ins in src but allows them in tests', async () => {
    const code = "import fs from 'node:fs'; export const f = fs;";
    expect(await ruleIds(code, 'src/ui/a.ts')).toContain('no-restricted-imports');
    expect(await ruleIds(code, 'tests/a.test.ts')).toEqual([]);
  });
  it('requires import type for type-only imports', async () => {
    const code = "import { Foo } from './foo.ts'; export type Bar = Foo;";
    expect(await ruleIds(code, 'src/core/a.ts')).toContain(
      '@typescript-eslint/consistent-type-imports',
    );
  });
});

describe('UI text guard', () => {
  const bad: [string, string][] = [
    ['text assignment', "el.textContent = 'Zagraj';"],
    ['template literal text', 'el.innerText = `Tura ${n}`;'],
    ['aria label attribute', "el.setAttribute('aria-label', 'Zamknij');"],
    ['pixi Text options', "new Text({ text: 'Walka' });"],
    ['pixi Text string argument', "new Text('Walka');"],
  ];
  it.each(bad)('rejects %s in src/ui', async (_n, code) => {
    expect(await ruleIds(code, 'src/ui/a.ts')).toContain('no-restricted-syntax');
  });
  it.each([
    "el.textContent = t('screen.test.switch');",
    "el.textContent = '';",
    "el.className = 'ui-button';",
    "el.setAttribute('role', 'button');",
  ])('allows %s', async (code) => {
    expect(await ruleIds(code, 'src/ui/a.ts')).not.toContain('no-restricted-syntax');
  });
  it('does not apply to tests', async () => {
    expect(await ruleIds("el.textContent = 'x';", 'tests/a.test.ts')).not.toContain(
      'no-restricted-syntax',
    );
  });
});
