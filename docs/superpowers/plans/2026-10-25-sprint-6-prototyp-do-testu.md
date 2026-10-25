# Sprint 6 «Prototyp do testu: pełna krótka wyprawa» — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prototyp 8–10 minut dla testerów bramki 1: wyprawa z czterech walk (Utopiec, Strzyga, Południca, Leszy), wybór nagrody po każdej wygranej, minimalny Warsztat między walkami, efekty „soku” z przełącznikami; do tego szablony dokumentów testu i decyzji bramki 1.

**Architecture:** Stan wyprawy to czysty moduł `src/core/run/run.ts` (talia, zdrowie, Atrament, etap, karty z Warsztatu) z losowaniem nagród z ziarna (`rewards.ts`, Qwen). Pętla gry w `src/game/game.ts` łączy istniejące ekrany walki i wyniku z trzema nowymi ekranami HTML (trasa, nagroda, Warsztat) opartymi na czystych widokach (`route-view`, `card-info`, `workshop-view` Qwena). „Sok” to czysta tabela `juice.ts` (Qwen) i dwie cienkie warstwy: rysowanie w scenie walki i dźwięk syntezowany w Web Audio. Stary pojedynek z Leszym zostaje pod `?duel=1` (build deweloperski), na nim stoją dotychczasowe testy walki.

**Tech Stack:** bez nowych zależności: TypeScript `strict` (~6.0.3), Vite 8, Vitest 5, PixiJS 8.22, zod 4, Playwright, Capacitor 8, Node ≥ 22.18.

**Spec:** `docs/plan-sprintow.md` — sekcja „S06 · 11–24 I 2027 · Prototyp do testu: pełna krótka wyprawa” (S06-00 … S06-09) i bramka B1; `docs/zaleglosci.md` (pozycje 3, 7, 8, 10 przeniesione do S06); opis pętli i liczb w `docs/wyprawa.md`.

## Global Constraints

Dziedziczone ze Sprintów 1–5 (pełna lista: plany S04 i S05), w skrócie:

- TypeScript `strict`; ESLint `--max-warnings 0`; Prettier; importy z `.ts`; `import type`; bez `enum`, `namespace`, parametrów-pól.
- Zero `Math.random` w `src/`; zero `Date.now` i `new Date()` w `src/core`, `src/data`, `src/view`. Cała losowość wyprawy z ziarna (`deriveSeed`, `createRng`).
- Warstwy: `src/core` czysty, `src/view` czysta prezentacja (TextRef, liczby), `src/game` Pixi i DOM, `src/platform` przeglądarka. Zero tekstów w kodzie interfejsu: wszystko przez i18n, klucze w `pl.json` i `en.json`, te same w obu (`tests/i18n/screen-keys.test.ts` czyta teraz także `tr(...)` i `translate(...)`).
- **Aplikacja nie wysyła nic przez sieć** (`tests/tools/no-network.test.ts`). Dźwięki są syntezowane, żadnych plików dźwiękowych (D54).
- Każdy efekt „soku” wyłączalny osobno; domyślnie włączone; wstrząs nie działa przy wyłączonych animacjach.
- Nowa zależność tylko z wpisem w `docs/decyzje.md` (w tym sprincie nie ma żadnej).
- Qwen edytuje jeden wskazany plik; po pięciu nieudanych podejściach zadanie przejmuje Claude i zapisuje powód w `docs/retro/S06.md`.
- `git push` i pull request tylko za wyraźną zgodą użytkownika. `.github/workflows/` bez zmian.
- Dokumenty po polsku; kod, identyfikatory, specyfikacje dla Qwena i komunikaty commitów po angielsku (Conventional Commits).

## Review Focus

Pięć sytuacji, które zepsułyby test z ludźmi, a których nie opisuje żadne zadanie z planu sprintów (każda ma test):

1. **Porażka w środku wyprawy**: wyprawa się kończy, a „Nowa wyprawa” zaczyna czystą (talia startowa, pełne zdrowie, Atrament startowy). E2E `losing a fight ends the expedition; New expedition starts a fresh one`; `tests/core/run/run.test.ts` (`end the expedition after a defeat`).
2. **Wygrana z 0 zdrowia** (zabicie wroga w ostatniej chwili): kolejna walka nie może zacząć się z 0 zdrowia. `leave at least 1 health after a win with 0 left`.
3. **Ta sama wyprawa dla tego samego ziarna i różne oferty w różnych etapach**: tester ma dostać nagrody, które da się odtworzyć z zapisanego ziarna. `tests/S06-03.test.ts` i `offer the configured number of different cards… the same for the same run`.
4. **Pamięć lokalna zablokowana** (tryb prywatny): gra działa, przełączniki efektów po prostu się nie zapisują. `tests/platform/juice-store.test.ts` (`survives a storage that throws`).
5. **Warsztat bez Atramentu i pominięta nagroda**: przycisk „Stwórz” wyłączony, powód widoczny; „Pomiń” nie zmienia talii, a etap się przesuwa. E2E `the Workshop makes a creature…` (wyłączony przed wyborem), `skipping the reward keeps the deck`; `tests/S06-02a.test.ts` (`blocked: not_enough_ink`).

---

## Gdzie i jak to wykonać

- **Laptop z Windows**, `C:\Users\tchor\bestiariusz` (Node 24, Ollama z `qwen3-coder-64k`), sesja Claude Code poleceniem `claude`: „Wykonaj plan docs/superpowers/plans/2026-10-25-sprint-6-prototyp-do-testu.md”.
- **Przygotowanie:**
  1. `git status` czysty. Gałęzie S04 i S05 muszą być scalone do `main` (`s04-done`, `s05-done`); jeśli nie są, zatrzymaj się i powiedz użytkownikowi, bo to nie jest część tego planu.
  2. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: zielone.
  3. `git switch -c sprint-6-prototyp-do-testu`.
  4. Plan i katalog `docs/superpowers/plans/sprint-6-pliki/` (**pakiet**) są już w repozytorium: `git add docs`, `git commit -m "docs: sprint 6 plan and package"`.
- Pakiet odwzorowuje układ repozytorium: `pakiet/src/core/run/run.ts` → `src/core/run/run.ts` itd., bez zmiany treści, potem `npm run format`. Pliki, które **zastępują** istniejące (lista przy zadaniach), mają pełną treść z wersji na laptopie z 25 X 2026 plus zmiany sprintu; **przed kopiowaniem porównaj** (`git diff --no-index`), bo jeśli od tego czasu zmieniłeś któryś plik, scal ręcznie.
- Moduły Qwena (`src/core/run/rewards.ts`, `src/view/workshop-view.ts`, `src/view/juice.ts`) leżą w pakiecie jako **szkielety** (typy i stałe prawdziwe, funkcje rzucają `Not implemented`). Rozwiązania wzorcowe są w `tests/reference/` (`run-rewards.ts`, `workshop-view.ts`, `juice.ts`) i nie trafiają do `src/`.
- **Co sprawdziłem w chmurze (25 X 2026).** Świeża kopia repozytorium po S05; szkielet każdego zadania Qwena czerwony (S06-03: 36 przypadków, S06-02a: 16 z 18, S06-04a: 34 z 35), po wstawieniu rozwiązania wzorcowego zielone (36/36, 22/22, 35/35); próba mutacji (14 błędów w `juice.ts`, 6 w `rewards.ts`, 4 w `workshop-view.ts`) wyłapana, z jednym fałszywym alarmem w typie; `tsc` 6.0.3 czysty dla obu projektów; zestaw testów jednostkowych zielony w atrapie Vitesta (59 plików, poza znanym `screen-manager`); aplikacja zbudowana i **w prawdziwym Chromium** 25 testów E2E zielonych (wyprawa 6, walka 19); pomiar bota: patrz `docs/wyprawa.md`.
- **Czego w chmurze nie sprawdziłem:** prawdziwy Vitest 5, ESLint 10, Prettier (pakiet może wymagać `npm run format`), WebKit, zrzuty wizualne (wzorce są z CI; `boot()` w E2E używa teraz `duel=1`, więc widok walki się nie zmienia), **dźwięk na prawdziwym telefonie** (Web Audio ruszy dopiero po dotknięciu ekranu; w chmurze nie ma karty dźwiękowej), wstrząs ekranu na A56, płynność 60 kl./s z efektami.
- Polecenia działają w PowerShell 5.1 i w Git Bash; bez `&&`.

## Decyzje podjęte w planie (zmień, jeśli się nie zgadzasz)

- **D50. Wyprawa to cztery stałe walki** (Utopiec, Strzyga, Południca, Leszy), bez mapy i rozgałęzień. Plan sprintów mówił „3 walki + Leszy”; trzech nowych wrogów ma różne mechaniki (tarcza i wciąganie, kradzież, klątwa). Mapa z wyborem trasy to później. Odrzucone: ta sama walka z Leszym trzy razy (nudna), losowi wrogowie (trudniejsza analiza testu).
- **D51. Zdrowie i Atrament przechodzą między walkami.** Po wygranej +12 zdrowia (nie ponad maksimum) i +12 Atramentu; start z 12 Atramentu. Po jednej wygranej starcza na najtańszą istotę (24). Odrzucone: pełne leczenie (znosi napięcie wyprawy), brak Atramentu (Warsztat bez sensu).
- **D52. Nagroda to jedna z trzech kart z puli dziesięciu albo nic.** Pula: 6 zaklęć i 4 istoty gotowe (po jednej na żywioł). Losowanie z ziarna wyprawy przez `deriveSeed(ziarno, 1000 + etap)`; ziarno walki to `deriveSeed(ziarno, etap)`. Odrzucone: nagroda obowiązkowa (tester bez dobrej oferty i tak bierze kartę).
- **D53. Warsztat odblokowuje od razu wszystkie 16 symboli** (5 żywiołów, 6 form, 5 cech), nie 12. Plan sprintów mówił o 12 odblokowanych; mechanizm odblokowania jest później (S07+), a test ma sprawdzić, czy zabawa istotą bawi, nie czy tester znajdzie symbole. Cena i budżet mocy bez zmian (`emberCost` 2, `inkPerPower` 4, budżet 10).
- **D54. Dźwięki syntezowane, nie z bibliotek CC0.** Dziesięć tonów w Web Audio (`src/view/sound-recipes.ts`); brak plików, brak licencji, brak sieci. Odstępstwo od S06-04 opisane w `docs/dzwieki.md`. Prawdziwe dźwięki i muzyka: S09–S10.
- **D55. Przełączniki efektów (wstrząsy, błyski, liczby, dźwięk) są na ekranie trasy**, stan w `localStorage` z obsługą błędów. Odrzucone: osobny ekran ustawień (menu i ustawienia to S08), przełączniki w walce (zasłaniają pole).
- **D56. `?duel=1` (build deweloperski) zachowuje pojedynek z Leszym.** `boot()` w E2E dodaje go sam, `bootRun()` startuje wyprawę. W buildzie produkcyjnym opcja jest ignorowana.
- **D57. Trudność wyprawy zostaje taka, jaka wyszła z pomiaru** (bot z losowymi nagrodami kończy 13% wypraw, `docs/wyprawa.md`); strojenie dopiero po obserwacji ludzi (S06-08), pokrętła w bloku `expedition`.

## Struktura plików po Sprincie 6

```
docs/wyprawa.md, docs/dzwieki.md, docs/bramka-1.md (szablon), docs/retro/S06.md (szkic)
src/core/run/rewards.ts          nowy, Qwen (S06-03): deriveSeed, drawRewards
src/core/run/run.ts              nowy: stan wyprawy, nagrody, Warsztat w wyprawie (S06-01a)
src/core/sim/run-sim.ts          nowy: bot przechodzi wyprawę (S06-01a)
src/core/combat/model.ts, reducer.ts   startHp w CombatSetup; ExpeditionBalance
src/data/balance.json, cards.json, enemies.json, combat-schema.ts   blok expedition, 10 kart, 3 wrogowie
src/view/workshop-view.ts        nowy, Qwen (S06-02a)
src/view/juice.ts                nowy, Qwen (S06-04a)
src/view/{route-view,card-info,sound-recipes}.ts   nowe (Claude)
src/platform/{audio,juice-store}.ts                nowe
src/game/{game.ts,combat-session.ts}, screens/{route,reward,workshop}-screen.ts, screens/panel.ts, screens/result-screen.ts, render/combat-scene.ts, art/enemy-art.ts
src/app/launch-options.ts (duel), src/i18n/*.json, src/ui/ui.css, eslint.config.js (.claude)
tasks/S06-02a.md, S06-03.md, S06-04a.md; tests/S06-*.test.ts; tests/reference/{run-rewards,workshop-view,juice}.ts
tests/core/run/run.test.ts, tests/data/expedition-data.test.ts, tests/sim/run-sim.test.ts, tests/view/{route-view,card-info}.test.ts,
tests/platform/juice-store.test.ts, tests/e2e/expedition.spec.ts, tests/e2e/support.ts (bootRun, winFight, duel=1)
```

## Kolejność wykonania

Zadania Ty: **S06-05 … S06-07, S06-09** (po zbudowaniu prototypu), warunki przeniesione z S05 (**S05-01 … S05-04**, workflow Pages) i **S06-00** (zamknięcie). Kod: Qwen S06-03 → S06-02a → S06-04a, potem Claude 1 → 2 → 3 → 4.

1. Task 1 (Qwen rewards) → 2. Task 2 (Qwen workshop-view) → 3. Task 3 (Qwen juice) → 4. Task 4 (dane i logika wyprawy) → 5. Task 5 (ekrany i pętla) → 6. Task 6 (efekty i dźwięk) → 7. Task 7 (E2E i zestaw) → (Ty: test z ludźmi) → S06-00.

---

### Task 1: S06-03 Losowanie nagród z ziarna (Qwen)

**Files:**
- Create: `src/core/run/rewards.ts` (szkielet z pakietu), `tasks/S06-03.md`, `tests/S06-03.test.ts`, `tests/reference/run-rewards.ts`

**Interfaces:**
- Produces: `deriveSeed(seed: number, salt: number): number` (RangeError poza zakresem), `drawRewards(pool: readonly string[], count: number, rng: Rng): string[]` (unikalne id, jedno `rng.shuffle`, `slice(0, count)`).

Procedura (jak w S05): 1. skopiuj pliki z listy (rozwiązanie wzorcowe do `tests/reference/`, nie do `src/`); `npm run format`. 2. `npx vitest run tests/S06-03.test.ts` — Expected: FAIL (`Not implemented`). 3. `node tools/qwen-run.mjs --tasks S06-03 --apply` — Expected: zaliczone; po porażce dopisz do specyfikacji liczby z testu, do pięciu podejść. 4. Recenzja diffu: (a) `deriveSeed` używa dokładnie kroków ze specyfikacji (`Math.imul`, `>>> 0`); (b) `drawRewards` nie zmienia wejścia i wywołuje `rng.shuffle` raz; (c) brak `Math.random`. 5. `npm run format`, `lint`, `typecheck`, `npm test`. 6. Commit: `git add src/core/run/rewards.ts tasks/S06-03.md tests/S06-03.test.ts tests/reference/run-rewards.ts` i `git commit -m "feat(core): run seeds and reward draw implemented by qwen"`.

### Task 2: S06-02a Widok Warsztatu (Qwen)

**Files:**
- Create: `src/view/workshop-view.ts` (szkielet), `tasks/S06-02a.md`, `tests/S06-02a.test.ts`, `tests/reference/workshop-view.ts`

**Interfaces:**
- Consumes: `CombatData`, `Unlocked`, `WorkshopError` (`src/core/workshop/workshop.ts`).
- Produces: `toggleSymbol(selection, kind, id): Selection`, `buildWorkshopView(data, unlocked, ink, selection): WorkshopView` (kolumny w kolejności żywioł, forma, cecha; `power {used, max}`; `preview`; `canCraft`; `blocked: WorkshopError | 'incomplete' | null`), stała `EMPTY_SELECTION`.

Procedura jak w Task 1 (`--tasks S06-02a`), recenzja: widok nie wywołuje `craftCreature`, nie zmienia wejścia, symbole zablokowane nie są na liście, ale liczą się do mocy. Commit: `feat(view): workshop view model implemented by qwen`.

### Task 3: S06-04a Tabela „soku” (Qwen)

**Files:**
- Create: `src/view/juice.ts` (szkielet), `tasks/S06-04a.md`, `tests/S06-04a.test.ts`, `tests/reference/juice.ts`

**Interfaces:**
- Consumes: `Cue` (`src/view/animation-plan.ts`).
- Produces: `JuiceSettings`, `DEFAULT_JUICE`, `SoundId`, `SOUND_IDS`, `JuiceCue`, `parseJuiceSettings(text)`, `serializeJuiceSettings(settings)`, `juiceForCue(cue, settings)`, `shakeOffset(strength, progress, maxPx)` (bez `-0`).

Procedura jak w Task 1 (`--tasks S06-04a`), recenzja: żadnych `Date`, `Math.random`; `parseJuiceSettings` nie rzuca; `shakeOffset` normalizuje `-0`. Commit: `feat(view): juice rules implemented by qwen`.

### Task 4: S06-01a Dane i logika wyprawy (Claude)

**Files:**
- Modify: `src/core/combat/model.ts` (`ExpeditionBalance`, `Balance.expedition?`, `CombatSetup.startHp?`), `src/core/combat/reducer.ts`, `src/data/{balance,cards,enemies}.json`, `src/data/combat-schema.ts`, `src/game/combat-session.ts` (`deck`, `startHp`), `tests/data/combat-schema.test.ts`
- Create: `src/core/run/run.ts`, `src/core/sim/run-sim.ts`, `tests/core/run/run.test.ts`, `tests/data/expedition-data.test.ts`, `tests/sim/run-sim.test.ts`; poprawka w `tests/game/combat-session.test.ts`

**Interfaces:**
- Consumes: `deriveSeed`, `drawRewards` (Task 1); `craftCreature` (S03-07).
- Produces: `RunState {seed, stage, deck, hp, ink, crafted, status}`, `startRun(data, seed)`, `stageEnemy`, `stageCount`, `fightSeed`, `dataForFight`, `finishFight(data, run, {won, hpLeft})`, `offerRewards(data, run)`, `takeReward(run, cardId | null)`, `addCrafted(run, card, ink)`; `playRun(data, seed)`; `createCombatSession(data, {deck?, startHp?, enemyId?, …})`.

- [ ] **Step 1: Skopiuj z pakietu** pliki z listy; pliki do zastąpienia (`model.ts`, `reducer.ts`, `balance.json`, `cards.json`, `enemies.json`, `combat-schema.ts`, `combat-session.ts`, oba testy) porównaj z wersją na laptopie. `npm run format`.
- [ ] **Step 2: Testy danych i logiki.** `npx vitest run tests/data tests/core/run tests/sim/run-sim.test.ts tests/game/combat-session.test.ts`. Expected: zielone (wymaga zaliczonego Task 1). Test `expedition-data` pilnuje, że blok `expedition` odwołuje się do istniejących wrogów, kart i talii, a pula nagród ma co najmniej tyle różnych kart, ile ofert.
- [ ] **Step 3: Zestaw walki** nie może się zmienić: `npm test`. Expected: zielone (`combat-schema.test.ts` oczekuje teraz czterech wrogów, Leszy pierwszy).
- [ ] **Step 4: Pomiar.** `npm run sim` i `npm run balance` dla Leszego bez zmian (przedział 35–65% z S03-08); `docs/wyprawa.md` podaje wynik bota dla wyprawy. Jeśli `npm run balance` wypada poza przedział, zatrzymaj się: nowe karty nie mogą wejść do talii startowej.
- [ ] **Step 5: Commit:** `git add src tests docs/wyprawa.md` i `git commit -m "feat(core): expedition state, rewards and bot run simulation"`.

### Task 5: S06-01b, S06-02b Ekrany i pętla gry (Claude)

**Files:**
- Create: `src/view/route-view.ts`, `src/view/card-info.ts`, `src/game/screens/{panel,route-screen,reward-screen,workshop-screen}.ts`, `tests/view/{route-view,card-info}.test.ts`
- Modify: `src/game/game.ts`, `src/game/screens/result-screen.ts` (`continueKey`), `src/view/combat-view.ts` (trzy funkcje eksportowane), `src/game/art/enemy-art.ts`, `src/app/launch-options.ts` (`duel`), `src/i18n/{pl,en}.json`, `src/ui/ui.css`, `tests/app/launch-options.test.ts`, `tests/i18n/screen-keys.test.ts`

**Interfaces:**
- Consumes: Task 2 i Task 4.
- Produces: `GameHandle.run()`; ekrany `route`, `reward`, `workshop` w menedżerze; przycisk `result.again` na ekranie wyniku wyprawy; `LaunchOptions.duel`.

- [ ] **Step 1: Skopiuj z pakietu** i porównaj pliki do zastąpienia; `npm run format`.
- [ ] **Step 2: Testy widoków i kluczy.** `npx vitest run tests/view tests/i18n tests/app`. Expected: zielone.
- [ ] **Step 3: Typy.** `npm run typecheck`. Expected: czysto (zły klucz w `createButton` jest błędem typu).
- [ ] **Step 4: Ręcznie na komputerze.** `npm run dev`, `http://localhost:5173/?seed=7`: trasa z czterema walkami → „Do walki” → wygrana → ekran nagrody → wybór → trasa z kolejnym wrogiem → „Warsztat” → utworzenie istoty → „Wróć”. Expected: bez błędów w konsoli; liczba w „Talia” rośnie.
- [ ] **Step 5: Commit:** `git add src tests` i `git commit -m "feat(game): expedition route, reward and workshop screens"`.

### Task 6: S06-04b Efekty i dźwięk w walce (Claude)

**Files:**
- Create: `src/view/sound-recipes.ts`, `src/platform/audio.ts`, `src/platform/juice-store.ts`, `tests/platform/juice-store.test.ts`
- Modify: `src/game/render/combat-scene.ts` (`JuiceHooks`, wstrząs, bramki błysku i liczb), `src/game/screens/combat-screen.ts`, `src/game/game.ts`

**Interfaces:**
- Consumes: `juiceForCue`, `shakeOffset` (Task 3).
- Produces: `createCombatScene(tr, juice?)` z `JuiceHooks {settings(), sound(id)}`; `createAudio().play(id)`; `loadJuice()`, `saveJuice(settings)`.

- [ ] **Step 1: Skopiuj z pakietu**; `npm run format`.
- [ ] **Step 2: Test pamięci.** `npx vitest run tests/platform`. Expected: zielone, w tym `survives a storage that throws`.
- [ ] **Step 3: Zrzuty wizualne bez zmian.** `npx playwright test tests/e2e/visual.spec.ts --project=chromium` (Linux albo CI). Expected: zielone; wstrząs i dźwięk nie zmieniają zrzutów, bo `anim=0` w testach.
- [ ] **Step 4: Ręcznie na telefonie (A56).** Otwórz `…/?fps=1`, zagraj walkę: sprawdź dźwięk (po pierwszym dotknięciu), wstrząs przy mocnym trafieniu, przełączniki na trasie, FPS i p95 (wpisz do `docs/retro/S06.md` pkt 4). Expected: wstrząs nie obniża płynności poniżej 50 kl./s; jeśli obniża, zmniejsz `SHAKE_MAX_PX` w `combat-scene.ts` albo wyłącz wstrząs dla `hit` i zgłoś.
- [ ] **Step 5: Commit:** `git add src tests` i `git commit -m "feat(game): juice effects with switches and synthesized sounds"`.

### Task 7: E2E i pełny zestaw (Claude)

**Files:**
- Create: `tests/e2e/expedition.spec.ts`
- Modify: `tests/e2e/support.ts` (`boot` dodaje `duel=1`, nowe `bootRun`, `winFight`, `screenId`), `eslint.config.js` (`.claude` w ignorowanych)

- [ ] **Step 1: Skopiuj z pakietu**; `npm run format`.
- [ ] **Step 2: E2E wyprawy.** `npx playwright test tests/e2e/expedition.spec.ts --project=chromium`. Expected: 6 testów zielonych: trasa z bossem, nagroda do talii, pominięcie, Warsztat, porażka i „Nowa wyprawa”, przełączniki zapisane.
- [ ] **Step 3: Cały E2E.** `npm run test:e2e`. Expected: zielone; walka (19 testów) przechodzi na `duel=1`. Znana niestabilność lokalna z retro S05 pkt 4 może dać przekroczenie czasu przy pierwszym `goto`: uruchom ponownie raz, powtarzający się błąd opisz w retro.
- [ ] **Step 4: Pełny zestaw.** `npm run format`, `lint`, `typecheck`, `npm test`, `npm run build`. Expected: zielone.
- [ ] **Step 5: Commit:** `git add tests eslint.config.js` i `git commit -m "test(e2e): expedition flow and duel mode for combat tests"`.

---

### Zadania człowieka (Ty)

- **Przed testem (warunki z S05):** S05-01 (decyzje w `docs/zaleglosci.md`; pozycje 3, 7, 8, 10 już przeniesione tutaj), S05-02 (10 testerów z terminami, nazwiska poza repozytorium), S05-04 (**dostosuj `docs/test-b1.md` do wyprawy**: scenariusz to cała wyprawa 9–10 min, nie jeden pojedynek; dodaj pytania: „czy walka była za długa / w sam raz / za krótka” (zaległość 10), „czy znalazłeś Warsztat i co z niego zrobiłeś”, „czy któraś nagroda była oczywistym wyborem”), S05-03 kroki 5–6 (uruchom workflow Pages na `main` po scaleniu, obie platformy z osobą z zewnątrz). **Nowa wersja prototypu musi trafić na stronę przed sesjami** (workflow „Prototype site”, push za twoją zgodą).
- **S06-05:** 10 sesji po 30 minut, obserwacja bez podpowiadania, dane z „Zapisz dane testu” i ankiety.
- **S06-06, S06-07:** wypełnij `docs/bramka-1.md` razem z Claude (analiza ankiet), decyzja według progu 7 z 10, decyzja finansowa.
- **S06-09:** klip 20–30 s i 5 zrzutów do `marketing/` (katalog spoza `docs/`, nie ma go jeszcze).
- **Zaległości przeniesione do S06:** `docs/balans-notatki.md` (10 najciekawszych i 10 najnudniejszych kombinacji, poz. 3) powstaje z Warsztatu w grze; teksty legend specjalnych i ceny Warsztatu (poz. 8) oceniasz tym samym podejściem; 13 istot `low` (poz. 7) rozpatrujesz w S06-08.

### Task S06-08: Naprawa 5 największych problemów (Claude, po teście)

Nie da się zaplanować przed testem. Po wypełnieniu `docs/bramka-1.md`: dla każdego z pięciu problemów test, który go odtwarza (E2E albo jednostkowy), poprawka, commit; to, co się nie mieści, trafia do S07 z uzasadnieniem w tabeli. Pierwsze pokrętła trudności to `healBetween`, `startInk`, `inkPerWin`, `rewardPool` w `balance.json`.

---

### Task S06-00: Zamknięcie sprintu

**Files:**
- Modify: `docs/retro/S06.md`, `docs/plan-sprintow.md`, `docs/ai-provenance.md`

- [ ] **Step 1: Demo na koniec sprintu.** Wynik testu z 10 osobami i zapisana decyzja. Sprawdź: (1) `lint`, `typecheck`, `npm test`, `build` zielone, CI zielone; (2) Qwen wykonał trzy zadania (raport w `results/`, liczby podejść w retro); (3) prototyp zagrany przez ciebie na telefonie od trasy do wyniku, z dźwiękiem; (4) `docs/bramka-1.md` wypełniony; (5) `marketing/` ma klip i zrzuty; (6) wyprawa trwa 8–10 minut u większości testerów.
- [ ] **Step 2: Retrospektywa (pięć linii)** w `docs/retro/S06.md` (szkic jest w repozytorium).
- [ ] **Step 3: Zsynchronizuj plan sprintów** (`☐` → `☑`); odstępstwa: S06-02 rozbite na 02a (Qwen) i 02b (Claude), wszystkie symbole odblokowane (D53); S06-03 jako 03 (Qwen) i część S06-01a; S06-04 rozbite na 04a (Qwen) i 04b (Claude), dźwięki syntezowane zamiast CC0 (D54); S06-01 w czterech walkach z trzema nowymi wrogami (D50). Wiersz w dzienniku zmian.
- [ ] **Step 4: Rejestr AI.** Decyzje D50–D57 zostają w tym planie (`docs/decyzje.md` to rejestr zależności, a sprint nie dodaje żadnej); wiersze rejestru dla planu S06, `wyprawa.md`, `dzwieki.md`, `bramka-1.md` (szablon), `retro/S06.md` oraz dla trzech modułów Qwena (`rewards.ts`, `workshop-view.ts`, `juice.ts`; `qwen3-coder-64k`).
- [ ] **Step 5: Commit i znacznik:** `git add .`, `git commit -m "docs: close sprint 6"`, `git tag s06-done`. Scal gałąź po zielonym CI; push tylko za zgodą.

---

## Stan wykonania (25 X 2026)

Plan napisany 25 X 2026, **czeka na twoją recenzję** i wybór metody wykonania. Kod i pakiet sprawdzone w chmurze (patrz „Co sprawdziłem”). Warunek startu: S04 i S05 scalone do `main`. Sprint 6 według tablicy startuje 11 I 2027; zadania kodowe można zacząć wcześniej, sesje testowe (S06-05) wymagają zamkniętych warunków z S05.

Do twojej decyzji: D50 (cztery stałe walki), D51 (zdrowie +12 i Atrament +12 po wygranej), D53 (wszystkie symbole odblokowane), D54 (dźwięki syntezowane zamiast CC0), D57 (trudność bez strojenia przed testem).
