# Bestiariusz — instrukcja dla Claude Code

## Polecenia

- `npm run lint` — ESLint `--max-warnings 0` i `prettier --check`
- `npm run typecheck` — `tsc` dla `tsconfig.json` i `tsconfig.core.json`
- `npm test` — Vitest; pojedynczy plik: `npx vitest run tests/<plik>.test.ts`
- `npm run test:e2e` — Playwright
- `npm run build`, `npm run dev`
- `npm run format` — przed commitem
- `npm run sim -- [--games 1000] [--seed 20261102] [--deck szeptucha] [--enemy leszy] [--enemy-hp N] [--player-hp N] [--out plik.csv] [--data katalog]` — bot rozgrywa walki, CSV w `sim-results/`
- `npm run balance -- [--games 200] [--seed 20261130] [--deck szeptucha] [--enemy leszy] [--copies 1] [--out plik.csv] [--data katalog]` — bot rozgrywa walki dla każdej z 150 istot (talia + badana istota), CSV z odsetkiem wygranych w `sim-results/`, flaga poza 35–65%

## Konwencje

- Warstwy: `src/core` (czysta logika: bez DOM, PixiJS, i18next, Capacitor; nie importuje `ui`, `game`, `platform`, `app`; zwraca klucze i18n, nie teksty), `src/data` (dane i ich schematy, te same ograniczenia), `src/app` (menedżer ekranów, start aplikacji), `src/game` i `src/ui` (PixiJS i nakładka HTML), `src/platform` (Capacitor). Granic pilnuje ESLint i projekt `tsconfig.core.json`.
- Zero `Math.random` w `src/`; zero `Date.now` i `new Date()` w `src/core` i `src/data` — tylko ziarno i wstrzyknięty zegar.
- Zero tekstów w kodzie interfejsu: wszystko przez `t()`, klucze w `src/i18n/pl.json` i `en.json`.
- Importy między plikami źródłowymi z rozszerzeniem `.ts`; `import type` dla typów; bez `enum`, `namespace` i parametrów-pól w konstruktorach.
- Nowa zależność tylko z wpisem w `docs/decyzje.md`.
- Język: dokumenty po polsku; kod, identyfikatory, specyfikacje dla Qwena i komunikaty commitów po angielsku (Conventional Commits).
- Ziarno kanoniczne w testach: `20261102`.

## Praca z Qwenem

Zasady potoku i polecenia dla Qwena: patrz `tools/qwen/CLAUDE.md` (Qwen dostaje ten plik jako swój `CLAUDE.md`).

- Najpierw szkielet i test, potem Qwen: `tasks/<ID>.md` (szablon: `tools/qwen/spec-template.md`, linia `File to edit:`), `tests/<ID>.test.ts` i szkielet pliku docelowego z `throw new Error('Not implemented')`. Test musi nie przechodzić przed uruchomieniem Qwena.
- Uruchomienie: `node tools/qwen-run.mjs --tasks <ID> --apply` (po zaliczeniu plik docelowy trafia do repozytorium). Raport: `results/<data>.md`, logi: `runs/<data>/<ID>/`. Bez Ollamy: `powershell -ExecutionPolicy Bypass -File tools\setup-ollama.ps1`.
- Po zaliczeniu zrecenzuj diff pliku docelowego, potem `npm run format`, `lint`, `typecheck`, `npm test`.
- Zasada pięciu podejść: podejścia liczysz po raportach zadania w `results/`. Po pięciu nieudanych zadanie przejmujesz ty i zapisujesz powód (specyfikacja czy model) w `docs/retro/Sxx.md`.

## Instrukcja dla Claude Code

```text
Plan prac: docs/plan-sprintow.md. Na prośbę „zacznij sprint N”:
1. Przeczytaj sekcję sprintu N, rozdział 2 (zasady pracy) i rozdział 3 (definicja ukończenia).
2. Jeśli przed sprintem N jest bramka (B1–B4), sprawdź, czy docs/bramka-X.md ma zapisaną decyzję. Bez decyzji nie zaczynaj sprintu.
3. Zaproponuj kolejność zadań z uwzględnieniem kolumny „Zależy od”. Zadania z „Kto” = Ty lub podwykonawca zamień na krótką listę kroków dla człowieka i nie wykonuj ich.
4. Dla zadań Qwen napisz tasks/<ID>.md i tests/<ID>.test.ts (patrz dodatek B), uruchom tools/qwen-run.mjs, a po zaliczeniu zrecenzuj diff.
5. Po zakończeniu zadania zmień ☐ na ☑ w planie, dopisz godziny faktyczne do logu i wpis do dziennika zmian.
6. Po pięciu nieudanych podejściach Qwena zadanie przejmujesz ty i zapisujesz powód w docs/retro/Sxx.md.
```
