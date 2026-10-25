# Sprint 4 «Prototyp UI: walka na telefonie» — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pierwsza grywalna walka na telefonie: ekran walki w pionie (360×800 dp) z ręką kart pod kciukiem, zagrywaniem dotykiem i przeciąganiem, animacjami z budżetem klatki, warstwowym rysowaniem 150 istot z grafikami zastępczymi, ikonami żywiołów, ekranem końca walki, pętlą gry spinającą logikę z interfejsem (walka z Leszym od początku do końca) i testami E2E oraz wizualnymi.

**Architecture:** Nowa warstwa `src/view` (czysta logika prezentacji: układ, wachlarz kart, maszyna wejścia, plan animacji, modele widoku; bez PixiJS, DOM, zegara i losowości) i warstwa `src/game` (rysowanie w PixiJS 8 plus przezroczyste przyciski DOM `.hit` jako jedyne wejście dla dotyku, klawiatury i czytnika ekranu). Sesja walki (`createCombatSession`) opakowuje rdzeń z S02/S03; ekran walki składa widok, układ, scenę, sterowanie i oś czasu animacji; po walce menedżer ekranów przechodzi do ekranu wyniku i z powrotem do nowej walki.

**Tech Stack:** bez nowych zależności: TypeScript `strict` (~6.0.3), Vite 8, Vitest 5, PixiJS 8.22, Playwright (Chromium; WebKit tylko dla testów bez WebGL), i18next z ICU, zod 4, Node ≥ 22.18.

**Spec:** `docs/plan-sprintow.md` — sekcja „S04 · 14–27 XII 2026 · Prototyp UI: walka na telefonie” (zadania S04-00 … S04-09); zasady walki: `docs/zasady-walki.md` (wersja 0.2); efekty symboli: `docs/efekty-symboli.md` (wersja 1.0). Pliki gotowe do skopiowania leżą w `docs/superpowers/plans/sprint-4-pliki/` (**pakiet**).

## Global Constraints

Wymagania całego projektu (ze specyfikacji i ze Sprintów 1–3); każde zadanie je dziedziczy.

- TypeScript `strict` bez wyjątków; ESLint bez ostrzeżeń (`--max-warnings 0`); Prettier.
- Zero `Math.random` w `src/`; zero `Date.now` i `new Date()` w `src/core`, `src/data` **i `src/view`**; losowość tylko z ziarna (`src/core/rng.ts`), czas tylko jako argument (`deltaMs`).
- Zero tekstów w kodzie interfejsu (`src/ui`, `src/game`, `src/app`): wszystko przez i18n; `src/core` i `src/view` zwracają klucze i parametry (`TextRef`), nie teksty. Każdy użyty klucz istnieje w `pl.json` i `en.json`; oba pliki mają te same klucze.
- `src/core`, `src/data` i `src/view` nie importują DOM, PixiJS, i18next, Capacitor, Node (`node:*`) ani warstw `ui`, `game`, `platform`, `app`. `src/view` może importować `src/core` i `src/data`.
- Importy z rozszerzeniem `.ts`; `import type` dla typów; bez `enum`, `namespace` i parametrów-pól (`erasableSyntaxOnly`).
- Pola dotyku ≥ 48 dp, każde sterowanie ma nazwę dostępną dla czytnika ekranu; sterowanie w zasięgu kciuka (dolna połowa ekranu).
- Aplikacja nie wysyła żadnych żądań poza własnym źródłem (offline; test E2E to sprawdza).
- Animacje wyłączalne: `?anim=0` w adresie i systemowe `prefers-reduced-motion`; dotknięcie w trakcie animacji pomija ją (walka trwa ok. 18 tur).
- Budżet klatki: 60 kl./s na telefonie testowym w walce z 3 istotami; pomiar `?fps=1` (tylko tryb deweloperski).
- Żadnych nowych zależności bez wpisu w `docs/decyzje.md` (w tym sprincie nie ma żadnej).
- Qwen edytuje tylko jeden wskazany plik; po pięciu nieudanych podejściach zadanie przejmuje Claude i zapisuje powód w `docs/retro/S04.md`. Każde „za każdym razem”, „najwyżej raz”, „w tej kolejności” ma własny przypadek testowy.
- Wartości oczekiwane w istniejących testach zmienia się tylko za zgodą użytkownika.
- Ziarno kanoniczne w testach: `20261102`; ziarno E2E: `7`.
- Dokumenty po polsku; kod, identyfikatory, specyfikacje dla Qwena i komunikaty commitów po angielsku (Conventional Commits). Sesja wykonująca dopisuje do commitów własną atrybucję.
- Żadnych haseł, kluczy ani tokenów w repozytorium.

## Review Focus

Sytuacje, których specyfikacja nie rozpisuje, a które uderzają w osobę grającą na telefonie. Każda ma test.

1. **Dotknięta karta wyjeżdża spod palca** (zaznaczona karta się podnosi, więc kończące dotknięcie trafia w tło, a tło odznaczało kartę): karta z brzegu ręki (np. pierwsza i ostatnia) zostaje zaznaczona po jednym dotknięciu. → S04-07, `tests/e2e/combat.spec.ts` (zagranie zaklęcia dotknięciem na skrajnej karcie). Błąd znaleziony w próbie w chmurze i naprawiony w `combat-controls.ts`.
2. **Pominięcie animacji dotknięciem zostawia zablokowany przycisk „Koniec tury”** (ekran nie odświeżał się po `skip`). → S04-05, test „with animations on, an action locks the controls and a tap skips it”.
3. **Obrót telefonu, zmiana rozmiaru i tryb dwuokienny w trakcie walki** nie zmieniają stanu walki, a przyciski zostają w widocznym obszarze. → S04-07, „rotating the phone keeps the state of the combat”, „survives rotation and resize”.
4. **Podwójne dotknięcie „Dalej”** (i szybkie dotknięcia „Koniec tury”) montują dokładnie jedną walkę i nie zostawiają nasłuchów. → S04-08, „double tap on Continue mounts exactly one combat”, „cycles combat → result → combat without leaks”.
5. **Dwa palce naraz i dotyk odrzucony w środku przeciągania:** liczy się pierwszy palec, `pointerCancel` wraca do stanu spoczynku, puszczenie w pustym miejscu anuluje zagranie. → S04-02b (maszyna wejścia, 55 przypadków) i E2E „releasing a dragged card in an empty place cancels the play”.

## Gdzie i jak to wykonać

- **Na twoim laptopie z Windows**, w katalogu repozytorium `C:\Users\tchor\bestiariusz` (Node 24, Ollama z `qwen3-coder-64k`), tak jak w Sprintach 2 i 3. Sesja startuje poleceniem `claude` i dostaje: „Wykonaj plan docs/superpowers/plans/2026-10-25-sprint-4-walka-na-telefonie.md”.
- **Przygotowanie (przed pierwszym zadaniem):**
  1. `git status` czysty, `git switch main`. `git tag` musi zawierać `s01-done`, `s02-done` i `s03-done`, a gałąź `sprint-3-dane` musi być scalona do `main`. **Na dziś (25 X 2026) tego nie ma:** `s03-done` i scalenie czekają na zielone CI gałęzi sprintu 3. Jeśli czegoś brakuje, zatrzymaj się i powiedz użytkownikowi co; zamknięcie Sprintu 3 nie jest częścią tego planu.
  2. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: zielone. To stan wyjściowy.
  3. `git switch -c sprint-4-walka-na-telefonie`.
  4. W repozytorium są już ten plan i katalog `docs/superpowers/plans/sprint-4-pliki/` (**pakiet**). Zatwierdź je jednym commitem: `git add docs` i `git commit -m "docs: sprint 4 plan and package"`.
- Pakiet odwzorowuje układ repozytorium: `pakiet/src/view/layout.ts` kopiujesz do `src/view/layout.ts` bez zmiany treści, potem `npm run format`. Katalog `docs/` nie trafia do kopii Qwena, więc rozwiązania wzorcowe z pakietu (`tests/reference/`) są dla niego niewidoczne, dopóki ich nie skopiujesz (S04-06b). **Pięć modułów Qwena** (`src/view/hand-fan.ts`, `hand-input.ts`, `creature-layers.ts`, `element-icons.ts`, `result-view.ts`) leży w pakiecie jako **szkielety** (prawdziwe typy i stałe, funkcje rzucają `Not implemented`); do czasu wykonania zadań Qwena aplikacja się kompiluje, ale się nie uruchomi.
- **Co sprawdziłem w chmurze (25 X 2026).** Cały sprint przeszedłem na świeżej kopii repozytorium po Sprincie 3 etapami: szkielety Qwena i ich testy czerwone (174 przypadki), po skopiowaniu rozwiązań wzorcowych zielone, test różnicowy zielony (9 przypadków, po 3000 losowych wejść), `tsc` 6.0.3 czysty dla obu projektów, reszta zestawu zielona w atrapie Vitesta, aplikacja zbudowana i **w prawdziwym Chromium** rozegrana dotykiem do końca (testy E2E: walka 16, wynik 4, ekrany 3; zrzuty wizualne 9 uruchomione). Próba wyłapała dwa prawdziwe błędy (Review Focus 1 i 2), które już są naprawione w pakiecie.
- **Czego w chmurze nie sprawdziłem** (potwierdza dopiero twój lokalny przebieg): prawdziwy Vitest 5, ESLint 10 (w tym nowy blok `src/view` i testy w `tests/tools/lint-rules.test.ts`), Prettier, prawdziwe i18next z ICU, `tests/game/combat-data.test.ts` (importy JSON wymagają Vite), `tests/app/screen-manager.test.ts`, `tests/e2e/rng.spec.ts` (potrzebuje serwera Vite), **WebKit** (w chmurze jest tylko Chromium) i wszystko, co dotyczy prawdziwego telefonu: 60 kl./s, dotyk palcem, rozmiar kart w ręku. Zrzutów wzorcowych do porównania nie ma w pakiecie celowo (patrz D39).
- Polecenia działają w PowerShell 5.1 i w Git Bash; nie używam `&&`. „Skopiuj z pakietu” = skopiuj wymienione pliki na tę samą ścieżkę w repozytorium i uruchom `npm run format`.
- `git push` tylko za wyraźną zgodą użytkownika. Plik `.github/workflows/ci.yml` zostaje bez zmian.

## Decyzje podjęte w planie (zmień, jeśli się nie zgadzasz)

Numeracja ciągnie się ze Sprintu 3 (D22–D32).

| # | Decyzja | Powód |
|---|---|---|
| D33 | **Nowa warstwa `src/view`:** czysta logika prezentacji (układ, wachlarz, maszyna wejścia, plan animacji, modele widoku, teksty jako `TextRef`). Ma własny blok w ESLint (jak `src/core`: bez zegara, losowości, PixiJS, i18next, Capacitora i warstw zewnętrznych) i jest w `tsconfig.core.json`. | Cała logika decyzji „co i gdzie pokazać” da się testować bez renderera i bez przeglądarki; zadania Qwena (wachlarz, wejście, warstwy, ikony, wynik) to czyste funkcje. |
| D34 | **Wejście przez przezroczyste przyciski DOM** (`.hit-card`, `.hit-circle`, `.hit-end`, `.hit-backdrop`) nad płótnem; Pixi tylko rysuje. Przeciąganie przez `setPointerCapture`; klawiatura jako „dotknięcie”. Żywy region `sr-only` czyta zdarzenia walki. | Pola dotyku ≥ 48 dp, nazwy dla czytnika ekranu i klawiatura za darmo; testy E2E celują w przyciski po nazwie. |
| D35 | **Układ odniesienia 360×800 dp**, skalowany (`layoutCombat(viewport, insets)` zwraca prostokąty we współrzędnych okna); na szerszych ekranach scena jest wyśrodkowana, scena liczy we współrzędnych lokalnych `(r − stage) / scale`. | Jedna kompozycja dla telefonu, tabletu i obrotu; pełny menedżer układów to S09-05. |
| D36 | **Animacje jako plan:** `planAnimation(events, { enabled })` zamienia zdarzenia rdzenia na listę „cue” (tura, karta, przyzwanie, atak, trafienie, efekt, śmierć, Obrzęd, ruch wroga, obrażenia gracza, odrzucenie, koniec) z czasami z tabeli `TIMING`; oś czasu (`createTimeline`) odtwarza, pomija i zgłasza `busy`. Podczas animacji sterowanie jest zablokowane, dotknięcie pomija. | Czas trwania i kolejność da się testować bez klatek; flaga `anim=0` daje ten sam stan końcowy. |
| D37 | **Opcje startowe z adresu** (`parseLaunchOptions`): `seed`, `anim`, `fps`, `enemyHp`, `playerHp`, `sheet`. Opcje deweloperskie (`fps`, `enemyHp`, `playerHp`, `sheet`) działają tylko w trybie `dev`. `anim` domyślnie wyłączone przy `prefers-reduced-motion`. | Testy E2E skracają walkę (`enemyHp=1`, `playerHp=1`) bez specjalnych przycisków w kodzie produkcyjnym. |
| D38 | **Grafiki zastępcze są wektorowe** (rysowane kodem: tło żywiołu, sylwetka formy, znak przymiotu, ikony), a nie atlas PNG; test S04-03 sprawdza układ warstw dla wszystkich 150 istot. | Kryterium „atlas poniżej 2 MB” spełnione z zapasem (0 bajtów); prawdziwa grafika to późniejszy sprint. Arkusz 150 istot: `?sheet=creatures` (tryb dev). |
| D39 | **Testy wizualne tylko w Chromium** (`tests/e2e/visual.spec.ts`: 3 rozmiary × 3 sceny = 9 zrzutów, próg 1% pikseli), **odstępstwo od S04-06** („Chromium i WebKit”): WebGL w bezgłowym WebKit na Linuksie jest zawodny (ten sam powód co w S01). Zrzutów wzorcowych nie ma w pakiecie, bo muszą pochodzić z CI (Linux); poza Linuksem spec się pomija (`VISUAL=1` wymusza). | Wzorce z innego systemu różniłyby się w tekście i zielone CI byłoby fikcją. Procedura wzorców w S04-06. |
| D40 | **Sylwetka istoty jest barwiona pełnym kolorem żywiołu** (zmiana względem pierwszej wersji specyfikacji S04-03, która miała jaśniejszy odcień). | Przy tym samym odcieniu tła sylwetka znikała (test wizualny na arkuszu 150 istot). |
| D41 | **Walka z Leszym** używa zamiarów z S02 (Leszy 380 zdrowia z D26); „3 zamiary (wersja robocza)” z planu sprintów to dane z `enemies.json`, bez zmian. Walka trwa ok. 18 tur, więc: pominięcie animacji dotykiem, `?anim=0`, i pomiar odczuć w S04-09. | Nie zmieniam balansu w sprincie interfejsu; jeśli walki męczą, wracamy do wariantu z niższym zdrowiem Leszego (Z14, retro S03 5d). |
| D42 | **Ziarno kolejnej walki** = ziarno z adresu + numer przebiegu, a bez ziarna `newSeed()` (`src/platform/seed.ts`, jedyne miejsce z losowym ziarnem). | Powtarzalność w testach i prawdziwa losowość w grze, bez `Math.random` w `src/game`. |
| D43 | **Pomiar klatek:** `?fps=1` (dev) pokazuje FPS i p95 czasu klatki z `createFrameMeter`; kryterium 60 kl./s mierzysz na Galaxy A56 w S04-09. W chmurze (renderer programowy) pomiaru nie da się wykonać. | Punkt odniesienia dla S12; A56 jest wyraźnie szybszy od telefonu klasy 2021 (retro S03 5g). |
| D44 | **Dane walki w aplikacji** pakuje `src/game/combat-data.ts` (importy JSON przez Vite, ten sam schemat zod co w testach); test `tests/game/combat-data.test.ts` porównuje je z danymi z dysku. | Złe dane wywalają się przy starcie z czytelnym komunikatem, a nie w środku walki. |

## Struktura plików po Sprincie 4

| Plik lub katalog | Odpowiedzialność | Zadanie |
|---|---|---|
| `src/view/geometry.ts`, `layout.ts` | `Size`, `Rect`, `Point`, `Insets`; `layoutCombat(viewport, insets)` | S04-01 |
| `src/view/text.ts`, `src/i18n/text.ts` | `TextRef` (klucz + parametry), `renderText` z funkcją tłumaczącą | S04-01 |
| `src/view/combat-view.ts` | `buildCombatView(state, data, selected)`: ręka, Kręgi, pasek stanu, zamiar wroga, opisy dla czytnika | S04-01 |
| `src/view/art-style.ts` | tabele stylu grafik zastępczych (kolory żywiołów, proporcje form, narożniki przymiotów) | S04-03 |
| `src/view/hand-fan.ts`, `hand-input.ts` | wachlarz kart; maszyna wejścia dotykowego (Qwen) | S04-02a, S04-02b |
| `src/view/creature-layers.ts` | plan trzech warstw obrazka istoty (Qwen) | S04-03 |
| `src/view/element-icons.ts` | pięć ikon żywiołów jako wielokąty (Qwen) | S04-04 |
| `src/view/animation-plan.ts` | `planAnimation`, `createTimeline`, `createFrameMeter` | S04-05 |
| `src/view/announce.ts` | zdarzenia walki → linie dla żywego regionu | S04-05 |
| `src/view/result-view.ts` | model ekranu wyniku (Qwen) | S04-08 |
| `src/core/combat/summary.ts` | `summarize(state)`: wynik zakończonej walki | S04-07 |
| `src/core/combat/reducer.ts` | `statRules` eksportowane (jedna linia) | S04-01 |
| `src/game/combat-session.ts`, `game.ts`, `combat-data.ts` | sesja walki, `startGame`, dane w aplikacji | S04-07 |
| `src/game/screens/combat-screen.ts`, `combat-controls.ts`, `result-screen.ts`, `art-sheet.ts` | ekrany i sterowanie | S04-07, S04-08 |
| `src/game/render/*`, `src/game/art/*` | rysowanie sceny, kart, grafik zastępczych | S04-01, S04-03 |
| `src/app/launch-options.ts`, `dev-hook.ts`; `src/platform/seed.ts`; `src/ui/safe-area.ts`, `ui.css`; `src/main.ts` | opcje startowe, hak deweloperski z `game`, ziarno, bezpieczne strefy, style, start | S04-07 |
| `eslint.config.js`, `tsconfig.core.json`, `tests/tools/lint-rules.test.ts` | blok `src/view`, dołączenie do projektu rdzenia | S04-01 |
| `tests/e2e/{support,combat,result,screens,visual}.spec.ts` | testy E2E i wizualne | S04-02, S04-06, S04-07, S04-08 |
| `tests/reference/*`, `tests/diff/qwen-vs-reference-s04.test.ts` | rozwiązania wzorcowe i test różnicowy | S04-06b |
| `src/game/screens/test-screens.ts` (usunięty) | ekrany testowe z S01 | S04-07 |

## Kolejność wykonania

Zadania Ty: **S04-09** (po S04-07), **S04-00** (zamknięcie). S04-01 przed wszystkim innym; zadania Qwena są od siebie niezależne.

1. S04-01 → 2. S04-05 → 3. S04-02a → 4. S04-02b → 5. S04-03 → 6. S04-04 → 7. S04-08 → 8. S04-06b → 9. S04-07 → 10. S04-06 → S04-09 → S04-00.

## Procedura zadania Qwena (S04-02a, S04-02b, S04-03, S04-04, S04-08)

1. Skopiuj z pakietu `tasks/<ID>.md`, `tests/<ID>.test.ts` (szkielet modułu jest już w repozytorium od S04-01). `npm run format`.
2. `npx vitest run tests/<ID>.test.ts`. Expected: FAIL (`Not implemented`).
3. `node tools/qwen-run.mjs --tasks <ID> --apply`. Expected: `<ID> … zaliczone`, plik docelowy zaktualizowany. Gdy niezaliczone, popraw specyfikację (dopisz przykład z liczbami z testu) i uruchom ponownie, do pięciu podejść; potem przejmij zadanie i zapisz powód w `docs/retro/S04.md`.
4. Zrecenzuj diff według listy „Na co patrzeć” w zadaniu.
5. `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`. Expected: zielone dla tego zadania (testy pozostałych zadań Qwena mogą jeszcze być czerwone, jeśli ich nie wykonano).
6. Commit: `git add tasks/<ID>.md tests/<ID>.test.ts <plik modułu>` i `git commit -m "feat(view): <moduł> implemented by qwen"`.

---

### Task S04-01: Warstwa `src/view`, układ walki i reguły (Claude)

**Files:**
- Create: `src/view/{geometry,layout,text,art-style,combat-view}.ts`, `src/i18n/text.ts`, `src/core/combat/summary.ts`, `tests/view/{layout,combat-view}.test.ts`, `tests/view/support.ts`
- Modify: `src/core/combat/reducer.ts` (eksport `statRules`), `src/i18n/index.ts` (`translate`), `src/i18n/pl.json`, `src/i18n/en.json` (89 nowych kluczy; stare bez zmian), `eslint.config.js` (blok `src/view`), `tsconfig.core.json` (dodaj `src/view`), `tests/tools/lint-rules.test.ts`
- Create szkielety Qwena: `src/view/{hand-fan,hand-input,creature-layers,element-icons,result-view}.ts`

**Interfaces:**
- Produces: `layoutCombat(viewport: Size, insets: Insets): CombatLayout` (wszystkie prostokąty we współrzędnych okna; przy 360×800: pasek wroga y 0–56, obraz wroga 56–292, zamiar 248–292, Kręgi y 300 (108×124), pasek stanu 432–488, ręka 488–728, linia rzutu 480, stosy i „Koniec tury” y 736), `buildCombatView(state: CombatState, data: CombatData, selectedIndex: number | null): CombatView`, `TextRef`, `text(key, params?)`, `renderText(ref, translate)`, `summarize(state): CombatSummary | null`.

Testy przypinają: układ w 5 rozmiarach (pola dotyku ≥ 48 dp, brak nakładania Kręgów na rękę, bezpieczne strefy), widok ręki (grywalność z Żaru, powód blokady, klucze tekstów istnieją), pasek stanu, zamiar wroga, opis istoty z legendą, wynik zakończonej walki oraz reguły ESLint dla `src/view` (zegar, losowość, importy).

- [ ] **Step 1:** Skopiuj z pakietu pliki wymienione wyżej (bez `eslint.config.js` i `tsconfig.core.json`, te w kroku 3) i szkielety Qwena. `npm run format`.
- [ ] **Step 2:** Sprawdź `src/i18n/pl.json` i `en.json`: nowe klucze muszą być jedynym zmienionym fragmentem (`git diff --stat`, bez usuniętych wierszy). Jeśli plik w repozytorium różni się od bazy pakietu inaczej niż dopisaniem kluczy, zatrzymaj się i scal ręcznie.
- [ ] **Step 3:** Skopiuj `eslint.config.js`, `tsconfig.core.json`, `tests/tools/lint-rules.test.ts`. `npm run lint`. Expected: zielone (nowy blok pilnuje `src/view`).
- [ ] **Step 4:** `npx vitest run tests/view tests/combat/summary.test.ts tests/tools/lint-rules.test.ts`. Expected: PASS. `npm run typecheck`. Expected: zielone (szkielety Qwena kompilują się).
- [ ] **Step 5:** Commit: `git add src tests eslint.config.js tsconfig.core.json` i `git commit -m "feat(view): view layer, combat layout and view model"`.

---

### Task S04-05: Animacje, oś czasu i opisy dla czytnika (Claude)

**Files:**
- Create: `src/view/animation-plan.ts`, `src/view/announce.ts`, `tests/view/animation-plan.test.ts`, `tests/view/announce.test.ts`

**Interfaces:**
- Consumes: `CombatEvent` z `src/core/combat/model.ts`, `buildCombatView`.
- Produces: `planAnimation(events: readonly CombatEvent[], opts?: { enabled?: boolean }): AnimationPlan`, `TIMING`, `createTimeline()` → `{ play, advance(deltaMs), skip, busy, elapsed, plan, active, pending }`, `createFrameMeter()` → `{ push(deltaMs), stats() }` (`frames`, `fps`, `averageMs`, `worstMs`, `p95Ms`, `slowFrames`), `announceEvents(events, state, data): TextRef[]`.

Testy przypinają: każdy rodzaj zdarzenia daje cue we właściwej kolejności; cue zaczynają się z nakładaniem z tabeli `TIMING`; `enabled: false` daje pusty plan; plan nie zmienia zdarzeń; `skip` kończy oś czasu natychmiast; `advance` nie przekracza końca; miernik klatek liczy p95 i wolne klatki; opisy po polsku dla każdego rodzaju zdarzenia (klucze istnieją).

- [ ] **Step 1:** Skopiuj wymienione pliki z pakietu. `npm run format`.
- [ ] **Step 2:** `npx vitest run tests/view/animation-plan.test.ts tests/view/announce.test.ts`. Expected: PASS.
- [ ] **Step 3:** `npm run lint`, `npm run typecheck`. Expected: zielone.
- [ ] **Step 4:** Commit: `git add src/view tests/view` i `git commit -m "feat(view): animation plan, timeline, frame meter and announcements"`.

---

### Task S04-02a: Wachlarz kart w ręce (Qwen)

**Files:**
- Create: `tasks/S04-02a.md`; Modify: `src/view/hand-fan.ts` (szkielet → rozwiązanie Qwena); Test: `tests/S04-02a.test.ts`

**Interfaces:**
- Produces: `fanLayout(count: number, area: Rect, selectedIndex: number | null): FanSlot[]`, `FanSlot { x; y; rotation; scale; z }`, stałe `CARD_WIDTH` 92, `CARD_HEIGHT` 128, `MAX_STEP` 69, `SIDE_MARGIN` 8, `BOTTOM_GAP` 12, `ROTATION_PER_SLOT` 0,05, `MAX_ROTATION` 0,2, `ARC_DROP` 4, `LIFT` 56, `SELECTED_SCALE` 1,1.

Testy przypinają (31): `RangeError` dla `count` ujemnego i ułamkowego, `[]` dla 0; krok 63 dla 5 kart w obszarze 360; krok `MAX_STEP` dla 2 kart; wąski obszar (krok 0); obrót ograniczony do ±0,2 przy 11 kartach; wybrana karta: ten sam `x`, `y = restY − LIFT` bez łuku, obrót 0, skala 1,1, `z = count`; niepoprawny `selectedIndex` = brak wyboru; argumenty niezmienione.

Na co patrzeć w diffie: łuk dodawany tylko karcie niewybranej; `Math.min`/`Math.max` dla kroku (nigdy poniżej 0); `z` wybranej to `count`, nie `count + 1`; brak mutacji `area`.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S04-02a`, moduł `src/view/hand-fan.ts`.

---

### Task S04-02b: Wejście dotykowe ręki: wybór, przeciąganie, zagranie (Qwen)

**Files:**
- Create: `tasks/S04-02b.md`; Modify: `src/view/hand-input.ts`; Test: `tests/S04-02b.test.ts`

**Interfaces:**
- Produces: `reduceHandInput(state: HandInputState, event: HandInputEvent, ctx: HandInputContext): HandInputResult`, `IDLE`, `DRAG_THRESHOLD` 8, typy `HandInputState` (`idle`, `pressing`, `selected`, `dragging`), `HandInputEvent` (`pointerDown`, `pointerMove`, `pointerUp`, `pointerCancel`, `tapCircle`, `tapOutside`, `reset`), `HandIntent` (`none`, `play`, `refuse`), `HandCardInfo`, `HandInputContext`.

Testy przypinają (55): reguły 1–9 ze specyfikacji, w tym: tylko jeden palec (drugi `pointerDown` ignorowany); próg przeciągania 8 (7 → nadal naciśnięcie, 8 → przeciąganie); karta niegrywalna nie da się przeciągnąć, ale da się ją zaznaczyć; zaklęcie rzucone dotknięciem zaznaczonej karty, stworzenie dotknięciem Kręgu; zaklęcie puszczone dokładnie na linii rzutu nie jest rzucone; stworzenie puszczone na dolnej krawędzi Kręgu nie jest w nim; zajęty Krąg daje `refuse` z powodem `circle_occupied`; stan z niepoprawnym `handIndex` liczy się jak spoczynek; `reset` zawsze czyści.

Na co patrzeć w diffie: decyduje pozycja zdarzenia `pointerUp`, nie ostatniego `pointerMove`; `reason` to `info.blocked ?? 'unplayable'`; brak pola `circle` w intencji zaklęcia; porównania `<` (nie `<=`) przy granicach.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S04-02b`, moduł `src/view/hand-input.ts`.

---

### Task S04-03: Warstwy obrazka istoty (Qwen)

**Files:**
- Create: `tasks/S04-03.md`; Modify: `src/view/creature-layers.ts`; Test: `tests/S04-03.test.ts`

**Interfaces:**
- Consumes: `backgroundTextureId`, `formStyle`, `traitCorner`, `elementColor` z `src/view/art-style.ts`.
- Produces: `planCreatureLayers(spec: CreatureSpec, box: Size): LayerPlan[]` (trzy plany: `background`, `silhouette`, `overlay`), `LayerPlan { role; textureId; x; y; width; height; tint; alpha }`.

Testy przypinają (21): trzy warstwy w stałej kolejności dla wszystkich 150 istot; tło na całe pudełko bez barwienia; sylwetka z proporcją formy i ograniczeniem do 0,9 szerokości (sowa 69,3 × 77 w x 15,35 y 31,5; wilk 90 × 72 w x 5 y 41); sylwetka barwiona pełnym kolorem żywiołu (D40); nakładka 0,3 krótszego boku z marginesem 0,05 w narożniku przymiotu, alfa 0,9; nieznane identyfikatory dają wartości domyślne, nie błąd; `RangeError` dla pudełka o zerowym, ujemnym lub nieskończonym wymiarze; argumenty niezmienione.

Na co patrzeć w diffie: ograniczenie szerokości przelicza też wysokość (`width / aspect`); środek sylwetki liczony po ograniczeniu; `tint` sylwetki to `elementColor(spec.element)`, nie jaśniejszy odcień.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S04-03`, moduł `src/view/creature-layers.ts`.

---

### Task S04-04: Ikony żywiołów (Qwen)

**Files:**
- Create: `tasks/S04-04.md`; Modify: `src/view/element-icons.ts`; Test: `tests/S04-04.test.ts`

**Interfaces:**
- Produces: `ELEMENT_ICONS: Record<string, ElementIcon>` (klucze `ogien`, `woda`, `ziemia`, `wiatr`, `grom`), `FALLBACK_ICON` (romb), `iconFor(element: string): ElementIcon`, `placeIcon(icon: ElementIcon, box: Rect): Point[][]`.

Testy przypinają (42): poprawność wielokątów (1–4 wielokąty po 3–24 punkty, współrzędne w [0, 1], pole ≥ 0,01, brak samoprzecięć); po rasteryzacji 48 × 48 wypełnienie 15–60%, **każda para żywiołów odróżnialna kształtem** (IoU poniżej 0,7 po rasteryzacji w skali szarości, czyli kryterium „pięć żywiołów odróżnialnych w skali szarości”); cechy kształtu (płomień szerszy u dołu i niesymetryczny, kropla symetryczna z ostrym czubkiem, góra, wiatr w trzech smugach, piorun wysoki i niewypukły); `iconFor` zwraca romb dla nieznanych nazw, także `toString`, `constructor`, `__proto__` i pustego napisu; `placeIcon` wpisuje ikonę w największy kwadrat w pudełku i zachowuje kolejność wielokątów.

Na co patrzeć w diffie: `iconFor` przez `Object.hasOwn`, nie `in`; wielokąty nie przecinają siebie; żadnych kolorów w danych ikon (kolor dodaje renderer).

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S04-04`, moduł `src/view/element-icons.ts`.

---

### Task S04-08: Model ekranu końca walki (Qwen)

**Files:**
- Create: `tasks/S04-08.md`; Modify: `src/view/result-view.ts`; Test: `tests/S04-08.test.ts`

**Interfaces:**
- Consumes: `CombatSummary` z `src/core/combat/summary.ts`, `text` z `src/view/text.ts`.
- Produces: `buildResultView(summary: CombatSummary): ResultView` (`outcome`, `title`, `flavor`, `enemyName`, `stats[turns, hp, ritual]`, `primary { id: 'continue', label }`), `LONG_DEFEAT_TURNS` 20.

Testy przypinają (25): tytuł i klucze wygranej i porażki; linia klimatu wygranej wg ułamka zdrowia (≥ 3/4 wysoka, ≥ 7/20 średnia, poniżej niska; granice dla `hpMax` 40: 30 → wysoka, 29 → średnia, 14 → średnia, 13 → niska; dla 100: 75/74/35/34); wygrana z 0 zdrowia dozwolona; linia porażki wg tur (19 → krótka, 20 → długa); trzy statystyki w stałej kolejności; `RangeError` dla niecałkowitych i spoza zakresu `turns`, `hpMax`, `hpLeft`; wszystkie klucze istnieją w obu językach; argumenty niezmienione.

Na co patrzeć w diffie: granice liczone na liczbach całkowitych (`hpLeft * 4 >= hpMax * 3`, `hpLeft * 20 >= hpMax * 7`), nie na ułamkach dziesiętnych; `enemy.<id>.name` składany z `enemyId`.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S04-08`, moduł `src/view/result-view.ts`.

---

### Task S04-06b: Test różnicowy modułów Qwena (Claude)

**Files:**
- Create: `tests/reference/{hand-fan,hand-input,creature-layers,element-icons,result-view}.ts`, `tests/diff/qwen-vs-reference-s04.test.ts`

**Interfaces:**
- Consumes: wszystkie pięć modułów Qwena z `src/view/`.
- Produces: pewność, że rozwiązania Qwena zgadzają się z implementacją kontrolną na tysiącach losowych wejść (po 3000 rund; maszyna wejścia: 600 sekwencji po 14 zdarzeń), także na wejściach niepoprawnych (ten sam wyjątek albo ta sama wartość).

- [ ] **Step 1:** Skopiuj z pakietu `tests/reference/*` i `tests/diff/qwen-vs-reference-s04.test.ts`. `npm run format`.
- [ ] **Step 2:** `npx vitest run tests/diff/qwen-vs-reference-s04.test.ts`. Expected: PASS (9 przypadków). Gdy czerwone: rozbieżność to albo błąd Qwena (popraw specyfikację i ponów zadanie), albo luka w specyfikacji; zapisz w `docs/retro/S04.md`, które.
- [ ] **Step 3:** `npm run lint`, `npm run typecheck`, `npm test`. Expected: zielone.
- [ ] **Step 4:** Commit: `git add tests` i `git commit -m "test: differential test of the qwen view modules"`.

---

### Task S04-07: Pętla gry i ekran walki (Claude)

**Files:**
- Create: `src/app/launch-options.ts`, `src/platform/seed.ts`, `src/ui/safe-area.ts`, `src/game/{combat-data,combat-session,game}.ts`, `src/game/screens/{combat-screen,combat-controls,result-screen,art-sheet}.ts`, `src/game/render/{theme,card-node,combat-scene}.ts`, `src/game/art/{placeholder-art,glyphs,enemy-art}.ts`, `tests/app/launch-options.test.ts`, `tests/game/{combat-session,combat-data}.test.ts`, `tests/i18n/screen-keys.test.ts`
- Modify: `src/app/dev-hook.ts` (pole `game`), `src/main.ts`, `src/ui/ui.css`
- Delete: `src/game/screens/test-screens.ts`

**Interfaces:**
- Consumes: wszystko z S04-01 … S04-08.
- Produces: `startGame({ manager, data, options, seed? }): GameHandle` (`options`, `session()`, `lastSummary()`, `runs()`, `combat()` z sondą `{ busy, frames, selected, hint }`), `createCombatSession(data, { seed, deckId, enemyId, enemyHp, playerHp })` (`state`, `startEvents`, `play(handIndex, circle?)`, `endTurn()`, `summary()`), `parseLaunchOptions(search, { dev, reducedMotion })`, `window.__bestiariusz.game`.

Testy przypinają: opcje startowe (domyślne, niepoprawne wartości, opcje deweloperskie tylko w trybie dev, `reduced-motion` wyłącza animacje); sesja walki (ta sama sekwencja dla tego samego ziarna, odrzucone zagranie niczego nie zmienia, wynik po końcu walki); każdy klucz tekstu użyty w `src/view` i `src/game` istnieje w obu językach, a pliki językowe mają te same klucze; dane w aplikacji równe danym z dysku.

- [ ] **Step 1:** Skopiuj z pakietu pliki z listy Create i Modify (nie kopiuj nic z `tests/e2e`). Usuń `src/game/screens/test-screens.ts`. `npm run format`.
- [ ] **Step 2:** `npx vitest run tests/app tests/game tests/i18n/screen-keys.test.ts`. Expected: PASS.
- [ ] **Step 3:** `npm run lint`, `npm run typecheck`, `npm run build`. Expected: zielone.
- [ ] **Step 4:** `npm run dev`, otwórz `http://localhost:5173/?seed=7` w przeglądarce z emulacją telefonu 360×800: karta Jeleń Ziemi dotknięta, potem Krąg 2, ląduje w Kręgu (Żar 3 → 1). Arkusz `?sheet=creatures` rysuje 150 istot, `?sheet=icons` pięć ikon.
- [ ] **Step 5:** Commit: `git add -A src tests` i `git commit -m "feat(game): combat loop, combat screen, result screen"`.

---

### Task S04-06: Testy E2E i wizualne walki (Claude)

**Files:**
- Create: `tests/e2e/{support,combat,result,visual}.spec.ts` (`support.ts` to pomocnik)
- Modify: `tests/e2e/screens.spec.ts` (przepisany: stare ekrany testowe zniknęły)

**Interfaces:**
- Consumes: `window.__bestiariusz.game` (`session()`, `lastSummary()`, `runs()`, `combat()`), przyciski `.hit-card`, `.hit-circle`, `.hit-end`.
- Produces: 16 testów walki (start bez żądań zewnętrznych, pola dotyku ≥ 48 dp i nazwy, sterowanie w dolnej połowie, zagranie dotknięciem i przeciągnięciem, anulowanie, odmowa z podpowiedzią, zajęty Krąg, klawiatura, koniec tury, blokada i pominięcie animacji, pełna walka dotykiem, obrót), 4 testy wyniku (wygrana, porażka, „Dalej” z nowym ziarnem, animacja), 3 testy ekranów (brak wycieków w 5 przejściach walka ↔ wynik, podwójne dotknięcie, obrót) i 9 zrzutów wizualnych.

- [ ] **Step 1:** Skopiuj z pakietu pliki `tests/e2e/*`. `npm run format`.
- [ ] **Step 2:** `npx playwright test combat result screens --project=chromium`. Expected: 23 przypadki zielone. WebKit pomija te specyfikacje (WebGL), więc `npm run test:e2e` w całości też przechodzi.
- [ ] **Step 3: Wzorce zrzutów.** Poza Linuksem `visual.spec.ts` się pomija. Wypchnięcie gałęzi i pierwszy bieg CI zakończą się błędami „A snapshot doesn't exist” dla 9 zrzutów (tylko za zgodą użytkownika na `git push`). Pobierz artefakt `e2e-report`, skopiuj pliki `*-actual.png` z `test-results/` do `tests/e2e/visual.spec.ts-snapshots/` pod nazwami `<nazwa>-chromium-linux.png` (np. `combat-start-phone-chromium-linux.png`), **obejrzyj każdy** (czy układ wygląda tak, jak chcesz; wzorzec zatwierdza człowiek), commit `test: visual baselines`. Drugi bieg CI: zielony; różnica powyżej 1% pikseli blokuje.
- [ ] **Step 4:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Expected: zielone.
- [ ] **Step 5:** Commit: `git add tests/e2e` i `git commit -m "test(e2e): combat, result, screen switching and visual baselines"`.

---

### Task S04-09: Granie na telefonie przez 3 wieczory (Ty)

**Files:**
- Create: `docs/playtest-S04.md`

- [ ] **Step 1:** Zbuduj wersję na telefon (APK z CI jako artefakt `bestiariusz-debug-apk` albo `npm run dev -- --host` w jednej sieci Wi-Fi) i zagraj na Galaxy A56 (i S26 Ultra) przez trzy wieczory po jednej–dwóch walkach z Leszym.
- [ ] **Step 2:** Zapisz 20 problemów w `docs/playtest-S04.md`: błędy i odczucia. Dla każdego: co robiłeś, co się stało, czego się spodziewałeś. Zwróć uwagę na: czy karty z brzegu ręki łatwo trafić kciukiem, długość walki (ok. 18 tur), czy animacje męczą (pomiń dotknięciem), czytelność zamiaru wroga, czy ikony żywiołów da się odróżnić bez koloru.
- [ ] **Step 3:** Pomiar klatek: otwórz `…/?seed=7&fps=1` (tryb dev), zagraj walkę z trzema istotami w Kręgach i zapisz FPS i p95 z paska. Cel: 60 kl./s (D43).

---

### Task S04-00: Zamknięcie sprintu

**Files:**
- Create: `docs/retro/S04.md`
- Modify: `docs/plan-sprintow.md`, `docs/ai-provenance.md`

- [ ] **Step 1: Demo na koniec sprintu**

Sprawdź i zaznacz: (1) `npm run lint`, `typecheck`, `npm test`, `npm run build` zielone, CI na `main` zielone (w tym `e2e` z wzorcami zrzutów); (2) Qwen wykonał pięć zadań (S04-02a, S04-02b, S04-03, S04-04, S04-08), każde z raportem w `results/`; (3) test różnicowy zielony (S04-06b); (4) cała walka z Leszym rozegrana na telefonie od początku do końca, obie ścieżki wyniku widziałeś (wygrana i porażka); (5) `docs/playtest-S04.md` ma 20 pozycji; (6) APK z gałęzi sprintu uruchomiony na A56.

- [ ] **Step 2: Retrospektywa (pięć linii)**

`docs/retro/S04.md`: (1) co poszło dobrze; (2) co nie (z liczbą podejść Qwena na każde z pięciu zadań i powodem porażek: specyfikacja czy model); (3) godziny: nie zapisujemy; (4) odkrycia z gry na telefonie (długość walki, rozmiar kart, FPS z D43, błędy z listy 20); (5) co zmienić w Sprincie 5 (`docs/zaleglosci.md` w S05-01).

- [ ] **Step 3: Zsynchronizuj plan sprintów**

W `docs/plan-sprintow.md`: `☐` → `☑` przy S04-00 … S04-09. Dopisz odstępstwa: S04-03 „atlas poniżej 2 MB” → „grafiki zastępcze wektorowe, 0 bajtów atlasu” (D38); S04-06 „Chromium i WebKit” → „Chromium; WebKit bez WebGL jest zawodny” (D39), „CI porównuje zrzuty” → „po zatwierdzeniu wzorców z CI”; S04-04 „SVG zastępcze” → „wielokąty w danych, rysowane w PixiJS”; S04-06 wykonawca „Qwen” → „Claude” (to klej E2E, nie izolowany moduł). Dopisz pod tabelą sprintu wiersz w dzienniku zmian.

- [ ] **Step 4: Rejestr plików AI**

W `docs/ai-provenance.md` dopisz wiersze dla `docs/retro/S04.md`, `docs/playtest-S04.md` i planu `docs/superpowers/plans/2026-10-25-sprint-4-walka-na-telefonie.md` (człowiek: zatwierdzenie zakresu, decyzje, uwagi z gry; AI: szkice, model i wersja z nagłówka sesji, data) oraz za pliki `src/view/*` wykonane przez Qwena (model `qwen3-coder-64k`, data). W `docs/decyzje.md` nic nie dopisuj (brak nowych zależności).

- [ ] **Step 5: Commit i znacznik**

```bash
git add .
git commit -m "docs: close sprint 4"
git tag s04-done
```

Scal gałąź `sprint-4-walka-na-telefonie` do `main` po zielonym CI, tak jak w poprzednich sprintach. `git push` i pull request tylko za zgodą użytkownika.

---

## Stan wykonania (25 X 2026)

Plan napisany 25 X 2026, **czeka na twoją recenzję** i na wybór metody wykonania (subagent-driven albo Native). Nic z kodu Sprintu 4 nie jest jeszcze wykonane na laptopie. Gotowe: ten plan i pakiet plików w `docs/superpowers/plans/sprint-4-pliki/` ze sprawdzonym w chmurze przebiegiem (szkielety, rozwiązania wzorcowe, test różnicowy, E2E w Chromium). Sprint 4 startuje 14 XII 2026 (tablica sprintów), ale zadania można zacząć wcześniej, gdy S03 jest zamknięty (`s03-done`).

Do twojej decyzji: odstępstwa D38 (grafiki wektorowe zamiast atlasu), D39 (testy wizualne tylko w Chromium, wzorce z CI) i D41 (walka ok. 18 tur zostaje; ewentualne skrócenie po S04-09).
