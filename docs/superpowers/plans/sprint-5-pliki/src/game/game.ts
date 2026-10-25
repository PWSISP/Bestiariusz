// Starts the game: registers the combat and result screens and chains them (a combat, its result, the
// next combat). Later sprints put the map and the run between them; the screens stay the same.
import type { ScreenManager } from '../app/screen-manager.ts';
import type { LaunchOptions } from '../app/launch-options.ts';
import type { CombatData } from '../core/combat/model.ts';
import type { CombatSummary } from '../core/combat/summary.ts';
import { translate } from '../i18n/index.ts';
import { newSeed } from '../platform/seed.ts';
import { exportTelemetry } from '../platform/telemetry-store.ts';
import { createCombatSession } from './combat-session.ts';
import type { CombatSession } from './combat-session.ts';
import { createCombatScreen } from './screens/combat-screen.ts';
import type { CombatProbe } from './screens/combat-screen.ts';
import { createResultScreen } from './screens/result-screen.ts';
import type { Telemetry } from './telemetry.ts';

/** What tests and measurements can see of a running game (exposed on `window.__bestiariusz.game` in development). */
export interface GameHandle {
  readonly options: LaunchOptions;
  /** The combat in progress, or the last one; null before the first. */
  session(): CombatSession | null;
  /** The summary of the last finished combat. */
  lastSummary(): CombatSummary | null;
  /** Number of combats started so far. */
  runs(): number;
  /** The running combat screen, or null on other screens. */
  combat(): CombatProbe | null;
  /** The telemetry of the tester build, or null in every other build. */
  telemetry(): Telemetry | null;
}

export interface GameDeps {
  readonly manager: ScreenManager;
  readonly data: CombatData;
  readonly options: LaunchOptions;
  readonly seed?: () => number;
  /** Present in the tester build only: records every combat and offers the export on the result screen. */
  readonly telemetry?: Telemetry;
}

export function startGame(deps: GameDeps): GameHandle {
  const { manager, data, options, telemetry } = deps;
  const freshSeed = deps.seed ?? newSeed;
  let session: CombatSession | null = null;
  let summary: CombatSummary | null = null;
  let runs = 0;
  const probe: { current: CombatProbe | null } = { current: null };

  manager.register('combat', () => {
    if (!session) throw new Error('No combat to show');
    return createCombatScreen({
      session,
      options,
      translate,
      probe,
      onFinished(done) {
        summary = done;
        telemetry?.combatFinished(done);
        manager.show('result');
      },
    });
  });
  manager.register('result', () => {
    if (!summary) throw new Error('No result to show');
    return createResultScreen({
      summary,
      translate,
      onContinue: startCombat,
      exporter: telemetry
        ? {
            text: () => telemetry.text(),
            run: () => exportTelemetry(telemetry.text(), telemetry.filename()),
          }
        : undefined,
    });
  });

  function startCombat(): void {
    const seed = options.seed !== null ? options.seed + runs : freshSeed();
    runs += 1;
    session = createCombatSession(data, {
      seed,
      enemyHp: options.enemyHp,
      playerHp: options.playerHp,
    });
    summary = null;
    telemetry?.combatStarted(seed);
    manager.show('combat');
  }

  startCombat();
  return {
    options,
    session: () => session,
    lastSummary: () => summary,
    runs: () => runs,
    combat: () => probe.current,
    telemetry: () => telemetry ?? null,
  };
}
