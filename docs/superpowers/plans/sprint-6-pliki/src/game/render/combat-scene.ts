// The picture of the combat screen (S04-01, S04-03, S04-04, S04-05): enemy, intent, Kręgi, status bar,
// hand and the effects of animation cues. It draws what the view model (src/view) and the layout say
// and nothing else: no rules, no input. The screen calls `update` after every change of the state and
// `tick` every frame with the running timeline.
import { Container, Graphics } from 'pixi.js';
import type { Text } from 'pixi.js';
import { elementColor } from '../../view/art-style.ts';
import { clamp01, easeOutBack, easeOutCubic, pulse } from '../../view/animation-plan.ts';
import type { Cue, Timeline } from '../../view/animation-plan.ts';
import type { CardView, CircleView, CombatView, IntentChip } from '../../view/combat-view.ts';
import type { Rect } from '../../view/geometry.ts';
import type { CombatLayout } from '../../view/layout.ts';
import { text } from '../../view/text.ts';
import type { TextRef } from '../../view/text.ts';
import type { FanSlot } from '../../view/hand-fan.ts';
import { drawElementIcon, drawGlyph } from '../art/glyphs.ts';
import type { GlyphName } from '../art/glyphs.ts';
import { createEnemyArt } from '../art/enemy-art.ts';
import { createCreatureArt } from '../art/placeholder-art.ts';
import { juiceForCue, shakeOffset } from '../../view/juice.ts';
import type { JuiceCue, JuiceSettings, SoundId } from '../../view/juice.ts';
import { createCardNode } from './card-node.ts';
import { COLORS, drawBar, drawGradient, label } from './theme.ts';

export interface SceneFrame {
  readonly view: CombatView;
  readonly layout: CombatLayout;
  /** Fan slots in stage coordinates (the 360x800 board), one per card in hand. */
  readonly slots: readonly FanSlot[];
  /** A line of help above the hand, or null. */
  readonly hint: TextRef | null;
  /** The animation is running or the combat is over: the end-turn button is dimmed. */
  readonly locked: boolean;
}

export interface PlayedCard {
  readonly handIndex: number;
  /** Circle a creature card went to; null for spells. */
  readonly circle: number | null;
}

export interface DragState {
  readonly handIndex: number;
  /** Pointer position in viewport pixels. */
  readonly x: number;
  readonly y: number;
}

export interface CombatScene {
  readonly root: Container;
  update(frame: SceneFrame, played?: PlayedCard | null): void;
  setDrag(drag: DragState | null): void;
  /** False switches off the idle motion and the smoothing of the health bars. */
  setAnimated(on: boolean): void;
  tick(deltaMs: number, timeline: Timeline): void;
  setFps(line: string | null): void;
  destroy(): void;
}

interface Fx {
  age: number;
  readonly life: number;
  step(progress: number): void;
  done(): void;
}

const GLYPH_OF_CHIP: Record<IntentChip['kind'], GlyphName> = {
  attack: 'attack',
  multi: 'multi',
  shield: 'shield',
  curse: 'curse',
  steal: 'steal',
};

/** The player's switches for the effects and the way to play a sound (S06-04). */
export interface JuiceHooks {
  settings(): JuiceSettings;
  sound(id: SoundId): void;
}

const SHAKE_MAX_PX = 8;
/** Without hooks every flash and number is drawn and nothing shakes or sounds. */
const ALL_JUICE: JuiceCue = { shake: null, sound: null, flash: true, number: true };

export function createCombatScene(tr: (ref: TextRef) => string, juice?: JuiceHooks): CombatScene {
  const root = new Container();
  const backdrop = new Graphics();
  const stageRoot = new Container();
  const enemyLayer = new Container();
  const backLayer = new Container();
  const bars = new Graphics();
  const frontLayer = new Container();
  const circleLayer = new Container();
  const cardLayer = new Container();
  const fxLayer = new Container();
  const fpsLabel = label('', 11, COLORS.dim);
  cardLayer.sortableChildren = true;
  stageRoot.addChild(enemyLayer, backLayer, bars, circleLayer, frontLayer, cardLayer, fxLayer);
  root.addChild(backdrop, stageRoot, fpsLabel);
  fpsLabel.position.set(6, 4);
  fpsLabel.visible = false;

  let frame: SceneFrame | null = null;
  let prev: SceneFrame | null = null;
  let played: PlayedCard | null = null;
  let drag: DragState | null = null;
  let enemyArt: Container | null = null;
  let enemyBase = { x: 0, y: 0 };
  let enemyRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  let statusRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  let hudRect: Rect = { x: 0, y: 0, width: 0, height: 0 };
  let stageSize = { width: 360, height: 800 };
  const circleNodes: (Container | null)[] = [null, null, null];
  const circleRects: Rect[] = [];
  const glows: (Graphics | null)[] = [null, null, null];
  const cardNodes: Container[] = [];
  const effects: Fx[] = [];
  const spawned = new WeakSet<Cue>();
  let ghostCard: Container | null = null;
  const ghostCreatures = new Map<Cue, Container>();
  let shownEnemy = -1;
  let shownPlayer = -1;
  let clock = 0;
  let animationOn = true;
  let shake: { strength: number; durationMs: number; age: number } | null = null;

  const toLocal = (r: Rect): Rect => {
    const l = frame?.layout;
    if (!l) return r;
    const s = l.scale;
    return {
      x: (r.x - l.stage.x) / s,
      y: (r.y - l.stage.y) / s,
      width: r.width / s,
      height: r.height / s,
    };
  };

  function addFx(fx: Fx): void {
    effects.push(fx);
  }

  function floatText(content: string, x: number, y: number, color: number, size = 24): void {
    const t = label(content, size, color, { bold: true, anchor: [0.5, 0.5], stroke: 0x000000 });
    t.position.set(x, y);
    fxLayer.addChild(t);
    addFx({
      age: 0,
      life: 700,
      step(p) {
        t.y = y - 34 * easeOutCubic(p);
        t.alpha = p < 0.65 ? 1 : 1 - (p - 0.65) / 0.35;
        t.scale.set(0.8 + 0.4 * easeOutBack(Math.min(1, p * 3)));
      },
      done: () => t.destroy(),
    });
  }

  function banner(content: string, color: number, life = 900): void {
    const t = label(content, 34, color, {
      bold: true,
      anchor: [0.5, 0.5],
      stroke: 0x000000,
      align: 'center',
      wrap: stageSize.width - 40,
    });
    t.position.set(stageSize.width / 2, stageSize.height * 0.4);
    fxLayer.addChild(t);
    addFx({
      age: 0,
      life,
      step(p) {
        t.alpha = p < 0.15 ? p / 0.15 : p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
        t.scale.set(0.85 + 0.15 * easeOutCubic(Math.min(1, p * 4)));
      },
      done: () => t.destroy(),
    });
  }

  function flashRect(r: Rect, color: number, peak: number, life: number): void {
    const g = new Graphics().rect(r.x, r.y, r.width, r.height).fill(color);
    g.alpha = 0;
    fxLayer.addChild(g);
    addFx({
      age: 0,
      life,
      step(p) {
        g.alpha = peak * (1 - p);
      },
      done: () => g.destroy(),
    });
  }

  function ring(
    cx: number,
    cy: number,
    color: number,
    from: number,
    to: number,
    life: number,
  ): void {
    const g = new Graphics();
    fxLayer.addChild(g);
    addFx({
      age: 0,
      life,
      step(p) {
        g.clear()
          .circle(cx, cy, from + (to - from) * easeOutCubic(p))
          .stroke({ width: 4, color, alpha: 1 - p });
      },
      done: () => g.destroy(),
    });
  }

  const circleCenter = (i: number): { x: number; y: number } => {
    const r = circleRects[i] ?? { x: 0, y: 0, width: 0, height: 0 };
    return { x: r.x + r.width / 2, y: r.y + r.width / 2 };
  };

  function clearChildren(c: Container): void {
    for (const child of c.removeChildren()) child.destroy({ children: true });
  }

  // ---- static parts ------------------------------------------------------------------------

  function drawEnemy(view: CombatView, art: Rect): void {
    clearChildren(enemyLayer);
    const height = art.height - 52;
    const width = Math.min(art.width - 40, height);
    const node = createEnemyArt(view.enemy.id, { width, height });
    enemyBase = { x: art.x + (art.width - width) / 2, y: art.y + 2 };
    node.pivot.set(width / 2, height);
    node.position.set(enemyBase.x + width / 2, enemyBase.y + height);
    enemyLayer.addChild(node);
    enemyArt = node;
  }

  function drawHud(view: CombatView, hud: Rect): void {
    const name = label(tr(view.enemy.name), 18, COLORS.text, { bold: true });
    name.position.set(hud.x + 4, hud.y + 2);
    frontLayer.addChild(name);
    const x = hud.x + 4 + name.width + 12;
    if (view.enemy.block > 0) {
      const g = new Graphics();
      drawGlyph(g, 'shield', { x, y: hud.y + 5, width: 18, height: 18 }, COLORS.blue);
      frontLayer.addChild(g);
      const n = label(String(view.enemy.block), 15, COLORS.blue, { bold: true, anchor: [0, 0.5] });
      n.position.set(x + 22, hud.y + 14);
      frontLayer.addChild(n);
    }
    // weaknesses and resistances, right-aligned: [label icons] [label icons]
    let right = hud.x + hud.width - 4;
    const group = (
      key: 'enemy.weak' | 'enemy.resist',
      elements: readonly string[],
      tint: number,
    ): void => {
      if (elements.length === 0) return;
      const g = new Graphics();
      for (let i = elements.length - 1; i >= 0; i--) {
        right -= 18;
        const element = elements[i] as string;
        g.circle(right + 8, hud.y + 14, 9).fill({ color: tint, alpha: 0.28 });
        drawElementIcon(
          g,
          element,
          { x: right + 1, y: hud.y + 7, width: 14, height: 14 },
          elementColor(element),
        );
      }
      frontLayer.addChild(g);
      const t = label(tr(text(key)), 10, COLORS.dim, { anchor: [1, 0.5] });
      t.position.set(right - 3, hud.y + 14);
      frontLayer.addChild(t);
      right -= t.width + 12;
    };
    group('enemy.resist', view.enemy.resist, COLORS.dim);
    group('enemy.weak', view.enemy.weak, COLORS.green);
    const hp = label(
      tr(text('status.enemyHp', { hp: view.enemy.hp, max: view.enemy.maxHp })),
      12,
      COLORS.white,
      { bold: true, anchor: [0.5, 0.5], stroke: 0x000000 },
    );
    hp.position.set(hud.x + hud.width / 2, hud.y + 40);
    frontLayer.addChild(hp);
  }

  function drawIntent(view: CombatView, area: Rect): void {
    const plate = new Graphics();
    plate
      .roundRect(area.x, area.y, area.width, area.height, 10)
      .fill({ color: COLORS.panel, alpha: 0.9 });
    plate
      .roundRect(area.x, area.y, area.width, area.height, 10)
      .stroke({ width: 1.5, color: COLORS.panelEdge });
    backLayer.addChild(plate);
    const name = label(tr(view.intent.name), 15, COLORS.text, { bold: true, anchor: [0, 0.5] });
    name.position.set(area.x + 12, area.y + area.height / 2);
    frontLayer.addChild(name);
    let x = area.x + 12 + name.width + 16;
    for (const chip of view.intent.chips) {
      const color =
        chip.kind === 'shield'
          ? COLORS.blue
          : chip.kind === 'curse'
            ? COLORS.violet
            : chip.kind === 'steal'
              ? COLORS.green
              : chip.direct
                ? COLORS.red
                : COLORS.gold;
      const g = new Graphics();
      drawGlyph(g, GLYPH_OF_CHIP[chip.kind], { x, y: area.y + 9, width: 26, height: 26 }, color);
      frontLayer.addChild(g);
      x += 30;
      const amount =
        chip.kind === 'multi'
          ? `${chip.amount}×${chip.times}`
          : chip.kind === 'curse'
            ? String((chip.circle ?? 0) + 1)
            : chip.kind === 'steal'
              ? ''
              : String(chip.amount);
      if (amount !== '') {
        const t = label(amount, 17, color, { bold: true, anchor: [0, 0.5] });
        t.position.set(x, area.y + area.height / 2);
        frontLayer.addChild(t);
        x += t.width;
      }
      x += 14;
    }
  }

  function drawCircle(circle: CircleView, area: Rect, index: number): void {
    const cell = area.width;
    const cx = area.x + cell / 2;
    const cy = area.y + cell / 2;
    const radius = cell / 2 - 3;
    const edge = circle.dropTarget
      ? COLORS.green
      : circle.ritualCompletes
        ? COLORS.gold
        : circle.cursed
          ? COLORS.violet
          : COLORS.panelEdge;
    const base = new Graphics();
    base.circle(cx, cy, radius).fill({ color: 0x0c140f, alpha: 0.88 });
    base
      .circle(cx, cy, radius)
      .stroke({ width: circle.dropTarget || circle.ritualCompletes ? 4 : 2.5, color: edge });
    circleLayer.addChild(base);
    const glow = new Graphics();
    glow.circle(cx, cy, radius + 5).stroke({ width: 5, color: edge, alpha: 0.5 });
    glow.visible = circle.dropTarget || circle.ritualCompletes !== null || circle.cursed;
    circleLayer.addChild(glow);
    glows[index] = glow;
    const node = new Container();
    circleLayer.addChild(node);
    circleNodes[index] = null;
    const creature = circle.creature;
    if (creature) {
      const side = cell - 16;
      const art = createCreatureArt(
        { element: creature.element, form: creature.form, trait: creature.trait },
        { width: side, height: side },
      );
      art.position.set(-side / 2, -side / 2);
      const mask = new Graphics().circle(0, 0, radius - 3).fill(0xffffff);
      art.mask = mask;
      node.addChild(art, mask);
      node.position.set(cx, cy);
      const chips = new Graphics();
      chips.roundRect(-radius + 2, radius - 22, 40, 22, 11).fill({ color: 0x0b0f0c, alpha: 0.92 });
      chips.roundRect(radius - 42, radius - 22, 40, 22, 11).fill({ color: 0x0b0f0c, alpha: 0.92 });
      drawGlyph(
        chips,
        'sword',
        { x: -radius + 6, y: radius - 19, width: 15, height: 15 },
        COLORS.gold,
      );
      drawGlyph(
        chips,
        'heart',
        { x: radius - 38, y: radius - 19, width: 15, height: 15 },
        COLORS.red,
      );
      node.addChild(chips);
      const attack = label(String(creature.attack), 13, COLORS.text, {
        bold: true,
        anchor: [0, 0.5],
      });
      attack.position.set(-radius + 24, radius - 11);
      const hurt = creature.health < creature.maxHealth;
      const health = label(String(creature.health), 13, hurt ? COLORS.red : COLORS.text, {
        bold: true,
        anchor: [0, 0.5],
      });
      health.position.set(radius - 20, radius - 11);
      node.addChild(attack, health);
      circleNodes[index] = node;
    } else if (circle.dropTarget || circle.ritualCompletes) {
      const g = new Graphics();
      g.poly([
        -3, -18, 3, -18, 3, -3, 18, -3, 18, 3, 3, 3, 3, 18, -3, 18, -3, 3, -18, 3, -18, -3, -3, -3,
      ]).fill({ color: edge, alpha: 0.8 });
      node.addChild(g);
      node.position.set(cx, cy);
    }
    if (circle.ritualCompletes) {
      const g = new Graphics();
      drawElementIcon(
        g,
        circle.ritualCompletes,
        { x: cx - 13, y: area.y - 6, width: 26, height: 26 },
        elementColor(circle.ritualCompletes),
      );
      circleLayer.addChild(g);
    }
    if (circle.cursed) {
      const g = new Graphics();
      drawGlyph(
        g,
        'curse',
        { x: cx + radius - 22, y: area.y - 4, width: 24, height: 24 },
        COLORS.violet,
      );
      circleLayer.addChild(g);
    }
    const caption = label(
      tr(creature ? creature.title : text('circle.caption', { n: index + 1 })),
      10,
      COLORS.dim,
      { anchor: [0.5, 0], align: 'center' },
    );
    caption.position.set(cx, area.y + cell + 1);
    circleLayer.addChild(caption);
  }

  function drawStatus(view: CombatView, area: Rect): void {
    const strip = new Graphics();
    strip.rect(area.x, area.y, area.width, area.height).fill({ color: COLORS.panel, alpha: 0.8 });
    strip.rect(area.x, area.y, area.width, 1.5).fill({ color: COLORS.panelEdge });
    backLayer.addChild(strip);
    const hp = label(
      tr(text('status.hp', { hp: view.player.hp, max: view.player.maxHp })),
      12,
      COLORS.white,
      { bold: true, anchor: [0.5, 0.5], stroke: 0x000000 },
    );
    hp.position.set(area.x + 12 + 85, area.y + 17);
    frontLayer.addChild(hp);
    if (view.player.block > 0) {
      const g = new Graphics();
      drawGlyph(
        g,
        'shield',
        { x: area.x + 204, y: area.y + 8, width: 18, height: 18 },
        COLORS.blue,
      );
      frontLayer.addChild(g);
      const n = label(tr(text('status.block', { block: view.player.block })), 13, COLORS.blue, {
        bold: true,
        anchor: [0, 0.5],
      });
      n.position.set(area.x + 226, area.y + 17);
      frontLayer.addChild(n);
    }
    const pips = Math.max(view.ember.current, view.ember.perTurn);
    const g = new Graphics();
    for (let i = 0; i < pips; i++) {
      const lit = i < view.ember.current;
      drawElementIcon(
        g,
        'ogien',
        { x: area.x + 12 + i * 20, y: area.y + 30, width: 17, height: 17 },
        lit ? elementColor('ogien') : 0x3a4a40,
      );
    }
    frontLayer.addChild(g);
    const ember = label(
      tr(text('status.ember', { current: view.ember.current, max: view.ember.perTurn })),
      11,
      COLORS.dim,
      { anchor: [0, 0.5] },
    );
    ember.position.set(area.x + 12 + pips * 20 + 6, area.y + 39);
    frontLayer.addChild(ember);
    const turn = label(tr(text('status.turn', { turn: view.turn })), 13, COLORS.dim, {
      bold: true,
      anchor: [1, 0.5],
    });
    turn.position.set(area.x + area.width - 12, area.y + 17);
    frontLayer.addChild(turn);
  }

  function drawPile(area: Rect, count: number, tint: number): void {
    const g = new Graphics();
    g.roundRect(area.x, area.y, area.width, area.height, 10).fill({
      color: COLORS.panel,
      alpha: 0.9,
    });
    g.roundRect(area.x, area.y, area.width, area.height, 10).stroke({
      width: 1.5,
      color: COLORS.panelEdge,
    });
    drawGlyph(
      g,
      'pile',
      { x: area.x + area.width / 2 - 12, y: area.y + 6, width: 24, height: 22 },
      tint,
    );
    frontLayer.addChild(g);
    const n = label(String(count), 16, COLORS.text, { bold: true, anchor: [0.5, 0.5] });
    n.position.set(area.x + area.width / 2, area.y + 42);
    frontLayer.addChild(n);
  }

  function drawEndTurn(area: Rect, locked: boolean, view: CombatView): void {
    const g = new Graphics();
    const active = !locked && view.phase === 'player';
    g.roundRect(area.x, area.y, area.width, area.height, 12).fill(active ? 0x8a6a1f : 0x2a2f2b);
    g.roundRect(area.x, area.y, area.width, area.height, 12).stroke({
      width: 2,
      color: active ? COLORS.gold : COLORS.panelEdge,
    });
    frontLayer.addChild(g);
    const t = label(tr(text('combat.endTurn')), 18, active ? COLORS.text : COLORS.dim, {
      bold: true,
      anchor: [0.5, 0.5],
    });
    t.position.set(area.x + area.width / 2, area.y + area.height / 2);
    frontLayer.addChild(t);
  }

  function drawDetail(view: CombatView, intentArea: Rect): void {
    const card = view.hand.find((c) => c.selected);
    if (!card) return;
    const width = stageSize.width - 16;
    const pad = 10;
    const lines: Text[] = [];
    const wrap = width - 2 * pad;
    if (card.creature) {
      lines.push(label(tr(card.creature.legend), 11, COLORS.dim, { wrap }));
      for (const e of card.creature.effects) lines.push(label(tr(e), 11, COLORS.gold, { wrap }));
    } else {
      for (const l of card.lines)
        lines.push(label(tr(l), 12, card.kind === 'curse' ? COLORS.dim : COLORS.gold, { wrap }));
    }
    const title = label(tr(card.title), 15, COLORS.text, { bold: true });
    const sub = card.subtitle ? label(tr(card.subtitle), 12, COLORS.dim, { anchor: [1, 0] }) : null;
    let height = pad + 22;
    for (const l of lines) height += l.height + 2;
    height += pad - 2;
    const top = intentArea.y - height - 6;
    const g = new Graphics();
    g.roundRect(8, top, width, height, 10).fill({ color: COLORS.panel, alpha: 0.95 });
    g.roundRect(8, top, width, height, 10).stroke({
      width: 1.5,
      color: card.element ? elementColor(card.element) : COLORS.panelEdge,
    });
    frontLayer.addChild(g);
    title.position.set(8 + pad, top + pad - 2);
    frontLayer.addChild(title);
    if (sub) {
      sub.position.set(8 + width - pad, top + pad);
      frontLayer.addChild(sub);
    }
    let y = top + pad + 22;
    for (const l of lines) {
      l.position.set(8 + pad, y);
      frontLayer.addChild(l);
      y += l.height + 2;
    }
  }

  function placeCard(node: Container, slot: FanSlot): void {
    node.position.set(slot.x, slot.y);
    node.rotation = slot.rotation;
    node.scale.set(slot.scale);
    node.zIndex = slot.z;
  }

  function dragLocal(d: DragState): { x: number; y: number } {
    const l = frame?.layout;
    if (!l) return { x: d.x, y: d.y };
    return { x: (d.x - l.stage.x) / l.scale, y: (d.y - l.stage.y) / l.scale - 44 };
  }

  function drawCards(f: SceneFrame): void {
    clearChildren(cardLayer);
    cardNodes.length = 0;
    f.view.hand.forEach((card: CardView, i) => {
      const slot = f.slots[i];
      if (!slot) return;
      const node = createCardNode(card, tr);
      placeCard(node, slot);
      cardLayer.addChild(node);
      cardNodes.push(node);
    });
    applyDrag();
  }

  function applyDrag(): void {
    if (!drag) return;
    const node = cardNodes[drag.handIndex];
    if (!node) return;
    const p = dragLocal(drag);
    node.position.set(p.x, p.y);
    node.rotation = 0;
    node.scale.set(1.1);
    node.zIndex = 100;
  }

  // ---- public ------------------------------------------------------------------------------

  function update(next: SceneFrame, playedCard: PlayedCard | null = null): void {
    prev = frame;
    frame = next;
    played = playedCard;
    const l = next.layout;
    stageSize = { width: l.stage.width / l.scale, height: l.stage.height / l.scale };
    backdrop.clear();
    drawGradient(
      backdrop,
      0,
      0,
      l.viewport.width,
      l.viewport.height,
      COLORS.bgTop,
      COLORS.bgBottom,
    );
    stageRoot.position.set(l.stage.x, l.stage.y);
    stageRoot.scale.set(l.scale);
    clearChildren(backLayer);
    clearChildren(frontLayer);
    clearChildren(circleLayer);
    circleRects.length = 0;
    enemyRect = toLocal(l.enemyArt);
    hudRect = toLocal(l.enemyHud);
    statusRect = toLocal(l.status);
    drawEnemy(next.view, enemyRect);
    drawHud(next.view, hudRect);
    drawIntent(next.view, toLocal(l.intent));
    next.view.circles.forEach((circle, i) => {
      const area = toLocal(l.circles[i] as Rect);
      circleRects.push(area);
      drawCircle(circle, area, i);
    });
    drawStatus(next.view, statusRect);
    drawPile(toLocal(l.drawPile), next.view.piles.draw, COLORS.blue);
    drawPile(toLocal(l.discardPile), next.view.piles.discard, COLORS.dim);
    drawEndTurn(toLocal(l.endTurn), next.locked, next.view);
    drawDetail(next.view, toLocal(l.intent));
    if (next.hint) {
      const hand = toLocal(l.hand);
      const t = label(tr(next.hint), 13, COLORS.text, {
        anchor: [0.5, 0],
        align: 'center',
        wrap: stageSize.width - 24,
        stroke: 0x000000,
      });
      t.position.set(stageSize.width / 2, hand.y + 10);
      frontLayer.addChild(t);
    }
    drawCards(next);
    if (shownEnemy < 0) shownEnemy = next.view.enemy.hp;
    if (shownPlayer < 0) shownPlayer = next.view.player.hp;
    if (!animationOn) {
      shownEnemy = next.view.enemy.hp;
      shownPlayer = next.view.player.hp;
    }
    drawBars();
  }

  function drawBars(): void {
    if (!frame) return;
    const v = frame.view;
    bars.clear();
    drawBar(
      bars,
      hudRect.x,
      hudRect.y + 32,
      hudRect.width,
      15,
      shownEnemy / v.enemy.maxHp,
      0xb8412f,
      0x2a1512,
    );
    drawBar(
      bars,
      statusRect.x + 12,
      statusRect.y + 9,
      170,
      16,
      shownPlayer / v.player.maxHp,
      0x4fa05a,
      0x15281a,
    );
  }

  function spawn(cue: Cue): void {
    const f = frame;
    if (!f) return;
    const enemyCenter = {
      x: enemyRect.x + enemyRect.width / 2,
      y: enemyRect.y + enemyRect.height * 0.45,
    };
    const fx = juice ? juiceForCue(cue, juice.settings()) : ALL_JUICE;
    if (juice && fx.sound) juice.sound(fx.sound);
    if (animationOn && fx.shake) shake = { ...fx.shake, age: 0 };
    switch (cue.kind) {
      case 'hit': {
        if (fx.flash)
          flashRect(
            { x: enemyRect.x, y: enemyRect.y, width: enemyRect.width, height: enemyRect.height },
            0xffffff,
            0.35,
            220,
          );
        if (fx.number)
          floatText(
          cue.amount > 0 ? `-${cue.amount}` : '0',
          enemyCenter.x + (cue.circle ?? 1) * 16 - 16,
          enemyCenter.y,
          cue.amount > 0 ? COLORS.white : COLORS.dim,
            cue.amount >= 10 ? 32 : 26,
          );
        break;
      }
      case 'effect': {
        const c = circleCenter(cue.circle ?? 0);
        const color =
          cue.detail === 'mend' || cue.detail === 'regen'
            ? COLORS.green
            : cue.detail === 'guard'
              ? COLORS.blue
              : cue.detail === 'kindle'
                ? elementColor('ogien')
                : COLORS.gold;
        if (fx.number) floatText(`+${cue.amount}`, c.x, c.y - 30, color, 22);
        break;
      }
      case 'ritual': {
        for (let i = 0; i < 3; i++) {
          const c = circleCenter(i);
          ring(c.x, c.y, cue.element ? elementColor(cue.element) : COLORS.gold, 20, 90, 600);
        }
        banner(
          tr(
            text('live.ritual', { element: text(`symbol.element.${cue.element ?? 'ogien'}.name`) }),
          ),
          cue.element ? elementColor(cue.element) : COLORS.gold,
          800,
        );
        break;
      }
      case 'hurt': {
        if (fx.flash)
          flashRect(
            { x: 0, y: 0, width: stageSize.width, height: stageSize.height },
            COLORS.red,
            0.3,
            320,
          );
        if (fx.number)
          floatText(`-${cue.amount}`, statusRect.x + 90, statusRect.y - 6, COLORS.red, 26);
        break;
      }
      case 'turn':
        if (cue.amount > 0) banner(tr(text('status.turn', { turn: cue.amount })), COLORS.text, 700);
        break;
      case 'end':
        banner(
          tr(text(cue.detail === 'won' ? 'live.won' : 'live.lost')),
          cue.detail === 'won' ? COLORS.gold : COLORS.red,
          1100,
        );
        break;
      case 'enemy_act':
      case 'card':
      case 'summon':
      case 'attack':
      case 'death':
      case 'rejected':
        break;
    }
  }

  function poseCircles(timeline: Timeline): void {
    circleRects.forEach((r, i) => {
      const node = circleNodes[i];
      if (!node) return;
      node.alpha = 1;
      node.scale.set(1);
      node.position.set(r.x + r.width / 2, r.y + r.width / 2);
    });
    for (const cue of timeline.pending()) {
      if (cue.kind === 'summon' && cue.circle !== null) {
        const node = circleNodes[cue.circle];
        if (node) node.alpha = 0;
      }
    }
    for (const { cue, progress } of timeline.active()) {
      if (cue.circle === null) continue;
      const node = circleNodes[cue.circle];
      const r = circleRects[cue.circle];
      if (!node || !r) continue;
      if (cue.kind === 'summon') {
        node.scale.set(0.4 + 0.6 * easeOutBack(progress));
        node.alpha = clamp01(progress * 3);
      } else if (cue.kind === 'attack') {
        const toward = enemyRect.y + enemyRect.height * 0.5 - (r.y + r.width / 2);
        node.y = r.y + r.width / 2 + toward * 0.35 * pulse(progress);
        node.scale.set(1 + 0.12 * pulse(progress));
      }
    }
  }

  function poseEnemy(timeline: Timeline): void {
    if (!enemyArt) return;
    enemyArt.scale.set(1);
    enemyArt.position.set(enemyBase.x + enemyArt.pivot.x, enemyBase.y + enemyArt.pivot.y);
    const idle = animationOn ? Math.sin(clock / 700) * 0.008 : 0;
    enemyArt.scale.set(1 + idle, 1 - idle);
    for (const { cue, progress } of timeline.active()) {
      if (cue.kind === 'enemy_act') {
        enemyArt.scale.set(1 + 0.08 * pulse(progress));
        enemyArt.y += 16 * pulse(progress);
      }
      if (cue.kind === 'hit') enemyArt.x += Math.sin(progress * 28) * 7 * (1 - progress);
    }
  }

  function poseGhosts(timeline: Timeline): void {
    const f = frame;
    const before = prev;
    // flying card
    const flight = timeline.active().find((a) => a.cue.kind === 'card');
    if (flight && played && before && f) {
      const card = before.view.hand[played.handIndex];
      const from = before.slots[played.handIndex];
      if (card && from) {
        if (!ghostCard) {
          ghostCard = createCardNode({ ...card, selected: false }, tr);
          fxLayer.addChild(ghostCard);
        }
        const to =
          played.circle !== null
            ? circleCenter(played.circle)
            : { x: enemyRect.x + enemyRect.width / 2, y: enemyRect.y + enemyRect.height * 0.5 };
        const p = easeOutCubic(flight.progress);
        ghostCard.position.set(from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p);
        ghostCard.rotation = from.rotation * (1 - p);
        ghostCard.scale.set(from.scale + (0.45 - from.scale) * p);
        ghostCard.alpha = 1 - 0.7 * p;
      }
    } else if (ghostCard) {
      ghostCard.destroy({ children: true });
      ghostCard = null;
    }
    // dying creatures
    for (const { cue, progress } of timeline.active()) {
      if (cue.kind !== 'death' || cue.circle === null || !before) continue;
      let ghost = ghostCreatures.get(cue);
      if (!ghost) {
        const creature = before.view.circles[cue.circle]?.creature;
        const r = circleRects[cue.circle];
        if (!creature || !r) continue;
        const side = r.width - 16;
        ghost = createCreatureArt(
          { element: creature.element, form: creature.form, trait: creature.trait },
          { width: side, height: side },
        );
        ghost.pivot.set(side / 2, side / 2);
        ghost.position.set(r.x + r.width / 2, r.y + r.width / 2);
        fxLayer.addChild(ghost);
        ghostCreatures.set(cue, ghost);
      }
      ghost.alpha = 1 - progress;
      ghost.scale.set(1 - 0.35 * progress);
      ghost.rotation = 0.5 * progress;
    }
    for (const [cue, ghost] of ghostCreatures) {
      if (!timeline.active().some((a) => a.cue === cue)) {
        ghost.destroy({ children: true });
        ghostCreatures.delete(cue);
      }
    }
  }

  function tick(deltaMs: number, timeline: Timeline): void {
    clock += deltaMs;
    // Start the effects of cues that have begun; a skipped plan drops the ones that never began.
    for (const cue of timeline.plan.cues) {
      if (spawned.has(cue)) continue;
      if (timeline.elapsed >= cue.start) {
        spawned.add(cue);
        if (timeline.busy || timeline.elapsed < cue.start + cue.duration) spawn(cue);
      }
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const fx = effects[i] as Fx;
      fx.age += deltaMs;
      const p = fx.age / fx.life;
      if (p >= 1) {
        fx.done();
        effects.splice(i, 1);
      } else {
        fx.step(p);
      }
    }
    if (shake) {
      shake.age += deltaMs;
      const off = shakeOffset(shake.strength, shake.age / shake.durationMs, SHAKE_MAX_PX);
      root.position.set(off.x, off.y);
      if (shake.age >= shake.durationMs) shake = null;
    } else if (root.position.x !== 0 || root.position.y !== 0) {
      root.position.set(0, 0);
    }
    poseCircles(timeline);
    poseEnemy(timeline);
    poseGhosts(timeline);
    // pulse the glow of drop targets
    glows.forEach((g) => {
      if (g?.visible) g.alpha = animationOn ? 0.55 + 0.45 * Math.sin(clock / 220) : 0.8;
    });
    // health bars follow the real numbers
    if (frame) {
      const k = animationOn ? 1 - Math.exp(-deltaMs / 160) : 1;
      shownEnemy += (frame.view.enemy.hp - shownEnemy) * k;
      shownPlayer += (frame.view.player.hp - shownPlayer) * k;
      if (Math.abs(shownEnemy - frame.view.enemy.hp) < 0.05) shownEnemy = frame.view.enemy.hp;
      if (Math.abs(shownPlayer - frame.view.player.hp) < 0.05) shownPlayer = frame.view.player.hp;
      drawBars();
    }
  }

  return {
    root,
    update,
    setDrag(next) {
      const before = drag;
      drag = next;
      if (before && !next && frame) {
        const slot = frame.slots[before.handIndex];
        const node = cardNodes[before.handIndex];
        if (slot && node) placeCard(node, slot);
      }
      applyDrag();
    },
    setAnimated(on) {
      animationOn = on;
    },
    tick,
    setFps(line) {
      fpsLabel.visible = line !== null;
      if (line !== null) fpsLabel.text = line;
    },
    destroy() {
      root.destroy({ children: true });
    },
  };
}
