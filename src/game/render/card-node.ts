// The picture of one card in the hand (and of the ghost that flies when it is played). The node is
// centred on its own origin, so the fan can place and rotate it by its middle.
import { Container, Graphics } from 'pixi.js';
import { elementColor, shade } from '../../view/art-style.ts';
import type { CardView } from '../../view/combat-view.ts';
import { CARD_HEIGHT, CARD_WIDTH } from '../../view/hand-fan.ts';
import type { TextRef } from '../../view/text.ts';
import { drawElementIcon, drawGlyph } from '../art/glyphs.ts';
import { createCreatureArt } from '../art/placeholder-art.ts';
import { COLORS, label } from './theme.ts';

export const ART_WIDTH = 80;
export const ART_HEIGHT = 52;
/** Width of the part of a card that stays visible when the next card lies on top of it. */
const VISIBLE_WIDTH = 56;

export function createCardNode(card: CardView, tr: (ref: TextRef) => string): Container {
  const node = new Container();
  const hw = CARD_WIDTH / 2;
  const hh = CARD_HEIGHT / 2;
  const accent =
    card.element !== null
      ? elementColor(card.element)
      : card.kind === 'curse'
        ? COLORS.violet
        : COLORS.dim;
  const frame = new Graphics();
  frame
    .roundRect(-hw, -hh, CARD_WIDTH, CARD_HEIGHT, 10)
    .fill(card.kind === 'curse' ? 0x241230 : shade(accent, 0.24));
  frame.roundRect(-hw, -hh, CARD_WIDTH, CARD_HEIGHT, 10).stroke({
    width: card.selected ? 3 : 2,
    color: card.selected ? COLORS.gold : accent,
    alpha: card.selected ? 1 : 0.85,
  });
  node.addChild(frame);

  const artBox = { x: -ART_WIDTH / 2, y: -hh + 5, width: ART_WIDTH, height: ART_HEIGHT };
  if (card.creature) {
    const art = createCreatureArt(
      { element: card.creature.element, form: card.creature.form, trait: card.creature.trait },
      { width: ART_WIDTH, height: ART_HEIGHT },
    );
    art.position.set(artBox.x, artBox.y);
    node.addChild(art);
  } else {
    const panel = new Graphics();
    panel
      .roundRect(artBox.x, artBox.y, artBox.width, artBox.height, 6)
      .fill(card.kind === 'curse' ? 0x170a20 : shade(accent, 0.45));
    if (card.element !== null) {
      drawElementIcon(
        panel,
        card.element,
        { x: -22, y: artBox.y + 5, width: 44, height: 44 },
        shade(accent, 1.15),
      );
    } else {
      drawGlyph(
        panel,
        card.kind === 'curse' ? 'curse' : 'shield',
        { x: -20, y: artBox.y + 7, width: 40, height: 40 },
        card.kind === 'curse' ? COLORS.violet : COLORS.blue,
      );
    }
    node.addChild(panel);
  }

  if (card.cost !== null) {
    const badge = new Graphics();
    const color = card.blocked === 'not_enough_ember' ? COLORS.redDark : 0x0b0f0c;
    badge.circle(-hw + 13, -hh + 13, 12).fill(color);
    badge
      .circle(-hw + 13, -hh + 13, 12)
      .stroke({ width: 2, color: card.blocked ? COLORS.red : COLORS.gold });
    node.addChild(badge);
    const cost = label(String(card.cost), 15, card.blocked ? COLORS.red : COLORS.gold, {
      bold: true,
      anchor: [0.5, 0.5],
    });
    cost.position.set(-hw + 13, -hh + 13);
    node.addChild(cost);
  }
  if (card.element !== null) {
    const tag = new Graphics();
    tag.circle(hw - 13, -hh + 13, 11).fill({ color: 0x0b0f0c, alpha: 0.8 });
    drawElementIcon(
      tag,
      card.element,
      { x: hw - 20, y: -hh + 6, width: 14, height: 14 },
      shade(accent, 1.3),
    );
    node.addChild(tag);
  }

  // Cards overlap in the fan and only the left part of all but the last stays visible: text starts at
  // the left edge, so what remains readable is the beginning of the name.
  const title = label(tr(card.title), 11, COLORS.text, {
    bold: true,
    wrap: VISIBLE_WIDTH,
    anchor: [0, 0],
  });
  title.position.set(-hw + 6, -hh + ART_HEIGHT + 8);
  node.addChild(title);

  if (card.creature) {
    const sub = label(tr(card.subtitle ?? card.title), 10, COLORS.dim, { anchor: [0, 0] });
    sub.position.set(-hw + 6, hh - 40);
    node.addChild(sub);
    const stats = new Graphics();
    drawGlyph(stats, 'sword', { x: -hw + 10, y: hh - 25, width: 14, height: 14 }, COLORS.gold);
    drawGlyph(stats, 'heart', { x: 6, y: hh - 25, width: 14, height: 14 }, COLORS.red);
    node.addChild(stats);
    const attack = label(String(card.creature.attack), 13, COLORS.text, {
      bold: true,
      anchor: [0, 0.5],
    });
    attack.position.set(-hw + 26, hh - 18);
    const health = label(String(card.creature.health), 13, COLORS.text, {
      bold: true,
      anchor: [0, 0.5],
    });
    health.position.set(22, hh - 18);
    node.addChild(attack, health);
  } else {
    const line = card.lines[0];
    if (line) {
      const text = label(tr(line), 10, COLORS.dim, { wrap: VISIBLE_WIDTH, anchor: [0, 0] });
      text.position.set(-hw + 6, hh - 48);
      node.addChild(text);
    }
  }

  if (card.blocked) {
    const dim = new Graphics();
    dim.roundRect(-hw, -hh, CARD_WIDTH, CARD_HEIGHT, 10).fill({ color: 0x000000, alpha: 0.42 });
    node.addChild(dim);
  }
  return node;
}
