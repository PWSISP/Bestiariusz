// Placeholder picture of an enemy (S04-01): the Leszy as a tree-man with an antler crown and glowing
// eyes, drawn into a box. Other enemies get a plain dark blob until they have art of their own.
import { Container, Graphics } from 'pixi.js';
import type { Size } from '../../view/geometry.ts';

export function createEnemyArt(enemyId: string, box: Size): Container {
  const art = new Container();
  const g = new Graphics();
  const w = box.width;
  const h = box.height;
  const u = (x: number): number => x * w;
  const v = (y: number): number => y * h;
  if (enemyId === 'leszy') {
    // trunk body
    g.poly([
      u(0.3),
      v(1),
      u(0.36),
      v(0.5),
      u(0.4),
      v(0.3),
      u(0.6),
      v(0.3),
      u(0.64),
      v(0.5),
      u(0.7),
      v(1),
    ]).fill(0x2b3a28);
    g.poly([u(0.4), v(1), u(0.44), v(0.55), u(0.5), v(0.4), u(0.56), v(0.55), u(0.6), v(1)]).fill({
      color: 0x3d5238,
      alpha: 0.7,
    });
    // arms (branches)
    g.moveTo(u(0.38), v(0.5)).lineTo(u(0.16), v(0.62)).lineTo(u(0.08), v(0.82));
    g.moveTo(u(0.62), v(0.5)).lineTo(u(0.84), v(0.62)).lineTo(u(0.92), v(0.82));
    g.stroke({ width: Math.max(4, u(0.04)), color: 0x2b3a28, cap: 'round', join: 'round' });
    // head
    g.ellipse(u(0.5), v(0.3), u(0.11), v(0.1)).fill(0x34462f);
    // antlers
    const antler = (side: number): void => {
      const x0 = u(0.5 + side * 0.07);
      g.moveTo(x0, v(0.22))
        .lineTo(u(0.5 + side * 0.16), v(0.1))
        .lineTo(u(0.5 + side * 0.2), v(0.0));
      g.moveTo(u(0.5 + side * 0.16), v(0.1)).lineTo(u(0.5 + side * 0.28), v(0.08));
      g.moveTo(u(0.5 + side * 0.11), v(0.16)).lineTo(u(0.5 + side * 0.22), v(0.18));
    };
    antler(-1);
    antler(1);
    g.stroke({ width: Math.max(3, u(0.025)), color: 0x6b5a3a, cap: 'round', join: 'round' });
    // eyes
    g.circle(u(0.46), v(0.29), u(0.022)).fill(0xd8ff7a);
    g.circle(u(0.54), v(0.29), u(0.022)).fill(0xd8ff7a);
    g.circle(u(0.46), v(0.29), u(0.05)).fill({ color: 0xd8ff7a, alpha: 0.18 });
    g.circle(u(0.54), v(0.29), u(0.05)).fill({ color: 0xd8ff7a, alpha: 0.18 });
    // moss beard
    g.poly([u(0.43), v(0.37), u(0.5), v(0.5), u(0.57), v(0.37)]).fill({
      color: 0x5f8a4a,
      alpha: 0.8,
    });
  } else {
    g.ellipse(u(0.5), v(0.6), u(0.3), v(0.38)).fill(0x2b2f35);
    g.circle(u(0.42), v(0.5), u(0.03)).fill(0xe0e0e0);
    g.circle(u(0.58), v(0.5), u(0.03)).fill(0xe0e0e0);
  }
  art.addChild(g);
  return art;
}
