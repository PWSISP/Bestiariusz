import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const tempDirs: string[] = [];
afterAll(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

const REPO = path.resolve(import.meta.dirname, '..', '..');
const SCRIPT = path.join(REPO, 'tools', 'qwen-run.mjs');
const TIMEOUT = 180_000;

const COPY_ITEMS = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.core.json',
  'vite.config.ts',
  'eslint.config.js',
  'tools/typecheck.mjs',
  'tools/qwen/CLAUDE.md',
];

const SPEC = '# FX-01 — add two numbers\n\nFile to edit: src/core/fx-01.ts\n';
const STUB =
  "export function add(_a: number, _b: number): number {\n  throw new Error('Not implemented');\n}\n";
const TEST = [
  "import { describe, expect, it } from 'vitest';",
  "import { add } from '../src/core/fx-01.ts';",
  '',
  "describe('add', () => {",
  "  it('adds', () => {",
  '    expect(add(2, 3)).toBe(5);',
  '    expect(add(-1, 1)).toBe(0);',
  '  });',
  '});',
  '',
].join('\n');
const GOOD = 'export function add(a: number, b: number): number {\n  return a + b;\n}\n';
const BAD = 'export function add(a: number, b: number): number {\n  return a - b;\n}\n';

function write(root: string, rel: string, content: string): void {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function read(root: string, rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function makeRoot(options: { spec?: string } = {}): string {
  const root = tempDir('qwen-run-');
  for (const item of COPY_ITEMS) {
    fs.cpSync(path.join(REPO, item), path.join(root, item), { recursive: true });
  }
  fs.symlinkSync(
    path.join(REPO, 'node_modules'),
    path.join(root, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  write(root, 'tasks/FX-01.md', options.spec ?? SPEC);
  write(root, 'tests/FX-01.test.ts', TEST);
  write(root, 'src/core/fx-01.ts', STUB);
  return root;
}

function runQwen(root: string, mockFiles: Record<string, string>, extraArgs: string[]) {
  const mockDir = tempDir('qwen-mock-');
  for (const [name, content] of Object.entries(mockFiles)) write(mockDir, name, content);
  const r = spawnSync(
    process.execPath,
    [SCRIPT, '--root', root, '--tasks', 'FX-01', '--mock', mockDir, ...extraArgs],
    { encoding: 'utf8', timeout: TIMEOUT },
  );
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

function readReport(root: string): string {
  const dir = path.join(root, 'results');
  const reports = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
  const last = reports.at(-1);
  if (!last) throw new Error('no report in results/');
  return fs.readFileSync(path.join(dir, last), 'utf8');
}

describe('qwen-run (mock mode)', () => {
  it(
    'adopts a passing solution with --apply',
    () => {
      const root = makeRoot();
      const r = runQwen(root, { 'FX-01.ts': GOOD }, ['--apply']);
      expect(r.status).toBe(0);
      expect(read(root, 'src/core/fx-01.ts')).toBe(GOOD);
      expect(readReport(root)).toMatch(/FX-01.*zaliczone/);
    },
    TIMEOUT,
  );

  it(
    'retries with test feedback after a failing first attempt',
    () => {
      const root = makeRoot();
      const r = runQwen(root, { 'FX-01.attempt1.ts': BAD, 'FX-01.attempt2.ts': GOOD }, [
        '--apply',
        '--attempts',
        '2',
      ]);
      expect(r.status).toBe(0);
      expect(readReport(root)).toContain('zaliczone w 2. podejściu');
      expect(read(root, 'src/core/fx-01.ts')).toBe(GOOD);
    },
    TIMEOUT,
  );

  it(
    'fails and leaves the repo untouched when the agent edits a protected file',
    () => {
      const root = makeRoot();
      const stub = read(root, 'src/core/fx-01.ts');
      const r = runQwen(root, { 'FX-01.ts': GOOD, 'FX-01.tamper': '' }, ['--apply']);
      expect(r.status).toBe(1);
      expect(read(root, 'src/core/fx-01.ts')).toBe(stub);
      expect(readReport(root)).toContain('tests/FX-01.test.ts');
    },
    TIMEOUT,
  );

  it(
    'rejects a spec without a "File to edit:" line',
    () => {
      const root = makeRoot({ spec: '# FX-01 — no target\n' });
      const r = runQwen(root, {}, []);
      expect(r.status).toBe(1);
      expect(r.stderr + r.stdout).toContain('File to edit');
    },
    TIMEOUT,
  );
});
