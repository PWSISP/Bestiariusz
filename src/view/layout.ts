// Layout of the combat screen (S04-01): where every region and every touch target sits.
// Pure: the Pixi drawing code and the DOM overlay both read the same rectangles, so they cannot drift.
// Portrait phones use the whole safe area (the board is at most 480 wide); wide screens (landscape,
// tablets) get the 360x800 reference stage scaled to fit until their own layouts arrive (S09-05).
import type { Insets, Rect, Size } from './geometry.ts';
import { NO_INSETS } from './geometry.ts';

export const REFERENCE_SIZE: Size = { width: 360, height: 800 };
/** Smallest touch target in CSS pixels (48 dp). */
export const MIN_TOUCH = 48;
/** Screens at least this wide in proportion to their height use the scaled reference stage. */
export const WIDE_ASPECT = 0.8;
export const MAX_COLUMN_WIDTH = 480;

const MARGIN = 8;
const GAP = 10;
const BUTTON_HEIGHT = 56;
const END_TURN_WIDTH = 128;
const PILE_WIDTH = 64;
const BAR_HEIGHT = 72;
const STATUS_HEIGHT = 56;
const ENEMY_HUD_HEIGHT = 56;
const INTENT_HEIGHT = 44;
const MAX_CIRCLE = 112;
const CIRCLE_CAPTION = 16;

export interface CombatLayout {
  /** 1 in portrait; the fit factor of the reference stage on wide screens. */
  readonly scale: number;
  readonly viewport: Size;
  /** The area the board occupies, in viewport coordinates. */
  readonly stage: Rect;
  /** Enemy name, health bar and block. */
  readonly enemyHud: Rect;
  /** The enemy picture; the intent chip floats over its lower edge. */
  readonly enemyArt: Rect;
  readonly intent: Rect;
  /** The three Kręgi (circles), left to right; each is a touch target. */
  readonly circles: readonly [Rect, Rect, Rect];
  /** Player health, block and Ember. */
  readonly status: Rect;
  /** Where the fan of cards is drawn. */
  readonly hand: Rect;
  /** A spell dragged above this y is cast. */
  readonly castLineY: number;
  readonly drawPile: Rect;
  readonly discardPile: Rect;
  readonly endTurn: Rect;
}

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

/** The layout inside a stage of the given size, with the origin at the stage's top-left corner. */
function stageLayout(
  width: number,
  height: number,
): Omit<CombatLayout, 'scale' | 'viewport' | 'stage'> {
  const buttonY = height - MARGIN - BUTTON_HEIGHT;
  const endTurn = rect(width - MARGIN - END_TURN_WIDTH, buttonY, END_TURN_WIDTH, BUTTON_HEIGHT);
  const drawPile = rect(MARGIN, buttonY, PILE_WIDTH, BUTTON_HEIGHT);
  const discardPile = rect(MARGIN + PILE_WIDTH + MARGIN, buttonY, PILE_WIDTH, BUTTON_HEIGHT);

  const handHeight = Math.min(250, Math.max(190, Math.round(height * 0.3)));
  const handY = height - BAR_HEIGHT - handHeight;
  const hand = rect(0, handY, width, handHeight);
  const status = rect(0, handY - STATUS_HEIGHT, width, STATUS_HEIGHT);

  const cell = Math.min(MAX_CIRCLE, Math.floor((width - 2 * MARGIN - 2 * GAP) / 3));
  const cellHeight = cell + CIRCLE_CAPTION;
  const rowWidth = 3 * cell + 2 * GAP;
  const circleY = status.y - MARGIN - cellHeight;
  const left = Math.round((width - rowWidth) / 2);
  const circles: [Rect, Rect, Rect] = [
    rect(left, circleY, cell, cellHeight),
    rect(left + cell + GAP, circleY, cell, cellHeight),
    rect(left + 2 * (cell + GAP), circleY, cell, cellHeight),
  ];

  const enemyBottom = circleY - MARGIN;
  const enemyHud = rect(MARGIN, 0, width - 2 * MARGIN, ENEMY_HUD_HEIGHT);
  const enemyArt = rect(0, ENEMY_HUD_HEIGHT, width, enemyBottom - ENEMY_HUD_HEIGHT);
  const intent = rect(MARGIN, enemyBottom - INTENT_HEIGHT, width - 2 * MARGIN, INTENT_HEIGHT);

  return {
    enemyHud,
    enemyArt,
    intent,
    circles,
    status,
    hand,
    castLineY: hand.y - MARGIN,
    drawPile,
    discardPile,
    endTurn,
  };
}

function place(r: Rect, scale: number, ox: number, oy: number): Rect {
  return rect(ox + r.x * scale, oy + r.y * scale, r.width * scale, r.height * scale);
}

export function layoutCombat(viewport: Size, insets: Insets = NO_INSETS): CombatLayout {
  const area = rect(
    insets.left,
    insets.top,
    Math.max(1, viewport.width - insets.left - insets.right),
    Math.max(1, viewport.height - insets.top - insets.bottom),
  );
  const wide = area.width / area.height >= WIDE_ASPECT;

  let scale = 1;
  let stageWidth: number;
  let stageHeight: number;
  if (wide) {
    scale = Math.min(area.width / REFERENCE_SIZE.width, area.height / REFERENCE_SIZE.height);
    stageWidth = REFERENCE_SIZE.width;
    stageHeight = REFERENCE_SIZE.height;
  } else {
    stageWidth = Math.min(area.width, MAX_COLUMN_WIDTH);
    stageHeight = area.height;
  }
  const ox = area.x + (area.width - stageWidth * scale) / 2;
  const oy = area.y + (area.height - stageHeight * scale) / 2;

  const local = stageLayout(stageWidth, stageHeight);
  const at = (r: Rect): Rect => place(r, scale, ox, oy);
  return {
    scale,
    viewport,
    stage: rect(ox, oy, stageWidth * scale, stageHeight * scale),
    enemyHud: at(local.enemyHud),
    enemyArt: at(local.enemyArt),
    intent: at(local.intent),
    circles: [at(local.circles[0]), at(local.circles[1]), at(local.circles[2])],
    status: at(local.status),
    hand: at(local.hand),
    castLineY: oy + local.castLineY * scale,
    drawPile: at(local.drawPile),
    discardPile: at(local.discardPile),
    endTurn: at(local.endTurn),
  };
}
