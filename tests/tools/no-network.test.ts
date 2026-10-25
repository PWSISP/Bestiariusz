// The tester build must not send anything over the network (S05-05): the app sources contain no way to
// do it. A guard for the telemetry and for everything added later; add an exception here, with a reason,
// when a sprint really needs the network (S18 ranking, S17 purchases).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../', import.meta.url);

function files(dir: string): string[] {
  return readdirSync(new URL(dir + '/', root)).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(new URL(path, root)).isDirectory()
      ? files(path)
      : path.endsWith('.ts')
        ? [path]
        : [];
  });
}

const FORBIDDEN: readonly [string, RegExp][] = [
  ['fetch', /(^|[^\w.$])fetch\s*\(/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['sendBeacon', /\bsendBeacon\b/],
  ['WebSocket', /\bWebSocket\b/],
  ['EventSource', /\bEventSource\b/],
  ['import of a URL', /\bimport\s*\(\s*['"`]https?:/],
];

const stripComments = (code: string): string =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('no network in the app sources', () => {
  const sources = files('src');
  it('finds the sources', () => {
    expect(sources.length).toBeGreaterThan(40);
  });
  it.each(FORBIDDEN)('src/ does not use %s', (_name, pattern) => {
    const offenders = sources.filter((f) =>
      pattern.test(stripComments(readFileSync(new URL(f, root), 'utf8'))),
    );
    expect(offenders).toEqual([]);
  });
});
