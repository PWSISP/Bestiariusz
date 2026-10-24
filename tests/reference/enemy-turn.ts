// Reference implementation of enemy-turn, kept only as an oracle for tests/diff/qwen-vs-reference.test.ts.
// Do not import it from src/. Added AFTER the Qwen task so the model never sees it.

import type { ElementId, FormId, TraitId } from '../../src/core/types.ts';

export interface CircleCreature {
  element: ElementId;
  form: FormId;
  trait: TraitId;
  attack: number;
  health: number;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  block: number;
  circles: Array<CircleCreature | null>;
  hand: string[];
  discard: string[];
  curses: number;
}

export interface BossState {
  hp: number;
  maxHp: number;
  block: number;
  stolen: string[];
}

export type EnemyAction =
  | { type: 'atak'; amount: number; direct?: boolean }
  | { type: 'wielokrotny'; amount: number; times: number; direct?: boolean }
  | { type: 'tarcza'; amount: number }
  | { type: 'klatwa'; circle: number }
  | { type: 'kradziez' };

export interface EnemyTurnResult {
  player: PlayerState;
  boss: BossState;
  log: string[];
}

export function resolveEnemyTurn(
  player: PlayerState,
  boss: BossState,
  actions: readonly EnemyAction[],
): EnemyTurnResult {
  const p: PlayerState = {
    ...player,
    circles: player.circles.map((c) => (c ? { ...c } : null)),
    hand: player.hand.slice(),
    discard: player.discard.slice(),
  };
  const b: BossState = { ...boss, stolen: boss.stolen.slice() };
  const log: string[] = [];
  let defeated = false;

  const hit = (amount: number, direct = false) => {
    let target = -1;
    if (!direct)
      p.circles.forEach((c, i) => {
        if (c && (target < 0 || c.attack > (p.circles[target] as CircleCreature).attack))
          target = i;
      });
    if (target >= 0) {
      const c = p.circles[target] as CircleCreature;
      const lost = Math.min(amount, c.health);
      c.health -= lost;
      log.push(`trafienie krag${target} ${lost}`);
      if (c.health <= 0) {
        p.circles[target] = null;
        log.push(`zniszczono krag${target}`);
      }
      return;
    }
    const blocked = Math.min(p.block, amount);
    p.block -= blocked;
    const hpLost = Math.min(amount - blocked, p.hp);
    p.hp -= hpLost;
    log.push(`trafienie gracz ${hpLost}`);
    if (p.hp <= 0) {
      log.push('porazka');
      defeated = true;
    }
  };

  for (const a of actions) {
    if (defeated) break;
    switch (a.type) {
      case 'atak':
        hit(a.amount, a.direct === true);
        break;
      case 'wielokrotny':
        for (let k = 0; k < a.times && !defeated; k++) hit(a.amount, a.direct === true);
        break;
      case 'tarcza':
        b.block += a.amount;
        log.push(`tarcza ${a.amount}`);
        break;
      case 'klatwa':
        if (p.circles[a.circle]) {
          p.circles[a.circle] = null;
          log.push(`zniszczono krag${a.circle}`);
        }
        p.discard.push('klatwa');
        p.curses += 1;
        log.push(`klatwa krag${a.circle}`);
        break;
      case 'kradziez': {
        const card = p.hand.pop();
        if (card === undefined) log.push('kradziez brak');
        else {
          b.stolen.push(card);
          log.push(`kradziez ${card}`);
        }
        break;
      }
    }
  }
  return { player: p, boss: b, log };
}
