import { describe, expect, it } from 'vitest';
import {
  MAX_RECORDS,
  TELEMETRY_SCHEMA,
  appendRecord,
  createLog,
  parseLog,
  serializeLog,
} from '../src/core/telemetry/log.ts';
import type { CombatRecord, LogMeta } from '../src/core/telemetry/log.ts';

const META: LogMeta = { logId: 123456, build: 'abc1234', startedAt: '2026-12-28T10:00:00.000Z' };
const REC: CombatRecord = {
  seed: 20261102,
  enemyId: 'leszy',
  outcome: 'won',
  turns: 14,
  hpLeft: 9,
  hpMax: 30,
  ritualUsed: true,
  durationMs: 187_250,
};
const rec = (patch: Record<string, unknown>): CombatRecord => ({ ...REC, ...patch }) as CombatRecord;
const meta = (patch: Record<string, unknown>): LogMeta => ({ ...META, ...patch }) as LogMeta;

describe('constants', () => {
  it('has schema 1 and a limit of 200 records', () => {
    expect(TELEMETRY_SCHEMA).toBe(1);
    expect(MAX_RECORDS).toBe(200);
  });
});

describe('createLog', () => {
  it('returns an empty log with the meta', () => {
    expect(createLog(META)).toEqual({ schema: 1, ...META, records: [] });
  });
  it.each([
    ['negative logId', { logId: -1 }],
    ['fractional logId', { logId: 1.5 }],
    ['logId above 32 bits', { logId: 4294967296 }],
    ['NaN logId', { logId: Number.NaN }],
    ['string logId', { logId: '5' }],
    ['empty build', { build: '' }],
    ['blank build', { build: '   ' }],
    ['numeric build', { build: 7 }],
    ['blank startedAt', { startedAt: ' ' }],
    ['missing startedAt', { startedAt: undefined }],
  ])('throws RangeError for %s', (_name, patch) => {
    expect(() => createLog(meta(patch))).toThrow(RangeError);
  });
  it('accepts the limits of logId', () => {
    expect(createLog(meta({ logId: 0 })).logId).toBe(0);
    expect(createLog(meta({ logId: 4294967295 })).logId).toBe(4294967295);
  });
});

describe('appendRecord', () => {
  it('adds the record at the end and keeps the input unchanged', () => {
    const log = createLog(META);
    const next = appendRecord(log, REC);
    expect(next.records).toEqual([REC]);
    expect(log.records).toEqual([]);
    expect(next).not.toBe(log);
    const third = appendRecord(next, rec({ seed: 5, outcome: 'lost', hpLeft: 0 }));
    expect(third.records.map((r) => r.seed)).toEqual([20261102, 5]);
    expect(next.records).toHaveLength(1);
  });
  it('keeps the meta', () => {
    expect(appendRecord(createLog(META), REC)).toMatchObject({ schema: 1, ...META });
  });
  it('rounds the duration to a whole number', () => {
    const r = (ms: number) => appendRecord(createLog(META), rec({ durationMs: ms })).records[0]?.durationMs;
    expect(r(1234.5)).toBe(1235);
    expect(r(1234.4)).toBe(1234);
    expect(r(0.4)).toBe(0);
    expect(r(0)).toBe(0);
  });
  it('ignores extra properties', () => {
    const next = appendRecord(createLog(META), rec({ secret: 'x', name: 'Jan' }));
    expect(next.records[0]).toEqual(REC);
    expect(Object.keys(next.records[0] as object)).not.toContain('secret');
  });
  it('accepts the limits of every field', () => {
    const edge = rec({ seed: 0, turns: 1, hpLeft: 0, hpMax: 1, durationMs: 0, outcome: 'lost' });
    expect(appendRecord(createLog(META), edge).records).toHaveLength(1);
    const top = rec({ seed: 4294967295, hpLeft: 30, hpMax: 30 });
    expect(appendRecord(createLog(META), top).records).toHaveLength(1);
  });
  it.each([
    ['negative seed', { seed: -1 }],
    ['fractional seed', { seed: 1.2 }],
    ['seed above 32 bits', { seed: 2 ** 32 }],
    ['empty enemyId', { enemyId: '' }],
    ['numeric enemyId', { enemyId: 3 }],
    ['unknown outcome', { outcome: 'draw' }],
    ['zero turns', { turns: 0 }],
    ['fractional turns', { turns: 2.5 }],
    ['zero hpMax', { hpMax: 0 }],
    ['negative hpLeft', { hpLeft: -1 }],
    ['hpLeft above hpMax', { hpLeft: 31 }],
    ['fractional hpLeft', { hpLeft: 2.5 }],
    ['ritualUsed as number', { ritualUsed: 1 }],
    ['missing ritualUsed', { ritualUsed: undefined }],
    ['NaN duration', { durationMs: Number.NaN }],
    ['infinite duration', { durationMs: Number.POSITIVE_INFINITY }],
    ['negative duration', { durationMs: -1 }],
    ['slightly negative duration', { durationMs: -0.4 }],
    ['string duration', { durationMs: '10' }],
  ])('throws RangeError for %s', (_name, patch) => {
    expect(() => appendRecord(createLog(META), rec(patch))).toThrow(RangeError);
  });
  it('keeps only the newest 200 records, in order', () => {
    let log = createLog(META);
    for (let i = 0; i < 205; i++) log = appendRecord(log, rec({ seed: i }));
    expect(log.records).toHaveLength(MAX_RECORDS);
    expect(log.records[0]?.seed).toBe(5);
    expect(log.records[199]?.seed).toBe(204);
  });
  it('does not drop anything at exactly 200 records', () => {
    let log = createLog(META);
    for (let i = 0; i < 200; i++) log = appendRecord(log, rec({ seed: i }));
    expect(log.records).toHaveLength(200);
    expect(log.records[0]?.seed).toBe(0);
  });
});

describe('serializeLog', () => {
  it('writes an empty log exactly', () => {
    expect(serializeLog(createLog(META))).toBe(
      [
        '{',
        '  "schema": 1,',
        '  "logId": 123456,',
        '  "build": "abc1234",',
        '  "startedAt": "2026-12-28T10:00:00.000Z",',
        '  "records": []',
        '}',
        '',
      ].join('\n'),
    );
  });
  it('writes one record exactly, keys in the documented order', () => {
    expect(serializeLog(appendRecord(createLog(META), REC))).toBe(
      [
        '{',
        '  "schema": 1,',
        '  "logId": 123456,',
        '  "build": "abc1234",',
        '  "startedAt": "2026-12-28T10:00:00.000Z",',
        '  "records": [',
        '    {',
        '      "seed": 20261102,',
        '      "enemyId": "leszy",',
        '      "outcome": "won",',
        '      "turns": 14,',
        '      "hpLeft": 9,',
        '      "hpMax": 30,',
        '      "ritualUsed": true,',
        '      "durationMs": 187250',
        '    }',
        '  ]',
        '}',
        '',
      ].join('\n'),
    );
  });
  it('puts the keys in the same order even when the log was built with another order', () => {
    const shuffled = {
      records: [],
      startedAt: META.startedAt,
      build: META.build,
      logId: META.logId,
      schema: 1,
    } as const;
    expect(serializeLog(shuffled)).toBe(serializeLog(createLog(META)));
  });
  it('escapes text in strings', () => {
    const log = appendRecord(createLog(meta({ build: 'a"b\\c' })), rec({ enemyId: 'x\ny' }));
    expect(JSON.parse(serializeLog(log))).toMatchObject({ build: 'a"b\\c', records: [{ enemyId: 'x\ny' }] });
  });
});

describe('parseLog', () => {
  it('reads back what serializeLog wrote', () => {
    let log = createLog(META);
    log = appendRecord(log, REC);
    log = appendRecord(log, rec({ seed: 7, outcome: 'lost', hpLeft: 0, ritualUsed: false, durationMs: 4000 }));
    expect(parseLog(serializeLog(log))).toEqual(log);
    expect(parseLog(serializeLog(createLog(META)))).toEqual(createLog(META));
  });
  it('accepts other whitespace and key order', () => {
    const text = JSON.stringify({ records: [REC], build: 'abc1234', schema: 1, startedAt: META.startedAt, logId: 123456 });
    expect(parseLog(text)).toEqual(appendRecord(createLog(META), REC));
  });
  it.each(['', '   ', 'null', '[]', '42', '"x"', '{', '{}', 'not json'])('returns null for %j', (text) => {
    expect(parseLog(text)).toBeNull();
  });
  it('returns null for another schema or a missing part', () => {
    const base = JSON.parse(serializeLog(appendRecord(createLog(META), REC))) as Record<string, unknown>;
    const bad = (patch: Record<string, unknown>) => parseLog(JSON.stringify({ ...base, ...patch }));
    expect(bad({ schema: 2 })).toBeNull();
    expect(bad({ schema: undefined })).toBeNull();
    expect(bad({ logId: -3 })).toBeNull();
    expect(bad({ build: '' })).toBeNull();
    expect(bad({ startedAt: undefined })).toBeNull();
    expect(bad({ records: 'x' })).toBeNull();
    expect(bad({ records: undefined })).toBeNull();
  });
  it('returns null when any record is invalid', () => {
    const base = JSON.parse(serializeLog(createLog(META))) as Record<string, unknown>;
    const withRecords = (records: unknown[]) => parseLog(JSON.stringify({ ...base, records }));
    expect(withRecords([REC, { ...REC, turns: 0 }])).toBeNull();
    expect(withRecords([REC, { ...REC, outcome: 'draw' }])).toBeNull();
    expect(withRecords([REC, null])).toBeNull();
    expect(withRecords([REC, 5])).toBeNull();
    expect(withRecords([REC])).not.toBeNull();
  });
  it('keeps only the newest 200 records of a longer file', () => {
    const base = JSON.parse(serializeLog(createLog(META))) as Record<string, unknown>;
    const records = Array.from({ length: 230 }, (_, i) => ({ ...REC, seed: i }));
    const log = parseLog(JSON.stringify({ ...base, records }));
    expect(log?.records).toHaveLength(200);
    expect(log?.records[0]?.seed).toBe(30);
    expect(log?.records[199]?.seed).toBe(229);
  });
  it('never throws', () => {
    for (const text of ['\u0000', '{"schema":1,"records":[{}]}', '{"schema":1,"logId":1e999}', '[[[[']) {
      expect(() => parseLog(text)).not.toThrow();
    }
  });
});
