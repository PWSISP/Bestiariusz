// The combat screen (S04-01, S04-07): connects the session (rules), the view model (what to show), the
// layout (where), the Pixi scene (the picture), the DOM controls (touch) and the animation timeline
// (when). All decisions about the game are the session's; this file decides only about the screen.
import type { Screen, ScreenContext } from '../../app/screen-manager.ts';
import type { CombatSummary } from '../../core/combat/summary.ts';
import { renderText } from '../../i18n/text.ts';
import type { TranslateFn } from '../../i18n/text.ts';
import { readSafeArea } from '../../ui/safe-area.ts';
import { announceEvents } from '../../view/announce.ts';
import { createFrameMeter, createTimeline, planAnimation } from '../../view/animation-plan.ts';
import type { FrameStats } from '../../view/animation-plan.ts';
import { buildCombatView } from '../../view/combat-view.ts';
import type { CombatView } from '../../view/combat-view.ts';
import type { Insets, Rect, Size } from '../../view/geometry.ts';
import { fanLayout } from '../../view/hand-fan.ts';
import { IDLE, reduceHandInput } from '../../view/hand-input.ts';
import type {
  HandInputContext,
  HandInputEvent,
  HandInputState,
  HandIntent,
} from '../../view/hand-input.ts';
import { layoutCombat } from '../../view/layout.ts';
import { text } from '../../view/text.ts';
import type { TextRef } from '../../view/text.ts';
import type { LaunchOptions } from '../../app/launch-options.ts';
import type { CombatSession } from '../combat-session.ts';
import { createCombatScene } from '../render/combat-scene.ts';
import type { PlayedCard, SceneFrame } from '../render/combat-scene.ts';
import { createControls } from './combat-controls.ts';

/** What the tests and the measurements can ask the running screen. */
export interface CombatProbe {
  busy(): boolean;
  frames(): FrameStats;
  selected(): number | null;
  /** The help line shown above the hand, translated; null when there is none. */
  hint(): string | null;
}

export interface CombatScreenDeps {
  readonly session: CombatSession;
  readonly options: LaunchOptions;
  readonly translate: TranslateFn;
  /** Called once, after the end of the combat has been shown. */
  readonly onFinished: (summary: CombatSummary) => void;
  readonly probe: { current: CombatProbe | null };
  readonly insets?: () => Insets;
}

const HINT_MS = 1600;
const HOLD_AFTER_END_MS = 500;
const FPS_REFRESH_MS = 500;

export function createCombatScreen(deps: CombatScreenDeps): Screen {
  const { session, options } = deps;
  const tr = (ref: TextRef): string => renderText(ref, deps.translate);
  const timeline = createTimeline();
  const meter = createFrameMeter();
  let size: Size = { width: 360, height: 800 };
  let input: HandInputState = IDLE;
  let hint: TextRef | null = null;
  let hintMs = 0;
  let view: CombatView | null = null;
  let frame: SceneFrame | null = null;
  let reported = false;
  let holdMs = 0;
  let fpsMs = 0;
  let scene: ReturnType<typeof createCombatScene> | null = null;
  let controls: ReturnType<typeof createControls> | null = null;
  let alive = false;

  const selectedIndex = (): number | null => (input.mode === 'idle' ? null : input.handIndex);
  const locked = (): boolean => timeline.busy || session.state.phase !== 'player';

  const local = (r: Rect, layout: { scale: number; stage: Rect }): Rect => ({
    x: (r.x - layout.stage.x) / layout.scale,
    y: (r.y - layout.stage.y) / layout.scale,
    width: r.width / layout.scale,
    height: r.height / layout.scale,
  });

  function handContext(
    v: CombatView,
    circleRects: readonly Rect[],
    castLineY: number,
  ): HandInputContext {
    return {
      hand: v.hand.map((c) => ({ kind: c.kind, playable: c.playable, blocked: c.blocked })),
      freeCircles: v.circles.map((c) => c.creature === null),
      circleRects,
      castLineY,
    };
  }

  function defaultHint(v: CombatView): TextRef | null {
    const card = v.hand.find((c) => c.selected);
    if (!card || !card.playable) return null;
    return card.kind === 'creature'
      ? text('hint.creature')
      : card.kind === 'spell'
        ? text('hint.spell')
        : null;
  }

  function render(played: PlayedCard | null = null): void {
    if (!alive || !scene || !controls) return;
    const selected = selectedIndex();
    const next = buildCombatView(session.state, session.data, selected);
    view = next;
    const layout = layoutCombat(size, (deps.insets ?? (() => readSafeArea(document)))());
    const slots = fanLayout(next.hand.length, local(layout.hand, layout), selected);
    frame = { view: next, layout, slots, hint: hint ?? defaultHint(next), locked: locked() };
    scene.update(frame, played);
    controls.sync({ view: next, layout, slots, locked: frame.locked });
  }

  function currentContext(): HandInputContext | null {
    if (!view || !frame) return null;
    return handContext(view, frame.layout.circles, frame.layout.castLineY);
  }

  function showHint(ref: TextRef): void {
    hint = ref;
    hintMs = HINT_MS;
    controls?.announce([tr(ref)]);
  }

  function run(events: Parameters<typeof announceEvents>[0], played: PlayedCard | null): void {
    timeline.play(planAnimation(events, { enabled: options.anim }));
    controls?.announce(announceEvents(events, session.state, session.data).map(tr));
    scene?.setAnimated(options.anim);
    render(played);
  }

  function play(handIndex: number, circle: number | null): void {
    const result = session.play(handIndex, circle === null ? undefined : circle);
    const rejected = result.events.find((e) => e.type === 'rejected');
    if (rejected && rejected.type === 'rejected') {
      showHint(refusal(rejected.reason));
      render();
      return;
    }
    input = IDLE;
    hint = null;
    scene?.setDrag(null);
    run(result.events, { handIndex, circle });
  }

  function refusal(reason: string): TextRef {
    return text(
      reason === 'not_enough_ember'
        ? 'hint.unaffordable'
        : reason === 'circle_occupied'
          ? 'hint.occupied'
          : 'hint.curse',
    );
  }

  function endTurn(): void {
    if (locked()) return;
    input = IDLE;
    hint = null;
    scene?.setDrag(null);
    run(session.endTurn().events, null);
  }

  function apply(intent: HandIntent): boolean {
    if (intent.type === 'play') {
      play(intent.handIndex, intent.circle ?? null);
      return true;
    }
    if (intent.type === 'refuse') {
      showHint(refusal(intent.reason));
      return false;
    }
    return false;
  }

  function onInput(event: HandInputEvent): void {
    const ctx = currentContext();
    if (!ctx || locked()) return;
    const before = selectedIndex();
    const result = reduceHandInput(input, event, ctx);
    input = result.state;
    if (apply(result.intent)) return;
    if (input.mode === 'dragging')
      scene?.setDrag({ handIndex: input.handIndex, x: input.x, y: input.y });
    else scene?.setDrag(null);
    if (before !== selectedIndex() || result.intent.type === 'refuse') render();
  }

  function finishIfOver(deltaMs: number): void {
    if (reported || session.state.phase === 'player' || timeline.busy) return;
    holdMs += deltaMs;
    if (holdMs < (options.anim ? HOLD_AFTER_END_MS : 0)) return;
    const summary = session.summary();
    if (!summary) return;
    reported = true;
    deps.onFinished(summary);
  }

  return {
    mount(ctx: ScreenContext) {
      alive = true;
      size = {
        width: ctx.overlay.clientWidth || size.width,
        height: ctx.overlay.clientHeight || size.height,
      };
      scene = createCombatScene(tr);
      scene.setAnimated(options.anim);
      ctx.layer.addChild(scene.root);
      controls = createControls(ctx.overlay, tr, {
        input: onInput,
        endTurn,
        skip: () => {
          if (!timeline.busy) return false;
          timeline.skip();
          render();
          return true;
        },
      });
      deps.probe.current = {
        busy: () => timeline.busy,
        frames: () => meter.stats(),
        selected: selectedIndex,
        hint: () => {
          const shown = frame?.hint ?? null;
          return shown ? tr(shown) : null;
        },
      };
      ctx.onTick((deltaMs) => {
        if (!alive) return;
        const wasBusy = timeline.busy;
        timeline.advance(deltaMs);
        meter.push(deltaMs);
        scene?.tick(deltaMs, timeline);
        if (hint) {
          hintMs -= deltaMs;
          if (hintMs <= 0) {
            hint = null;
            render();
          }
        }
        if (wasBusy && !timeline.busy) render();
        if (options.fps) {
          fpsMs += deltaMs;
          if (fpsMs >= FPS_REFRESH_MS) {
            fpsMs = 0;
            const stats = meter.stats();
            scene?.setFps(
              deps.translate('dev.fps', {
                fps: Math.round(stats.fps),
                p95: Math.round(stats.p95Ms),
              }),
            );
          }
        }
        finishIfOver(deltaMs);
      });
      run(session.startEvents, null);
    },
    unmount() {
      alive = false;
      if (deps.probe.current) deps.probe.current = null;
    },
    resize(next: Size) {
      size = next;
      render();
    },
  };
}
