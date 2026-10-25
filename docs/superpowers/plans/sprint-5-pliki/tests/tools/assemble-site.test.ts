import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { APK_NAME, assembleSite } from '../../tools/assemble-site.ts';

const dirs: string[] = [];
function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
  dirs.push(root);
  const dist = path.join(root, 'dist');
  fs.mkdirSync(path.join(dist, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(dist, 'testy'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), '<html></html>');
  fs.writeFileSync(path.join(dist, 'assets', 'a.js'), 'x');
  fs.writeFileSync(path.join(dist, 'testy', 'index.html'), '<html>instrukcja</html>');
  const apk = path.join(root, 'app-debug.apk');
  fs.writeFileSync(apk, Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.alloc(100, 7)]));
  return { root, dist, apk, out: path.join(root, 'site'), build: 'abc1234', date: '2026-12-28' };
}

afterAll(() => {
  for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
});

describe('assembleSite', () => {
  it('copies the web build, adds the APK and the version file', () => {
    const w = workspace();
    const result = assembleSite(w);
    expect(result.apkBytes).toBe(104);
    expect(fs.readFileSync(path.join(w.out, 'index.html'), 'utf8')).toBe('<html></html>');
    expect(fs.existsSync(path.join(w.out, 'assets', 'a.js'))).toBe(true);
    expect(fs.existsSync(path.join(w.out, 'testy', 'index.html'))).toBe(true);
    expect(fs.statSync(path.join(w.out, 'apk', APK_NAME)).size).toBe(104);
    expect(fs.readFileSync(path.join(w.out, 'wersja.txt'), 'utf8')).toBe(
      'build: abc1234\ndata: 2026-12-28\n',
    );
    expect(fs.existsSync(path.join(w.out, '.nojekyll'))).toBe(true);
  });
  it('replaces an older site folder and leaves the build folder alone', () => {
    const w = workspace();
    fs.mkdirSync(w.out);
    fs.writeFileSync(path.join(w.out, 'old.txt'), 'old');
    assembleSite(w);
    expect(fs.existsSync(path.join(w.out, 'old.txt'))).toBe(false);
    expect(fs.existsSync(path.join(w.dist, 'apk'))).toBe(false);
  });
  it('refuses a missing build, a missing or wrong APK and a bad label or date', () => {
    const w = workspace();
    expect(() => assembleSite({ ...w, dist: path.join(w.root, 'none') })).toThrow(/web build/);
    expect(() => assembleSite({ ...w, apk: path.join(w.root, 'none.apk') })).toThrow(/No APK/);
    const fake = path.join(w.root, 'fake.apk');
    fs.writeFileSync(fake, 'hello');
    expect(() => assembleSite({ ...w, apk: fake })).toThrow(/not an APK/);
    fs.writeFileSync(fake, '');
    expect(() => assembleSite({ ...w, apk: fake })).toThrow(/not an APK/);
    expect(() => assembleSite({ ...w, build: 'a b' })).toThrow(/build label/);
    expect(() => assembleSite({ ...w, build: '' })).toThrow(/build label/);
    expect(() => assembleSite({ ...w, date: '28.12.2026' })).toThrow(/date/);
  });
  it('refuses an output folder that is the build folder or inside it', () => {
    const w = workspace();
    expect(() => assembleSite({ ...w, out: w.dist })).toThrow(/outside/);
    expect(() => assembleSite({ ...w, out: path.join(w.dist, 'site') })).toThrow(/outside/);
    expect(fs.existsSync(path.join(w.dist, 'index.html'))).toBe(true);
  });
});

describe('command line', () => {
  const script = path.resolve('tools/assemble-site.ts');
  const run = (args: string[]) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  it('assembles the site and reports the size', () => {
    const w = workspace();
    const r = run(['--dist', w.dist, '--apk', w.apk, '--out', w.out, '--build', w.build, '--date', w.date]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('104 bytes');
    expect(fs.existsSync(path.join(w.out, 'apk', APK_NAME))).toBe(true);
  });
  it('fails with a message and exit code 1 on a missing argument', () => {
    const w = workspace();
    const r = run(['--dist', w.dist, '--apk', w.apk, '--out', w.out, '--build', w.build]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Missing --date');
    expect(fs.existsSync(w.out)).toBe(false);
  });
});
