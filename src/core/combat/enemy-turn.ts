import type { ElementId, FormId, TraitId } from '../types.ts';

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
  /** direct: true = the hit goes to the player and skips the circles. */
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
  // Create deep copies to avoid modifying the original inputs
  const playerCopy = JSON.parse(JSON.stringify(player)) as PlayerState;
  const bossCopy = JSON.parse(JSON.stringify(boss)) as BossState;
  const log: string[] = [];

  function getTarget() {
    // Find the creature with highest attack, or player if all circles are empty
    let targetCircleIndex = -1;
    let maxAttack = -1;

    for (let i = 0; i < playerCopy.circles.length; i++) {
      const creature = playerCopy.circles[i];
      if (creature !== null && creature.attack > maxAttack) {
        maxAttack = creature.attack;
        targetCircleIndex = i;
      }
    }

    // If no creatures, target is the player
    if (targetCircleIndex === -1) {
      return { type: 'player' as const };
    }

    return { type: 'circle' as const, index: targetCircleIndex };
  }

  function applyDamageToPlayer(amount: number) {
    // Player block absorbs first
    let damage = amount;
    if (playerCopy.block > 0) {
      const absorbed = Math.min(damage, playerCopy.block);
      playerCopy.block -= absorbed;
      damage -= absorbed;
    }

    // Then player hp goes down
    const actualDamage = Math.min(damage, playerCopy.hp);
    playerCopy.hp -= actualDamage;

    log.push(`trafienie gracz ${actualDamage}`);

    // Check for defeat
    if (playerCopy.hp <= 0) {
      log.push('porazka');
      return true; // Defeat occurred
    }

    return false; // No defeat
  }

  function applyDamageToCreature(circleIndex: number, amount: number) {
    const creature = playerCopy.circles[circleIndex];
    if (creature === null) return;

    const damage = Math.min(amount, creature.health);
    creature.health -= damage;
    log.push(`trafienie krag${circleIndex} ${damage}`);

    if (creature.health <= 0) {
      playerCopy.circles[circleIndex] = null;
      log.push(`zniszczono krag${circleIndex}`);
    }
  }

  function performAttack(amount: number, direct: boolean | undefined) {
    // Check for defeat before the attack
    if (playerCopy.hp <= 0) return false;

    // If direct is true, always hit player
    if (direct === true) {
      return applyDamageToPlayer(amount);
    }

    // Otherwise, find target creature or player
    const target = getTarget();

    if (target.type === 'player') {
      return applyDamageToPlayer(amount);
    } else {
      applyDamageToCreature(target.index, amount);
    }

    return false; // No defeat from this attack
  }

  function performMultiAttack(amount: number, times: number, direct: boolean | undefined) {
    for (let i = 0; i < times; i++) {
      // Check for defeat before each attack
      if (playerCopy.hp <= 0) break;

      const defeated = performAttack(amount, direct);
      if (defeated) break;
    }
  }

  // Process all actions
  for (const action of actions) {
    // Check for defeat before processing new action
    if (playerCopy.hp <= 0) break;

    if (action.type === 'atak') {
      const defeated = performAttack(action.amount, action.direct);
      if (defeated) {
        // Stop processing after defeat
        break;
      }
    } else if (action.type === 'wielokrotny') {
      performMultiAttack(action.amount, action.times, action.direct);
    } else if (action.type === 'tarcza') {
      bossCopy.block += action.amount;
      log.push(`tarcza ${action.amount}`);
    } else if (action.type === 'klatwa') {
      const circleIndex = action.circle;
      if (playerCopy.circles[circleIndex] !== null) {
        playerCopy.circles[circleIndex] = null;
        log.push(`zniszczono krag${circleIndex}`);
      }
      // Add curse to discard pile and increase curses count
      playerCopy.discard.push('klatwa');
      playerCopy.curses += 1;
      log.push(`klatwa krag${circleIndex}`);
    } else if (action.type === 'kradziez') {
      if (playerCopy.hand.length > 0) {
        const card = playerCopy.hand.pop()!;
        bossCopy.stolen.push(card);
        log.push(`kradziez ${card}`);
      } else {
        log.push('kradziez brak');
      }
    }
  }

  return {
    player: playerCopy,
    boss: bossCopy,
    log,
  };
}
