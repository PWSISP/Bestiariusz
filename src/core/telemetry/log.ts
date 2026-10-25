// Local telemetry log of the tester build (S05-05a). Pure: no clock, no storage, no network. The game
// layer fills it and the platform layer saves and exports the text this module produces.

/** Version of the file format; bump when a field changes. */
export const TELEMETRY_SCHEMA = 1;
/** The log keeps at most this many combats (the newest ones). */
export const MAX_RECORDS = 200;

export interface CombatRecord {
  /** Seed of the combat: unsigned 32-bit integer. */
  readonly seed: number;
  readonly enemyId: string;
  readonly outcome: 'won' | 'lost';
  /** Turn the combat ended in (1-based). */
  readonly turns: number;
  readonly hpLeft: number;
  readonly hpMax: number;
  readonly ritualUsed: boolean;
  /** Milliseconds from the start of the combat to its end. */
  readonly durationMs: number;
}

export interface LogMeta {
  /** Random id of this log, unsigned 32-bit integer (not a person's id). */
  readonly logId: number;
  /** Build label, e.g. a short commit hash; non-empty. */
  readonly build: string;
  /** ISO 8601 time the log was created; non-empty. */
  readonly startedAt: string;
}

export interface TelemetryLog extends LogMeta {
  readonly schema: typeof TELEMETRY_SCHEMA;
  readonly records: readonly CombatRecord[];
}

/** An empty log. Throws RangeError for invalid meta (see the task file). */
export function createLog(meta: LogMeta): TelemetryLog {
  // Validate meta
  if (!Number.isInteger(meta.logId) || meta.logId < 0 || meta.logId > 4294967295) {
    throw new RangeError('Invalid logId');
  }
  if (typeof meta.build !== 'string' || meta.build.trim() === '') {
    throw new RangeError('Invalid build');
  }
  if (typeof meta.startedAt !== 'string' || meta.startedAt.trim() === '') {
    throw new RangeError('Invalid startedAt');
  }

  return { schema: TELEMETRY_SCHEMA, ...meta, records: [] };
}

/** A new log with the record added at the end; the input is not modified. Throws RangeError for an invalid record. */
export function appendRecord(log: TelemetryLog, record: CombatRecord): TelemetryLog {
  // Validate record
  if (!Number.isInteger(record.seed) || record.seed < 0 || record.seed > 4294967295) {
    throw new RangeError('Invalid seed');
  }
  if (typeof record.enemyId !== 'string' || record.enemyId.length === 0) {
    throw new RangeError('Invalid enemyId');
  }
  if (record.outcome !== 'won' && record.outcome !== 'lost') {
    throw new RangeError('Invalid outcome');
  }
  if (!Number.isInteger(record.turns) || record.turns < 1) {
    throw new RangeError('Invalid turns');
  }
  if (!Number.isInteger(record.hpMax) || record.hpMax < 1) {
    throw new RangeError('Invalid hpMax');
  }
  if (!Number.isInteger(record.hpLeft) || record.hpLeft < 0 || record.hpLeft > record.hpMax) {
    throw new RangeError('Invalid hpLeft');
  }
  if (typeof record.ritualUsed !== 'boolean') {
    throw new RangeError('Invalid ritualUsed');
  }
  if (
    typeof record.durationMs !== 'number' ||
    !Number.isFinite(record.durationMs) ||
    record.durationMs < 0
  ) {
    throw new RangeError('Invalid durationMs');
  }

  // Normalize durationMs by rounding to whole number
  const normalizedRecord = {
    seed: record.seed,
    enemyId: record.enemyId,
    outcome: record.outcome,
    turns: record.turns,
    hpLeft: record.hpLeft,
    hpMax: record.hpMax,
    ritualUsed: record.ritualUsed,
    durationMs: Math.round(record.durationMs),
  };

  // Create new log with the record appended
  const newRecords = [...log.records, normalizedRecord];

  // If we exceed MAX_RECORDS, keep only the newest ones
  if (newRecords.length > MAX_RECORDS) {
    newRecords.splice(0, newRecords.length - MAX_RECORDS);
  }

  return { ...log, records: newRecords };
}

/** The log as the text of the exported file (see the task file for the exact format). */
export function serializeLog(log: TelemetryLog): string {
  // Create a copy with properties in the required order
  const ordered = {
    schema: log.schema,
    logId: log.logId,
    build: log.build,
    startedAt: log.startedAt,
    records: log.records,
  };

  return JSON.stringify(ordered, null, 2) + '\n';
}

/** The log read back from text made by serializeLog, or null when the text is not a valid log. */
export function parseLog(text: string): TelemetryLog | null {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  // Check if it's an object
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  // Validate schema
  if (parsed.schema !== TELEMETRY_SCHEMA) {
    return null;
  }

  // Validate meta fields
  const { logId, build, startedAt } = parsed;
  if (!Number.isInteger(logId) || logId < 0 || logId > 4294967295) {
    return null;
  }
  if (typeof build !== 'string' || build.trim() === '') {
    return null;
  }
  if (typeof startedAt !== 'string' || startedAt.trim() === '') {
    return null;
  }

  // Validate records
  const { records } = parsed;
  if (!Array.isArray(records)) {
    return null;
  }

  const validRecords: CombatRecord[] = [];
  for (const record of records) {
    // If any record is invalid, return null
    if (typeof record !== 'object' || record === null) {
      return null;
    }

    const { seed, enemyId, outcome, turns, hpLeft, hpMax, ritualUsed, durationMs } = record;

    // Validate all fields of the record
    if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295) {
      return null;
    }
    if (typeof enemyId !== 'string' || enemyId.length === 0) {
      return null;
    }
    if (outcome !== 'won' && outcome !== 'lost') {
      return null;
    }
    if (!Number.isInteger(turns) || turns < 1) {
      return null;
    }
    if (!Number.isInteger(hpMax) || hpMax < 1) {
      return null;
    }
    if (!Number.isInteger(hpLeft) || hpLeft < 0 || hpLeft > hpMax) {
      return null;
    }
    if (typeof ritualUsed !== 'boolean') {
      return null;
    }
    if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) {
      return null;
    }

    // Add the valid record with normalized duration
    validRecords.push({
      seed,
      enemyId,
      outcome,
      turns,
      hpLeft,
      hpMax,
      ritualUsed,
      durationMs: Math.round(durationMs),
    });
  }

  // If we have more than MAX_RECORDS records, keep only the newest ones
  if (validRecords.length > MAX_RECORDS) {
    validRecords.splice(0, validRecords.length - MAX_RECORDS);
  }

  return {
    schema: TELEMETRY_SCHEMA,
    logId,
    build,
    startedAt,
    records: validRecords,
  };
}
