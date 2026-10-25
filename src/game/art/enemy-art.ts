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
  } else if (enemyId === 'utopiec') {
    // a hunched drowned man with a green cap and dripping water
    g.ellipse(u(0.5), v(0.68), u(0.3), v(0.3)).fill(0x2a5560);
    g.ellipse(u(0.5), v(0.36), u(0.15), v(0.14)).fill(0x3b7c78);
    g.poly([u(0.36), v(0.3), u(0.5), v(0.12), u(0.64), v(0.3)]).fill(0x2f6b3c);
    g.circle(u(0.44), v(0.37), u(0.025)).fill(0xf2ffb0);
    g.circle(u(0.56), v(0.37), u(0.025)).fill(0xf2ffb0);
    for (const x of [0.3, 0.45, 0.62, 0.74])
      g.ellipse(u(x), v(0.9), u(0.025), v(0.05)).fill({ color: 0x6fc4d6, alpha: 0.7 });
  } else if (enemyId === 'strzyga') {
    // a pale, winged shape with two rows of claws
    g.poly([
      u(0.5),
      v(0.25),
      u(0.05),
      v(0.7),
      u(0.3),
      v(0.62),
      u(0.5),
      v(0.95),
      u(0.7),
      v(0.62),
      u(0.95),
      v(0.7),
    ]).fill(0x4a2a3a);
    g.ellipse(u(0.5), v(0.34), u(0.13), v(0.13)).fill(0xd9cfc4);
    g.circle(u(0.45), v(0.33), u(0.022)).fill(0xc0242c);
    g.circle(u(0.55), v(0.33), u(0.022)).fill(0xc0242c);
    g.poly([u(0.44), v(0.4), u(0.5), v(0.5), u(0.56), v(0.4)]).fill(0x7a1c24);
    g.moveTo(u(0.28), v(0.74))
      .lineTo(u(0.24), v(0.9))
      .moveTo(u(0.72), v(0.74))
      .lineTo(u(0.76), v(0.9));
    g.stroke({ width: Math.max(3, u(0.025)), color: 0xd9cfc4, cap: 'round' });
  } else if (enemyId === 'poludnica') {
    // a tall figure in a pale dress with a scythe against the noon sun
    g.circle(u(0.5), v(0.22), u(0.3)).fill({ color: 0xf3d26a, alpha: 0.18 });
    g.poly([u(0.4), v(0.3), u(0.6), v(0.3), u(0.78), v(1), u(0.22), v(1)]).fill(0xe8dfc2);
    g.ellipse(u(0.5), v(0.2), u(0.09), v(0.09)).fill(0xf1e7d0);
    g.rect(u(0.44), v(0.16), u(0.12), v(0.04)).fill(0x20202a);
    g.moveTo(u(0.84), v(0.12)).lineTo(u(0.84), v(0.95));
    g.stroke({ width: Math.max(3, u(0.02)), color: 0x6b5a3a, cap: 'round' });
    g.moveTo(u(0.84), v(0.12)).quadraticCurveTo(u(0.62), v(0.06), u(0.56), v(0.22));
    g.stroke({ width: Math.max(3, u(0.025)), color: 0xc8ccd2, cap: 'round' });
  } else {
    g.ellipse(u(0.5), v(0.6), u(0.3), v(0.38)).fill(0x2b2f35);
    g.circle(u(0.42), v(0.5), u(0.03)).fill(0xe0e0e0);
    g.circle(u(0.58), v(0.5), u(0.03)).fill(0xe0e0e0);
  }
  art.addChild(g);
  return art;
}
