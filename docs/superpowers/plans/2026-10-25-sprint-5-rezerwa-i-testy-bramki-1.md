# Sprint 5 «Rezerwa i przygotowanie testów bramki 1» — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prototyp z S04 (walka z Leszym) dostępny dla testera bez instalatora deweloperskiego (link w przeglądarce i APK), z lokalną telemetrią walk eksportowaną przez testera, plus zaległości z S01–S04 domknięte i gotowy plan testu bramki 1 z 10 umówionymi osobami.

**Architecture:** Kod to trzy małe elementy. (1) Czysty moduł `src/core/telemetry/log.ts` (Qwen) buduje i serializuje dziennik walk. (2) Warstwa gry i platformy zapisuje go w `localStorage` i oddaje testerowi przez schowek lub plik; działa tylko w „buildzie testera” (`VITE_TESTER=1`), więc zwykły build i zrzuty wizualne się nie zmieniają. (3) Ręcznie uruchamiany workflow GitHub Actions buduje wersję testera, APK i stronę instrukcji i publikuje całość w GitHub Pages. Reszta sprintu to zadania człowieka (zaległości, testerzy, ankieta).

**Tech Stack:** bez nowych zależności: TypeScript `strict` (~6.0.3), Vite 8, Vitest 5, PixiJS 8.22, Playwright, Capacitor 8, GitHub Actions (`upload-pages-artifact@v3`, `deploy-pages@v4`), Node ≥ 22.18.

**Spec:** `docs/plan-sprintow.md` — sekcja „S05 · 28 XII 2026 – 10 I 2027 · Rezerwa i przygotowanie testów bramki 1” (S05-00 … S05-05) i bramka B1 w sekcji S06; retro S04 pkt 5 (S05-06).

## Global Constraints

Dziedziczone ze Sprintów 1–4 (pełna lista: plan S04), w skrócie:

- TypeScript `strict`; ESLint `--max-warnings 0`; Prettier; importy z `.ts`; `import type`; bez `enum`, `namespace`, parametrów-pól.
- Zero `Math.random` w `src/`; zero `Date.now` i `new Date()` w `src/core`, `src/data`, `src/view` (zegar wstrzykiwany).
- Zero tekstów w kodzie interfejsu: wszystko przez i18n, klucze w `pl.json` i `en.json`, te same w obu.
- **Aplikacja nie wysyła nic przez sieć.** Telemetria zapisuje tylko lokalnie; do testera należy skopiowanie i wysłanie danych. Pilnują tego test `tests/tools/no-network.test.ts` i E2E.
- Telemetria istnieje wyłącznie w buildzie testera; zwykły build nie zbiera nic i nie pokazuje przycisku eksportu.
- Plik eksportu nie zawiera danych osobowych ani danych urządzenia: tylko pola z `CombatRecord` i nagłówek (`schema`, `logId`, `build`, `startedAt`).
- Nowa zależność tylko z wpisem w `docs/decyzje.md` (w tym sprincie nie ma żadnej).
- Qwen edytuje jeden wskazany plik; po pięciu nieudanych podejściach zadanie przejmuje Claude i zapisuje powód w `docs/retro/S05.md`.
- `git push` i pull request tylko za wyraźną zgodą użytkownika. `.github/workflows/ci.yml` zostaje bez zmian.
- Dokumenty po polsku; kod, identyfikatory, specyfikacje dla Qwena i komunikaty commitów po angielsku (Conventional Commits).

## Review Focus

Pięć sytuacji, które zepsułyby test z ludźmi, a których nie opisuje żadne zadanie z planu sprintów (każda ma test):

1. **Schowek niedostępny lub odmowa** (przeglądarka w trybie prywatnym, brak uprawnień): tester i tak musi dostać dane → pole tekstowe do ręcznego kopiowania. E2E: `when copying fails the text is shown for copying by hand`.
2. **Pamięć lokalna zablokowana lub pełna**: gra ma działać, telemetria po prostu się nie zapisuje. Test jednostkowy `survives a store that throws`.
3. **Zwykły build zbiera dane**: nie wolno. E2E `a normal build has no telemetry and no export button` (brak przycisku, brak klucza w `localStorage`).
4. **Przypadkowe żądania sieciowe**: E2E `playing and exporting makes no request outside the page itself` i test przeszukujący `src/` pod kątem `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`.
5. **Pobranie pliku w aplikacji Androida** wyprowadziłoby WebView z gry (nawigacja do adresu `blob:`): w powłoce Capacitor plik się nie pobiera, tylko schowek (`isNativeShell`); test jednostkowy `exportTelemetry` sprawdza kolejność: plik, potem schowek, a przy błędzie pliku nadal schowek.

---

## Gdzie i jak to wykonać

- **Laptop z Windows**, `C:\Users\tchor\bestiariusz` (Node 24, Ollama z `qwen3-coder-64k`), sesja Claude Code poleceniem `claude`: „Wykonaj plan docs/superpowers/plans/2026-10-25-sprint-5-rezerwa-i-testy-bramki-1.md”.
- **Przygotowanie:**
  1. `git status` czysty, `git switch main`. Gałąź `sprint-4-walka-na-telefonie` musi być scalona do `main` (workflow z S05-03 trzeba mieć na `main`, żeby dało się go uruchomić z interfejsu GitHub). Jeśli nie jest: zatrzymaj się i powiedz użytkownikowi, zamknięcie S04 nie jest częścią tego planu.
  2. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: zielone.
  3. `git switch -c sprint-5-testy-bramki-1`.
  4. Plan i katalog `docs/superpowers/plans/sprint-5-pliki/` (**pakiet**) są już w repozytorium: `git add docs`, `git commit -m "docs: sprint 5 plan and package"`.
- Pakiet odwzorowuje układ repozytorium: `pakiet/src/platform/telemetry-store.ts` → `src/platform/telemetry-store.ts`, bez zmiany treści, potem `npm run format`. Pliki, które **zastępują** istniejące (`src/game/game.ts`, `src/game/screens/result-screen.ts`, `src/app/launch-options.ts`, `src/main.ts`, `src/i18n/pl.json`, `src/i18n/en.json`, `src/ui/ui.css`, `index.html`, `package.json`, `playwright.config.ts`, `.prettierignore`, `tests/app/launch-options.test.ts`) zawierają pełną treść z wersji na laptopie z 25 X 2026 plus zmiany sprintu; **przed kopiowaniem zrób `git diff --no-index` albo porównaj**, bo jeśli od tego czasu zmieniłeś któryś plik, scal ręcznie.
- Moduł Qwena (`src/core/telemetry/log.ts`) leży w pakiecie jako **szkielet** (typy i stałe prawdziwe, funkcje rzucają `Not implemented`). Katalog `docs/` nie trafia do kopii Qwena, więc rozwiązanie wzorcowe (`tests/reference/telemetry-log.ts`) jest dla niego niewidoczne.
- **Co sprawdziłem w chmurze (25 X 2026).** Świeża kopia repozytorium po S04, etapami: szkielet i test modułu Qwena czerwone (57 z 58 przypadków), po skopiowaniu rozwiązania wzorcowego zielone (58/58); `tsc` 6.0.3 czysty dla obu projektów; próba mutacji (12 wstrzykniętych błędów) wszystkie wyłapane; testy jednostkowe telemetrii, opcji uruchomienia, zakazu sieci i składania strony zielone; reszta zestawu zielona w atrapie Vitesta; aplikacja zbudowana i **w prawdziwym Chromium** 14 testów E2E zielonych (wynik 4, ekrany 4, telemetria 6); złożona strona (`site/`) obsłużona lokalnie: instrukcja, gra i APK-atrapa odpowiadają 200, ekran wyniku z przyciskiem eksportu obejrzany na zrzucie 360×800.
- **Czego w chmurze nie sprawdziłem:** prawdziwy Vitest 5, ESLint 10, Prettier (pakiet może wymagać `npm run format`), WebKit, **workflow GitHub Actions** (nie da się uruchomić poza GitHubem; to jedyne miejsce, gdzie `deploy-pages` zadziała po raz pierwszy), prawdziwy APK z `assembleDebug`, schowek i instalacja na prawdziwym telefonie, zachowanie `blob:` w WebView Androida (dlatego tam pliku nie pobieramy).
- Polecenia działają w PowerShell 5.1 i w Git Bash; bez `&&`.

## Decyzje podjęte w planie (zmień, jeśli się nie zgadzasz)

- **D45. Hosting prototypu: GitHub Pages.** Repozytorium jest publiczne (retro S01 pkt 4), więc Pages działa bez płatnego planu i bez nowych kont. Adres stały: `https://pwsisp.github.io/Bestiariusz/` (strona testowa pod `/testy/`). Odrzucone: Cloudflare Pages albo Netlify (osobne konto, token w sekretach, więcej kroków). Skutek: APK też jest publicznie pod stałym adresem (`/apk/bestiariusz-prototyp.apk`); strona ma `noindex` i `robots.txt` z zakazem, ale nie jest tajna. Jeśli repozytorium zostanie kiedyś prywatne, trzeba przejść na Cloudflare Pages.
- **D46. Telemetria tylko w buildzie testera.** Flaga `VITE_TESTER=1` ustawiana przez workflow; w buildzie deweloperskim włącza ją `?tester=1`. Zwykły build, CI i zrzuty wizualne bez zmian. Dane zostają w `localStorage` urządzenia i wychodzą tylko przez przycisk „Zapisz dane testu” (schowek, w przeglądarce dodatkowo plik). Odrzucone: wysyłka na serwer (łamie zasadę „bez sieci” i wymaga zgody RODO przed bramką 1), zawsze włączona telemetria (zbierałaby dane w grze dla wszystkich). Zbiera: ziarno, wróg, wynik, tury, zdrowie, Obrzęd, czas walki; nic o osobie.
- **D47. APK jest debugowy, bez ścieżki aktualizacji.** Każda kompilacja w CI ma inny klucz debugowy, więc nową wersję trzeba instalować po odinstalowaniu starej; instrukcja o tym mówi. Stały klucz podpisu i kanał aktualizacji to S13. Odrzucone: klucz debugowy w repozytorium albo w sekretach (praca bez zysku przed 10 osobami).
- **D48. Rozgrzewka serwera E2E w `globalSetup`**, nie zmiana `ci.yml` ani długie limity (retro S04 pkt 5b): jedno wejście w grę w Chromium przed testami, błąd rozgrzewki nie przerywa przebiegu.
- **D49. `logId` zamiast identyfikatora testera.** Losowa liczba tworzona przy pierwszym uruchomieniu; nazwa pliku zawiera `build` i `logId`, ale nic o osobie. Jeden dziennik rośnie przez wszystkie sesje do 200 walk (starsze wypadają). Jeśli tester zaktualizuje wersję w trakcie, dziennik zostaje i ma `build` z pierwszej wersji (ograniczenie przyjęte świadomie: test trwa 30 minut).

## Struktura plików po Sprincie 5

```
.github/workflows/deploy-prototype.yml   nowy: ręczny deploy (web + APK + instrukcja)
docs/zaleglosci.md                        szkic gotowy w repozytorium (S05-01)
docs/test-b1.md                           szkic gotowy w repozytorium (S05-04)
docs/retro/S05.md                         nowy (S05-00)
index.html                                meta: noindex, theme-color, tryb pełnoekranowy
public/robots.txt, public/testy/index.html   instrukcja dla testerów (S05-03)
src/core/telemetry/log.ts                 nowy, Qwen (S05-05a)
src/platform/telemetry-store.ts           nowy: localStorage, schowek, plik (S05-05b)
src/game/telemetry.ts                     nowy: zegar + zapis (S05-05b)
src/game/game.ts, screens/result-screen.ts, src/app/launch-options.ts, src/main.ts, src/ui/ui.css, i18n/*.json   zmienione (S05-05b)
tools/assemble-site.ts                    nowy: składanie strony (S05-03)
tests/e2e/global-setup.ts, playwright.config.ts   rozgrzewka (S05-06)
tests/S05-05a.test.ts, tests/reference/telemetry-log.ts, tasks/S05-05a.md
tests/game/telemetry.test.ts, tests/e2e/telemetry.spec.ts, tests/tools/{no-network,assemble-site}.test.ts, tests/app/launch-options.test.ts
```

## Kolejność wykonania

Zadania Ty: **S05-01**, **S05-02**, **S05-04** (mogą iść równolegle z kodem), **S05-00** (zamknięcie). Kod: S05-06 → S05-05a → S05-05b → S05-03; weryfikacja S05-03 przez osobę z zewnątrz po opublikowaniu.

1. S05-06 → 2. S05-05a → 3. S05-05b → 4. S05-03 → (Ty: S05-01, S05-02, S05-04) → S05-00.

---

### Task S05-06: Rozgrzewka serwera E2E (Claude)

**Files:**
- Create: `tests/e2e/global-setup.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1:** Skopiuj z pakietu `tests/e2e/global-setup.ts` i `playwright.config.ts` (jedyna różnica to linia `globalSetup`). `npm run format`.
- [ ] **Step 2:** Zatrzymaj działający serwer Vite (`reuseExistingServer` w CI jest wyłączone, lokalnie włączone) i uruchom `npm run test:e2e`. Expected: wszystkie zielone, bez przekroczeń czasu przy pierwszym `goto`; rozgrzewka trwa kilka sekund.
- [ ] **Step 3:** Commit: `git add tests/e2e/global-setup.ts playwright.config.ts` i `git commit -m "test(e2e): warm up the dev server before the first test"`.

### Task S05-05a: Dziennik walk testera (Qwen)

**Files:**
- Create: `src/core/telemetry/log.ts` (szkielet z pakietu, Qwen go uzupełnia), `tasks/S05-05a.md`, `tests/S05-05a.test.ts`, `tests/reference/telemetry-log.ts`

**Interfaces:**
- Produces: `TELEMETRY_SCHEMA`, `MAX_RECORDS`, `CombatRecord`, `LogMeta`, `TelemetryLog`, `createLog`, `appendRecord`, `serializeLog`, `parseLog` (sygnatury w `tasks/S05-05a.md`).

Procedura (jak w S04): 1. skopiuj `src/core/telemetry/log.ts`, `tasks/S05-05a.md`, `tests/S05-05a.test.ts` (rozwiązanie wzorcowe zostaw w pakiecie do S05-05b, nie kopiuj do `src/`); `npm run format`. 2. `npx vitest run tests/S05-05a.test.ts` — Expected: FAIL (`Not implemented`). 3. `node tools/qwen-run.mjs --tasks S05-05a --apply` — Expected: zaliczone; po porażce dopisz do specyfikacji przykład z liczbami z testu, do pięciu podejść. 4. Zrecenzuj diff: (a) żadnych `Date`, `Math.random`, `JSON.parse` poza `parseLog`; (b) `appendRecord` nie zmienia wejścia; (c) `parseLog` nie rzuca; (d) kolejność kluczy w `serializeLog`. 5. `npm run format`, `lint`, `typecheck`, `npm test`. 6. Commit: `git add src/core/telemetry/log.ts tasks/S05-05a.md tests/S05-05a.test.ts` i `git commit -m "feat(core): telemetry log implemented by qwen"`.

### Task S05-05b: Zapis, eksport i podpięcie do gry (Claude)

**Files:**
- Create: `src/platform/telemetry-store.ts`, `src/game/telemetry.ts`, `tests/game/telemetry.test.ts`, `tests/e2e/telemetry.spec.ts`, `tests/tools/no-network.test.ts`
- Modify: `src/game/game.ts`, `src/game/screens/result-screen.ts`, `src/app/launch-options.ts`, `src/main.ts`, `src/ui/ui.css`, `src/i18n/pl.json`, `src/i18n/en.json`, `tests/app/launch-options.test.ts`

**Interfaces:**
- Consumes: `createLog`, `appendRecord`, `serializeLog`, `parseLog` (S05-05a); `CombatSummary` (`src/core/combat/summary.ts`); `newSeed` (`src/platform/seed.ts`).
- Produces: `createTelemetry(deps): Telemetry` z `combatStarted(seed)`, `combatFinished(summary)`, `count()`, `text()`, `filename()`; `createLocalStore()`, `exportTelemetry(text, filename, env?) → 'copied' | 'manual'`; opcja `tester` w `LaunchOptions`; `GameHandle.telemetry()`; `GameDeps.telemetry?`; `ResultScreenDeps.exporter?`.

- [ ] **Step 1: Skopiuj z pakietu** wszystkie pliki z listy wyżej (pliki do zastąpienia porównaj z wersją na laptopie, patrz „Gdzie i jak”). `npm run format`.
- [ ] **Step 2: Testy jednostkowe.** `npx vitest run tests/game/telemetry.test.ts tests/app/launch-options.test.ts tests/tools/no-network.test.ts tests/i18n/screen-keys.test.ts`. Expected: zielone (wymaga zaliczonego S05-05a).
- [ ] **Step 3: E2E.** `npx playwright test tests/e2e/telemetry.spec.ts tests/e2e/result.spec.ts tests/e2e/screens.spec.ts --project=chromium`. Expected: zielone; w zrzutach wizualnych nic się nie zmienia (`npx playwright test tests/e2e/visual.spec.ts` na Linuksie albo w CI).
- [ ] **Step 4: Pełny zestaw.** `npm run format`, `lint`, `typecheck`, `npm test`, `npm run build`. Expected: zielone. Sprawdź ręcznie na komputerze: `npm run dev`, adres `http://localhost:5173/?tester=1&enemyHp=1&seed=7`, wygraj walkę (dwa razy dotknij karty), na ekranie wyniku „Zapisz dane testu”: pojawia się komunikat, plik `bestiariusz-sesja-dev-<liczba>.json` zapisuje się w pobranych, a w schowku jest ten sam tekst.
- [ ] **Step 5: Commit:** `git add src tests index.html package.json` (bez `.github`) i `git commit -m "feat(game): local telemetry and export for the tester build"`.

**Na co patrzeć w recenzji:** `src/main.ts` włącza telemetrię tylko przy `options.tester`; `game.ts` woła telemetrię przez `?.` (bez niej gra działa jak w S04); ekran wyniku bez `exporter` ma dokładnie ten sam układ co w S04 (zrzuty wizualne); w `telemetry-store.ts` żadne `fetch`.

### Task S05-03: Strona prototypu: web, APK, instrukcja (Claude, z twoimi krokami)

**Files:**
- Create: `.github/workflows/deploy-prototype.yml`, `tools/assemble-site.ts`, `tests/tools/assemble-site.test.ts`, `public/robots.txt`, `public/testy/index.html`
- Modify: `index.html`, `package.json` (skrypt `site`), `.prettierignore` (wpis `public/testy`)

**Interfaces:**
- Produces: `assembleSite({ dist, apk, out, build, date })`, stała `APK_NAME = 'bestiariusz-prototyp.apk'`; strona: `/` gra, `/testy/` instrukcja, `/apk/bestiariusz-prototyp.apk`, `/wersja.txt`.

- [ ] **Step 1: Skopiuj z pakietu** pliki z listy; `index.html`, `package.json` i `.prettierignore` porównaj z wersją na laptopie. `npm run format`.
- [ ] **Step 2: Test składania strony.** `npx vitest run tests/tools/assemble-site.test.ts`. Expected: zielone.
- [ ] **Step 3: Lokalna próba.** `npm run build`, potem `node tools/assemble-site.ts --dist dist --apk <dowolny plik zip, np. android\app\build\outputs\apk\debug\app-debug.apk> --out site --build local --date 2026-12-28`. Expected: `Site ready: APK … bytes`; w `site/` są `index.html`, `testy/index.html`, `apk/bestiariusz-prototyp.apk`, `wersja.txt`. Dodaj `site` do `.gitignore`.
- [ ] **Step 4: Commit:** `git add .github public tools tests index.html package.json .prettierignore .gitignore` i `git commit -m "feat(dist): prototype site with web build, apk and tester instructions"`.
- [ ] **Step 5 (Ty, jednorazowo, po scaleniu gałęzi do `main` za twoją zgodą):** w ustawieniach repozytorium **Settings → Pages → Build and deployment → Source: GitHub Actions**. Potem **Actions → Prototype site → Run workflow** na gałęzi `main`. Expected: oba zadania (`build`, `deploy`) zielone, a pod adresem z kroku `deploy` (`https://pwsisp.github.io/Bestiariusz/`) działa gra, pod `/testy/` instrukcja. Pierwszy przebieg może wymagać drobnych poprawek workflow (to jedyna część, której nie dało się uruchomić w chmurze); wklej mi log błędu.
- [ ] **Step 6 (Ty, S05-03 kryterium):** daj link `…/testy/` osobie spoza projektu: raz na iPhonie (przeglądarka), raz na Androidzie (APK). Odhacz dopiero, gdy obie dotarły do ekranu walki i zakończyły ją przyciskiem „Zapisz dane testu”.

### Task S05-01, S05-02, S05-04: zadania człowieka (Ty)

- **S05-01:** `docs/zaleglosci.md` (szkic jest już w `docs/zaleglosci.md`): wypełnij kolumnę „Decyzja” dla 12 pozycji, przenieś pozycje „przenieść” do planu sprintów. 6 h w planie, realnie ok. 1 h, bo większość pozycji ma propozycję.
- **S05-02:** 10 testerów, w tym co najmniej 3 bez doświadczenia z deckbuilderami; z terminami. Listę z nazwiskami trzymaj poza repozytorium (jest publiczne).
- **S05-04:** `docs/test-b1.md` (szkic scenariusza i ankiety jest już w `docs/test-b1.md`): przejrzyj, popraw pytania, załóż formularz (bez pól osobowych) i wklej jego link do dokumentu.

---

### Task S05-00: Zamknięcie sprintu

**Files:**
- Create: `docs/retro/S05.md`
- Modify: `docs/plan-sprintow.md`, `docs/ai-provenance.md`

- [ ] **Step 1: Demo na koniec sprintu.** Osoba spoza projektu uruchamia prototyp z linku (web) i z APK. Sprawdź: (1) `lint`, `typecheck`, `npm test`, `build` zielone, CI na `main` zielone; (2) Qwen wykonał S05-05a (raport w `results/`); (3) workflow „Prototype site” zielony, strona działa; (4) `docs/zaleglosci.md` bez wolnych pozycji; (5) `docs/test-b1.md` ma link do ankiety i datę akceptacji; (6) lista 10 testerów z terminami (liczba w retro, nazwiska poza repozytorium); (7) build sprintu zagrany przez ciebie na telefonie, z eksportem danych.
- [ ] **Step 2: Retrospektywa (pięć linii)** w `docs/retro/S05.md`: (1) co poszło dobrze; (2) co nie, z liczbą podejść Qwena w S05-05a i powodem porażek; (3) godziny: nie zapisujemy; (4) odkrycia (co zgłosiła osoba spoza projektu przy instalacji i grze; ile trwała instalacja APK); (5) co zmienić w Sprincie 6 (np. instrukcja, scenariusz testu).
- [ ] **Step 3: Zsynchronizuj plan sprintów:** `☐` → `☑` przy zadaniach S05; odstępstwa: S05-05 rozbite na 05a (Qwen) i 05b (Claude), eksport przez schowek i plik zamiast samego pliku (WebView), telemetria tylko w buildzie testera (D46); S05-06 dodane (rozgrzewka E2E); S05-03 „APK do pobrania” = stały adres w GitHub Pages (D45). Wiersz w dzienniku zmian.
- [ ] **Step 4: Rejestr plików AI:** wiersze dla `retro/S05.md`, `zaleglosci.md`, `test-b1.md`, `public/testy/index.html`, planu S05 (człowiek: decyzje, akceptacja; AI: szkice, model z nagłówka sesji, data) i dla `src/core/telemetry/log.ts` (Qwen, `qwen3-coder-64k`).
- [ ] **Step 5: Commit i znacznik:** `git add .`, `git commit -m "docs: close sprint 5"`, `git tag s05-done`. Scal gałąź po zielonym CI; push tylko za zgodą.

---

## Stan wykonania (25 X 2026)

Plan napisany 25 X 2026, **czeka na twoją recenzję** i wybór metody wykonania. Kod i pakiet sprawdzone w chmurze (patrz „Co sprawdziłem”). Warunek startu: S04 scalony do `main` (`s04-done`). Sprint 5 według tablicy startuje 28 XII 2026, ale zadania można zacząć wcześniej.

Do twojej decyzji: D45 (GitHub Pages, publiczny adres APK), D46 (telemetria tylko w buildzie testera, wyjście przez schowek), D47 (APK debugowy bez aktualizacji), pozycje „przenieść” w `docs/zaleglosci.md`.
