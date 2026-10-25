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
export function createLog(_meta: LogMeta): TelemetryLog {
  throw new Error('Not implemented');
}

/** A new log with the record added at the end; the input is not modified. Throws RangeError for an invalid record. */
export function appendRecord(_log: TelemetryLog, _record: CombatRecord): TelemetryLog {
  throw new Error('Not implemented');
}

/** The log as the text of the exported file (see the task file for the exact format). */
export function serializeLog(_log: TelemetryLog): string {
  throw new Error('Not implemented');
}

/** The log read back from text made by serializeLog, or null when the text is not a valid log. */
export function parseLog(_text: string): TelemetryLog | null {
  throw new Error('Not implemented');
}
