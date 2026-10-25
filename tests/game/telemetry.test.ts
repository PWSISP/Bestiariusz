// The glue between the combat loop and the telemetry log (S05-05b): clock, storage, failures.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseLog } from '../../src/core/telemetry/log.ts';
import type { CombatSummary } from '../../src/core/combat/summary.ts';
import { createTelemetry } from '../../src/game/telemetry.ts';
import type { TelemetryDeps } from '../../src/game/telemetry.ts';
import { createLocalStore, exportTelemetry } from '../../src/platform/telemetry-store.ts';
import type { TelemetryStorage } from '../../src/platform/telemetry-store.ts';

const WON: CombatSummary = {
  outcome: 'won',
  enemyId: 'leszy',
  turns: 18,
  hpLeft: 12,
  hpMax: 40,
  ritualUsed: true,
};
const LOST: CombatSummary = { ...WON, outcome: 'lost', hpLeft: 0, ritualUsed: false };

function memoryStore(
  initial: string | null = null,
): TelemetryStorage & { value: string | null; saves: number } {
  const store = {
    value: initial,
    saves: 0,
    load: () => store.value,
    save: (text: string) => {
      store.value = text;
      store.saves += 1;
    },
  };
  return store;
}

function setup(store: TelemetryStorage = memoryStore(), build = 'abc1234') {
  let now = 1000;
  const deps: TelemetryDeps = {
    store,
    clock: () => now,
    wallClock: () => '2026-12-28T10:00:00.000Z',
    newId: () => 777,
    build,
  };
  return { telemetry: createTelemetry(deps), advance: (ms: number) => (now += ms) };
}

describe('createTelemetry', () => {
  it('starts with an empty log with the build and a fresh id', () => {
    const { telemetry } = setup();
    expect(telemetry.count()).toBe(0);
    expect(parseLog(telemetry.text())).toMatchObject({
      logId: 777,
      build: 'abc1234',
      startedAt: '2026-12-28T10:00:00.000Z',
      records: [],
    });
    expect(telemetry.filename()).toBe('bestiariusz-sesja-abc1234-777.json');
  });

  it('falls back to the build label dev when the label is empty (it never throws into the game)', () => {
    const { telemetry } = setup(memoryStore(), '');
    expect(parseLog(telemetry.text())).toMatchObject({ build: 'dev', logId: 777 });
    expect(telemetry.filename()).toBe('bestiariusz-sesja-dev-777.json');
  });

  it('records a combat with its seed, summary and duration, and saves the log', () => {
    const store = memoryStore();
    const { telemetry, advance } = setup(store);
    telemetry.combatStarted(7);
    advance(187_250.4);
    telemetry.combatFinished(WON);
    expect(telemetry.count()).toBe(1);
    expect(store.saves).toBe(1);
    expect(parseLog(store.value ?? '')?.records).toEqual([
      {
        seed: 7,
        enemyId: 'leszy',
        outcome: 'won',
        turns: 18,
        hpLeft: 12,
        hpMax: 40,
        ritualUsed: true,
        durationMs: 187_250,
      },
    ]);
    expect(telemetry.text()).toBe(store.value);
  });

  it('records combats in order', () => {
    const { telemetry, advance } = setup();
    telemetry.combatStarted(1);
    advance(10);
    telemetry.combatFinished(WON);
    telemetry.combatStarted(2);
    advance(20);
    telemetry.combatFinished(LOST);
    const records = parseLog(telemetry.text())?.records ?? [];
    expect(records.map((r) => [r.seed, r.outcome, r.durationMs])).toEqual([
      [1, 'won', 10],
      [2, 'lost', 20],
    ]);
  });

  it('ignores a finish without a start and a second finish of the same combat', () => {
    const { telemetry } = setup();
    telemetry.combatFinished(WON);
    expect(telemetry.count()).toBe(0);
    telemetry.combatStarted(3);
    telemetry.combatFinished(WON);
    telemetry.combatFinished(WON);
    expect(telemetry.count()).toBe(1);
  });

  it('keeps the log across launches', () => {
    const store = memoryStore();
    const first = setup(store);
    first.telemetry.combatStarted(5);
    first.advance(100);
    first.telemetry.combatFinished(WON);
    const second = setup(store, 'other');
    expect(second.telemetry.count()).toBe(1);
    expect(second.telemetry.filename()).toBe('bestiariusz-sesja-abc1234-777.json');
    second.telemetry.combatStarted(6);
    second.advance(5);
    second.telemetry.combatFinished(LOST);
    expect(second.telemetry.count()).toBe(2);
  });

  it('starts a fresh log when the saved text is damaged', () => {
    const { telemetry } = setup(memoryStore('{"schema":1,'));
    expect(telemetry.count()).toBe(0);
    expect(telemetry.filename()).toContain('-777');
  });

  it('survives a store that throws', () => {
    const broken: TelemetryStorage = {
      load: () => {
        throw new Error('blocked');
      },
      save: () => {
        throw new Error('full');
      },
    };
    const { telemetry } = setup(broken);
    telemetry.combatStarted(1);
    expect(() => telemetry.combatFinished(WON)).not.toThrow();
    expect(telemetry.count()).toBe(1);
  });

  it('skips a summary the log refuses (it never throws into the game)', () => {
    const { telemetry } = setup();
    telemetry.combatStarted(1);
    expect(() => telemetry.combatFinished({ ...WON, turns: 0 })).not.toThrow();
    expect(telemetry.count()).toBe(0);
  });

  it('records a negative duration (clock went back) as zero', () => {
    const { telemetry, advance } = setup();
    telemetry.combatStarted(1);
    advance(-50);
    telemetry.combatFinished(WON);
    expect(parseLog(telemetry.text())?.records[0]?.durationMs).toBe(0);
  });
});

describe('createLocalStore', () => {
  it('reads and writes under one key', () => {
    const data = new Map<string, string>();
    const store = createLocalStore(
      { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) },
      'k',
    );
    expect(store.load()).toBeNull();
    store.save('hello');
    expect(store.load()).toBe('hello');
    expect(data.get('k')).toBe('hello');
  });
  it('swallows storage errors and works without storage', () => {
    const angry = createLocalStore({
      getItem: () => {
        throw new Error('no');
      },
      setItem: () => {
        throw new Error('no');
      },
    });
    expect(angry.load()).toBeNull();
    expect(() => angry.save('x')).not.toThrow();
    const none = createLocalStore(null);
    expect(none.load()).toBeNull();
    expect(() => none.save('x')).not.toThrow();
  });
});

describe('exportTelemetry', () => {
  it('downloads the file and copies the text', async () => {
    const calls: string[] = [];
    const outcome = await exportTelemetry('TEXT', 'f.json', {
      clipboard: { writeText: async (t) => void calls.push(`copy:${t}`) },
      download: (name, text) => void calls.push(`file:${name}:${text}`),
    });
    expect(outcome).toBe('copied');
    expect(calls).toEqual(['file:f.json:TEXT', 'copy:TEXT']);
  });
  it('still copies when the download fails, and asks for manual copy when copying fails', async () => {
    const failingDownload = () => {
      throw new Error('no');
    };
    expect(
      await exportTelemetry('T', 'f', {
        clipboard: { writeText: async () => undefined },
        download: failingDownload,
      }),
    ).toBe('copied');
    expect(
      await exportTelemetry('T', 'f', {
        clipboard: {
          writeText: async () => {
            throw new Error('denied');
          },
        },
        download: null,
      }),
    ).toBe('manual');
    expect(await exportTelemetry('T', 'f', { clipboard: null, download: null })).toBe('manual');
  });
});

describe('texts of the export', () => {
  it('exist in both languages', () => {
    const root = new URL('../../', import.meta.url);
    for (const lang of ['pl', 'en']) {
      const json = JSON.parse(
        readFileSync(new URL(`src/i18n/${lang}.json`, root), 'utf8'),
      ) as Record<string, string>;
      for (const key of ['result.export', 'result.export.copied', 'result.export.manual'])
        expect(json[key], `${lang}: ${key}`).toBeTruthy();
    }
  });
});
