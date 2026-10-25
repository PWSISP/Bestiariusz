// Starts the game: registers the combat and result screens and chains them (a combat, its result, the
// next combat). Later sprints put the map and the run between them; the screens stay the same.
import type { ScreenManager } from '../app/screen-manager.ts';
import type { LaunchOptions } from '../app/launch-options.ts';
import type { CombatData } from '../core/combat/model.ts';
import type { CombatSummary } from '../core/combat/summary.ts';
import { translate } from '../i18n/index.ts';
import { newSeed } from '../platform/seed.ts';
import { exportTelemetry } from '../platform/telemetry-store.ts';
import {
  addCrafted,
  dataForFight,
  fightSeed,
  finishFight,
  offerRewards,
  stageEnemy,
  startRun,
  takeReward,
} from '../core/run/run.ts';
import type { RunState } from '../core/run/run.ts';
import { createAudio } from '../platform/audio.ts';
import { loadJuice, saveJuice } from '../platform/juice-store.ts';
import type { JuiceSettings } from '../view/juice.ts';
import { createCombatSession } from './combat-session.ts';
import type { CombatSession } from './combat-session.ts';
import { createCombatScreen } from './screens/combat-screen.ts';
import type { CombatProbe } from './screens/combat-screen.ts';
import { createResultScreen } from './screens/result-screen.ts';
import { createRewardScreen } from './screens/reward-screen.ts';
import { createRouteScreen } from './screens/route-screen.ts';
import { createWorkshopScreen } from './screens/workshop-screen.ts';
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
  /** The expedition in progress; null in a duel (`?duel=1`) and before the first one. */
  run(): RunState | null;
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
  const expedition = !options.duel && data.balance.expedition !== undefined;
  let session: CombatSession | null = null;
  let summary: CombatSummary | null = null;
  let run: RunState | null = null;
  let offered: string[] = [];
  let runs = 0;
  let expeditions = 0;
  const probe: { current: CombatProbe | null } = { current: null };
  let juiceSettings: JuiceSettings = loadJuice();
  const audio = createAudio();
  const juice = {
    settings: () => juiceSettings,
    sound: (id: Parameters<typeof audio.play>[0]) => audio.play(id),
  };
  const unlocked = {
    elements: data.symbols.elements.map((e) => e.id),
    forms: data.symbols.forms.map((f) => f.id),
    traits: data.symbols.traits.map((t) => t.id),
  };

  manager.register('combat', () => {
    if (!session) throw new Error('No combat to show');
    return createCombatScreen({
      session,
      options,
      translate,
      probe,
      juice,
      onFinished(done) {
        summary = done;
        telemetry?.combatFinished(done);
        if (!expedition || !run) {
          manager.show('result');
          return;
        }
        run = finishFight(data, run, { won: done.outcome === 'won', hpLeft: done.hpLeft });
        if (run.status === 'active') {
          offered = offerRewards(data, run);
          manager.show('reward');
        } else {
          manager.show('result');
        }
      },
    });
  });
  manager.register('result', () => {
    if (!summary) throw new Error('No result to show');
    return createResultScreen({
      summary,
      translate,
      onContinue: expedition ? startExpedition : startCombat,
      continueKey: expedition ? 'result.again' : 'result.continue',
      exporter: telemetry
        ? {
            text: () => telemetry.text(),
            run: () => exportTelemetry(telemetry.text(), telemetry.filename()),
          }
        : undefined,
    });
  });
  manager.register('route', () => {
    if (!run) throw new Error('No expedition to show');
    return createRouteScreen({
      data,
      run,
      translate,
      onFight: startFight,
      onWorkshop: () => manager.show('workshop'),
      juice: {
        get: () => juiceSettings,
        set(next) {
          juiceSettings = next;
          saveJuice(next);
        },
      },
    });
  });
  manager.register('reward', () =>
    createRewardScreen({
      data,
      offered,
      translate,
      onPick(cardId) {
        if (run) run = takeReward(run, cardId);
        manager.show('route');
      },
    }),
  );
  manager.register('workshop', () => {
    if (!run) throw new Error('No expedition to show');
    return createWorkshopScreen({
      data,
      unlocked,
      ink: run.ink,
      translate,
      onCrafted(card, ink) {
        if (run) run = addCrafted(run, card, ink);
      },
      onBack: () => manager.show('route'),
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

  function startExpedition(): void {
    const seed = options.seed !== null ? options.seed + expeditions : freshSeed();
    expeditions += 1;
    run = startRun(data, seed);
    summary = null;
    manager.show('route');
  }

  function startFight(): void {
    if (!run) return;
    const seed = fightSeed(run);
    runs += 1;
    session = createCombatSession(dataForFight(data, run), {
      seed,
      deck: run.deck,
      startHp: run.hp,
      enemyId: stageEnemy(data, run),
      enemyHp: options.enemyHp,
      playerHp: options.playerHp,
    });
    summary = null;
    telemetry?.combatStarted(seed);
    manager.show('combat');
  }

  if (expedition) startExpedition();
  else startCombat();
  return {
    options,
    session: () => session,
    run: () => run,
    lastSummary: () => summary,
    runs: () => runs,
    combat: () => probe.current,
    telemetry: () => telemetry ?? null,
  };
}
