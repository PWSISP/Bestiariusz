// Records one line per finished combat in the tester build (S05-05b). The log itself is pure
// (src/core/telemetry/log.ts); this file adds the clock and the storage. Telemetry must never break
// the game, so every failure here is swallowed.
import { appendRecord, createLog, parseLog, serializeLog } from '../core/telemetry/log.ts';
import type { TelemetryLog } from '../core/telemetry/log.ts';
import type { CombatSummary } from '../core/combat/summary.ts';
import type { TelemetryStorage } from '../platform/telemetry-store.ts';

export interface TelemetryDeps {
  readonly store: TelemetryStorage;
  /** Monotonic milliseconds (performance.now). */
  readonly clock: () => number;
  /** ISO 8601 wall-clock time, only for the header of a new log. */
  readonly wallClock: () => string;
  /** A random unsigned 32-bit integer for the id of a new log. */
  readonly newId: () => number;
  /** Label of this build (short commit hash, or `dev`). */
  readonly build: string;
}

export interface Telemetry {
  /** Call when a combat starts. */
  combatStarted(seed: number): void;
  /** Call when it ends; adds a record and saves the log. A call without a start is ignored. */
  combatFinished(summary: CombatSummary): void;
  /** Number of records in the log (kept across launches). */
  count(): number;
  /** The text of the export file. */
  text(): string;
  /** A name for the export file. */
  filename(): string;
}

export function createTelemetry(deps: TelemetryDeps): Telemetry {
  let log: TelemetryLog = loadOrCreate(deps);
  let pending: { readonly seed: number; readonly at: number } | null = null;

  return {
    combatStarted(seed) {
      pending = { seed, at: deps.clock() };
    },
    combatFinished(summary) {
      const started = pending;
      pending = null;
      if (!started) return;
      try {
        log = appendRecord(log, {
          seed: started.seed,
          enemyId: summary.enemyId,
          outcome: summary.outcome,
          turns: summary.turns,
          hpLeft: summary.hpLeft,
          hpMax: summary.hpMax,
          ritualUsed: summary.ritualUsed,
          durationMs: Math.max(0, deps.clock() - started.at),
        });
        deps.store.save(serializeLog(log));
      } catch {
        // an invalid record or a failing store: skip it, keep the game going
      }
    },
    count: () => log.records.length,
    text: () => serializeLog(log),
    filename: () => `bestiariusz-sesja-${log.build}-${log.logId}.json`,
  };
}

function loadOrCreate(deps: TelemetryDeps): TelemetryLog {
  try {
    const saved = deps.store.load();
    const parsed = saved === null ? null : parseLog(saved);
    if (parsed) return parsed;
  } catch {
    // fall through to a fresh log
  }
  return createLog({ logId: deps.newId(), build: deps.build, startedAt: deps.wallClock() });
}
