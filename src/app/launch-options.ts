// Options read from the address of the page (`?seed=42&anim=0`). Pure: takes the query string and the
// facts about the environment, returns plain values. Options for tests and measurements (`seed`,
// `enemyHp`, `playerHp`) are honoured in development builds only, so a player cannot start a
// weakened enemy by editing the address; `anim` and `fps` are harmless and work everywhere. Telemetry
// (`tester`) is switched on by the build of the testers, never by the address of a normal build.

export interface LaunchOptions {
  /** Fixed seed of the run; null = ask for a fresh one. */
  readonly seed: number | null;
  /** False switches the combat animations off (also the default for people who asked for reduced motion). */
  readonly anim: boolean;
  /** True shows the frame meter. */
  readonly fps: boolean;
  /** Enemy maximum health override (development builds only). */
  readonly enemyHp: number | null;
  /** Player maximum health override (development builds only). */
  readonly playerHp: number | null;
  /** A development sheet to show instead of the game (development builds only). */
  readonly sheet: 'creatures' | 'icons' | null;
  /** True in the tester build (and with `?tester=1` in development builds): local telemetry and its export. */
  readonly tester: boolean;
}

export interface LaunchEnvironment {
  readonly dev: boolean;
  /** The system asks for less motion (`prefers-reduced-motion`). */
  readonly reducedMotion: boolean;
  /** The build was made for testers (`VITE_TESTER=1`). */
  readonly testerBuild?: boolean;
}

const OFF = new Set(['0', 'false', 'off', 'no']);
const ON = new Set(['1', 'true', 'on', 'yes']);

function wholeNumber(value: string | null, min: number, max: number): number | null {
  if (value === null || !/^\d{1,10}$/.test(value)) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
}

export function parseLaunchOptions(search: string, env: LaunchEnvironment): LaunchOptions {
  const params = new URLSearchParams(search);
  const anim = params.get('anim')?.toLowerCase() ?? null;
  const fps = params.get('fps')?.toLowerCase() ?? null;
  const sheet = params.get('sheet');
  return {
    seed: env.dev ? wholeNumber(params.get('seed'), 0, 0xffffffff) : null,
    anim:
      anim !== null && OFF.has(anim)
        ? false
        : anim !== null && ON.has(anim)
          ? true
          : !env.reducedMotion,
    fps: fps !== null && ON.has(fps),
    enemyHp: env.dev ? wholeNumber(params.get('enemyHp'), 1, 99_999) : null,
    playerHp: env.dev ? wholeNumber(params.get('playerHp'), 1, 99_999) : null,
    sheet: env.dev && (sheet === 'creatures' || sheet === 'icons') ? sheet : null,
    tester:
      env.testerBuild === true || (env.dev && ON.has(params.get('tester')?.toLowerCase() ?? '')),
  };
}
