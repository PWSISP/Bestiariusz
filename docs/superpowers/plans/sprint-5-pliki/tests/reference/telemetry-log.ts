// Reference implementation of S05-05a (written by Claude, not by Qwen). It checks that the test is
// satisfiable and is what Claude takes over with after five failed Qwen attempts. Not part of the app.
export const TELEMETRY_SCHEMA = 1;
export const MAX_RECORDS = 200;

export interface CombatRecord {
  readonly seed: number;
  readonly enemyId: string;
  readonly outcome: 'won' | 'lost';
  readonly turns: number;
  readonly hpLeft: number;
  readonly hpMax: number;
  readonly ritualUsed: boolean;
  readonly durationMs: number;
}
export interface LogMeta {
  readonly logId: number;
  readonly build: string;
  readonly startedAt: string;
}
export interface TelemetryLog extends LogMeta {
  readonly schema: typeof TELEMETRY_SCHEMA;
  readonly records: readonly CombatRecord[];
}

const isUint32 = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 0xffffffff;
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function checkMeta(meta: LogMeta): LogMeta {
  const m = meta as unknown as Record<string, unknown>;
  if (!m || !isUint32(m.logId) || !isText(m.build) || !isText(m.startedAt)) throw new RangeError('meta');
  return { logId: m.logId, build: m.build, startedAt: m.startedAt };
}

function checkRecord(record: CombatRecord): CombatRecord {
  const r = record as unknown as Record<string, unknown>;
  if (!r || typeof r !== 'object') throw new RangeError('record');
  const { seed, enemyId, outcome, turns, hpLeft, hpMax, ritualUsed, durationMs } = r;
  if (!isUint32(seed)) throw new RangeError('seed');
  if (typeof enemyId !== 'string' || enemyId.length === 0) throw new RangeError('enemyId');
  if (outcome !== 'won' && outcome !== 'lost') throw new RangeError('outcome');
  if (typeof turns !== 'number' || !Number.isInteger(turns) || turns < 1) throw new RangeError('turns');
  if (typeof hpMax !== 'number' || !Number.isInteger(hpMax) || hpMax < 1) throw new RangeError('hpMax');
  if (typeof hpLeft !== 'number' || !Number.isInteger(hpLeft) || hpLeft < 0 || hpLeft > hpMax)
    throw new RangeError('hpLeft');
  if (typeof ritualUsed !== 'boolean') throw new RangeError('ritualUsed');
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0)
    throw new RangeError('durationMs');
  return { seed, enemyId, outcome, turns, hpLeft, hpMax, ritualUsed, durationMs: Math.round(durationMs) };
}

export function createLog(meta: LogMeta): TelemetryLog {
  return { schema: TELEMETRY_SCHEMA, ...checkMeta(meta), records: [] };
}

export function appendRecord(log: TelemetryLog, record: CombatRecord): TelemetryLog {
  const records = [...log.records, checkRecord(record)];
  return { ...log, records: records.slice(Math.max(0, records.length - MAX_RECORDS)) };
}

export function serializeLog(log: TelemetryLog): string {
  const value = {
    schema: log.schema,
    logId: log.logId,
    build: log.build,
    startedAt: log.startedAt,
    records: log.records.map((r) => ({
      seed: r.seed,
      enemyId: r.enemyId,
      outcome: r.outcome,
      turns: r.turns,
      hpLeft: r.hpLeft,
      hpMax: r.hpMax,
      ritualUsed: r.ritualUsed,
      durationMs: r.durationMs,
    })),
  };
  return JSON.stringify(value, null, 2) + '\n';
}

export function parseLog(text: string): TelemetryLog | null {
  try {
    const raw: unknown = JSON.parse(text);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const o = raw as Record<string, unknown>;
    if (o.schema !== TELEMETRY_SCHEMA || !Array.isArray(o.records)) return null;
    let log = createLog({ logId: o.logId as number, build: o.build as string, startedAt: o.startedAt as string });
    for (const r of o.records) log = appendRecord(log, r as CombatRecord);
    return log;
  } catch {
    return null;
  }
}
