import { describe, expect, it } from 'vitest';
import type { CombatState } from '../../src/core/combat/model.ts';
import { summarizeCombat } from '../../src/core/combat/summary.ts';
import { playWithBot, start } from '../view/support.ts';

const finished = (patch: Partial<CombatState> & { hp?: number }): CombatState => {
  const { state } = start();
  const { hp, ...rest } = patch;
  return { ...state, ...rest, player: { ...state.player, hp: hp ?? state.player.hp } };
};

describe('summarizeCombat', () => {
  it('is null while the combat goes on', () => {
    expect(summarizeCombat(start().state)).toBeNull();
  });

  it('summarizes a won combat', () => {
    const base = start().state;
    const summary = summarizeCombat(finished({ phase: 'won', turn: 12, hp: 31, ritualUsed: true }));
    expect(summary).toEqual({
      outcome: 'won',
      enemyId: 'leszy',
      turns: 12,
      hpLeft: 31,
      hpMax: base.player.maxHp,
      ritualUsed: true,
    });
  });

  it('shows 0 health after a defeat, even when the state went below 0', () => {
    expect(summarizeCombat(finished({ phase: 'lost', turn: 9, hp: -4 }))?.hpLeft).toBe(0);
    expect(summarizeCombat(finished({ phase: 'lost', turn: 9, hp: 0 }))?.outcome).toBe('lost');
  });

  it('never shows more health than the maximum', () => {
    const base = start().state;
    expect(summarizeCombat(finished({ phase: 'won', hp: base.player.maxHp + 5 }))?.hpLeft).toBe(base.player.maxHp);
  });

  it('summarizes real combats played by the bot', () => {
    let won = 0;
    let lost = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const end = playWithBot(seed, () => {});
      const summary = summarizeCombat(end);
      if (end.phase === 'player') {
        expect(summary).toBeNull();
        continue;
      }
      expect(summary?.outcome).toBe(end.phase);
      expect(summary?.turns).toBe(end.turn);
      expect(summary?.ritualUsed).toBe(end.ritualUsed);
      expect(summary?.hpLeft).toBeGreaterThanOrEqual(0);
      expect(summary?.hpLeft).toBeLessThanOrEqual(summary?.hpMax ?? 0);
      if (end.phase === 'won') won++;
      else lost++;
    }
    expect(won + lost).toBeGreaterThan(0);
  });

  it('does not modify the state', () => {
    const state = finished({ phase: 'won', turn: 5, hp: 20 });
    const before = JSON.stringify(state);
    summarizeCombat(state);
    expect(JSON.stringify(state)).toBe(before);
  });
});
