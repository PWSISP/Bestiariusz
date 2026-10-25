import { describe, expect, it } from 'vitest';
import { parseLaunchOptions } from '../../src/app/launch-options.ts';

const DEV = { dev: true, reducedMotion: false };
const PROD = { dev: false, reducedMotion: false };

describe('parseLaunchOptions', () => {
  it('has sensible defaults for an empty query', () => {
    expect(parseLaunchOptions('', DEV)).toEqual({
      seed: null,
      anim: true,
      fps: false,
      enemyHp: null,
      playerHp: null,
      sheet: null,
      tester: false,
    });
    expect(parseLaunchOptions('?', PROD)).toEqual({
      seed: null,
      anim: true,
      fps: false,
      enemyHp: null,
      playerHp: null,
      sheet: null,
      tester: false,
    });
  });

  it('reads all options in a development build, with or without the question mark', () => {
    const expected = {
      seed: 42,
      anim: false,
      fps: true,
      enemyHp: 5,
      playerHp: 30,
      sheet: 'icons',
      tester: false,
    };
    expect(
      parseLaunchOptions('?seed=42&anim=0&fps=1&enemyHp=5&playerHp=30&sheet=icons', DEV),
    ).toEqual(expected);
    expect(
      parseLaunchOptions('seed=42&anim=0&fps=1&enemyHp=5&playerHp=30&sheet=icons', DEV),
    ).toEqual(expected);
  });

  it('ignores test options in a production build but keeps anim and fps', () => {
    expect(
      parseLaunchOptions('?seed=42&enemyHp=5&playerHp=30&sheet=icons&anim=off&fps=true', PROD),
    ).toEqual({
      seed: null,
      anim: false,
      fps: true,
      enemyHp: null,
      playerHp: null,
      sheet: null,
      tester: false,
    });
  });

  it('understands several spellings of on and off', () => {
    for (const v of ['0', 'false', 'OFF', 'No'])
      expect(parseLaunchOptions(`?anim=${v}`, PROD).anim).toBe(false);
    for (const v of ['1', 'true', 'On', 'YES'])
      expect(parseLaunchOptions(`?anim=${v}`, PROD).anim).toBe(true);
    for (const v of ['1', 'true', 'on', 'yes'])
      expect(parseLaunchOptions(`?fps=${v}`, PROD).fps).toBe(true);
    for (const v of ['0', 'false', 'maybe', ''])
      expect(parseLaunchOptions(`?fps=${v}`, PROD).fps).toBe(false);
  });

  it('turns animations off for reduced motion unless asked for them', () => {
    const reduced = { dev: false, reducedMotion: true };
    expect(parseLaunchOptions('', reduced).anim).toBe(false);
    expect(parseLaunchOptions('?anim=1', reduced).anim).toBe(true);
    expect(parseLaunchOptions('?anim=banana', reduced).anim).toBe(false);
    expect(parseLaunchOptions('?anim=banana', PROD).anim).toBe(true);
  });

  it.each([
    ['seed', 'x', null],
    ['seed', '-1', null],
    ['seed', '1.5', null],
    ['seed', '4294967296', null],
    ['seed', '99999999999', null],
    ['seed', '', null],
    ['seed', '0', 0],
    ['seed', '4294967295', 4294967295],
    ['enemyHp', '0', null],
    ['enemyHp', '1', 1],
    ['enemyHp', '100000', null],
    ['playerHp', 'abc', null],
    ['playerHp', '99999', 99999],
  ] as const)('reads %s=%s as %j in a development build', (name, value, expected) => {
    expect(
      parseLaunchOptions(`?${name}=${value}`, DEV)[name as 'seed' | 'enemyHp' | 'playerHp'],
    ).toBe(expected);
  });

  it('switches the tester mode on by the build, and by the address in development builds only', () => {
    expect(parseLaunchOptions('', { ...PROD, testerBuild: true }).tester).toBe(true);
    expect(parseLaunchOptions('?tester=0', { ...PROD, testerBuild: true }).tester).toBe(true);
    expect(parseLaunchOptions('?tester=1', DEV).tester).toBe(true);
    expect(parseLaunchOptions('?tester=YES', DEV).tester).toBe(true);
    expect(parseLaunchOptions('?tester=0', DEV).tester).toBe(false);
    expect(parseLaunchOptions('?tester=maybe', DEV).tester).toBe(false);
    expect(parseLaunchOptions('?tester=1', PROD).tester).toBe(false);
    expect(parseLaunchOptions('?tester=1', { ...PROD, testerBuild: false }).tester).toBe(false);
  });

  it('knows only two sheets', () => {
    expect(parseLaunchOptions('?sheet=creatures', DEV).sheet).toBe('creatures');
    expect(parseLaunchOptions('?sheet=other', DEV).sheet).toBeNull();
  });

  it('ignores unknown parameters and takes the first of a repeated one', () => {
    expect(parseLaunchOptions('?foo=bar&seed=1&seed=2', DEV).seed).toBe(1);
  });
});
