import type { Rng } from '../rng.ts';
import { buildCreature } from './creature.ts';
import type { StatRules } from './creature.ts';
import { createDeck, drawCards, endTurn as endTurnDeck, HAND_LIMIT } from './deck.ts';
import { EMBER_PER_TURN, gainEmber, playableIndexes, spendEmber } from './ember.ts';
import { damageEnemy, hitCircles, resolveCreatureEffects } from './effects.ts';
import { resolveEnemyTurn } from './enemy-turn.ts';
import type { EnemyAction } from './enemy-turn.ts';
import { chooseIntent } from './intent.ts';
import type {
  Balance,
  CardDef,
  CombatAction,
  CombatData,
  CombatEnv,
  CombatEvent,
  CombatResult,
  CombatSetup,
  CombatState,
  Creature,
  Effect,
  Intent,
  RejectReason,
} from './model.ts';
import { detectRitual } from './ritual.ts';

const cardOf = (data: CombatData, id: string): CardDef => {
  const card = Object.hasOwn(data.cards, id) ? data.cards[id] : undefined;
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
};

/** Stats rules from the balance data (decision D22); undefined = no unspent-budget bonus. */
export function statRules(balance: Balance): StatRules | undefined {
  return balance.leftoverHealth && balance.powerBudget !== undefined
    ? { powerBudget: balance.powerBudget, leftoverHealth: balance.leftoverHealth }
    : undefined;
}

function pickIntent(state: CombatState, data: CombatData): Intent {
  const def = Object.hasOwn(data.enemies, state.enemy.id)
    ? data.enemies[state.enemy.id]
    : undefined;
  if (!def) throw new Error(`Unknown enemy: ${state.enemy.id}`);
  const circles = state.player.circles;
  const actionId = chooseIntent(def.actions, {
    playerHand: state.deck.hand.length,
    bossHp: state.enemy.hp,
    bossMaxHp: state.enemy.maxHp,
    playerCircles: circles.filter((c) => c !== null).length,
    history: state.enemy.history,
  });
  const action = def.actions.find((a) => a.id === actionId);
  if (!action) throw new Error(`Unknown action: ${actionId}`);
  // A curse is telegraphed with its target: the circle of the strongest creature (lowest index on ties).
  let strongest = -1;
  circles.forEach((c, i) => {
    if (c && (strongest < 0 || c.attack > (circles[strongest] as Creature).attack)) strongest = i;
  });
  const actions: EnemyAction[] = action.effects.map((a) =>
    a.type === 'klatwa' ? { type: 'klatwa', circle: Math.max(0, strongest) } : { ...a },
  );
  return { actionId, actions };
}

function startPlayerTurn(state: CombatState, env: CombatEnv, events: CombatEvent[]): CombatState {
  let next: CombatState = {
    ...state,
    turn: state.turn + 1,
    player: { ...state.player, block: 0 },
    ember: EMBER_PER_TURN,
    deck: drawCards(state.deck, HAND_LIMIT, env.rng),
  };
  next = { ...next, intent: pickIntent(next, env.data) };
  events.push({ type: 'turn_started', turn: next.turn, intentId: next.intent.actionId });
  return next;
}

export function createCombat(data: CombatData, setup: CombatSetup, rng: Rng): CombatResult {
  const def = Object.hasOwn(data.enemies, setup.enemyId) ? data.enemies[setup.enemyId] : undefined;
  if (!def) throw new Error(`Unknown enemy: ${setup.enemyId}`);
  for (const id of setup.deck) cardOf(data, id);
  const base: CombatState = {
    turn: 0,
    phase: 'player',
    player: {
      hp: Math.max(
        1,
        Math.min(data.balance.playerMaxHp, setup.startHp ?? data.balance.playerMaxHp),
      ),
      maxHp: data.balance.playerMaxHp,
      block: 0,
      circles: [null, null, null],
      curses: 0,
    },
    enemy: {
      id: def.id,
      hp: def.maxHp,
      maxHp: def.maxHp,
      block: 0,
      resist: def.resist,
      weak: def.weak,
      stolen: [],
      history: [],
    },
    deck: createDeck(setup.deck, rng),
    ember: 0,
    ritualUsed: false,
    intent: { actionId: '', actions: [] },
  };
  const events: CombatEvent[] = [];
  return { state: startPlayerTurn(base, { data, rng }, events), events };
}

function applyEffects(
  state: CombatState,
  effects: readonly Effect[],
  element: string | null,
  source: 'spell' | 'ritual',
  env: CombatEnv,
  events: CombatEvent[],
): CombatState {
  let s = state;
  for (const fx of effects) {
    if (s.phase !== 'player') break;
    switch (fx.kind) {
      case 'damage':
        s = damageEnemy(
          s,
          { amount: fx.amount, element, pierce: fx.pierce },
          source,
          undefined,
          events,
        );
        break;
      case 'block':
        s = { ...s, player: { ...s.player, block: s.player.block + fx.amount } };
        break;
      case 'heal':
        s = {
          ...s,
          player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + fx.amount) },
        };
        break;
      case 'draw':
        s = { ...s, deck: drawCards(s.deck, fx.count, env.rng) };
        break;
      case 'ember':
        s = { ...s, ember: gainEmber(s.ember, fx.amount) };
        break;
    }
  }
  return s;
}

function reject(state: CombatState, reason: RejectReason): CombatResult {
  return { state, events: [{ type: 'rejected', reason }] };
}

function playCard(
  state: CombatState,
  action: Extract<CombatAction, { type: 'playCard' }>,
  env: CombatEnv,
): CombatResult {
  const { handIndex, circle } = action;
  const id = Number.isInteger(handIndex) ? state.deck.hand[handIndex] : undefined;
  if (id === undefined) return reject(state, 'no_such_card');
  const card = cardOf(env.data, id);
  if (card.kind === 'curse') return reject(state, 'unplayable');
  if (card.cost > state.ember) return reject(state, 'not_enough_ember');
  if (card.kind === 'creature') {
    if (circle === undefined || !Number.isInteger(circle) || circle < 0 || circle > 2) {
      return reject(state, 'circle_required');
    }
    if (state.player.circles[circle] !== null) return reject(state, 'circle_occupied');
  }

  const events: CombatEvent[] = [{ type: 'card_played', cardId: id }];
  let s: CombatState = {
    ...state,
    ember: spendEmber(state.ember, card.cost),
    deck: {
      ...state.deck,
      hand: state.deck.hand.filter((_, i) => i !== handIndex),
      discard: [...state.deck.discard, id],
    },
  };

  if (card.kind === 'spell') {
    s = applyEffects(s, card.effects, card.element, 'spell', env, events);
    return { state: s, events };
  }

  const slot = circle as number;
  const creature = buildCreature(env.data.symbols, id, card.creature, statRules(env.data.balance));
  let circles = s.player.circles.slice();
  circles[slot] = creature;
  s = { ...s, player: { ...s.player, circles } };
  events.push({ type: 'creature_summoned', circle: slot, cardId: id });

  // Summon effects come before the ritual check; they can end the combat.
  s = resolveCreatureEffects(s, 'summon', slot, env, events);
  if (s.phase !== 'player') return { state: s, events };
  circles = s.player.circles.slice();

  const allElements = env.data.symbols.elements.map((e) => e.id);
  const ritual = detectRitual(
    circles.map((c) => (c ? { element: c.element } : null)),
    s.ritualUsed ? allElements : [],
  );
  if (ritual !== null) {
    s = { ...s, ritualUsed: true };
    events.push({ type: 'ritual', element: ritual });
    s = applyEffects(s, env.data.balance.ritual[ritual] ?? [], ritual, 'ritual', env, events);
  }
  return { state: s, events };
}

function endTurn(state: CombatState, env: CombatEnv): CombatResult {
  const events: CombatEvent[] = [];
  let s = state;

  // 1. Creatures attack, circle 0 to 2.
  for (let i = 0; i < 3 && s.phase === 'player'; i++) {
    const creature = s.player.circles[i];
    if (creature) {
      s = damageEnemy(
        s,
        { amount: creature.attack, element: creature.element },
        'creature',
        i,
        events,
      );
      s = resolveCreatureEffects(s, 'attack', i, env, events);
    }
  }
  if (s.phase !== 'player') return { state: s, events };

  // 1b. End-of-turn effects, circle 0 to 2.
  for (let i = 0; i < 3 && s.phase === 'player'; i++) {
    s = resolveCreatureEffects(s, 'turnEnd', i, env, events);
  }
  if (s.phase !== 'player') return { state: s, events };

  // 2. Enemy phase: block expires, the shown intent resolves.
  const before = s.player.circles;
  const resolved = resolveEnemyTurn(
    {
      hp: s.player.hp,
      maxHp: s.player.maxHp,
      block: s.player.block,
      circles: before.map((c) =>
        c
          ? { element: c.element, form: c.form, trait: c.trait, attack: c.attack, health: c.health }
          : null,
      ),
      hand: s.deck.hand.slice(),
      discard: s.deck.discard.slice(),
      curses: s.player.curses,
    },
    { hp: s.enemy.hp, maxHp: s.enemy.maxHp, block: 0, stolen: s.enemy.stolen.slice() },
    s.intent.actions,
  );
  const circles = before.map((c, i) => {
    const after = resolved.player.circles[i];
    return c && after ? { ...c, health: after.health } : null;
  });
  circles.forEach((c, i) => {
    if (before[i] && !c) events.push({ type: 'creature_died', circle: i });
  });
  if (resolved.player.hp < s.player.hp) {
    events.push({ type: 'player_damaged', amount: s.player.hp - resolved.player.hp });
  }
  events.push({ type: 'enemy_acted', actionId: s.intent.actionId, log: resolved.log });
  s = {
    ...s,
    player: {
      ...s.player,
      hp: resolved.player.hp,
      block: resolved.player.block,
      circles,
      curses: resolved.player.curses,
    },
    enemy: {
      ...s.enemy,
      block: resolved.boss.block,
      stolen: resolved.boss.stolen,
      history: [...s.enemy.history, s.intent.actionId],
    },
    deck: { ...s.deck, hand: resolved.player.hand, discard: resolved.player.discard },
  };
  if (s.player.hp <= 0) {
    events.push({ type: 'combat_lost' });
    return { state: { ...s, phase: 'lost' }, events };
  }

  // 2b. Effects of creatures that were hit and survived, in the order of the hits.
  for (const circle of hitCircles(resolved.log)) {
    s = resolveCreatureEffects(s, 'damaged', circle, env, events);
    if (s.phase !== 'player') return { state: s, events };
  }

  // 3. Hand to the discard pile, next player turn.
  s = { ...s, deck: endTurnDeck(s.deck) };
  return { state: startPlayerTurn(s, env, events), events };
}

export function reduce(state: CombatState, action: CombatAction, env: CombatEnv): CombatResult {
  if (state.phase !== 'player') return reject(state, 'combat_over');
  return action.type === 'playCard' ? playCard(state, action, env) : endTurn(state, env);
}

export function legalActions(state: CombatState, env: CombatEnv): CombatAction[] {
  if (state.phase !== 'player') return [];
  const costOf = (id: string): number | null => {
    const card = cardOf(env.data, id);
    return card.kind === 'curse' ? null : card.cost;
  };
  const out: CombatAction[] = [];
  for (const handIndex of playableIndexes(state.deck.hand, costOf, state.ember)) {
    const card = cardOf(env.data, state.deck.hand[handIndex] as string);
    if (card.kind === 'spell') out.push({ type: 'playCard', handIndex });
    else
      state.player.circles.forEach((c, circle) => {
        if (c === null) out.push({ type: 'playCard', handIndex, circle });
      });
  }
  out.push({ type: 'endTurn' });
  return out;
}
