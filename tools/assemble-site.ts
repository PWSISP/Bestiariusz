// Puts the prototype site together for GitHub Pages (S05-03): the web build, the debug APK and a file
// with the version. Usage:
//   node tools/assemble-site.ts --dist dist --apk <app-debug.apk> --out site --build <label> --date <YYYY-MM-DD>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APK_NAME = 'bestiariusz-prototyp.apk';

export interface SiteOptions {
  readonly dist: string;
  readonly apk: string;
  readonly out: string;
  readonly build: string;
  readonly date: string;
}

export function assembleSite(options: SiteOptions): { readonly apkBytes: number } {
  const { dist, apk, out, build, date } = options;
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(build)) throw new Error(`Invalid build label: ${build}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date (YYYY-MM-DD): ${date}`);
  if (!fs.existsSync(path.join(dist, 'index.html')))
    throw new Error(`No web build in ${dist} (index.html is missing); run the build first`);
  if (!fs.existsSync(apk) || !fs.statSync(apk).isFile()) throw new Error(`No APK at ${apk}`);
  const bytes = fs.readFileSync(apk);
  // An APK is a zip archive: it starts with "PK". Catches an empty or wrong file before it is published.
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b)
    throw new Error(`${apk} is not an APK (not a zip archive)`);
  const rel = path.relative(path.resolve(dist), path.resolve(out));
  if (rel === '' || !rel.startsWith('..'))
    throw new Error('The output folder must be outside the web build folder');

  fs.rmSync(out, { recursive: true, force: true });
  fs.cpSync(dist, out, { recursive: true });
  fs.mkdirSync(path.join(out, 'apk'), { recursive: true });
  fs.writeFileSync(path.join(out, 'apk', APK_NAME), bytes);
  fs.writeFileSync(path.join(out, 'wersja.txt'), `build: ${build}\ndata: ${date}\n`);
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
  return { apkBytes: bytes.length };
}

function parseArgs(argv: readonly string[]): SiteOptions {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i];
    const value = argv[i + 1];
    if (!name?.startsWith('--') || value === undefined || value.startsWith('--'))
      throw new Error(`Bad arguments near "${name ?? ''}"`);
    values.set(name.slice(2), value);
  }
  const need = (name: string): string => {
    const value = values.get(name);
    if (!value) throw new Error(`Missing --${name}`);
    return value;
  };
  return {
    dist: need('dist'),
    apk: need('apk'),
    out: need('out'),
    build: need('build'),
    date: need('date'),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = assembleSite(parseArgs(process.argv.slice(2)));
    console.log(`Site ready: APK ${result.apkBytes} bytes`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
