# Sprint 1 «Fundament: repozytorium i fabryka» — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Działające repozytorium gry z narzędziami i CI, potok Qwen → Claude wykonujący zadania w repozytorium, szkielet aplikacji PixiJS (menedżer ekranów, nakładka HTML, magistrala zdarzeń), lokalizacja PL/EN i debugowy APK, który pokazuje ekran PixiJS na twoim telefonie.

**Architecture:** Jedno repozytorium z trzema warstwami: `src/core` (czysta logika bez DOM, PixiJS, i18n), `src/app` + `src/game` + `src/ui` (PixiJS i nakładka HTML) oraz `src/platform` (Capacitor, od S07). Granice warstw pilnują ESLint (zakazane importy, `Math.random`, `Date.now`) i drugi projekt TypeScript bez typów DOM dla `src/core` i `src/data`. Zadania modułowe robi Qwen w izolowanej kopii repozytorium (potok z benchmarku, ocena: Vitest + `tsc` + ESLint + sumy kontrolne), konfigurację, integracje i szkielet robi Claude.

**Tech Stack:** TypeScript strict (~6.0.3 jak w benchmarku), Vite, Vitest (+ jsdom), ESLint 9 (flat config) + typescript-eslint, Prettier, zod, PixiJS v8, i18next + i18next-icu, @playwright/test (Chromium + WebKit), Capacitor (Android), GitHub Actions. Wersje: najnowsze stabilne z dnia wykonania, zapisane w `package-lock.json`.

**Spec:** `docs/plan-sprintow.md` — sekcja „S01 · 2–15 XI 2026 · Fundament: repozytorium i fabryka” (zadania S01-00 … S01-12), rozdziały 2–3 (zasady pracy, definicja ukończenia) oraz dodatki A–B. Plik leży w repozytorium obok tego planu.

## Global Constraints

Wymagania całego projektu, skopiowane ze specyfikacji; każde zadanie je dziedziczy.

- TypeScript `strict` bez wyjątków; ESLint bez ostrzeżeń (`--max-warnings 0`).
- Zero `Math.random` w `src/`; zero `Date.now` (i `new Date()`) w logice gry (`src/core`, `src/data`) — tylko ziarno i wstrzyknięty zegar.
- Zero tekstów w kodzie interfejsu: wszystko przez i18n, klucze w `pl.json` i `en.json`.
- Interfejs: pola dotyku ≥ 48 dp; każdy element interaktywny ma nazwę dla czytnika ekranu; informacja nigdy nie jest przekazana samym kolorem; działa w pionie, poziomie i na tablecie.
- Gra działa offline: w czasie działania zero żądań do zewnętrznych hostów.
- Budżety: paczka ≤ 150 MB (cel 120 MB), 60 kl./s na telefonie testowym, pamięć ≤ 500 MB; build web w CI poniżej 5 minut.
- Importy między plikami źródłowymi z rozszerzeniem `.ts`; `import type` dla typów; bez `enum`, `namespace` i parametrów-pól w konstruktorach (`erasableSyntaxOnly`).
- `src/core` nie importuje DOM, PixiJS, i18next, Capacitor ani warstw `ui`, `game`, `platform`, `app`; zwraca klucze i18n, nie teksty.
- Żadnych nowych zależności bez wpisu w `docs/decyzje.md`.
- Qwen edytuje tylko jeden wskazany plik; po pięciu nieudanych podejściach zadanie przejmuje Claude i zapisuje powód w `docs/retro/S01.md`.
- Ziarno kanoniczne w testach: `20261102`.
- Dokumenty po polsku; kod, identyfikatory, specyfikacje dla Qwena i komunikaty commitów po angielsku (Conventional Commits). Sesja wykonująca dopisuje do commitów własną atrybucję.
- Żadnych haseł, kluczy ani tokenów w repozytorium.

## Review Focus

Wejścia i sytuacje, których specyfikacja nie rozpisuje, a które najprawdopodobniej uderzą w osobę grającą. Każda pozycja ma swój test lub krok w zadaniu, które posiada kod.

1. **Nieprawidłowe ziarno** (`NaN`, `-1`, `1.5`, `2^32`, `Infinity`): ma rzucać `RangeError`, a ziarna `0` i `4294967295` mają działać. → S01-04.
2. **Uszkodzony plik danych symboli** (`null`, `[]`, brak listy, zdublowane `id`, koszt `0`, `1.5` albo `"3"`, nieznane pole, `id` z polskimi znakami): czytelny błąd z nazwą pola, nigdy `undefined` ani dane częściowe. → S01-03.
3. **Podwójne dotknięcie i przełączenie ekranu z wnętrza `mount()`**: ekran montuje się raz, odmontowuje raz, nic nie zostaje w pamięci. → S01-05.
4. **Obrót telefonu i zmiana rozmiaru okna przy zamontowanym ekranie**: płótno i nakładka dopasowują się, przełączanie dalej działa. → S01-05.
5. **Aplikacja w tle i powrót, wycięcie aparatu lub pasek systemowy nad przyciskiem**: ekran znowu się rysuje, przycisk nie jest przykryty. → S01-08 (lista kontrolna na telefonie).

## Gdzie i jak to wykonać

- **Na twoim laptopie z Windows** (Node 24.22.0, Ollama 0.34.4 z modelem `qwen3-coder-64k`, Claude Code 2.1.309). W środowisku chmurowym nie działa rejestr npm, więc tam nie da się zainstalować zależności.
- Katalog repozytorium: `C:\Users\tchor\bestiariusz` (krótka ścieżka; unikaj `Downloads`). Sesja wykonująca startuje w tym katalogu poleceniem `claude` i dostaje: „Wykonaj plan docs/superpowers/plans/2026-10-24-sprint-1-fundament.md”.
- Do repozytorium trafiają dwa pliki otrzymane ode mnie: `docs/plan-sprintow.md` i ten plan.
- Polecenia w planie działają w PowerShell 5.1 i w Git Bash; nie używam `&&` poza `package.json`.
- Źródło portu potoku: `C:\Users\tchor\Downloads\bestiariusz\bestiariusz-bench\bench\run.mjs` (w chmurze: `/home/claude/bestiariusz-bench/bench/run.mjs`; wszystkie trzy kopie `run.mjs` są identyczne).

## Decyzje podjęte w planie (zmień, jeśli się nie zgadzasz)

| # | Decyzja | Powód |
|---|---|---|
| D1 | **Koszty mocy w S01-11 wymagają twojej decyzji** (opis niżej). | Dane z benchmarku łamią kryterium S03-01. |
| D2 | Testy jednostkowe w **Vitest**, nie `node --test`. | Definicja ukończenia wymaga Vitest; potok Qwena dostaje własne polecenie testowe. |
| D3 | **zod** do walidacji danych (S01-03), później także zapisu gry i serwera. | Błędy ze ścieżką pola za darmo; jedna biblioteka schematów w całej aplikacji. |
| D4 | Nowy katalog **`src/app/`** (menedżer ekranów, start aplikacji). | Dodatek A nie ma miejsca na kod, który łączy PixiJS i nakładkę HTML. |
| D5 | Specyfikacje i `CLAUDE.md` dla Qwena **po angielsku**; runner rozumie też etykietę `Plik do edycji:`. | Benchmark (9/10) szedł po angielsku. |
| D6 | Chronione są **wszystkie pliki poza plikiem docelowym** (zamiast listy katalogów z benchmarku). | W repozytorium gry plik docelowy leży w `src/core`, więc ochrona katalogami nie działa. |
| D7 | Test przecieków ekranów w przeglądarce tylko w **Chromium**; WebKit sprawdza RNG. | Bezgłowy WebKit na Linuksie bywa bez WebGL. |
| D8 | PixiJS wymuszony na **WebGL** (`preference: 'webgl'`). | WebGPU w Android WebView jest niestabilne. |
| D9 | Identyfikator aplikacji Androida roboczo **`app.bestiariusz.game`**. | Zmienia się, jeśli przegląd nazwy (S11) odrzuci „Bestiariusz”; musi być zamrożony przed S13. |
| D10 | Wyświetlane nazwy symboli (nazwa, dopełniacz, przymiotnik) siedzą w plikach językowych pod `symbol.<rodzaj>.<id>.*`, nie w danych. | Reguła „zero tekstów w kodzie”; klucze dochodzą w S03-01. |

### D1. Koszty mocy symboli

Przy kosztach z benchmarku (Ogień 3, Woda 2, Ziemia 2, Wiatr 2, Grom 4; Wilk 4, Kruk 3, Sowa 3, Wąż 4, Niedźwiedź 5, Jeleń 4; Gniew 3, Smutek 1, Spryt 2, Odwaga 2, Głód 3) **12 z 150 kombinacji przekracza budżet 10**: Ogień+Niedźwiedź+{Gniew, Głód}; Grom+{Wilk, Wąż, Jeleń}+{Gniew, Głód}; Grom+Niedźwiedź+{Gniew, Spryt, Odwaga, Głód}. Kryterium S03-01 wymaga budżetu 10 dla każdej z 150 kombinacji.

- **A (rekomendacja):** Grom 4→3 i Niedźwiedź 5→4. Wszystkie 150 kombinacji mieści się w 10; rozkład kosztów: 6 istot za 6, 28 za 7, 52 za 8, 48 za 9, 16 za 10.
- **B:** budżet 11. Zmienia zasadę „stałe 10 punktów” z dokumentu projektowego.
- **C:** zostawić koszty i uznać 12 kombinacji za niedozwolone. Daje 138 istot zamiast 150 i psuje liczby z planu.

Decyzja zapada w S01-11 (krok 1). Reszta planu od niej nie zależy.

## Struktura plików po Sprincie 1

| Plik lub katalog | Odpowiedzialność | Zadanie |
|---|---|---|
| `package.json`, `package-lock.json`, `.nvmrc` | skrypty, zależności, Node ≥ 22.18 | S01-01 |
| `tsconfig.json`, `tsconfig.core.json` | projekt główny (DOM + Node) i projekt `src/core`, `src/data` bez DOM | S01-01 |
| `vite.config.ts`, `index.html`, `public/blank.html` | build, Vitest, strona startowa, pusta strona do testów RNG | S01-01, S01-04 |
| `eslint.config.js`, `.prettierrc.json`, `.prettierignore` | reguły stylu i architektury | S01-01, S01-06 |
| `.gitignore`, `.gitattributes` | zakończenia linii LF (ważne dla `gradlew`), pliki pomijane | S01-01 |
| `CLAUDE.md`, `README.md`, `docs/decyzje.md` | instrukcja dla Claude, opis, rejestr zależności | S01-01 |
| `tools/qwen-run.mjs`, `tools/typecheck.mjs`, `tools/setup-ollama.ps1`, `tools/qwen/CLAUDE.md`, `tools/qwen/spec-template.md` | potok Qwena | S01-02 |
| `src/core/types.ts`, `src/data/symbol-schema.ts` | typy symboli, schemat i wczytywanie | S01-03 |
| `src/core/rng.ts` | PCG32 (Qwen) | S01-04 |
| `src/core/math.ts` | `clamp` (zadanie próbne Qwena) | S01-02 |
| `src/i18n/index.ts`, `pl.json`, `en.json` | lokalizacja (Qwen: `index.ts`) | S01-06 |
| `src/core/event-bus.ts` | typowana magistrala zdarzeń | S01-05 |
| `src/app/` (`events.ts`, `screen-manager.ts`, `app.ts`, `dev-hook.ts`) | menedżer ekranów, start PixiJS i nakładki | S01-05 |
| `src/game/screens/test-screens.ts`, `src/ui/dom.ts`, `src/ui/ui.css`, `src/main.ts` | dwa ekrany testowe, pomocnik przycisku, style, punkt wejścia | S01-05 |
| `.github/workflows/ci.yml` | lint, typecheck, testy, build, e2e, APK | S01-07, S01-08 |
| `capacitor.config.ts`, `android/` | projekt Androida | S01-08 |
| `docs/ai-provenance.md`, `docs/gdd-mvp.md`, `docs/log-godzin.csv`, `docs/retro/S01.md` | dokumenty sprintu | S01-09, 11, 12, 00 |
| `tests/**` | testy jednostkowe, `tests/e2e/` (Playwright), `tests/tools/` | wszystkie |

## Kolejność wykonania

Zadania Ty (S01-09, S01-10, S01-11, S01-12) idą równolegle z kodem. **S01-10 (repozytorium na GitHubie) robisz pierwszy dnia 1**, bo S01-07 potrzebuje zdalnego repozytorium; tablica sprintu tej zależności nie ma.

1. S01-01 → 2. S01-02 → 3. S01-03 → 4. S01-04 → 5. S01-06 → 6. S01-05 (potrzebuje `t()` do podpisów przycisków; tablica sprintu tej zależności nie ma) → 7. S01-07 → 8. S01-08 → S01-00 (zamknięcie sprintu).

## Stan wykonania (24 X 2026)

Metoda wykonania: **Native** (jedna sesja robi wszystkie zadania, na końcu jedna świeża recenzja całej gałęzi). Sesja w chmurze nie ma rejestru npm ani powłoki na laptopie, więc zrobiono tylko zadania bez kodu. Resztę wykonuje sesja Claude Code na laptopie, od S01-01.

- **D1 rozstrzygnięte: wariant A** (Grom 3, Niedźwiedź 4).
- **S01-11** — `docs/gdd-mvp.md` wygenerowany (150 kombinacji, rozkład sum 6/28/52/48/16, zero ponad budżet; sumy sprawdzone drugim, niezależnym skryptem). Czeka na twoje zatwierdzenie: wpisz datę w sekcji „Zatwierdzenie”. Sesja wykonująca pomija generowanie, zostawia tylko commit po zatwierdzeniu.
- **S01-12** — `docs/log-godzin.csv` gotowy (13 wierszy, suma planowana 32 h). Zostaje twój kalendarz na 4 tygodnie.
- **S01-09** — szkic `docs/ai-provenance.md` gotowy. Zostaje twoje sprawdzenie licencji w kartach modeli (komórki `___`) i akapit „Wkład AI” w `README.md`.
- Wszystkie trzy pliki trafiają do `docs/` repozytorium razem z tym planem; sesja wykonująca nie tworzy ich od nowa.

---

### Task S01-01: Repozytorium i narzędzia

**Files:**
- Create: `package.json`, `.nvmrc`, `tsconfig.json`, `tsconfig.core.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.gitattributes`, `index.html`, `src/main.ts`, `README.md`, `CLAUDE.md`, `docs/decyzje.md`, `tools/typecheck.mjs`
- Test: `tests/tools/lint-rules.test.ts`

**Interfaces:**
- Produces: skrypty npm `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`, `format`; `node tools/typecheck.mjs` (kończy się kodem 1, gdy którykolwiek projekt TypeScript ma błędy); konfiguracja ESLint z regułami architektury; Vite ze `base: './'`, `outDir: 'dist'`, portem 5173 (`strictPort`).

- [ ] **Step 1: Repozytorium i dokumenty**

W `C:\Users\tchor\bestiariusz`: `git init -b main`, katalog `docs/`, wgraj `docs/plan-sprintow.md` i ten plan do `docs/superpowers/plans/2026-10-24-sprint-1-fundament.md`.

- [ ] **Step 2: Zależności**

`npm init -y`, potem `npm install -D typescript@~6.0.3 vite vitest jsdom eslint @eslint/js typescript-eslint globals prettier eslint-config-prettier @types/node`. Jeśli npm zgłosi konflikt `ERESOLVE` między TypeScriptem a typescript-eslint, wybierz najnowszy TypeScript mieszczący się w zakresie peer typescript-eslint i zapisz to w `docs/decyzje.md` (po zmianie wersji powtórz próbę Qwena z S01-02).

- [ ] **Step 3: Pliki konfiguracyjne**

Wartości, które mają znaczenie:

| Plik | Zawartość |
|---|---|
| `package.json` | `"private": true`, `"type": "module"`, `"engines": {"node": ">=22.18"}`; skrypty: `dev` = `vite`, `build` = `vite build`, `preview` = `vite preview`, `test` = `vitest run`, `test:e2e` = `playwright test`, `lint` = `eslint . --max-warnings 0 && prettier --check .`, `typecheck` = `node tools/typecheck.mjs`, `format` = `prettier --write .` |
| `.nvmrc` | `24` |
| `tsconfig.json` | `target` ES2022; `lib` ES2022, DOM, DOM.Iterable; `module` ESNext; `moduleResolution` Bundler; `strict`, `noEmit`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `resolveJsonModule`, `skipLibCheck`, `noFallthroughCasesInSwitch` = true; `types`: `["vite/client", "node"]`; `include`: `src`, `tests`, `vite.config.ts`, `playwright.config.ts`, `capacitor.config.ts` |
| `tsconfig.core.json` | `extends` `./tsconfig.json`; `lib`: `["ES2022"]`; `types`: `[]`; `include`: `src/core`, `src/data` |
| `vite.config.ts` | `defineConfig` z `vitest/config`: `base: './'`, `server: { port: 5173, strictPort: true }`, `build: { outDir: 'dist', target: 'es2022' }`, `test: { include: ['tests/**/*.test.ts'], exclude: ['tests/e2e/**', 'node_modules/**'], environment: 'node', testTimeout: 15000 }` |
| `.prettierrc.json` | `singleQuote: true`, `printWidth: 100`, `endOfLine: "lf"` |
| `.prettierignore` | `dist`, `android`, `ios`, `results`, `runs`, `docs`, `playwright-report`, `test-results`, `package-lock.json`, `*.md` |
| `.gitignore` | `node_modules`, `dist`, `results`, `runs`, `test-results`, `playwright-report`, `*.log`, `.env*`, `.DS_Store` |
| `.gitattributes` | `* text=auto eol=lf`, `*.png binary`, `*.jpg binary`, `*.ogg binary`, `*.jar binary` (bez tego `gradlew` zapisany na Windowsie z CRLF nie uruchomi się w CI) |
| `index.html` | `<html lang="pl">`; `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; `<title>Bestiariusz</title>`; `<div id="app"></div>`; `<script type="module" src="/src/main.ts">` |
| `src/main.ts` | `export {};` (zastąpiony w S01-05) |
| `tools/typecheck.mjs` | uruchamia kolejno `node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` i `-p tsconfig.core.json` przez `process.execPath`, wypisuje wyjście, kod wyjścia 1 przy błędach |

`docs/decyzje.md`: tabela `| Data | Zależność | Po co | Odrzucona alternatywa |` z wpisami dla wszystkich pakietów z kroku 2. `README.md`: po polsku, co to jest, wymagania, polecenia, wskazanie `docs/plan-sprintow.md`. `CLAUDE.md`: po polsku; sekcje „Polecenia”, „Konwencje” (warstwy, importy `.ts`, `import type`, język), „Praca z Qwenem” (jedno zdanie: patrz `tools/qwen/CLAUDE.md`) i, **dosłownie skopiowany**, blok „Instrukcja dla Claude Code” z rozdziału 1 pliku `docs/plan-sprintow.md`.

- [ ] **Step 4: Napisz test, który nie przechodzi**

`tests/tools/lint-rules.test.ts`:

```ts
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint();

async function ruleIds(code: string, file: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.resolve(file) });
  return (result?.messages ?? []).map((m) => m.ruleId ?? 'parse-error');
}

describe('architecture guards', () => {
  it('forbids Math.random anywhere in src', async () => {
    expect(await ruleIds('export const x = Math.random();', 'src/game/a.ts')).toContain(
      'no-restricted-properties',
    );
  });
  it('forbids Date.now in src/core but allows it in src/platform', async () => {
    expect(await ruleIds('export const x = Date.now();', 'src/core/a.ts')).toContain(
      'no-restricted-properties',
    );
    expect(await ruleIds('export const x = Date.now();', 'src/platform/a.ts')).toEqual([]);
  });
  it('forbids new Date() in src/core', async () => {
    expect(await ruleIds('export const x = new Date();', 'src/core/a.ts')).toContain(
      'no-restricted-syntax',
    );
  });
  it.each(['pixi.js', 'i18next', '@capacitor/core', '../ui/dom.ts', '../app/app.ts'])(
    'forbids importing %s from src/core',
    async (spec) => {
      const code = `import { x } from '${spec}'; export const y = x;`;
      expect(await ruleIds(code, 'src/core/a.ts')).toContain('no-restricted-imports');
    },
  );
  it('forbids Node built-ins in src but allows them in tests', async () => {
    const code = "import fs from 'node:fs'; export const f = fs;";
    expect(await ruleIds(code, 'src/ui/a.ts')).toContain('no-restricted-imports');
    expect(await ruleIds(code, 'tests/a.test.ts')).toEqual([]);
  });
  it('requires import type for type-only imports', async () => {
    const code = "import { Foo } from './foo.ts'; export type Bar = Foo;";
    expect(await ruleIds(code, 'src/core/a.ts')).toContain(
      '@typescript-eslint/consistent-type-imports',
    );
  });
});
```

- [ ] **Step 5: Uruchom test, zobacz porażkę**

Run: `npx vitest run tests/tools/lint-rules.test.ts`
Expected: FAIL — ESLint nie znajduje `eslint.config.js`.

- [ ] **Step 6: Napisz `eslint.config.js` (flat config, `tseslint.config(...)`)**

Bloki w tej kolejności: (1) `ignores`: `dist`, `android`, `ios`, `results`, `runs`, `test-results`, `playwright-report`, `node_modules`; (2) `js.configs.recommended`, `...tseslint.configs.recommended`, `eslint-config-prettier`; (3) reguły ogólne: `consistent-type-imports` = error, `no-explicit-any` = error, `no-unused-vars` z `argsIgnorePattern` i `varsIgnorePattern` = `^_`; (4) `tools/**/*.mjs` i `*.config.*` z `languageOptions.globals` = `globals.node`; (5) `src/**/*.ts`: `no-restricted-properties` (`Math.random`), `no-restricted-globals` (`process`, `Buffer`, `require`, `__dirname`), `no-restricted-imports` ze wzorcem `node:*`; (6) `src/core/**` i `src/data/**`: `no-restricted-properties` (**`Math.random` i `Date.now`**), `no-restricted-syntax` (`NewExpression[callee.name='Date']`), `no-restricted-imports` ze wzorcami `node:*`, `pixi.js`, `i18next*`, `@capacitor/*`, `**/ui/**`, `**/game/**`, `**/platform/**`, `**/app/**`. Reguły w późniejszym bloku **zastępują** wcześniejsze, nie łączą się z nimi, dlatego blok 6 powtarza `Math.random` i wzorzec `node:*`. Każdy komunikat po angielsku i mówi, co zrobić zamiast tego (np. „use the injected Rng”).

- [ ] **Step 7: Uruchom test, zobacz sukces**

Run: `npx vitest run tests/tools/lint-rules.test.ts`
Expected: PASS (wszystkie przypadki).

- [ ] **Step 8: Sprawdź komplet poleceń od zera**

Usuń `node_modules`, potem po kolei: `npm ci`, `npm run format` (raz, żeby sformatować pliki z tego zadania), `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run dev` (w drugim oknie `curl http://localhost:5173` zwraca 200, potem zatrzymaj serwer).
Expected: każde polecenie kończy się kodem 0; `dist/index.html` istnieje.

- [ ] **Step 9: Sprawdź, że `src/core` nie widzi DOM**

Utwórz tymczasowo `src/core/dom-probe.ts` z treścią `export const d = document;`, uruchom `npm run typecheck`.
Expected: błąd TS2304 („Cannot find name 'document'”) z projektu `tsconfig.core.json`. Usuń plik i powtórz `npm run typecheck` (kod 0).

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "chore: scaffold repository, tooling and architecture lint guards"
```

---

### Task S01-02: Potok Qwena w repozytorium

**Files:**
- Create: `tools/qwen-run.mjs`, `tools/qwen/CLAUDE.md`, `tools/qwen/spec-template.md`, `tools/setup-ollama.ps1` (kopia `bench/setup-ollama.ps1` bez zmian), `tasks/S01-02.md`, `src/core/math.ts` (szkielet, potem rozwiązanie Qwena)
- Test: `tests/tools/qwen-run.test.ts`, `tests/S01-02.test.ts`
- Modify: `CLAUDE.md` (sekcja „Praca z Qwenem”), `docs/decyzje.md` (bez nowych zależności; wpis o Vitest w potoku)

**Interfaces:**
- Consumes: `node tools/typecheck.mjs`, konfiguracja ESLint i Vitest z S01-01.
- Produces: `node tools/qwen-run.mjs --tasks <ID>[,<ID>] [--attempts N] [--apply] [--root DIR] [--mock DIR] [--timeout-min N] [--max-turns N] [--model NAME] [--log FILE]`. Kod wyjścia 0, gdy wszystkie zadania zaliczone, inaczej 1. Wymaga `tasks/<ID>.md` z linią `File to edit: <ścieżka>` (lub `Plik do edycji: <ścieżka>`) i `tests/<ID>.test.ts`. Raport: `results/<stamp>.md` i `.json`, logi: `runs/<stamp>/<ID>/`. Tryb `--mock DIR` podstawia pliki `<ID>.attempt<N>.ts` lub `<ID>.ts` zamiast wołać model, a plik `<ID>.tamper` powoduje, że „agent” nadpisuje `tests/<ID>.test.ts`.

**Reguły potoku (zapisz je w `tools/qwen/CLAUDE.md` i w `tools/qwen-run.mjs --help`):**
- Qwen dostaje świeżą kopię: `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.core.json`, `vite.config.ts`, `eslint.config.js`, `src`, `tests`, `tasks`, `tools/typecheck.mjs`, a `tools/qwen/CLAUDE.md` jako `CLAUDE.md`; `node_modules` jako dowiązanie (junction na Windowsie).
- Zaliczone, gdy: testy zadania zielone, `node tools/typecheck.mjs` czysty, ESLint `--max-warnings 0` na pliku docelowym czysty i **żaden plik poza docelowym nie zmienił sumy SHA-256** (dodany, usunięty i zmieniony liczą się jako naruszenie).
- Dozwolone narzędzia agenta: `Read`, `Edit`, `Write`, `Glob`, `Grep` oraz tylko trzy polecenia powłoki (po jednym wariancie `Bash(...)` i `PowerShell(...)`): `node node_modules/vitest/vitest.mjs run *`, `node tools/typecheck.mjs`, `node node_modules/eslint/bin/eslint.js *`.
- Podejście = pierwsza próba + próba z wynikiem testów w poleceniu (`--attempts 2` domyślnie, jak w benchmarku). Limit pięciu podejść liczy Claude po liczbie raportów zadania w `results/`.

- [ ] **Step 1: Napisz testy potoku, które nie przechodzą**

`tests/tools/qwen-run.test.ts` uruchamia skrypt w trybie `--mock` na tymczasowej kopii repozytorium (zadanie `FX-01`, `add(a, b)`), więc nie zostawia plików w repozytorium. Pomocnicy: `makeRoot()` (tworzy katalog tymczasowy, kopiuje elementy z listy powyżej, dowiązuje `node_modules` repozytorium, zapisuje `tasks/FX-01.md` z linią `File to edit: src/core/fx-01.ts`, `tests/FX-01.test.ts` sprawdzający `add(2, 3) === 5` i `add(-1, 1) === 0` oraz szkielet `src/core/fx-01.ts` rzucający `Not implemented`) i `runQwen(root, mockFiles, extraArgs)` (zapisuje pliki mocka w katalogu tymczasowym, uruchamia `process.execPath tools/qwen-run.mjs --root <root> --tasks FX-01 --mock <dir> ...`, zwraca `status`, `stdout`, `stderr`). Stałe: `GOOD` = poprawne `add` (`a + b`), `BAD` = `a - b`. Każdy test ma limit 180 000 ms.

```ts
describe('qwen-run (mock mode)', () => {
  it('adopts a passing solution with --apply', () => {
    const root = makeRoot();
    const r = runQwen(root, { 'FX-01.ts': GOOD }, ['--apply']);
    expect(r.status).toBe(0);
    expect(read(root, 'src/core/fx-01.ts')).toBe(GOOD);
    expect(readReport(root)).toMatch(/FX-01.*zaliczone/);
  });

  it('retries with test feedback after a failing first attempt', () => {
    const root = makeRoot();
    const r = runQwen(root, { 'FX-01.attempt1.ts': BAD, 'FX-01.attempt2.ts': GOOD }, ['--apply', '--attempts', '2']);
    expect(r.status).toBe(0);
    expect(readReport(root)).toContain('zaliczone w 2. podejściu');
    expect(read(root, 'src/core/fx-01.ts')).toBe(GOOD);
  });

  it('fails and leaves the repo untouched when the agent edits a protected file', () => {
    const root = makeRoot();
    const stub = read(root, 'src/core/fx-01.ts');
    const r = runQwen(root, { 'FX-01.ts': GOOD, 'FX-01.tamper': '' }, ['--apply']);
    expect(r.status).toBe(1);
    expect(read(root, 'src/core/fx-01.ts')).toBe(stub);
    expect(readReport(root)).toContain('tests/FX-01.test.ts');
  });

  it('rejects a spec without a "File to edit:" line', () => {
    const root = makeRoot({ spec: '# FX-01 — no target\n' });
    const r = runQwen(root, {}, []);
    expect(r.status).toBe(1);
    expect(r.stderr + r.stdout).toContain('File to edit');
  });
});
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/tools/qwen-run.test.ts`
Expected: FAIL — brak `tools/qwen-run.mjs`.

- [ ] **Step 3: Przenieś `bench/run.mjs` do `tools/qwen-run.mjs` z poniższymi zmianami**

Zachowaj bez zmian: parsowanie argumentów i `--help`, `setupLog`, `walk`/`sha`/`snapshot`/`diffSnapshots`, `quoteForCmd`, `resolveClaude`, `runProcess` z `taskkill`, `parseAgentJson`, `linkNodeModules`, `agentEnv` (zmienne Ollamy), `mockAgent`, preflight Ollamy (wersja ≥ 0.14, obecność modelu), `ollamaPlacement`, raport. Zmień:

1. `ROOT` = katalog nadrzędny `tools/`, z możliwością nadpisania `--root DIR` (potrzebne testom).
2. Usuń tablicę `TASKS` i `PROTECTED_*`. Zadania pochodzą z `--tasks` (wymagane). `parseSpec(id)` czyta `tasks/<id>.md`: tytuł z pierwszego nagłówka, plik docelowy z linii `File to edit:` lub `Plik do edycji:`; brak linii albo brak `tests/<id>.test.ts` kończy się błędem z nazwą brakującego elementu.
3. `COPY_ITEMS` jak w „Regułach potoku”; po kopiowaniu `tools/qwen/CLAUDE.md` trafia do kopii jako `CLAUDE.md`.
4. Ocena: `runTests` uruchamia `node node_modules/vitest/vitest.mjs run tests/<id>.test.ts --reporter=json --outputFile=<plik tymczasowy>` i czyta pola `numPassedTests`, `numFailedTests`, `success`; `runTypecheck` uruchamia `node tools/typecheck.mjs`; nowe `runLint` uruchamia `node node_modules/eslint/bin/eslint.js --max-warnings 0 <plik docelowy>`.
5. Ochrona: `tampered` = każda zmiana w migawce poza plikiem docelowym (zastępuje `isProtected` i `otherChanges`). Podejście zaliczone = testy + typy + lint + brak naruszeń.
6. `failureDigest` buduje streszczenie z JSON-a Vitest (`failureMessages` pierwszych nieudanych testów, albo `message` pliku, gdy test się nie załadował), błędów typów i lintu; limit 6000 znaków jak dotąd.
7. Polecenia w `firstPrompt` i `retryPrompt` zgodne z „Regułami potoku”: testy, `node tools/typecheck.mjs`, ESLint na pliku docelowym; „edytuj tylko `<plik docelowy>`”.
8. Nowa opcja `--apply`: po zaliczeniu kopiuje plik docelowy z kopii roboczej do repozytorium, ale tylko gdy suma SHA-256 pliku w repozytorium nadal równa się sumie z migawki początkowej; w przeciwnym razie nie kopiuje i wypisuje powód. Zadanie niezaliczone nigdy nie jest kopiowane.
9. Preflight sprawdza `node_modules/vitest/vitest.mjs` zamiast TypeScriptu; wymóg wersji Node ≥ 22.18 zostaje.
10. Raport trafia do `results/<stamp>.md` i `.json` (bez przyrostka dostawcy), kolumny: Zadanie, Wynik, Podejścia, Testy, Typy, Lint, Czas, Tury, Uwagi. Kod wyjścia procesu: 0 przy wszystkich zaliczonych, inaczej 1.

- [ ] **Step 4: Napisz pliki pomocnicze**

`tools/qwen/CLAUDE.md` (po angielsku): port `CLAUDE.md` z benchmarku — jedno zadanie naraz; specyfikacja w `tasks/<ID>.md` wskazuje jedyny plik do edycji; zakaz edycji testów, `tasks/`, konfiguracji, `package.json`, lockfile i innych plików; zachowaj każdą wyeksportowaną nazwę, typ i sygnaturę ze szkieletu; TypeScript strict, ES modules, importy z `.ts`, `import type`; bez `enum`, `namespace`, parametrów-pól; bez nowych zależności i bez API Node w `src/`; zakaz `Math.random`, `Date.now`, `new Date()` (lint odrzuci); funkcje czyste, bez mutowania argumentów; trzy polecenia sprawdzające (testy, typy, lint) z dokładnymi liniami i zasada „zadanie skończone, gdy wszystkie trzy przechodzą”. `tools/qwen/spec-template.md` = szablon z dodatku B po angielsku: `# <ID> — <title>`, `File to edit:`, `Goal:`, `Signatures (do not change):`, `Rules:`, `Edge cases:` (wejście → wynik), `Tests:`, `Done when:`. `tools/typecheck.mjs` istnieje z S01-01.

- [ ] **Step 5: Uruchom testy potoku, zobacz sukces**

Run: `npx vitest run tests/tools/qwen-run.test.ts`
Expected: PASS (4 testy).

- [ ] **Step 6: Zadanie próbne dla prawdziwego Qwena (`clamp`)**

Napisz `tasks/S01-02.md` według szablonu (plik docelowy `src/core/math.ts`; cel: `clamp` ogranicza liczbę do przedziału i posłuży do zdrowia, Żaru i obrażeń; przypadki brzegowe: `clamp(5,0,3)=3`, `clamp(-1,0,3)=0`, `clamp(2,0,3)=2`, `clamp(1,1,1)=1`, `clamp(Infinity,0,3)=3`, `min > max` oraz `NaN` w dowolnym argumencie → `RangeError`), szkielet `src/core/math.ts` (`export function clamp(value: number, min: number, max: number): number` rzucające `Not implemented`) i test:

```ts
// tests/S01-02.test.ts
import { describe, expect, it } from 'vitest';
import { clamp } from '../src/core/math.ts';

describe('clamp', () => {
  it.each([
    [5, 0, 3, 3],
    [-1, 0, 3, 0],
    [2, 0, 3, 2],
    [1, 1, 1, 1],
    [Infinity, 0, 3, 3],
    [-Infinity, 0, 3, 0],
  ])('clamp(%s, %s, %s) = %s', (value, min, max, expected) => {
    expect(clamp(value, min, max)).toBe(expected);
  });
  it('throws RangeError when min > max', () => {
    expect(() => clamp(1, 3, 0)).toThrow(RangeError);
  });
  it.each([[NaN, 0, 3], [1, NaN, 3], [1, 0, NaN]])('throws RangeError for NaN (%s, %s, %s)', (v, a, b) => {
    expect(() => clamp(v, a, b)).toThrow(RangeError);
  });
});
```

Run: `npx vitest run tests/S01-02.test.ts`
Expected: FAIL (`Not implemented`).

- [ ] **Step 7: Uruchom Qwena na laptopie**

Ollama musi działać z modelem `qwen3-coder-64k`; jeśli modelu brak, uruchom `powershell -ExecutionPolicy Bypass -File tools\setup-ollama.ps1`.

Run: `node tools/qwen-run.mjs --tasks S01-02 --apply`
Expected: wiersz `S01-02 … zaliczone`, `src/core/math.ts` zawiera implementację, `results/<stamp>.md` istnieje. Gdy niezaliczone: popraw specyfikację lub test i uruchom ponownie (limit pięciu podejść).

- [ ] **Step 8: Recenzja diffu**

`git diff src/core/math.ts` — sprawdź: zgodność z specyfikacją, brak zbędnych zależności, czytelność. Potem `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`.
Expected: wszystko zielone.

- [ ] **Step 9: Uzupełnij `CLAUDE.md` i `docs/decyzje.md`, commit**

W `CLAUDE.md` sekcja „Praca z Qwenem”: polecenie z `--apply`, zasada pięciu podejść, „najpierw szkielet i test, potem Qwen”. W `docs/decyzje.md` wpis: ocena Qwena przez Vitest zamiast `node --test` (powód: definicja ukończenia).

```bash
git add .
git commit -m "feat(tools): qwen pipeline with sha-256 protection and trial task"
```

---

### Task S01-03: Schemat danych symboli

**Files:**
- Create: `src/core/types.ts`, `src/data/symbol-schema.ts`
- Test: `tests/data/symbol-schema.test.ts`
- Modify: `docs/decyzje.md` (zod)

**Interfaces:**
- Produces (`src/core/types.ts`):

```ts
export type Gender = 'm' | 'f';
export interface ElementDef { id: string; cost: number; attackBonus: number; healthBonus: number }
export interface FormDef { id: string; cost: number; baseAttack: number; baseHealth: number; gender: Gender }
export interface TraitDef { id: string; cost: number; attackMod: number; healthMod: number }
export interface SymbolData {
  readonly elements: readonly ElementDef[];
  readonly forms: readonly FormDef[];
  readonly traits: readonly TraitDef[];
}
```

- Produces (`src/data/symbol-schema.ts`):

```ts
export interface SymbolDataIssue { fieldPath: string; detail: string }
export class SymbolDataError extends Error {
  readonly source: string;
  readonly fieldPath: string;          // pierwszy błąd, np. "elements[1].cost"
  readonly issues: readonly SymbolDataIssue[];
}
export function parseSymbolData(raw: unknown, source?: string): SymbolData; // source domyślnie "symbols"
```

Komunikat błędu: `"<source>: <fieldPath> — <detail>"`; błąd korzenia ma `fieldPath` równe `(root)`. Nazwy wyświetlane (nazwa, dopełniacz, przymiotnik) **nie** należą do danych (decyzja D10).

- [ ] **Step 1: Napisz test, który nie przechodzi**

```ts
import { describe, expect, it } from 'vitest';
import { parseSymbolData, SymbolDataError } from '../../src/data/symbol-schema.ts';

const element = { id: 'ogien', cost: 3, attackBonus: 1, healthBonus: 0 };
const form = { id: 'wilk', cost: 4, baseAttack: 3, baseHealth: 4, gender: 'm' };
const trait = { id: 'gniew', cost: 3, attackMod: 2, healthMod: 0 };
const valid = { elements: [element], forms: [form], traits: [trait] };

describe('parseSymbolData', () => {
  it('loads one symbol of each kind', () => {
    const data = parseSymbolData(valid, 'test.json');
    expect(data.elements[0]).toEqual(element);
    expect(data.forms[0]).toEqual(form);
    expect(data.traits[0]).toEqual(trait);
  });

  it('does not touch its input', () => {
    const copy = structuredClone(valid);
    parseSymbolData(valid);
    expect(valid).toEqual(copy);
  });

  it.each([
    ['null root', null, '(root)'],
    ['array root', [], '(root)'],
    ['missing forms list', { ...valid, forms: undefined }, 'forms'],
    ['empty elements list', { ...valid, elements: [] }, 'elements'],
    ['cost as string', { ...valid, elements: [{ ...element, cost: '3' }] }, 'elements[0].cost'],
    ['cost zero', { ...valid, elements: [{ ...element, cost: 0 }] }, 'elements[0].cost'],
    ['cost fractional', { ...valid, traits: [{ ...trait, cost: 1.5 }] }, 'traits[0].cost'],
    ['bad gender', { ...valid, forms: [{ ...form, gender: 'x' }] }, 'forms[0].gender'],
    ['id with diacritics', { ...valid, traits: [{ ...trait, id: 'głód' }] }, 'traits[0].id'],
    ['unknown key', { ...valid, elements: [{ ...element, colr: 1 }] }, 'elements[0]'],
    ['duplicate id', { ...valid, elements: [element, { ...element }] }, 'elements[1].id'],
  ])('rejects %s with the field path', (_name, raw, fieldPath) => {
    let error: unknown;
    try {
      parseSymbolData(raw, 'symbols.json');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(SymbolDataError);
    const err = error as SymbolDataError;
    expect(err.fieldPath).toBe(fieldPath);
    expect(err.message).toContain('symbols.json');
    expect(err.message).toContain(fieldPath);
    expect(err.issues.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Uruchom, zobacz porażkę**

Run: `npx vitest run tests/data/symbol-schema.test.ts`
Expected: FAIL — brak modułu.

- [ ] **Step 3: Zainstaluj zod i zapisz decyzję**

`npm install zod`; wpis w `docs/decyzje.md` (zod: walidacja danych, zapisu gry i ładunków serwera; odrzucona alternatywa: ręczny walidator).

- [ ] **Step 4: Zaimplementuj `src/core/types.ts` i `src/data/symbol-schema.ts`**

Schematy zod `.strict()`: `id` pasuje do `^[a-z][a-z0-9_]*$`; `cost` całkowite ≥ 1; `attackBonus`, `healthBonus`, `attackMod`, `healthMod` całkowite (mogą być ujemne); `baseAttack` całkowite ≥ 0; `baseHealth` całkowite ≥ 1; `gender` ∈ {`m`, `f`}; każda lista ma co najmniej jeden element; w obrębie listy `id` są unikalne (`superRefine` zgłasza błąd na ścieżce zduplikowanego elementu, np. `elements[1].id`). Typy schematów mają spełniać interfejsy z `types.ts` (`satisfies`). Błąd zod zamieniany na `SymbolDataError`: `fieldPath` z `issue.path` (indeksy jako `[n]`, klucze po kropce), `detail` z `issue.message`; komunikat składany przez własną funkcję, test nie zależy od brzmienia komunikatów zod.

- [ ] **Step 5: Uruchom, zobacz sukces, sprawdź lint i typy**

Run: `npx vitest run tests/data/symbol-schema.test.ts`, potem `npm run format`, `npm run lint`, `npm run typecheck`
Expected: PASS; lint i typecheck (w tym projekt `tsconfig.core.json`) kończą się kodem 0.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(data): symbol schema with field-path errors"
```

---

### Task S01-04: Generator liczb losowych PCG32 (Qwen)

**Files:**
- Create: `tasks/S01-04.md`, `src/core/rng.ts` (szkielet z interfejsem `Rng`; docelowo rozwiązanie Qwena), `public/blank.html`, `playwright.config.ts`
- Test: `tests/S01-04.test.ts`, `tests/e2e/rng.spec.ts`
- Modify: `package.json` (zależność `@playwright/test`), `docs/decyzje.md`

**Interfaces:**
- Produces (`src/core/rng.ts`; interfejs identyczny jak w benchmarku):

```ts
export interface Rng {
  next(): number;                              // float w [0, 1)
  int(min: number, max: number): number;       // całkowita w [min, max], zawsze zużywa dokładnie jedno next()
  pick<T>(items: readonly T[]): T;             // zużywa jedno int()
  shuffle<T>(items: readonly T[]): T[];        // Fisher–Yates od końca, nie mutuje wejścia, zużywa length-1 wywołań int()
}
export function createRng(seed: number): Rng;  // seed: liczba całkowita 0..4294967295, inaczej RangeError
```

- [ ] **Step 1: Napisz specyfikację `tasks/S01-04.md` (po angielsku)**

```text
# S01-04 — Seeded random number generator (PCG32)
File to edit: src/core/rng.ts
Goal: deterministic RNG for all game logic (map, deck shuffles, enemy choices, daily challenge). The same seed gives the same sequence on every device and engine (Node, Chromium, WebKit).
Signatures (do not change): the `Rng` interface and `createRng(seed: number): Rng` in the stub.
Algorithm: PCG32 XSH-RR (M. O'Neill), 64-bit state, fixed stream 54.
  MASK64 = 2^64 - 1; inc = (54 << 1) | 1; state = 0
  step(): old = state; state = (old * 6364136223846793005 + inc) mod 2^64; return old
  seeding: step(); state = (state + seed) mod 2^64; step()
  u32():   old = step(); xorshifted = low 32 bits of (((old >> 18) ^ old) >> 27); rot = old >> 59;
           return ((xorshifted >>> rot) | (xorshifted << ((-rot) & 31))) >>> 0
  next() = u32() / 4294967296
BigInt is allowed (a variant without BigInt is allowed too if all tests pass).
int(min, max) = min + Math.floor(next() * (max - min + 1)); it calls next() exactly once, also when min === max.
pick(items) = items[int(0, items.length - 1)]
shuffle(items): copy the array; for i from length-1 down to 1: j = int(0, i); swap [i] and [j]; return the copy.
Errors (all RangeError): seed not an integer in 0..4294967295; int() with a non-integer bound or max < min; pick() on an empty array.
Rules: no Math.random, no Date.now, no new dependencies, no Node APIs, `import type` for types.
Edge cases: seed 0 and 4294967295 are valid; shuffle([]) and shuffle([x]) return a copy and consume no randomness.
Tests: tests/S01-04.test.ts (do not edit).
Done when: vitest, tsc and eslint pass with no errors.
```

- [ ] **Step 2: Napisz szkielet i test, który nie przechodzi**

Szkielet: interfejs `Rng` z komentarzami z powyższych sygnatur i `createRng` rzucające `Not implemented`. Test (wektory policzone z referencyjnej implementacji PCG32; ziarno 42 daje znany ciąg demonstracyjny `0xa15c02b7, 0x7b47f409, …`):

```ts
import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../src/core/rng.ts';

const TWO32 = 4294967296;
const u32s = (seed: number, n: number): number[] => {
  const r = createRng(seed);
  return Array.from({ length: n }, () => r.next() * TWO32);
};

describe('PCG32 reference vectors', () => {
  it('seed 42 matches the published PCG32 demo output', () => {
    expect(u32s(42, 6)).toEqual([0xa15c02b7, 0x7b47f409, 0xba1d3330, 0x83d2f293, 0xbfa4784b, 0xcbed606e]);
  });
  it('canonical seed 20261102', () => {
    expect(u32s(20261102, 4)).toEqual([2382011530, 2784460958, 3497812807, 405242244]);
  });
  it('seeds 5 and 4294967295', () => {
    expect(u32s(5, 2)).toEqual([2644768073, 2880917919]);
    expect(u32s(0xffffffff, 2)).toEqual([406254218, 1097992594]);
  });
});

describe('derived methods', () => {
  it('int(1, 6) for seed 20261102', () => {
    const r = createRng(20261102);
    expect(Array.from({ length: 10 }, () => r.int(1, 6))).toEqual([4, 4, 5, 1, 3, 6, 4, 3, 3, 3]);
  });
  it('shuffle of 0..9 for seed 7', () => {
    expect(createRng(7).shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([7, 1, 9, 8, 2, 4, 5, 0, 3, 6]);
  });
  it('next() stays in [0, 1)', () => {
    const r = createRng(1);
    for (let i = 0; i < 10000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('int covers both bounds and is roughly uniform', () => {
    const r = createRng(99);
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60000; i++) counts[r.int(1, 6) - 1] += 1;
    for (const c of counts) {
      expect(c).toBeGreaterThan(9000);
      expect(c).toBeLessThan(11000);
    }
  });
  it('int always consumes exactly one next(), even for a single value', () => {
    const a = createRng(3);
    const b = createRng(3);
    expect(a.int(5, 5)).toBe(5);
    b.next();
    expect(a.next()).toBe(b.next());
  });
  it('pick consumes one int and returns an element', () => {
    const a = createRng(11);
    const b = createRng(11);
    expect(a.pick(['x', 'y', 'z'])).toBe(['x', 'y', 'z'][b.int(0, 2)]);
  });
  it('shuffle returns a permutation, keeps the input and consumes length-1 draws', () => {
    const input = [1, 2, 3, 4, 5];
    const a = createRng(8);
    const b = createRng(8);
    const out = a.shuffle(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    for (let i = 4; i >= 1; i--) b.int(0, i);
    expect(a.next()).toBe(b.next());
  });
  it('shuffle of 0 or 1 items consumes nothing', () => {
    const a = createRng(8);
    const b = createRng(8);
    expect(a.shuffle([])).toEqual([]);
    expect(a.shuffle([7])).toEqual([7]);
    expect(a.next()).toBe(b.next());
  });
  it('same seed gives equal independent generators', () => {
    const a = createRng(5);
    const b = createRng(5);
    a.next();
    expect(b.next()).toBe(createRng(5).next());
  });
  it('never calls Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    const r = createRng(1);
    r.next(); r.int(1, 3); r.pick([1, 2]); r.shuffle([1, 2, 3]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('input validation (RangeError)', () => {
  it.each([NaN, -1, 1.5, 2 ** 32, Infinity])('rejects seed %s', (seed) => {
    expect(() => createRng(seed)).toThrow(RangeError);
  });
  it.each([0, 4294967295])('accepts seed %s', (seed) => {
    const r = createRng(seed);
    expect(r.next()).not.toBe(r.next());
  });
  it.each([[2, 1], [1.5, 3], [NaN, 3], [1, Infinity]])('int(%s, %s) throws', (a, b) => {
    expect(() => createRng(1).int(a, b)).toThrow(RangeError);
  });
  it('pick on an empty array throws', () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError);
  });
});
```

Run: `npx vitest run tests/S01-04.test.ts`
Expected: FAIL (`Not implemented`).

- [ ] **Step 3: Uruchom Qwena**

Run: `node tools/qwen-run.mjs --tasks S01-04 --apply`
Expected: `S01-04 … zaliczone`, plik `src/core/rng.ts` zaktualizowany. Gdy niezaliczone, popraw specyfikację (np. dopisz przykład kroku `state` z wartościami) i uruchom ponownie, do pięciu podejść.

- [ ] **Step 4: Recenzja diffu**

Sprawdź: stała mnożnika `6364136223846793005`, maskowanie do 64 bitów po każdym mnożeniu, `rot` z bitów 59–63, brak `Math.random`, walidacja ziarna **przed** użyciem, brak mutowania wejścia w `shuffle`. Potem `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`.
Expected: wszystko zielone.

- [ ] **Step 5: Playwright i test między silnikami**

`npm install -D @playwright/test`, `npx playwright install chromium webkit`. `public/blank.html` = pusta strona (`<!doctype html><title>blank</title>`), wpis w `docs/decyzje.md`. `playwright.config.ts`: `testDir: 'tests/e2e'`, `use.baseURL: 'http://localhost:5173'`, projekty `chromium` (`devices['Desktop Chrome']`) i `webkit` (`devices['Desktop Safari']`), `webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI }`. Test:

```ts
// tests/e2e/rng.spec.ts
import { expect, test } from '@playwright/test';

test('PCG32 gives the same sequences in this engine as in Node', async ({ page }) => {
  await page.goto('/blank.html');
  const result = await page.evaluate(async () => {
    const specifier = '/src/core/rng.ts';
    const { createRng } = await import(/* @vite-ignore */ specifier);
    const a = createRng(20261102);
    const b = createRng(20261102);
    return {
      u32: Array.from({ length: 4 }, () => a.next() * 4294967296),
      ints: Array.from({ length: 10 }, () => b.int(1, 6)),
      shuffled: createRng(7).shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    };
  });
  expect(result.u32).toEqual([2382011530, 2784460958, 3497812807, 405242244]);
  expect(result.ints).toEqual([4, 4, 5, 1, 3, 6, 4, 3, 3, 3]);
  expect(result.shuffled).toEqual([7, 1, 9, 8, 2, 4, 5, 0, 3, 6]);
});
```

Run: `npm run test:e2e`
Expected: PASS w projektach `chromium` i `webkit`.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat(core): PCG32 rng implemented by qwen, cross-engine e2e test"
```

---

### Task S01-06: Lokalizacja i18next z ICU (Qwen + Claude)

**Files:**
- Create: `tasks/S01-06.md`, `src/i18n/index.ts` (szkielet z typami; docelowo rozwiązanie Qwena), `src/i18n/pl.json`, `src/i18n/en.json`
- Test: `tests/S01-06.test.ts`; rozszerzenie `tests/tools/lint-rules.test.ts`
- Modify: `eslint.config.js`, `docs/decyzje.md`, `package.json`

**Interfaces:**
- Produces (`src/i18n/index.ts`):

```ts
import type pl from './pl.json';
export type Lang = 'pl' | 'en';
export type TranslationKey = keyof typeof pl;
export function initI18n(lang: Lang): Promise<void>;
export function setLanguage(lang: Lang): Promise<void>;
export function getLanguage(): Lang;
export function t(key: TranslationKey, params?: Record<string, string | number>): string;
```

Klucze są płaskie (kropka jest częścią nazwy), np. `cards.count`. `t()` przed `initI18n()` rzuca `Error('i18n is not initialised')`. Nieznany klucz (tylko przez rzutowanie) zwraca sam klucz.

- [ ] **Step 1: Zależności i zasoby (Claude)**

`npm install i18next i18next-icu`; wpis w `docs/decyzje.md`. `pl.json`:

```json
{
  "app.title": "Bestiariusz",
  "cards.count": "{count, plural, one {# karta} few {# karty} many {# kart} other {# karty}}",
  "screen.test.a.title": "Ekran próbny A",
  "screen.test.b.title": "Ekran próbny B",
  "screen.test.switch": "Przełącz ekran"
}
```

`en.json` ma te same klucze: `Bestiariusz`, `{count, plural, one {# card} other {# cards}}`, `Test screen A`, `Test screen B`, `Switch screen`.

- [ ] **Step 2: Specyfikacja `tasks/S01-06.md` (po angielsku)**

```text
# S01-06 — Localisation (i18next + ICU)
File to edit: src/i18n/index.ts
Goal: the single place that initialises i18next with ICU message format and exposes `t()` to UI code.
Signatures (do not change): `Lang`, `TranslationKey`, `initI18n`, `setLanguage`, `getLanguage`, `t` from the stub.
Behaviour:
  - Use one i18next instance with the `i18next-icu` plugin; resources are the imported `pl.json` and `en.json` (single namespace "translation").
  - Options: fallbackLng "pl", keySeparator false, nsSeparator false, returnNull false, interpolation.escapeValue false.
  - initI18n(lang) initialises once; calling it again re-initialises with the new language without throwing.
  - setLanguage switches the language; getLanguage returns the current one.
  - t() before initI18n() throws Error("i18n is not initialised").
  - An unknown key (only reachable through a cast) returns the key itself.
Rules: no new dependencies, no Math.random / Date.now, `import type` for types.
Tests: tests/S01-06.test.ts (do not edit).
Done when: vitest, tsc and eslint pass with no errors.
```

- [ ] **Step 3: Szkielet i test, który nie przechodzi**

Szkielet: powyższe typy i funkcje rzucające `Not implemented`.

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../src/i18n/en.json';
import pl from '../src/i18n/pl.json';
import { getLanguage, initI18n, setLanguage, t } from '../src/i18n/index.ts';

describe('Polish plurals', () => {
  beforeEach(async () => {
    await initI18n('pl');
  });
  it.each([
    [0, '0 kart'], [1, '1 karta'], [2, '2 karty'], [4, '4 karty'], [5, '5 kart'],
    [12, '12 kart'], [22, '22 karty'], [25, '25 kart'], [101, '101 kart'], [112, '112 kart'],
    [1.5, '1,5 karty'],
  ])('cards.count for %s', (count, text) => {
    expect(t('cards.count', { count })).toBe(text);
  });
});

describe('English plurals and language switching', () => {
  it('switches at runtime', async () => {
    await initI18n('pl');
    await setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(t('cards.count', { count: 1 })).toBe('1 card');
    expect(t('cards.count', { count: 2 })).toBe('2 cards');
    expect(t('screen.test.switch')).toBe('Switch screen');
  });
  it('initI18n can be called again with another language', async () => {
    await initI18n('pl');
    await initI18n('en');
    expect(getLanguage()).toBe('en');
  });
});

describe('resources', () => {
  it('PL and EN have exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pl).sort());
  });
  it('no translation is empty and every message formats', async () => {
    for (const lang of ['pl', 'en'] as const) {
      await initI18n(lang);
      for (const key of Object.keys(pl) as (keyof typeof pl)[]) {
        const text = t(key, { count: 1 });
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text).not.toBe(key);
      }
    }
  });
  it('unknown keys do not compile and return the key at runtime', async () => {
    await initI18n('pl');
    // @ts-expect-error — the key is not in pl.json
    expect(t('does.not.exist')).toBe('does.not.exist');
  });
  it('t() before initialisation throws', async () => {
    vi.resetModules();
    const fresh = await import('../src/i18n/index.ts');
    expect(() => fresh.t('app.title')).toThrow('i18n is not initialised');
  });
});
```

Run: `npx vitest run tests/S01-06.test.ts`
Expected: FAIL (`Not implemented`).

- [ ] **Step 4: Uruchom Qwena i zrecenzuj**

Run: `node tools/qwen-run.mjs --tasks S01-06 --apply`
Expected: zaliczone. Recenzja diffu: jedna instancja i18next, wtyczka ICU podpięta przez `.use(...)`, opcje zgodne ze specyfikacją, brak `any`. Potem `npm run format`.

- [ ] **Step 5: Reguła lintu „zero tekstu w kodzie interfejsu” — najpierw testy (Claude)**

Dopisz do `tests/tools/lint-rules.test.ts`:

```ts
describe('UI text guard', () => {
  const bad: [string, string][] = [
    ['text assignment', "el.textContent = 'Zagraj';"],
    ['template literal text', 'el.innerText = `Tura ${n}`;'],
    ['aria label attribute', "el.setAttribute('aria-label', 'Zamknij');"],
    ['pixi Text options', "new Text({ text: 'Walka' });"],
    ['pixi Text string argument', "new Text('Walka');"],
  ];
  it.each(bad)('rejects %s in src/ui', async (_n, code) => {
    expect(await ruleIds(code, 'src/ui/a.ts')).toContain('no-restricted-syntax');
  });
  it.each([
    "el.textContent = t('screen.test.switch');",
    "el.textContent = '';",
    "el.className = 'ui-button';",
    "el.setAttribute('role', 'button');",
  ])('allows %s', async (code) => {
    expect(await ruleIds(code, 'src/ui/a.ts')).not.toContain('no-restricted-syntax');
  });
  it('does not apply to tests', async () => {
    expect(await ruleIds("el.textContent = 'x';", 'tests/a.test.ts')).not.toContain('no-restricted-syntax');
  });
});
```

(`el`, `t`, `n`, `Text` są niezadeklarowane, więc w tych próbkach pojawi się też `no-undef`; test sprawdza tylko obecność lub brak `no-restricted-syntax`.)

Run: `npx vitest run tests/tools/lint-rules.test.ts`
Expected: FAIL w grupie „UI text guard”.

- [ ] **Step 6: Dopisz blok do `eslint.config.js`**

Dla `src/ui/**`, `src/game/**`, `src/app/**`: `no-restricted-syntax` z selektorami (komunikat: „UI text must come from t(); add a key to pl.json and en.json”):

| Przypadek | Selektor (esquery) |
|---|---|
| przypisanie literału | `AssignmentExpression[left.property.name=/^(textContent\|innerText\|innerHTML\|outerHTML\|title\|alt\|placeholder\|ariaLabel)$/][right.type='Literal'][right.value!='']` |
| przypisanie szablonu | ten sam lewy człon, `[right.type='TemplateLiteral']` |
| atrybuty | `CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^(aria-label\|aria-description\|title\|alt\|placeholder)$/][arguments.1.type=/^(Literal\|TemplateLiteral)$/]` |
| Pixi `Text` (opcje) | `NewExpression[callee.name='Text'] > ObjectExpression > Property[key.name='text'][value.type=/^(Literal\|TemplateLiteral)$/]` |
| Pixi `Text` (napis) | `NewExpression[callee.name='Text'][arguments.0.type=/^(Literal\|TemplateLiteral)$/]` |

(W pliku konfiguracyjnym znak `\|` zapisz jako zwykłe `|` wewnątrz wyrażenia regularnego.)

Run: `npx vitest run tests/tools/lint-rules.test.ts`
Expected: PASS.

- [ ] **Step 7: Pełna weryfikacja i commit**

Run: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`
Expected: kod 0.

```bash
git add .
git commit -m "feat(i18n): ICU localisation by qwen and UI text lint guard"
```

---

### Task S01-05: Szkielet aplikacji

**Files:**
- Create: `src/core/event-bus.ts`, `src/app/events.ts`, `src/app/screen-manager.ts`, `src/app/app.ts`, `src/app/dev-hook.ts`, `src/game/screens/test-screens.ts`, `src/ui/dom.ts`, `src/ui/ui.css`
- Modify: `src/main.ts`, `index.html` (kontener `#app`), `docs/decyzje.md` (pixi.js)
- Test: `tests/core/event-bus.test.ts`, `tests/app/screen-manager.test.ts` (jsdom), `tests/e2e/screens.spec.ts`

**Interfaces:**
- Consumes: `t()` z S01-06 (podpisy przycisków i tytuły).
- Produces:

```ts
// src/core/event-bus.ts
export type Unsubscribe = () => void;
export interface EventBus<E extends object> {
  on<K extends keyof E>(type: K, handler: (payload: E[K]) => void): Unsubscribe;
  emit<K extends keyof E>(type: K, payload: E[K]): void;
  listenerCount(type?: keyof E): number;
}
export function createEventBus<E extends object>(): EventBus<E>;
export function createScopedBus<E extends object>(bus: EventBus<E>): EventBus<E> & { dispose(): void };

// src/app/events.ts
export type ScreenId = string;
export interface Size { width: number; height: number }
export interface AppEvents {
  'screen:changed': { from: ScreenId | null; to: ScreenId };
  'app:resize': Size;
}

// src/app/screen-manager.ts
import type { Container } from 'pixi.js';
export interface ScreenContext {
  readonly layer: Container;                       // warstwa PixiJS należąca do ekranu
  readonly overlay: HTMLElement;                   // div nakładki należący do ekranu
  readonly bus: EventBus<AppEvents>;               // zakresowa: subskrypcje znikają przy odmontowaniu
  onTick(handler: (deltaMs: number) => void): void; // znika przy odmontowaniu
  navigate(id: ScreenId): void;                    // = manager.show(id)
}
export interface Screen {
  mount(ctx: ScreenContext): void;
  unmount?(): void;
  resize?(size: Size): void;
}
export interface ScreenHost {
  readonly stage: Pick<Container, 'addChild' | 'removeChild' | 'children'>;
  readonly overlay: HTMLElement;
  readonly bus: EventBus<AppEvents>;
  createLayer(): Container;
}
export interface ManagerStats {
  stageChildren: number; overlayChildren: number; busListeners: number;
  tickHandlers: number; mountCount: number; unmountCount: number;
}
export interface ScreenManager {
  register(id: ScreenId, factory: () => Screen): void;
  show(id: ScreenId): void;
  tick(deltaMs: number): void;
  resize(size: Size): void;
  readonly current: ScreenId | null;
  stats(): ManagerStats;
  dispose(): void;
}
export function createScreenManager(host: ScreenHost): ScreenManager;

// src/app/app.ts
export interface AppHandle { app: Application; manager: ScreenManager; bus: EventBus<AppEvents>; destroy(): void }
export function createApp(root: HTMLElement): Promise<AppHandle>;

// src/app/dev-hook.ts
export interface DevHook { app: Application; manager: ScreenManager }
declare global { interface Window { __bestiariusz?: DevHook } }

// src/ui/dom.ts
export function createButton(labelKey: TranslationKey, onClick: () => void): HTMLButtonElement;
```

Semantyka magistrali: wywołania w kolejności subskrypcji; `emit` iteruje po kopii listy (subskrypcje dodane lub usunięte w trakcie emisji nie zmieniają tej emisji); `Unsubscribe` jest idempotentne; wyjątek w jednym handlerze nie zatrzymuje pozostałych, a pierwszy wyjątek jest rzucany po zakończeniu emisji; `dispose()` magistrali zakresowej usuwa tylko jej własne subskrypcje.

Semantyka menedżera: `show(nieznany)` rzuca `Error('Unknown screen "<id>"')` i nie zmienia stanu; `show(bieżący)` nic nie robi; przejście = `unmount?.()` bieżącego, sprzątanie (zakresowa magistrala `dispose()`, wyczyszczone handlery `onTick`, warstwa zdjęta ze sceny i `destroy({ children: true })`, div nakładki usunięty), potem fabryka → nowa warstwa i div → `mount(ctx)` → zdarzenie `screen:changed`; `show()` wywołane w trakcie przejścia (także przez `navigate` z `mount`) jest kolejkowane i po zakończeniu przejścia wykonuje się tylko ostatnie żądanie („ostatnie wygrywa”, pośrednie ekrany nie są montowane); gdy `mount` rzuci wyjątek, zasoby nowego ekranu są sprzątane, `current` = `null` i wyjątek leci dalej; `tick` woła handlery bieżącego ekranu (po kopii listy); `resize` woła `screen.resize?.()` bieżącego i emituje `app:resize`; `stats()` zlicza bieżące elementy.

- [ ] **Step 1: Testy magistrali, które nie przechodzą**

`tests/core/event-bus.test.ts` (typ zdarzeń `{ ping: number; pong: string }`):

```ts
it('calls handlers in subscription order', ...)               // [1, 2] po dwóch subskrypcjach
it('unsubscribe is idempotent and stops delivery', ...)       // listenerCount spada tylko raz
it('emit iterates over a snapshot', ...)                      // handler dodający handlera w trakcie emisji: nowy nie dostaje bieżącego zdarzenia
it('a throwing handler does not stop the others', ...)        // drugi handler wywołany; emit rzuca pierwszy wyjątek po całej emisji
it('listenerCount counts per type and in total', ...)         // brak argumentu = suma
it('scoped bus dispose removes only its own subscriptions', ...) // subskrypcja bazowa zostaje, zakresowe znikają, emit przez zakresową dochodzi do bazowych
```

Run: `npx vitest run tests/core/event-bus.test.ts`
Expected: FAIL — brak modułu.

- [ ] **Step 2: Zaimplementuj `src/core/event-bus.ts`**

Mapa `type → Set` handlerów (kolejność wstawiania), `emit` kopiuje listę, kolekcjonuje pierwszy wyjątek; `createScopedBus` zapamiętuje własne `Unsubscribe` i zwraca magistralę, której `on` rejestruje w bazowej, a `dispose` je wywołuje.

Run: `npx vitest run tests/core/event-bus.test.ts`
Expected: PASS.

- [ ] **Step 3: Testy menedżera ekranów (jsdom), które nie przechodzą**

`tests/app/screen-manager.test.ts` zaczyna się od `// @vitest-environment jsdom`. Pomocnik `fakeHost()` zwraca `ScreenHost` z prawdziwym `div` jako nakładką, prawdziwą `createEventBus<AppEvents>()`, atrapą sceny (tablica `children`, `addChild`, `removeChild`, rzutowana `as unknown as ScreenHost['stage']`) i `createLayer()` zwracającym atrapę `Container` (`{ children: [], destroy: vi.fn() } as unknown as Container`). Ekrany testowe zapisują wywołania (`mount`, `unmount`), subskrybują `ctx.bus.on('app:resize', …)`, rejestrują `ctx.onTick(…)` i dokładają dziecko do `ctx.overlay`.

```ts
it('mounts a screen with its own layer and overlay div', ...)                 // stats: stageChildren 1, overlayChildren 1, current === 'a'
it('survives 100 switches without leaking', ...)                              // 100× show(a/b naprzemiennie): stats().stageChildren, overlayChildren, busListeners, tickHandlers równe wartościom po pierwszym zamontowaniu tego samego ekranu; mountCount - unmountCount === 1
it('cleans everything on unmount', ...)                                       // po show('b'): stara subskrypcja bus nie dostaje 'app:resize', stary onTick nie jest wołany przez tick(), layer.destroy wywołane z { children: true }, div nakładki odpięty od drzewa
it('rejects an unknown screen without changing state', ...)                   // toThrow('Unknown screen "x"'), current bez zmian
it('ignores show() of the current screen', ...)                               // mountCount bez zmian
it('handles navigate() called from inside mount()', ...)                      // a.mount woła ctx.navigate('b'): current 'b', a mount 1×, a unmount 1×, b mount 1×
it('queues requests during a transition and the last one wins', ...)          // a.mount woła show('b') i show('c'): current 'c', b nigdy nie zamontowany
it('cleans up and rethrows when mount throws', ...)                           // current null, stageChildren 0, overlayChildren 0; potem show('a') działa
it('forwards resize and emits app:resize', ...)
it('emits screen:changed with from and to', ...)                              // pierwszy raz from: null
```

Run: `npx vitest run tests/app/screen-manager.test.ts`
Expected: FAIL — brak modułu.

- [ ] **Step 4: Zaimplementuj `src/app/events.ts` i `src/app/screen-manager.ts`**

Zgodnie z interfejsami i semantyką wyżej. `import type { Container } from 'pixi.js'` — menedżer nie ładuje PixiJS w czasie działania. Stan przejścia (`transitioning` + `pendingId`) realizuje kolejkę „ostatnie wygrywa”.

Run: `npx vitest run tests/app/screen-manager.test.ts`
Expected: PASS.

- [ ] **Step 5: Zależność PixiJS i start aplikacji**

`npm install pixi.js` (wersja 8), wpis w `docs/decyzje.md`. `src/app/app.ts`, `createApp(root)`: `new Application()`, `await app.init({ resizeTo: root, background: '#1b1b22', antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), preference: 'webgl' })`; dołącz `app.canvas` do `root`; dodaj za nim `div.ui-root` (nakładka); `createScreenManager({ stage: app.stage, overlay: uiRoot, bus, createLayer: () => new Container() })`; `app.ticker.add((ticker) => manager.tick(ticker.deltaMS))`; `ResizeObserver` na `root` woła `manager.resize({ width, height })`; `destroy()` rozłącza obserwatora, woła `manager.dispose()` i `app.destroy(true, { children: true })`.

- [ ] **Step 6: Interfejs i ekrany testowe**

- `src/ui/ui.css`: `html, body, #app { margin: 0; height: 100%; overflow: hidden; touch-action: manipulation; overscroll-behavior: none; }`; `.ui-root` i div nakładki ekranu: `position: absolute; inset: 0; pointer-events: none; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);` z `pointer-events: auto` dla dzieci; `.ui-button { min-width: 48px; min-height: 48px; font-size: 1rem; }`.
- `src/ui/dom.ts`: `createButton(labelKey, onClick)` tworzy `<button type="button" class="ui-button">` z `textContent = t(labelKey)` (nazwa dla czytnika ekranu to ten tekst).
- `src/game/screens/test-screens.ts`: `createTestScreen(titleKey, color, nextId): Screen` — na warstwie `Graphics` (prostokąt wypełniony kolorem), `Text` z `t(titleKey)`, obracany w `ctx.onTick`; w nakładce przycisk `createButton('screen.test.switch', () => ctx.navigate(nextId))`; `ctx.bus.on('app:resize', …)` ustawia pozycję tekstu na środku. Komentarz na górze: ekrany tymczasowe, znikają przy pierwszych prawdziwych ekranach (S04).
- `src/main.ts`: `await initI18n('pl')`; `const { app, manager } = await createApp(document.getElementById('app')!)` (bez operatora `!`: sprawdź element i rzuć czytelny błąd); zarejestruj `test-a` (tytuł `screen.test.a.title`, następny `test-b`) i `test-b`; `manager.show('test-a')`; pod warunkiem `import.meta.env.DEV` ustaw `window.__bestiariusz = { app, manager }`. Import `ui.css` w `main.ts`.

- [ ] **Step 7: Test e2e (Chromium), który nie przechodzi**

`tests/e2e/screens.spec.ts` — na początku `test.skip(({ browserName }) => browserName !== 'chromium', 'WebGL in headless WebKit on Linux is unreliable')`. Pomocnik `stats(page)` zwraca `page.evaluate(() => ({ ...window.__bestiariusz!.manager.stats(), pixiStageChildren: window.__bestiariusz!.app.stage.children.length, tickerListeners: window.__bestiariusz!.app.ticker.count }))`. Przycisk: `page.getByRole('button', { name: 'Przełącz ekran' })`.

```ts
test('boots into test-a without external requests', ...)
  // zbierz page.on('request'); po załadowaniu każdy URL zaczyna się od http://localhost:5173 lub data:/blob:
test('switch button is a 48px target with an accessible name', ...)
  // boundingBox().width i .height >= 48
test('100 switches leave no objects behind', ...)
  // baseline = stats po starcie; 100 kliknięć; ostatecznie current === 'test-a' (parzysta liczba),
  // stageChildren, overlayChildren, busListeners, tickHandlers, pixiStageChildren, tickerListeners równe baseline,
  // mountCount - unmountCount === 1
test('double tap mounts exactly one screen', ...)
  // button.dblclick(): mountCount - unmountCount === 1 i pixiStageChildren === 1
test('survives rotation and resize while a screen is mounted', ...)
  // setViewportSize 390x844 → 844x390 → 1024x768: za każdym razem canvas.clientWidth/Height równe viewportowi (±1 px),
  // nakładka .ui-root o tym samym rozmiarze, a przycisk nadal przełącza ekran (current się zmienia)
```

Run: `npx playwright test tests/e2e/screens.spec.ts --project=chromium`
Expected: FAIL (przed krokami 5–6) — po wykonaniu kroków 5–6 uruchom ponownie.

- [ ] **Step 8: Uruchom całość**

Run: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`
Expected: kod 0 dla każdego; w e2e wszystkie testy `screens` w Chromium zielone, w WebKit pominięte. Otwórz `npm run dev` i obejrzyj oba ekrany oraz ich przełączanie.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat(app): screen manager, event bus, PixiJS app skeleton and test screens"
```

---

### Task S01-07: CI w GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (plakietka statusu pominięta; opis CI w jednym zdaniu)

**Interfaces:**
- Consumes: skrypty z S01-01, `npm run test:e2e` z S01-04, zdalne repozytorium z S01-10.
- Produces: workflow `CI` z zadaniami `check` (lint, typecheck, testy, build) i `e2e` (Playwright Chromium + WebKit); zadanie `android` dochodzi w S01-08.

- [ ] **Step 1: Zdalne repozytorium (Ty, po S01-10)**

`git remote add origin https://github.com/<twój-login>/bestiariusz.git` (repozytorium **prywatne**, utworzone w S01-10). Pierwszy `git push -u origin main` wykonujesz ty, bo wymaga logowania do GitHuba.

- [ ] **Step 2: Napisz workflow**

`.github/workflows/ci.yml`: `name: CI`; wyzwalacze: `push` na `main` i `pull_request`; `permissions: contents: read`; `concurrency` grupa `ci-${{ github.ref }}` z `cancel-in-progress: true`. Zadanie `check` (`ubuntu-latest`, `timeout-minutes: 15`): `actions/checkout@v4`, `actions/setup-node@v4` (`node-version: 24`, `cache: npm`), `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Zadanie `e2e` (równolegle, `timeout-minutes: 20`): checkout, setup-node, `npm ci`, `npx playwright install --with-deps chromium webkit`, `npm run test:e2e` (zmienna `CI=true`), a przy porażce `actions/upload-artifact@v4` z `playwright-report/` i `test-results/` (nazwa `e2e-report`, retencja 7 dni). Wersje akcji `@v4` są sprawdzone; podniesienie do nowszej głównej wersji to osobna, świadoma zmiana.

- [ ] **Step 3: Wypchnij i obserwuj**

Run: `git add .`, `git commit -m "ci: lint, typecheck, test, build and e2e on every push"`, ty: `git push`.
Expected: w karcie Actions zielone `check` i `e2e` na gałęzi `main`; czas zadania `check` poniżej 5 minut (odczytaj z karty przebiegu i zapisz w retrospektywie). Po porażce: przeczytaj log, popraw, wypchnij ponownie.

---

### Task S01-08: Capacitor i debugowy APK

**Files:**
- Create: `capacitor.config.ts`, `android/` (wygenerowany przez `npx cap add android`, wersjonowany w git)
- Modify: `package.json` (zależności i skrypt `android:sync`), `.github/workflows/ci.yml` (zadanie `android`), `docs/decyzje.md`, `README.md`

**Interfaces:**
- Consumes: `dist/` z `npm run build` (S01-01), szkielet aplikacji (S01-05), CI (S01-07).
- Produces: artefakt CI `bestiariusz-debug-apk` zawierający `app-debug.apk`; skrypt `npm run android:sync` = `vite build && cap sync android`.

- [ ] **Step 1: Zainstaluj Capacitor i dodaj Androida**

`npm install @capacitor/core @capacitor/android`, `npm install -D @capacitor/cli`, wpisy w `docs/decyzje.md`. `capacitor.config.ts`: `appId: 'app.bestiariusz.game'` (roboczo, decyzja D9), `appName: 'Bestiariusz'`, `webDir: 'dist'`. Potem `npm run build`, `npx cap add android`, `npm run android:sync`.
Expected: katalog `android/` z `gradlew` i `app/`; `android/app/src/main/assets/public/index.html` istnieje.

- [ ] **Step 2: Ustal wersję Javy dla CI**

Run: `git grep -n "JavaVersion.VERSION_" -- android`
Expected: jedna wersja (np. `VERSION_21`). Ta liczba jest `java-version` w workflow.

- [ ] **Step 3: Dodaj zadanie `android` do workflow**

`ubuntu-latest`, `timeout-minutes: 30`, kroki: checkout, setup-node (24, cache npm), `actions/setup-java@v4` (`distribution: temurin`, `java-version` z kroku 2), `gradle/actions/setup-gradle@v4`, `npm ci`, `npm run android:sync`, `chmod +x android/gradlew` (Windows nie zachowuje bitu wykonywalności), w katalogu `android`: `./gradlew assembleDebug`, `actions/upload-artifact@v4` (nazwa `bestiariusz-debug-apk`, ścieżka `android/app/build/outputs/apk/debug/app-debug.apk`, `if-no-files-found: error`, retencja 14 dni).

- [ ] **Step 4: Wypchnij i pobierz APK**

Run: `git add .`, `git commit -m "feat(android): capacitor project and debug apk in ci"`, ty: `git push`.
Expected: zielone zadanie `android`, artefakt do pobrania z karty przebiegu.

- [ ] **Step 5: Instalacja i lista kontrolna na telefonie (Ty)**

Pobierz artefakt, rozpakuj, przenieś `app-debug.apk` na telefon, zainstaluj (zezwól przeglądarce lub menedżerowi plików na instalację z nieznanych źródeł). Sprawdź i zaznacz:

- [ ] Aplikacja się uruchamia i pokazuje ekran PixiJS z przyciskiem „Przełącz ekran”.
- [ ] 20 dotknięć przełącza ekrany bez zawieszenia.
- [ ] Obrót w poziom i z powrotem: ekran dopasowuje się do rozmiaru.
- [ ] Przycisk Home, wejście z powrotem po 30 sekundach: ekran znowu się rysuje i reaguje na dotyk.
- [ ] Przycisk nie jest przykryty paskiem systemowym ani wycięciem aparatu. Jeśli jest: zapisz to w `docs/retro/S01.md` jako zadanie dla S09 (powłoka aplikacji); nie naprawiamy w S01.
- [ ] Liczba klatek wygląda płynnie (ocena na oko; pomiar wykonuje S03-09).

Wynik listy trafia do `docs/retro/S01.md` w zadaniu S01-00.

---

### Task S01-09: Licencje modeli i spis wkładu AI (Ty)

**Files:**
- Create: `docs/ai-provenance.md`
- Modify: `README.md` (akapit z zasadą)

- [ ] **Step 1: Claude przygotowuje szkic, ty sprawdzasz licencje**

Szkic `docs/ai-provenance.md`: nagłówek z zasadą („każdy plik w `art/`, `audio/`, `marketing/` i `docs/` ma wpis: co zrobił człowiek, co AI, którym modelem i na jakiej licencji”); tabela modeli `| Model | Do czego | Licencja | Data sprawdzenia |` z wierszami: FLUX.2 klein 4B (grafika), ACE-Step 1.5 (muzyka), Qwen3 Coder 30B lokalnie przez Ollamę (kod), Claude (architektura, recenzja, kod); sekcja „Wykluczone”: FLUX.2 klein 9B i FLUX.2 dev; tabela rejestru `| Plik | Człowiek | AI (model, wersja) | Data |` (pusta). W kolumnie „Licencja” i „Data sprawdzenia” wpisujesz sam: otwórz kartę każdego modelu na stronie wydawcy, skopiuj nazwę licencji i dzisiejszą datę. Plan sprintów zakłada Apache 2.0 dla FLUX.2 klein 4B i MIT dla ACE-Step 1.5; ta weryfikacja potwierdza to u źródła. Dla modeli wykluczonych dopisz jednozdaniowy powód.

- [ ] **Step 2: Zasada w README**

Akapit „Wkład AI” w `README.md` (po polsku, 2–3 zdania) z odwołaniem do `docs/ai-provenance.md`.

- [ ] **Step 3: Sprawdź i commit**

Expected: plik istnieje, wszystkie komórki „Licencja” i „Data sprawdzenia” wypełnione, modele wykluczone wymienione.

```bash
git add docs/ai-provenance.md README.md
git commit -m "docs: ai provenance rule and model licences"
```

---

### Task S01-10: Konta bez opłat (Ty)

**Files:** brak plików w repozytorium (dane dostępowe w menedżerze haseł).

- [ ] **Step 1 (pierwszego dnia): prywatne repozytorium GitHub**

Utwórz prywatne repozytorium `bestiariusz` na swoim koncie, włącz uwierzytelnianie dwuskładnikowe, w ustawieniach repozytorium upewnij się, że Actions są włączone. Nie dodawaj README ani licencji z poziomu GitHuba (pierwszy push zrobisz z laptopa w S01-07).

- [ ] **Step 2: Supabase w regionie UE**

Nowy projekt `bestiariusz-dev`, region UE (Frankfurt), plan bezpłatny. Zapisz URL projektu i hasło bazy w menedżerze haseł. Niczego nie wpisuj do repozytorium.

- [ ] **Step 3: Serwer Discord i skrzynka projektu**

Roboczy serwer Discord (kanały: ogłoszenia, testy, błędy) i osobna skrzynka e-mail projektu; oba dane dostępowe do menedżera haseł.

- [ ] **Step 4: Sprawdź, że w repozytorium nie ma sekretów**

Claude uruchamia `git grep -nEi "(api[_-]?key|secret|password|token)\s*[:=]"`.
Expected: brak trafień (poza komentarzami w testach, jeśli się pojawią, wyjaśnij je w odpowiedzi).

---

### Task S01-11: Zamrożenie zakresu MVP (Ty + Claude)

**Files:**
- Create: `docs/gdd-mvp.md`

- [ ] **Step 1: Decyzja D1**

Wybierz wariant A, B albo C z sekcji „D1. Koszty mocy symboli” (rekomendacja: A). Odpowiedź zapisz w pierwszej linii `docs/gdd-mvp.md` („Decyzja D1: A, data”).

- [ ] **Step 2: Claude generuje dokument**

Jednorazowym skryptem Node (niewersjonowanym) powstaje `docs/gdd-mvp.md`: (1) trzy tabele symboli: `id`, nazwa PL, koszt (żywioły: Ogień, Woda, Ziemia, Wiatr, Grom; formy: Wilk, Kruk, Sowa, Wąż, Niedźwiedź, Jeleń; przymioty: Gniew, Smutek, Spryt, Odwaga, Głód; koszty wg wybranego wariantu); (2) tabela 150 kombinacji `żywioł · forma · przymiot | suma kosztów | pozostało z 10`; (3) podsumowanie: liczba kombinacji, rozkład sum, liczba kombinacji ponad budżet (dla A: 0); (4) zasada: wartości ataku i zdrowia oraz efekty dochodzą w S03-01 i nie są tu zamrożone.

- [ ] **Step 3: Sprawdzenie liczb**

Run (Claude): skrypt liczy sumy niezależnie od generatora i porównuje z tabelą.
Expected: 150 wierszy; dla wariantu A rozkład 6/28/52/48/16 dla sum 6–10 i zero kombinacji powyżej budżetu.

- [ ] **Step 4: Twoje zatwierdzenie i commit**

Przeczytaj dokument, wpisz „Zatwierdzone” z datą na końcu pliku.

```bash
git add docs/gdd-mvp.md
git commit -m "docs: freeze MVP symbol scope and power costs"
```

---

### Task S01-12: Rytm pracy (Ty)

**Files:**
- Create: `docs/log-godzin.csv`

- [ ] **Step 1: Arkusz godzin w repozytorium**

Claude tworzy `docs/log-godzin.csv` z nagłówkiem `sprint,zadanie,godziny_planowane,godziny_faktyczne,uwagi` i wierszami S01-00 … S01-12 z godzinami planowanymi z planu sprintów (2; 3; 4; 2; 2; 3; 2,5; 2; 3; 1,5; 2; 4; 1). Kolumnę `godziny_faktyczne` uzupełniasz na bieżąco (Claude dopisuje ją po zakończeniu zadania, zgodnie z `CLAUDE.md`).

- [ ] **Step 2: Kalendarz**

W swoim kalendarzu zablokuj sloty na 4 tygodnie z góry (łącznie 15–20 godzin tygodniowo). Kryterium: kalendarz na 4 tygodnie istnieje, arkusz ma kolumny „godziny planowane / faktyczne”.

- [ ] **Step 3: Commit**

```bash
git add docs/log-godzin.csv
git commit -m "docs: hours log"
```

---

### Task S01-00: Zamknięcie sprintu

**Files:**
- Create: `docs/retro/S01.md`
- Modify: `docs/plan-sprintow.md`, `docs/log-godzin.csv`

- [ ] **Step 1: Demo na koniec sprintu**

Sprawdź i zaznacz: (1) na telefonie działa APK z CI i lista z S01-08 jest wypełniona; (2) `npm run lint`, `typecheck`, `npm test`, `npm run test:e2e`, `npm run build` zielone; (3) CI na `main` zielone; (4) Qwen wykonał w repozytorium trzy zadania (S01-02, S01-04, S01-06) i każde ma raport w `results/`.

- [ ] **Step 2: Retrospektywa (pięć linii)**

`docs/retro/S01.md`: (1) co poszło dobrze; (2) co nie (z liczbą podejść Qwena na zadanie i powodem każdej porażki: specyfikacja czy model); (3) godziny: plan 32 h, faktycznie ___; (4) uwagi z listy na telefonie (wycięcie aparatu, powrót z tła); (5) co zmienić w Sprincie 2.

- [ ] **Step 3: Zsynchronizuj plan sprintów**

W `docs/plan-sprintow.md`: zmień `☐` na `☑` przy zadaniach S01; dodaj zależności `S01-07 ← S01-10` i `S01-05 ← S01-06`; w dodatku A dopisz wiersz `src/app/` („menedżer ekranów i start aplikacji”); w dodatku B użyj angielskich etykiet szablonu (`File to edit:` itd., runner rozumie też polskie); w rozdziale 2 zamień „listę chronionych plików” na zasadę „chronione jest wszystko poza plikiem docelowym”; wpis w dzienniku zmian z datą i opisem (decyzja D1, wybrany wariant). Uzupełnij `godziny_faktyczne` w `docs/log-godzin.csv`.

- [ ] **Step 4: Commit i znacznik**

```bash
git add .
git commit -m "docs: close sprint 1"
git tag s01-done
```
