import { describe, expect, it } from 'vitest';
import { finishFight, startRun, takeReward } from '../../src/core/run/run.ts';
import { buildRouteView } from '../../src/view/route-view.ts';
import { data } from './support.ts';

describe('buildRouteView', () => {
  const ex = data.balance.expedition!;

  it('marks the first fight as current, the rest as upcoming and the last as the boss', () => {
    const view = buildRouteView(data, startRun(data, 1));
    expect(view.stages.map((s) => s.enemyId)).toEqual([...ex.stages]);
    expect(view.stages.map((s) => s.state)).toEqual(
      ex.stages.map((_, i) => (i === 0 ? 'current' : 'upcoming')),
    );
    expect(view.stages.filter((s) => s.boss).map((s) => s.enemyId)).toEqual(['leszy']);
    expect(view.step).toEqual({ current: 1, total: ex.stages.length });
    expect(view.stages[0]?.name).toEqual({ key: `enemy.${ex.stages[0]}.name` });
  });

  it('shows the carried health, ink and deck size and marks the won fights as done', () => {
    let run = startRun(data, 1);
    run = takeReward(finishFight(data, run, { won: true, hpLeft: 20 }), 'iskra');
    const view = buildRouteView(data, run);
    expect(view.stages[0]?.state).toBe('done');
    expect(view.stages[1]?.state).toBe('current');
    expect(view.hp).toBe(run.hp);
    expect(view.hpMax).toBe(data.balance.playerMaxHp);
    expect(view.ink).toBe(run.ink);
    expect(view.deckSize).toBe(run.deck.length);
    expect(view.step.current).toBe(2);
    expect(view.workshop).toBe(true);
  });

  it('throws without an expedition', () => {
    const { expedition: _e, ...balance } = data.balance;
    expect(() => buildRouteView({ ...data, balance }, startRun(data, 1))).toThrow('not configured');
  });
});
