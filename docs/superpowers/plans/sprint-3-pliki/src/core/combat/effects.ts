import { applyDamage } from './damage.ts';
import { drawCards } from './deck.ts';
import { gainEmber } from './ember.ts';
import type {
  CombatEnv,
  CombatEvent,
  CombatState,
  Creature,
} from './model.ts';
import { scaledAmount } from './synergy.ts';
import type {
  CreatureEffectDef,
  CreatureSpec,
  EffectTrigger,
  SymbolData,
} from '../types.ts';

/**
 * The effects of a creature in the fixed order of resolution: element, then form, then trait
 * (docs/efekty-symboli.md). Unknown symbols have no effects.
 */
export function effectsOf(symbols: SymbolData, spec: CreatureSpec): CreatureEffectDef[] {
  return [
    ...(symbols.elements.find((e) => e.id === spec.element)?.effects ?? []),
    ...(symbols.forms.find((f) => f.id === spec.form)?.effects ?? []),
    ...(symbols.traits.find((t) => t.id === spec.trait)?.effects ?? []),
  ];
}

/** Applies one hit to the enemy and records it; kills end the combat at once. */
export function damageEnemy(
  state: CombatState,
  hit: { amount: number; element: string | null; pierce?: boolean },
  source: 'spell' | 'creature' | 'ritual',
  circle: number | undefined,
  events: CombatEvent[],
): CombatState {
  const result = applyDamage(
    {
      hp: state.enemy.hp,
      maxHp: state.enemy.maxHp,
      block: state.enemy.block,
      resist: state.enemy.resist,
      weak: state.enemy.weak,
    },
    hit,
  );
  events.push({
    type: 'enemy_damaged',
    source,
    ...(circle === undefined ? {} : { circle }),
    dealt: result.dealt,
    blocked: result.blocked,
  });
  let next: CombatState = {
    ...state,
    enemy: { ...state.enemy, hp: result.target.hp, block: result.target.block },
  };
  if (result.killed) {
    next = { ...next, phase: 'won' };
    events.push({ type: 'combat_won' });
  }
  return next;
}

function withCreature(
  state: CombatState,
  index: number,
  change: (creature: Creature) => Creature,
): CombatState {
  const circles = state.player.circles.map((c, i) => (i === index && c ? change(c) : c));
  return { ...state, player: { ...state.player, circles } };
}

/** The whole effect vocabulary. A new operation is a new `EffectOp` value, a case here and a test. */
function applyOp(
  state: CombatState,
  fx: CreatureEffectDef,
  amount: number,
  index: number,
  creature: Creature,
  env: CombatEnv,
  events: CombatEvent[],
): CombatState {
  switch (fx.op) {
    case 'strike':
      return damageEnemy(
        state,
        { amount, element: creature.element, pierce: fx.pierce },
        'creature',
        index,
        events,
      );
    case 'guard':
      return { ...state, player: { ...state.player, block: state.player.block + amount } };
    case 'mend':
      return {
        ...state,
        player: { ...state.player, hp: Math.min(state.player.maxHp, state.player.hp + amount) },
      };
    case 'draw':
      return { ...state, deck: drawCards(state.deck, amount, env.rng) };
    case 'kindle':
      return { ...state, ember: gainEmber(state.ember, amount) };
    case 'growAttack':
      return withCreature(state, index, (c) => ({ ...c, attack: c.attack + amount }));
    case 'growHealth':
      return withCreature(state, index, (c) => ({
        ...c,
        health: c.health + amount,
        maxHealth: c.maxHealth + amount,
      }));
    case 'regen':
      return withCreature(state, index, (c) => ({
        ...c,
        health: Math.min(c.maxHealth, c.health + amount),
      }));
  }
}

/**
 * Resolves the effects of the creature in circle `index` that fire on `trigger`, in the order of
 * `effectsOf`. Stops as soon as the combat is over. Effects whose scaled amount is 0 do not fire.
 */
export function resolveCreatureEffects(
  state: CombatState,
  trigger: EffectTrigger,
  index: number,
  env: CombatEnv,
  events: CombatEvent[],
): CombatState {
  let s = state;
  const first = s.player.circles[index];
  if (!first) return s;
  for (const fx of effectsOf(env.data.symbols, first)) {
    if (fx.trigger !== trigger) continue;
    const creature = s.player.circles[index];
    if (s.phase !== 'player' || !creature) break;
    const amount = scaledAmount(fx, s.player.circles, index);
    if (amount < 1) continue;
    events.push({ type: 'effect', circle: index, trigger, op: fx.op, amount });
    s = applyOp(s, fx, amount, index, creature, env, events);
  }
  return s;
}

/** Circle indexes of the creature hits in an enemy-turn log (`trafienie krag<i> <n>`), in order. */
export function hitCircles(log: readonly string[]): number[] {
  const out: number[] = [];
  for (const line of log) {
    const match = /^trafienie krag(\d) (\d+)$/.exec(line);
    if (match && Number(match[2]) > 0) out.push(Number(match[1]));
  }
  return out;
}
