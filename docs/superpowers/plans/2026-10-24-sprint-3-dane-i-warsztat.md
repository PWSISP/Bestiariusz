# Sprint 3 «Rdzeń II: dane 150 istot i Warsztat» — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pełne dane MVP (5 żywiołów, 6 form, 5 przymiotów, czyli 150 istot, każda z budżetem mocy 10 i z efektami), system efektów istot w walce, ocena istoty, kod istoty, legenda PL/EN, logika Warsztatu i polecenie `npm run balance`, które rozgrywa tysiące walk i zapisuje CSV z odsetkiem wygranych dla każdej z 150 istot.

**Architecture:** Efekt istoty jest **daną** (kiedy, co, ile, od czego zależy) przy żywiole, formie albo przymiocie w `src/data/symbols.json`; reducer walki ma cztery haki (przyzwanie, atak, koniec tury, uszkodzenie) i jedną funkcję rozstrzygającą efekty w stałej kolejności (żywioł, forma, przymiot; Kręgi 0→2). Czyste funkcje o jasnych sygnaturach (ocena istoty, kod, legenda, liczenie synergii) pisze Qwen z gotowych specyfikacji i testów, a testy różnicowe porównują jego kod z niezależnym rozwiązaniem wzorcowym; model, schemat, system efektów, Warsztat i harness balansu wprowadza Claude. Reguła „niewydany budżet mocy daje zdrowie” oraz ceny Warsztatu leżą w `src/data/balance.json`, więc ich siłę zmienia się bez zmiany kodu.

**Tech Stack:** bez nowych zależności: TypeScript `strict` (~6.0.3), Vitest 5, zod 4, ESLint 10, Prettier, i18next z ICU, Node ≥ 22.18 (CLI uruchamia `.ts` bezpośrednio).

**Spec:** `docs/plan-sprintow.md` — sekcja „S03 · 30 XI – 13 XII 2026 · Rdzeń II: dane 150 istot i Warsztat” (zadania S03-00 … S03-10); symbole: `docs/gdd-mvp.md`; zasady walki: `docs/zasady-walki.md` (wersja 0.2, zmiany czekają na twoje zatwierdzenie w S03-01b); efekty symboli: `docs/efekty-symboli.md` (propozycja Claude'a, też czeka na zatwierdzenie). Pliki gotowe do skopiowania: `docs/superpowers/plans/sprint-3-pliki/` (opis w „Gdzie i jak to wykonać”).

## Global Constraints

Wymagania całego projektu, skopiowane ze specyfikacji i ze Sprintu 2; każde zadanie je dziedziczy.

- TypeScript `strict` bez wyjątków; ESLint bez ostrzeżeń (`--max-warnings 0`).
- Zero `Math.random` w `src/`; zero `Date.now` (i `new Date()`) w logice gry (`src/core`, `src/data`) — tylko ziarno i wstrzyknięty zegar.
- Zero tekstów w kodzie interfejsu: wszystko przez i18n. Rdzeń zwraca identyfikatory, liczby i **klucze** i18n (legenda, błędy Warsztatu), nigdy tekstów dla gracza; testy sprawdzają, że klucze istnieją w `pl.json` i `en.json`.
- Importy między plikami źródłowymi z rozszerzeniem `.ts`; `import type` dla typów; bez `enum`, `namespace` i parametrów-pól w konstruktorach (`erasableSyntaxOnly`).
- `src/core` i `src/data` nie importują DOM, PixiJS, i18next, Capacitor, Node (`node:*`) ani warstw `ui`, `game`, `platform`, `app`. Node wolno w `tools/` i `tests/`.
- Wszystkie zmiany stanu walki przechodzą przez `reduce`; stan i dane wejściowe są niemutowalne (testy na głęboko zamrożonych obiektach).
- Każda z 150 istot MVP kosztuje **najwyżej 10 punktów mocy** (suma kosztów trzech symboli); sprawdza to zwykły test jednostkowy, nie tylko nocny.
- Efekty i ceny Warsztatu są danymi (`src/data/*.json`), nie stałymi w kodzie. Nowy efekt istniejącą operacją to zmiana w JSON, nowa operacja to jeden `case` i jeden test.
- Budżety wydajności: `npm run balance` dla 150 istot × 300 gier w mniej niż 60 s (pomiar w chmurze: 12,5 s); 1000 symulowanych walk w mniej niż 60 s (jak w Sprincie 2).
- Żadnych nowych zależności bez wpisu w `docs/decyzje.md` (w tym sprincie nie ma żadnej).
- Qwen edytuje tylko jeden wskazany plik; po pięciu nieudanych podejściach zadanie przejmuje Claude i zapisuje powód w `docs/retro/S03.md`.
- Wartości oczekiwane w istniejących testach zmienia się tylko za zgodą użytkownika; jedyny wyjątek w tym planie to jedna linia w `tests/S01-06.test.ts` (D28).
- Ziarno kanoniczne w testach: `20261102`; ziarno raportu balansu: `20261130`.
- Dokumenty po polsku; kod, identyfikatory, specyfikacje dla Qwena i komunikaty commitów po angielsku (Conventional Commits). Sesja wykonująca dopisuje do commitów własną atrybucję.
- Żadnych haseł, kluczy ani tokenów w repozytorium.

## Review Focus

Wejścia i sytuacje, których specyfikacja nie rozpisuje, a które najprawdopodobniej uderzą w osobę grającą lub balansującą. Każda pozycja ma test w zadaniu, które posiada kod.

1. **Uszkodzone efekty w danych** (nieznany moment, operacja lub zakres, `amount` 0 albo ułamkowy, `pierce` przy operacji innej niż `strike`, nieznane pole, `effects` nie będące listą) oraz bilans z `leftoverHealth` bez `powerBudget`: czytelny błąd ze ścieżką pola, nigdy ciche pominięcie efektu ani `NaN` w zdrowiu istoty. → S03-01a (`symbol-effects`, `mvp-data`) i S03-05 (`leftover-reducer`).
2. **Efekt, który kończy walkę w środku tury** (zabicie wroga przy przyzwaniu, przy ataku, w efekcie przebijającym): walka kończy się od razu, nie ma Obrzędu, nie ma fazy wroga, nie ma następnej tury, zdarzenie `combat_won` jest jedno. → S03-05 (test 8 i test przyzwania).
3. **Kod istoty z literówką, złą długością, małymi literami, myślnikami, mylącymi znakami (O/0, I/L/1), z innej wersji albo z indeksem bez symbolu:** `null` albo ta sama istota, nigdy inna istota i nigdy wyjątek. → S03-03.
4. **Niedozwolona istota w Warsztacie** (nieznany symbol, symbol jeszcze nieodblokowany, ponad budżet, za mało Atramentu; dokładnie tyle Atramentu, ile trzeba): zwrot z kluczem błędu w stałej kolejności sprawdzeń, bez wyjątku i bez zmiany danych wejściowych. → S03-07.
5. **Błędne argumenty `npm run balance`** (`--games 0`, `abc`, `--copies 0`, nieznana talia lub wróg, `__proto__`, brak wartości po opcji, brak katalogu danych): komunikat po polsku i kod wyjścia 1, nie ślad stosu. → S03-08.

## Gdzie i jak to wykonać

- **Na twoim laptopie z Windows**, w katalogu repozytorium `C:\Users\tchor\bestiariusz` (Node 24, Ollama z `qwen3-coder-64k`), tak jak w Sprincie 2. Sesja startuje poleceniem `claude` i dostaje: „Wykonaj plan docs/superpowers/plans/2026-10-24-sprint-3-dane-i-warsztat.md”. W chmurze nie ma rejestru npm, więc tam nie da się uruchomić Vitest, ESLinta, Prettiera ani i18next.
- **Przygotowanie (przed pierwszym zadaniem):**
  1. `git status` czysty, `git switch main`. Sprawdź `git tag`: musi zawierać `s01-done` i `s02-done`, a gałąź `sprint-2-walka` musi być scalona. Jeśli nie, zatrzymaj się i powiedz użytkownikowi, co brakuje; zamknięcie Sprintu 2 (S02-00) nie jest częścią tego planu.
  2. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`: zielone. To stan wyjściowy.
  3. `git switch -c sprint-3-dane-i-warsztat`.
  4. W repozytorium są już: ten plan, `docs/efekty-symboli.md`, `docs/zasady-walki.md` (wersja 0.2) i katalog `docs/superpowers/plans/sprint-3-pliki/` (**pakiet**). Zatwierdź je jednym commitem: `git add docs` i `git commit -m "docs: sprint 3 plan, symbol effects and combat rules v0.2"`.
- Pakiet odwzorowuje układ repozytorium, jak w Sprincie 2: plik `pakiet/tests/S03-02.test.ts` kopiujesz do `tests/S03-02.test.ts`, bez zmiany treści. Katalog `docs/` nie trafia do kopii Qwena, więc rozwiązania wzorcowe z pakietu (`tests/reference/`) są dla niego niewidoczne, dopóki ich nie skopiujesz (S03-06b). Szkielety modułów Qwena (`src/core/creatures.ts`, `creature-code.ts`, `legend.ts`, `combat/synergy.ts`) leżą w pakiecie pod swoimi docelowymi ścieżkami.
- **Co sprawdziłem w chmurze.** Cały sprint przeszedłem na świeżej kopii repozytorium po Sprincie 2, etap po etapie, w kolejności z tego planu: testy napisane przed kodem są czerwone, po skopiowaniu plików zielone (łącznie 155 przypadków nowych testów plus dotychczasowe); `tsc` 6.0.3 z ustawieniami repozytorium przechodzi na każdym etapie; moduły Qwena zastąpiłem w próbie rozwiązaniami wzorcowymi. Testy celowo psułem: 21 usterek w czterech modułach Qwena wyłapały testy jednostkowe i różnicowe, 21 usterek w efektach, reducerze, Warsztacie i harnessie balansu wyłapały testy jednostkowe. Te próby i przegląd etapów odkryły cztery luki, które załatałem dopisanymi testami (reguła budżetu w reducerze, Wiatr nie jest dowolnym żywiołem w synergiach, przebijanie bloku, zabicie wroga efektem przy przyzwaniu). Uruchamiałem je na cienkim zastępniku Vitest nad `node:test`, z prawdziwym zod 4. **Niesprawdzone:** Vitest 5, ESLint 10 (w tym reguły z `tests/tools/lint-rules.test.ts`), Prettier, i18next i ICU (test `tests/i18n/legend-i18next.test.ts` i jedna linia w `tests/S01-06.test.ts`), skrypt `tools/typecheck.mjs` i oba projekty `tsconfig`. Pierwszy bieg na laptopie może więc wymagać drobnych poprawek stylu (`npm run format`) lub kodu. Reguła jak w Sprincie 2: jeśli test nie przechodzi, poprawiasz kod; **wartość oczekiwaną w teście zmieniasz tylko za zgodą użytkownika**, bo to zmiana reguły gry.
- Polecenia w planie działają w PowerShell 5.1 i w Git Bash; nie używam `&&`. „Skopiuj z pakietu” oznacza: skopiuj wymienione pliki na tę samą ścieżkę w repozytorium (`cp`, `Copy-Item` lub narzędzia plikowe) i uruchom `npm run format`.
- `git push` tylko za wyraźną zgodą użytkownika. Plik `.github/workflows/ci.yml` zostaje bez zmian.

## Decyzje podjęte w planie (zmień, jeśli się nie zgadzasz)

Numeracja ciągnie się ze Sprintu 2 (D11–D21). Zasady gry mają osobną tabelę Z1–Z14 w `docs/zasady-walki.md`.

| # | Decyzja | Powód |
|---|---|---|
| D22 | **Niewydany budżet mocy daje zdrowie:** zdrowie istoty rośnie o `max(0, powerBudget − koszt) × leftoverHealth` (dane: 10 i 1), tylko dla istoty mieszczącej się w budżecie. Reguła pochodzi ze specyfikacji zadania 02 benchmarku („ocena istoty”), **nie z `docs/gdd-mvp.md`**, który podaje tylko sam budżet 10. | Bez niej istota za 6 punktów jest po prostu słabsza od tej za 10, a lista 150 istot ma sens tylko wtedy, gdy tania istota czymś rekompensuje brak mocy. Skutek uboczny: walki są dłuższe (patrz D26). Zmienisz to jedną liczbą w `balance.json`. |
| D23 | **Efekty są danymi:** cztery momenty (`summon`, `attack`, `damaged`, `turnEnd`), osiem operacji, cztery zakresy; wartość = `amount` × liczba policzonych istot; wartość 0 = nic się nie dzieje. Efekty mają tylko żywioły i formy, przymioty zmieniają liczby. Pełny opis i tabela efektów: `docs/efekty-symboli.md`. | Plan sprintów wymaga „efektów jako danych i małej funkcji” (S03-05). GDD nie opisuje efektów, więc tabela efektów MVP jest **moją propozycją** do zatwierdzenia w S03-01b. |
| D24 | Kolejność: **S03-06 (Qwen, liczenie synergii) przed S03-05 (system efektów)**, wbrew zależności z tablicy sprintów (S03-06 po S03-05). | `countScope` i `scaledAmount` to czyste funkcje, z których korzysta system efektów; reducer składa je bez zaślepek, a zadanie Qwena nie czeka na reducer. |
| D25 | **„Grom przeskakuje na drugi cel”** (opis S03-06 w tablicy sprintów) rozumiem tak: walka ma jednego wroga, więc Grom przy ataku zadaje dodatkowy cios przebijający (2) za każdą *inną* gromową istotę na planszy; Ogień tak samo, słabiej (1). | W repozytorium nie ma rozwinięcia tego opisu. Inne odczytania (np. kilku wrogów) wymagają zmiany zakresu walki, więc zostawiam to do decyzji w S03-01b. |
| D26 | **Zdrowie Leszego 380 (z 160).** Z efektami i bonusem z D22 bot wygrywa przy 160 zdrowia ok. 99% walk w ok. 9 turach. Przy 380: ok. 57% i ok. 18 tur. Tabela wrażliwości w S03-01b. Alternatywa: zostawić niższe zdrowie i podnieść obrażenia Leszego (krótsze walki, ale trzeba przejść kalibrację od nowa). | Zasady walki z kroku S02-11 celują w 30–70% wygranych bota. Decyzję podejmujesz w S03-01b; walka ok. 18 tur może być za długa na telefon i warto to ocenić w S03-10. |
| D27 | Harness balansu (`npm run balance`) bierze talię `szeptucha` plus **jedną kopię** badanej istoty (domyślnie 200 gier na istotę, raport w planie: 300; ziarno 20261130; wróg `leszy`). Wszystkie istoty grają na tych samych ziarnach. Poza przedziałem 35–65% = flaga `low` albo `high`. | Prosty wzorzec, który da się porównywać. Poziom absolutny zależy od talii (średnia w pierwszym raporcie 44,5%), więc raport mówi o różnicach **między** istotami. |
| D28 | Jedna linia w `tests/S01-06.test.ts` się zmienia: `t(key, { count: 1 })` → `t(key, { count: 1, adjective: 'A', form: 'F', element: 'E' })`. | Test przechodzi przez wszystkie klucze językowe, a zdanie legendy ma w ICU argumenty `{adjective}`, `{form}`, `{element}`; bez nich i18next nie złoży tekstu. Zmienia się sposób wywołania, nie wartość oczekiwana. |
| D29 | Ceny Warsztatu (robocze): `workshop.emberCost` 2 (koszt zagrania karty z Warsztatu), `workshop.inkPerPower` 4 (cena w Atramencie = suma kosztów symboli × 4, czyli od 24 do 40). | Plan sprintów wymaga „kosztu Atramentu”, GDD nie podaje liczb. Stały koszt Żaru jest uczciwy, bo wszystkie istoty mają ten sam budżet mocy. Strojenie w S03-10. |
| D30 | „Dodanie istoty do talii” (S03-07) kończy się na funkcji `craftCreature`, która zwraca kartę i resztę Atramentu. Talia i portfel Atramentu należą do stanu przebiegu gry, którego jeszcze nie ma (S06). | Nie wymyślam stanu przebiegu przed jego sprintem; funkcja jest czysta i gotowa do wywołania stamtąd. |
| D31 | Trzy legendy specjalne (Grom Wilk Gniew, Woda Wąż Smutek, Ziemia Niedźwiedź Odwaga) mają teksty napisane przeze mnie; są w `pl.json` i `en.json` pod kluczami `legend.special.*`. Reszta dostaje zdanie z szablonu z rodzajem gramatycznym formy. | Plan sprintów wymaga legend bez błędów zgody rodzaju; teksty specjalne są danymi, poprawiasz je bez kodu. |
| D32 | Pokrycie „nocnego testu budżetu 10” (S03-01): zwykły test `tests/data/mvp-data.test.ts`, bez osobnego zadania nocnego w CI. Nocny przebieg `npm run balance` nie jest dodany do `ci.yml`. | Test trwa ułamek sekundy, więc nie ma powodu czekać z nim do nocy; harness balansu trwa kilkanaście sekund i jego harmonogram w CI można dodać, gdy będzie wiadomo, kto czyta raport. |

## Struktura plików po Sprincie 3

| Plik lub katalog | Odpowiedzialność | Zadanie |
|---|---|---|
| `src/core/types.ts` | typy efektów (`EffectTrigger`, `EffectOp`, `EffectScope`, `CreatureEffectDef`), pole `effects` przy żywiołach, formach i przymiotach | S03-01a |
| `src/core/combat/model.ts` | `WorkshopBalance`, opcjonalne `powerBudget`, `leftoverHealth`, `workshop` w `Balance`, zdarzenie `effect` | S03-01a |
| `src/core/combat/creature.ts` | `StatRules`, `buildCreature` z bonusem za niewydany budżet | S03-01a |
| `src/data/symbol-schema.ts`, `src/data/combat-schema.ts` | schemat efektów i pól bilansu (zod) | S03-01a |
| `src/data/symbols.json`, `src/data/balance.json` | pełne dane MVP z efektami; budżet, bonus i ceny Warsztatu | S03-01a |
| `src/core/creatures.ts` | `evaluateCreature`, `listValidCreatures` (Qwen) | S03-02 |
| `src/core/creature-code.ts` | kod istoty: `encodeCreatureCode`, `decodeCreatureCode` (Qwen) | S03-03 |
| `src/core/legend.ts` | `legendKey`, `describeLegend` (Qwen) | S03-04 |
| `src/data/legends.ts`, `src/i18n/legend.ts` | lista legend specjalnych, `renderLegend` | S03-04b |
| `src/i18n/pl.json`, `src/i18n/en.json` | nazwy symboli, szablony legend, legendy specjalne, błędy Warsztatu (45 kluczy) | S03-04b |
| `src/core/combat/synergy.ts` | `countScope`, `scaledAmount` (Qwen) | S03-06 |
| `src/core/combat/effects.ts` | `effectsOf`, `damageEnemy`, `resolveCreatureEffects`, `hitCircles` | S03-05 |
| `src/core/combat/reducer.ts` | haki efektów i reguła budżetu | S03-05 |
| `src/data/enemies.json` | zdrowie Leszego (wartość ustalasz w S03-01b) | S03-01b |
| `src/core/workshop/workshop.ts` | `previewCreature`, `craftCreature` | S03-07 |
| `src/core/sim/balance.ts`, `tools/balance.ts` | harness balansu i polecenie `npm run balance` | S03-08 |
| `tasks/S03-02.md`, `S03-03.md`, `S03-04.md`, `S03-06.md` | specyfikacje dla Qwena (4 pliki) | S03-02 … S03-06 |
| `tests/S03-02.test.ts`, `S03-03`, `S03-04`, `S03-06` | testy modułów Qwena (4 pliki) | S03-02 … S03-06 |
| `tests/data/` (`symbol-effects`, `mvp-data`, `symbol-synergies`, `mvp-fight`) | dane MVP, efekty w schemacie, synergie żywiołów na prawdziwych danych, uczciwa walka z Leszym | S03-01a, S03-05, S03-01b |
| `tests/combat/` (`leftover`, `leftover-reducer`, `effect-fixtures`, `effects`) | bonus za budżet, zamrożone dane z efektami, kolejność efektów | S03-01a, S03-05 |
| `tests/i18n/` (`legend`, `legend-i18next`) | legendy w obu językach | S03-04b |
| `tests/reference/`, `tests/diff/qwen-vs-reference-s03.test.ts` | rozwiązania wzorcowe czterech modułów i test różnicowy | S03-06b |
| `tests/workshop/workshop.test.ts`, `tests/sim/balance.test.ts`, `tests/tools/balance-cli.test.ts` | Warsztat, harness i CLI balansu | S03-07, S03-08 |
| `docs/efekty-symboli.md`, `docs/zasady-walki.md` | efekty symboli, zasady walki v0.2 | S03-01b |
| `docs/balans-notatki.md`, `docs/retro/S03.md` | notatki z gry na papierze, retrospektywa | S03-10, S03-00 |

## Kolejność wykonania

Zadania Ty (S03-09, S03-10) idą równolegle z kodem. **S03-09 możesz zacząć od razu** (nie zależy od kodu). S03-10 wymaga raportu z S03-08.

1. S03-01a → 2. S03-02 → 3. S03-03 → 4. S03-04 → 5. S03-04b → 6. S03-06 → 7. S03-06b → 8. S03-05 → 9. S03-01b → 10. S03-07 → 11. S03-08 → S03-10 → S03-00 (zamknięcie sprintu).

Zadania Qwena (2, 3, 4, 6) są od siebie niezależne i możesz je uruchomić w dowolnej kolejności po S03-01a.

## Procedura zadania Qwena (S03-02, S03-03, S03-04, S03-06)

Zadania Qwena mają ten sam przebieg; sekcje zadań podają tylko to, co się różni.

1. Skopiuj z pakietu `tasks/<ID>.md`, `tests/<ID>.test.ts` i szkielet modułu (ścieżka w zadaniu). Szkielet ma prawdziwe typy i stałe, a funkcje rzucają `Not implemented`. `npm run format`.
2. `npx vitest run tests/<ID>.test.ts`. Expected: FAIL (`Not implemented`). Test musi nie przechodzić przed uruchomieniem Qwena.
3. `node tools/qwen-run.mjs --tasks <ID> --apply`. Expected: `<ID> … zaliczone`, plik docelowy zaktualizowany. Gdy niezaliczone, popraw specyfikację (dopisz przykład z liczbami z testu) i uruchom ponownie, do pięciu podejść; potem przejmij zadanie i zapisz powód w `docs/retro/S03.md`.
4. Zrecenzuj diff według listy „Na co patrzeć” w zadaniu.
5. `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`. Expected: zielone.
6. Commit: `git add tasks/<ID>.md tests/<ID>.test.ts <plik modułu>` i `git commit -m "feat(core): <moduł> implemented by qwen"`.

---

### Task S03-01a: Dane MVP i model efektów (Claude)

**Files:**
- Modify: `src/core/types.ts`, `src/core/combat/model.ts`, `src/core/combat/creature.ts`, `src/data/symbol-schema.ts`, `src/data/combat-schema.ts`, `src/data/symbols.json`, `src/data/balance.json`
- Test: `tests/data/symbol-effects.test.ts`, `tests/data/mvp-data.test.ts`, `tests/combat/leftover.test.ts`

**Interfaces:**
- Consumes: istniejące `SymbolData`, `Balance`, `Creature`, `buildCreature` z Sprintu 2.
- Produces:

```ts
// src/core/types.ts
export type EffectTrigger = 'summon' | 'attack' | 'damaged' | 'turnEnd';
export type EffectOp = 'strike' | 'guard' | 'mend' | 'draw' | 'kindle' | 'growAttack' | 'growHealth' | 'regen';
export type EffectScope = 'self' | 'sameElementOthers' | 'sameElementAll' | 'othersAny';
export interface CreatureEffectDef { trigger: EffectTrigger; op: EffectOp; amount: number; scope: EffectScope; pierce?: boolean }
// ElementDef, FormDef, TraitDef gain: effects?: readonly CreatureEffectDef[]
// src/core/combat/creature.ts
export interface StatRules { readonly powerBudget: number; readonly leftoverHealth: number }
export function buildCreature(symbols: SymbolData, cardId: string, spec: CreatureSpec, rules?: StatRules): Creature;
// src/core/combat/model.ts
export interface WorkshopBalance { readonly emberCost: number; readonly inkPerPower: number }
// Balance gains: powerBudget?: number; leftoverHealth?: number; workshop?: WorkshopBalance
// CombatEvent gains: { type: 'effect'; circle: number; trigger: EffectTrigger; op: EffectOp; amount: number }
```

Testy przypinają (24): efekty w schemacie są opcjonalne i zachowane jak zapisane, a osiem uszkodzonych wariantów (nieznany moment, operacja, zakres; `amount` 0 i 1,5; `pierce` przy `guard`; nieznane pole; `effects` nie lista) kończy się `SymbolDataError` ze ścieżką pola; dane MVP to 5 + 6 + 5 symboli w kolejności, na której opiera się kod istoty (S03-03), każdy żywioł i każda forma ma efekt, przymioty nie; `balance.json` ma budżet 10, bonus 1 i ceny Warsztatu; **każda z 150 kombinacji kosztuje najwyżej 10**; każda istota ma co najmniej 1 atak i 3 zdrowia; schemat odrzuca `leftoverHealth` albo `workshop` bez `powerBudget`, ujemny lub ułamkowy `leftoverHealth` i zerową cenę Atramentu, a stary bilans bez nowych pól nadal przyjmuje; `buildCreature` bez reguł liczy jak dawniej, z regułami dodaje zdrowie za niewydane punkty (czynnik 2 daje 12, bonus 0 dla istoty za 10 i dla budżetu 7).

Na co patrzeć w diffie: `symbols.json` różni się od wersji ze Sprintu 2 **wyłącznie** polami `effects` (koszty i statystyki bazowe wg `docs/gdd-mvp.md` bez zmian; dla pewności `git diff src/data/symbols.json` nie pokazuje zmienionego `cost`, `attackBonus`, `baseAttack` itd.); schemat jest `.strict()`, więc literówka w nazwie pola nie przechodzi po cichu; `buildCreature` bez czwartego argumentu zachowuje się dokładnie jak w Sprincie 2.

- [ ] **Step 1: Skopiuj testy i zobacz, że padają**

Z pakietu: `tests/data/symbol-effects.test.ts`, `tests/data/mvp-data.test.ts`, `tests/combat/leftover.test.ts`. `npm run format`.
Run: `npx vitest run tests/data/symbol-effects.test.ts tests/data/mvp-data.test.ts tests/combat/leftover.test.ts`
Expected: FAIL we wszystkich trzech plikach (w chmurze: 9 z 9, 5 z 11 i 1 z 4 przypadków czerwone).

- [ ] **Step 2: Skopiuj implementacje kontrolne**

Z pakietu: `src/core/types.ts`, `src/core/combat/model.ts`, `src/core/combat/creature.ts`, `src/data/symbol-schema.ts`, `src/data/combat-schema.ts`, `src/data/symbols.json`, `src/data/balance.json`. Są sprawdzone na tych samych testach; bierz je za punkt wyjścia, zrecenzuj i popraw, jeśli coś ci się nie podoba. `npm run format`.

- [ ] **Step 3: Uruchom komplet**

Run: `npm run typecheck`, potem `npm test`
Expected: zielone: 9 + 11 + 4 nowych przypadków i wszystkie dotychczasowe (nic ze Sprintu 2 nie zmienia wyniku, bo reducer jeszcze nie używa efektów ani bonusu).

- [ ] **Step 4: Commit**

```bash
git add src/core src/data tests/data tests/combat
git commit -m "feat(data): MVP symbol data with effects, power budget rules and workshop prices"
```

---

### Task S03-02: Ocena istoty i lista dostępnych istot (Qwen)

**Files:**
- Create: `tasks/S03-02.md`; Modify: `src/core/creatures.ts` (szkielet → rozwiązanie Qwena); Test: `tests/S03-02.test.ts`

**Interfaces:**
- Consumes: `SymbolData`, `CreatureSpec` z `src/core/types.ts`, `StatRules` z `src/core/combat/creature.ts` (typy).
- Produces: `evaluateCreature(symbols: SymbolData, spec: CreatureSpec, rules: StatRules): CreatureStats`, `CreatureStats { cost; valid; overBudgetBy; attack; health }`, `listValidCreatures(symbols: SymbolData, powerBudget: number): CreatureSpec[]`.

Testy przypinają (12): zdrowie z niewydanego budżetu; premie żywiołu i modyfikatory przymiotu; czynnik `leftoverHealth`; istota ponad budżet jest niepoprawna, ale ma atak i zdrowie, bez bonusu; istota za dokładnie 10 jest poprawna; atak nie spada poniżej 0 ani zdrowie poniżej 1; nieznany symbol rzuca `Error`; dane wejściowe niezmienione; lista 150 istot z danych MVP; lista pomija kombinacje ponad budżet z zachowaniem kolejności; pusta lista, gdy nic się nie mieści; zgodność z `evaluateCreature`.

Na co patrzeć w diffie: `valid` to `<=` (nie `<`); bonus tylko dla poprawnej istoty; `Math.max(0, …)` dla ataku i `Math.max(1, …)` dla zdrowia; kolejność pętli żywioł → forma → przymiot; nieznany symbol to `Error`, nie `RangeError`.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S03-02`, moduł `src/core/creatures.ts`.

---

### Task S03-03: Kod istoty, 7 znaków (Qwen)

**Files:**
- Create: `tasks/S03-03.md`; Modify: `src/core/creature-code.ts` (szkielet → rozwiązanie Qwena); Test: `tests/S03-03.test.ts`

**Interfaces:**
- Consumes: `SymbolData` (typ).
- Produces: `CODE_ALPHABET` (Crockford Base32, już w szkielecie), `CreatureCode { element; form; trait; variant }`, `encodeCreatureCode(symbols: SymbolData, creature: CreatureCode): string`, `decodeCreatureCode(symbols: SymbolData, code: string): CreatureCode | null`.

Testy przypinają (13): znane wektory (`ogien · wilk · gniew · 0` → `00000N5`, `grom · wilk · gniew · 0` → `4000EN5`, `woda · sowa · smutek · 137` → `1464P0V`, `wiatr · jelen · glod · 255` → `3AKZYRF`); 7 znaków z alfabetu dla każdej z 150 kombinacji; odrzucenie wariantu spoza 0–255, nieznanego symbolu i indeksu, który się nie mieści (9. żywioł); round-trip wszystkich kombinacji i **20 000 losowych istot**; normalizacja wielkich/małych liter, myślników, białych znaków i znaków mylących; zła długość i znaki spoza alfabetu; **każda pojedyncza literówka i każda zamiana sąsiednich znaków w trzech kodach daje `null`**; poprawny kod z indeksem bez symbolu i kod innej wersji dają `null`; argumenty niezmienione.

Na co patrzeć w diffie: **żadnych operatorów bitowych na `V`** (siedem cyfr base-32 przekracza 32 bity; `XOR` wolno tylko na `P`, który ma poniżej 21 bitów); suma kontrolna dokładnie `((P XOR floor(P / 128)) × 31 + 677) mod 16384`; `null`, nigdy wyjątek, dla każdego wejścia tekstowego; normalizacja `O→0`, `I`/`L→1` przed sprawdzeniem alfabetu.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S03-03`, moduł `src/core/creature-code.ts`.

---

### Task S03-04: Legenda z szablonów, rodzaj gramatyczny (Qwen)

**Files:**
- Create: `tasks/S03-04.md`; Modify: `src/core/legend.ts` (szkielet → rozwiązanie Qwena); Test: `tests/S03-04.test.ts`

**Interfaces:**
- Consumes: `SymbolData`, `CreatureSpec` (typy).
- Produces: `Legend { key: string; parts: { adjective: string; form: string; element: string } | null }`, `legendKey(spec: CreatureSpec): string` (`"element:form:trait"`), `describeLegend(symbols: SymbolData, spec: CreatureSpec, special: readonly string[]): Legend`.

Testy przypinają (8): `legendKey` łączy trzy identyfikatory dwukropkami; rodzaj męski i żeński dają `legend.born.m` i `legend.born.f` z przymiotnikiem w odpowiednim rodzaju; kombinacja z listy specjalnych daje `legend.special.<e>_<f>_<t>` i `parts: null`; podobna kombinacja nie jest specjalna; każda z 150 istot ma legendę; nieznany symbol rzuca `Error`, także dla specjalnej; dane niezmienione.

Na co patrzeć w diffie: rodzaj bierze się z `form.gender`, nie z końcówki nazwy; klucze zgodne z szablonami `symbol.trait.<id>.adjective_<m|f>`, `symbol.form.<id>.name`, `symbol.element.<id>.of`; sprawdzenie symboli **przed** sprawdzeniem listy specjalnych.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S03-04`, moduł `src/core/legend.ts`.

---

### Task S03-04b: Legenda w dwóch językach (Claude)

**Files:**
- Create: `src/data/legends.ts`, `src/i18n/legend.ts`, `tests/i18n/legend.test.ts`, `tests/i18n/legend-i18next.test.ts`
- Modify: `src/i18n/pl.json`, `src/i18n/en.json`, `tests/S01-06.test.ts` (jedna linia, D28)

**Interfaces:**
- Consumes: `describeLegend`, `Legend` (S03-04).
- Produces: `SPECIAL_LEGENDS: readonly string[]` (`grom:wilk:gniew`, `woda:waz:smutek`, `ziemia:niedzwiedz:odwaga`), `type Translate = (key: string, params?: Record<string, string>) => string`, `renderLegend(legend: Legend, translate: Translate): string`. Klucze w obu językach: `symbol.element.<id>.name|of`, `symbol.form.<id>.name`, `symbol.trait.<id>.name|adjective_m|adjective_f`, `legend.born.m|f` (ICU: `{adjective} {form} zrodzony/zrodzona z {element}.`), trzy `legend.special.*`, cztery `workshop.error.*` (używa ich S03-07).

Testy przypinają (6 + 3): zdanie polskie z rodzajem formy i angielskie; tekst ręczny dla legendy specjalnej; w żadnej z 150 legend, w żadnym języku, nie zostaje `{…}`; `pl.json` i `en.json` mają dokładnie te same klucze; każdy klucz potrzebny istocie istnieje w obu plikach; trzy testy z prawdziwym i18next (polski, angielski, wszystkie 150 w obu językach).

Na co patrzeć w diffie: **`tests/i18n/legend-i18next.test.ts` nie był uruchomiony w chmurze** (brak i18next); to pierwszy test, który sprawdza ICU na prawdziwej bibliotece. Jeśli jest czerwony, poprawiasz klucze językowe albo `renderLegend`, nie oczekiwanie w teście. W angielskich tekstach apostrof jest typograficzny (`Perun’s`), żeby ICU nie mylił go ze znakiem cytowania.

- [ ] **Step 1: Skopiuj testy i zobacz, że padają**

Z pakietu: `tests/i18n/legend.test.ts`, `tests/i18n/legend-i18next.test.ts`. `npm run format`.
Run: `npx vitest run tests/i18n`
Expected: FAIL (brak `src/data/legends.ts` i `src/i18n/legend.ts`).

- [ ] **Step 2: Skopiuj implementacje kontrolne i klucze językowe**

Z pakietu: `src/data/legends.ts`, `src/i18n/legend.ts`, `src/i18n/pl.json`, `src/i18n/en.json`, `tests/S01-06.test.ts`. Ten ostatni plik różni się od wersji w repozytorium **jedną linią** (D28); sprawdź `git diff tests/S01-06.test.ts`: ma pokazać tylko tę linię. Teksty trzech legend specjalnych są moje (D31): przeczytaj je i popraw, jeśli chcesz. `npm run format`.

- [ ] **Step 3: Uruchom komplet**

Run: `npm run lint`, `npm run typecheck`, `npm test`
Expected: zielone: 9 przypadków legend i wszystkie dotychczasowe (w tym `tests/S01-06.test.ts`, który sprawdza teraz 45 kluczy w obu językach).

- [ ] **Step 4: Commit**

```bash
git add src/data/legends.ts src/i18n tests/i18n tests/S01-06.test.ts
git commit -m "feat(i18n): symbol names, legend templates and workshop errors in pl and en"
```

---

### Task S03-06: Liczenie synergii (Qwen)

**Files:**
- Create: `tasks/S03-06.md`; Modify: `src/core/combat/synergy.ts` (szkielet → rozwiązanie Qwena); Test: `tests/S03-06.test.ts`

**Interfaces:**
- Consumes: `EffectScope`, `CreatureEffectDef` z `src/core/types.ts` (typy).
- Produces: `BoardCreature { readonly element: string }`, `countScope(scope: EffectScope, circles: readonly (BoardCreature | null)[], index: number): number`, `scaledAmount(effect: Pick<CreatureEffectDef, 'amount' | 'scope'>, circles: readonly (BoardCreature | null)[], index: number): number`.

Testy przypinają (13): `self` zawsze 1; `sameElementOthers`, `sameElementAll` i `othersAny` liczą inne istoty tego samego żywiołu, te same z samą istotą i wszystkie inne; **Wiatr nie jest dowolnym żywiołem** (liczy się tylko ten sam identyfikator, także gdy Wiatr stoi obok Ognia); `RangeError` dla pustego Kręgu, indeksu spoza 0–2 lub niecałkowitego i dla innej liczby Kręgów niż trzy; wejście niezmienione; `scaledAmount` mnoży, daje 0 przy braku policzonych istot i rzuca jak `countScope`.

Na co patrzeć w diffie: żadnej specjalnej obsługi `'wiatr'` (w Obrzędzie Wiatr jest dowolnym żywiołem, tutaj nie jest; to pułapka, w którą łatwo wpaść); `RangeError` także dla nieznanego zakresu; puste Kręgi (`null`) nigdy nie są liczone.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S03-06`, moduł `src/core/combat/synergy.ts`.

---

### Task S03-06b: Weryfikacja modułów Qwena testem różnicowym (Claude)

**Files:**
- Create: `tests/reference/{creatures,creature-code,legend,synergy}.ts`, `tests/diff/qwen-vs-reference-s03.test.ts`

**Interfaces:**
- Consumes: cztery moduły z `src/core/` (po zadaniach Qwena).
- Produces: nic dla kodu; brama jakości przed systemem efektów.

- [ ] **Step 1: Skopiuj rozwiązania wzorcowe i test różnicowy**

Z pakietu: `tests/reference/{creatures,creature-code,legend,synergy}.ts` (cztery niezależne implementacje, każda z komentarzem „oracle only”) i `tests/diff/qwen-vs-reference-s03.test.ts`. `npm run format`. Pliki w `tests/reference/` nie są testami i nikt z `src/` ich nie importuje.

- [ ] **Step 2: Uruchom test różnicowy**

Run: `npx vitest run tests/diff/qwen-vs-reference-s03.test.ts`
Expected: 5 testów zielonych: `evaluateCreature` i `listValidCreatures` na losowych zestawach symboli; ocena wszystkich 150 istot zgodna z `buildCreature` z walki; kodowanie i dekodowanie na losowych istotach i losowych (także uszkodzonych) kodach; `legendKey` i `describeLegend`; `countScope` i `scaledAmount` na losowych planszach.

- [ ] **Step 3: Sprawdź, że test różnicowy żyje**

Dla każdego z czterech modułów wprowadź jedną celową usterkę (np. w `creatures.ts` `<=` → `<` przy `valid`; w `creature-code.ts` stała `677` → `678`; w `legend.ts` rodzaj zawsze `m`; w `synergy.ts` `sameElementOthers` bez odjęcia siebie), uruchom `npx vitest run tests/S03-02.test.ts tests/S03-03.test.ts tests/S03-04.test.ts tests/S03-06.test.ts tests/diff/qwen-vs-reference-s03.test.ts`, potwierdź FAIL i cofnij usterkę (`git checkout -- <plik>`).
Expected: cztery usterki, cztery czerwone przebiegi, po cofnięciu zielono. (W chmurze oba rodzaje testów razem wyłapały 21 z 21 usterek; każdy z nich przepuścił po jednej, którą złapał drugi, dlatego są oba.)

- [ ] **Step 4: Rozbieżność = decyzja**

Jeśli test różnicowy zawiedzie: wypisz wejście z komunikatu, rozstrzygnij według specyfikacji `tasks/S03-xx.md`, kto ma rację (kod Qwena czy wzorzec), popraw ten plik ręcznie i **dopisz to wejście jako przypadek do testu modułu** (`tests/S03-xx.test.ts`; po zadaniu Qwena wolno).

- [ ] **Step 5: Commit**

```bash
git add tests/reference tests/diff
git commit -m "test(core): differential tests of S03 qwen modules against reference solutions"
```

---

### Task S03-05: System efektów istot w walce (Claude)

**Files:**
- Create: `src/core/combat/effects.ts`
- Modify: `src/core/combat/reducer.ts`
- Test: `tests/combat/effect-fixtures.ts`, `tests/combat/effects.test.ts`, `tests/combat/leftover-reducer.test.ts`, `tests/data/symbol-synergies.test.ts`

**Interfaces:**
- Consumes: `scaledAmount` (S03-06), `CreatureEffectDef`, `EffectTrigger` (S03-01a), `StatRules` (S03-01a), istniejące `applyDamage`, `drawCards`, `gainEmber`.
- Produces:

```ts
// src/core/combat/effects.ts
export function effectsOf(symbols: SymbolData, spec: CreatureSpec): CreatureEffectDef[];   // element, then form, then trait
export function damageEnemy(state: CombatState, hit: { amount: number; element: string | null; pierce?: boolean },
  source: 'spell' | 'creature' | 'ritual', circle: number | undefined, events: CombatEvent[]): CombatState;  // moved from reducer.ts
export function resolveCreatureEffects(state: CombatState, trigger: EffectTrigger, index: number,
  env: CombatEnv, events: CombatEvent[]): CombatState;
export function hitCircles(log: readonly string[]): number[];   // circles hit in an enemy-turn log, in order, hits that took health
```

Haki w `reduce` (kolejność ma znaczenie, całość w `docs/zasady-walki.md`, rozdział 5a):

| Moment | Gdzie w reducerze |
|---|---|
| `summon` | zaraz po położeniu istoty w Kręgu, **przed** sprawdzeniem Obrzędu; może zakończyć walkę |
| `attack` | zaraz po uderzeniu danej istoty, zanim zaatakuje następna (Kręgi 0→2) |
| `turnEnd` | po atakach wszystkich istot, przed fazą wroga (Kręgi 0→2) |
| `damaged` | po fazie wroga i sprawdzeniu, czy gracz przeżył; raz za każde trafienie z dziennika wroga; tylko dla istot, które przeżyły |

Reguła budżetu (D22) wchodzi do `createCombat`/`playCard` przez `statRules(balance)`: bonus tylko gdy `balance.leftoverHealth` jest niezerowe **i** `balance.powerBudget` jest zdefiniowane.

Testy przypinają (39): `effectsOf` w kolejności żywioł, forma, przymiot i puste dla symboli bez efektów lub nieznanych; `hitCircles` czyta tylko `trafienie krag<i> <n>` i pomija trafienia bez utraty zdrowia; **dziesięć scenariuszy kolejności** (przyzwanie przed Obrzędem; ataki w kolejności Kręgów po uderzeniu tej samej istoty; żywioł → forma → przymiot; koniec tury po atakach i przed wrogiem; istota, która przeżyła, reaguje po wrogu, zniszczona nie; raz za każde trafienie; mnożnik 0 nie uruchamia i nie zostawia zdarzenia; walka kończy się w środku efektów; wzrost zostaje na następne tury, regeneracja staje na maksimum; przyzwanie płaci Żarem i leczy do maksimum); przebijający cios omija blok; zabicie wroga efektem przy przyzwaniu kończy walkę przed Obrzędem; efekty są deterministyczne dla ziarna, nie zmieniają stanu wejściowego, a walka bez efektów wygląda dokładnie jak w Sprincie 2; reducer stosuje regułę budżetu z danych (9 zdrowia zamiast 6; czynnik 2 daje 12), bez reguły nic nie zmienia, a `leftoverHealth` bez `powerBudget` jest ignorowane, nie daje `NaN`; **na prawdziwych danych** (`tests/data/symbol-synergies.test.ts`, kryterium S03-06 „każda synergia ma test wg opisu”): jedenaście efektów w `symbols.json` równa się tabeli z `docs/efekty-symboli.md` (moment, operacja, wartość, zakres, przebicie) oraz pięć żywiołów działa tak, jak tabela opisuje: Ogień i Grom dodają cios przebijający (1 i 2) za każdą *inną* istotę swojego żywiołu, także przy bloku wroga, a sami albo wśród innych żywiołów (także Wiatru) nie robią nic; Woda leczy 1 do maksimum; Ziemia daje 3 bloku; Wiatr daje 1 Żaru.

Na co patrzeć w diffie: `damaged` liczy trafienia **z dziennika wroga**, więc istota trafiona dwa razy reaguje dwa razy; pętla `damaged` stoi po sprawdzeniu śmierci gracza; po każdym efekcie sprawdzenie `phase !== 'player'`; stan nigdy nie jest mutowany (testy na zamrożonych obiektach); zdarzenie `effect` niesie wartość po przeskalowaniu (zawsze ≥ 1).

- [ ] **Step 1: Skopiuj testy i zobacz, że padają**

Z pakietu: `tests/combat/effect-fixtures.ts`, `tests/combat/effects.test.ts`, `tests/combat/leftover-reducer.test.ts`, `tests/data/symbol-synergies.test.ts`. `npm run format`.
Run: `npx vitest run tests/combat/effects.test.ts tests/combat/leftover-reducer.test.ts tests/data/symbol-synergies.test.ts`
Expected: FAIL (brak `effects.ts`; test reguły budżetu w reducerze czerwony, bo reducer jeszcze jej nie stosuje).

- [ ] **Step 2: Skopiuj implementację kontrolną**

Z pakietu: `src/core/combat/effects.ts`, `src/core/combat/reducer.ts`. Reducer różni się od wersji ze Sprintu 2 czterema hakami, wyniesieniem `damageEnemy` do `effects.ts` i funkcją `statRules`; zrecenzuj diff (`git diff src/core/combat/reducer.ts`). `npm run format`.

- [ ] **Step 3: Uruchom komplet**

Run: `npm run typecheck`, `npm run lint`, `npm test`
Expected: zielone: 19 + 3 + 17 nowych przypadków i **wszystkie testy walki ze Sprintu 2 bez zmian** (używają zamrożonych danych bez efektów i bez bilansu budżetu, więc nowe reguły ich nie ruszają).

- [ ] **Step 4: Sprawdź, że testy żyją**

Wprowadź po jednej celowej usterce i uruchom `npx vitest run tests/combat`: (a) w `effects.ts` usuń `pierce: fx.pierce`; (b) w `reducer.ts` odwróć pętlę `turnEnd` na `i = 2 … 0`; (c) w `reducer.ts` usuń sprawdzenie `if (s.phase !== 'player') return` po haku `summon`; (d) w `statRules` usuń warunek `balance.powerBudget !== undefined`. Potwierdź FAIL i cofnij (`git checkout -- <plik>`).
Expected: cztery usterki, cztery czerwone przebiegi.

- [ ] **Step 5: Commit**

```bash
git add src/core/combat tests/combat
git commit -m "feat(core): creature effects as data with four hooks, and the unspent-budget health rule"
```

---

### Task S03-01b: Leszy po efektach i zatwierdzenie zasad (Ty + Claude)

**Files:**
- Modify: `src/data/enemies.json` (`maxHp` Leszego), `docs/zasady-walki.md` (linia „Zatwierdzone”), `docs/efekty-symboli.md` (status)
- Test: `tests/data/mvp-fight.test.ts`

**Interfaces:**
- Consumes: S03-05 (efekty i bonus w reducerze), `runGames`, `summarize` z `src/core/sim/simulate.ts`.
- Produces: dane walki, w których bot z talią `szeptucha` wygrywa z Leszym 45–65% walk (600 gier, ziarno 20261102); zatwierdzone zasady v0.2.

Test pilnuje, że z efektami i bonusem z D22 walka z Leszym jest nadal uczciwa. Zakres 45–65% jest węższy niż 30–70% z S02-11, bo od niego zależy balans całego sprintu; zmieniasz go tylko za zgodą użytkownika.

- [ ] **Step 1: Skopiuj test i zobacz, że pada**

Z pakietu: `tests/data/mvp-fight.test.ts`. `npm run format`.
Run: `npx vitest run tests/data/mvp-fight.test.ts`
Expected: FAIL (zdrowie Leszego 160 daje ok. 99% wygranych bota).

- [ ] **Step 2: Pokaż użytkownikowi, co zrobiły efekty, i zapytaj o zdrowie Leszego**

Run (po jednym razie): `npm run sim -- --games 1000 --enemy-hp 160`, `300`, `340`, `360`, `380`, `400`, `420`, `460`.
Expected (pomiar w chmurze, ziarno 20261102, 1000 gier; na laptopie powinno wyjść to samo):

| Zdrowie Leszego | Wygrane bota | Średnia liczba tur |
|---|---|---|
| 160 | 98,9% | 9,3 |
| 300 | 76,1% | 16,0 |
| 340 | 66,7% | 17,4 |
| 360 | 63,6% | 18,0 |
| 380 | 57,4% | 18,3 |
| 400 | 49,6% | 18,4 |
| 420 | 41,1% | 18,1 |
| 460 | 28,5% | 17,6 |

Zapytaj użytkownika (`AskUserQuestion`), którą wartość wpisać; domyślnie **380** (D26). Przedstaw też alternatywę: zostawić niższe zdrowie Leszego i podnieść jego obrażenia (krótsze walki, ale kalibracja od nowa), a także możliwość zmiany reguły D22 (`leftoverHealth` w `balance.json`). Walka o ok. 18 turach jest długa; jeśli użytkownik woli krótsze, wybierz wariant z mniejszymi obrażeniami karty `uderzenie`/`plomien` albo większymi obrażeniami Leszego, ale **tylko po zatwierdzeniu** i z ponownym przejściem tabeli z S02-11.

- [ ] **Step 3: Wpisz wartość i uruchom test**

Wpisz wybrane `maxHp` w `src/data/enemies.json`.
Run: `npx vitest run tests/data/mvp-fight.test.ts`, potem `npm test`.
Expected: zielone (dla 380 w chmurze: 57,4% w 1000 grach, test na 600 grach zielony).

- [ ] **Step 4: Zatwierdź zasady i efekty**

Użytkownik czyta `docs/zasady-walki.md` (rozdziały 5a, 5b, 9 i decyzje Z11–Z14) oraz `docs/efekty-symboli.md` (tabela efektów i interpretacja Gromu, D25). Zmiany reguł robi on; Claude zmienia dokument, test i kod w osobnym commicie. Gdy zatwierdzone: wpisz datę w linii „Zatwierdzone: ____” w zasadach walki, zmień w nagłówku „czekają na zatwierdzenie” na „zatwierdzone”, popraw tabelę z liczbami Leszego w rozdziale 7, a w `docs/efekty-symboli.md` zmień „Status” na „zatwierdzone <data>” i wersję na 1.0.

- [ ] **Step 5: Commit**

```bash
git add src/data/enemies.json tests/data/mvp-fight.test.ts docs/zasady-walki.md docs/efekty-symboli.md
git commit -m "feat(data): Leszy health after effects, combat rules v0.2 and symbol effects approved"
```

---

### Task S03-07: Warsztat, logika (Claude)

**Files:**
- Create: `src/core/workshop/workshop.ts`
- Test: `tests/workshop/workshop.test.ts`

**Interfaces:**
- Consumes: `evaluateCreature`, `CreatureStats` (S03-02), `CombatData`, `CardDef` (model walki), `balance.workshop` i `balance.powerBudget` (S03-01a), klucze `workshop.error.*` (S03-04b).
- Produces:

```ts
export interface Unlocked { readonly elements: readonly string[]; readonly forms: readonly string[]; readonly traits: readonly string[] }
export type WorkshopError = 'workshop.error.unknown_symbol' | 'workshop.error.locked_symbol'
  | 'workshop.error.over_budget' | 'workshop.error.not_enough_ink';
export interface WorkshopPreview { cardId: string; stats: CreatureStats; inkCost: number; emberCost: number;
  card: Extract<CardDef, { kind: 'creature' }> }
export function previewCreature(data: CombatData, unlocked: Unlocked, spec: CreatureSpec):
  { ok: true; preview: WorkshopPreview } | { ok: false; error: WorkshopError };
export function craftCreature(data: CombatData, unlocked: Unlocked, ink: number, spec: CreatureSpec):
  { ok: true; ink: number; card: Extract<CardDef, { kind: 'creature' }> } | { ok: false; error: WorkshopError };
```

Testy przypinają (12): podgląd pokazuje statystyki, cenę w Atramencie, koszt Żaru i kartę; najdroższa istota kosztuje budżet × cena za punkt; odmowa dla nieznanego symbolu (najpierw), nieodblokowanego (dla każdego z trzech rodzajów) i ponad budżet (po sprawdzeniu odblokowania); wyjątek, gdy w danych nie ma `workshop`; działanie bez bonusu za niewydany budżet; dane niezmienione; `craftCreature` zabiera Atrament i oddaje kartę, **dokładnie tyle Atramentu, ile trzeba, wystarcza, o jedną jednostkę mniej nie**; inne problemy zgłaszane przed brakiem Atramentu; karta z Warsztatu jest grywalna w walce i ma statystyki obiecane w podglądzie.

Na co patrzeć w diffie: kolejność sprawdzeń nieznany → nieodblokowany → ponad budżet → brak Atramentu (interfejs pokaże pierwszy błąd); `ink < inkCost`, nie `<=`; `cardId` to `<żywioł>-<forma>-<przymiot>`, taki sam jak id karty w danych; funkcje nie dotykają talii ani portfela (D30).

- [ ] **Step 1: Skopiuj test i zobacz, że pada**

Z pakietu: `tests/workshop/workshop.test.ts`. `npm run format`.
Run: `npx vitest run tests/workshop`
Expected: FAIL (brak modułu).

- [ ] **Step 2: Skopiuj implementację kontrolną**

Z pakietu: `src/core/workshop/workshop.ts`. Zrecenzuj. `npm run format`.

- [ ] **Step 3: Uruchom komplet**

Run: `npm run typecheck`, `npm run lint`, `npm test`
Expected: zielone, 12 nowych przypadków.

- [ ] **Step 4: Commit**

```bash
git add src/core/workshop tests/workshop
git commit -m "feat(core): workshop preview and crafting with i18n error keys"
```

---

### Task S03-08: Test balansu, `npm run balance` (Claude)

**Files:**
- Create: `src/core/sim/balance.ts`, `tools/balance.ts`
- Modify: `package.json` (skrypt `balance`), `README.md` (tabela poleceń), `CLAUDE.md` (lista poleceń)
- Test: `tests/sim/balance.test.ts`, `tests/tools/balance-cli.test.ts`

**Interfaces:**
- Consumes: `listValidCreatures`, `evaluateCreature` (S03-02), `runGames`, `summarize` (Sprint 2), `loadCombatData` (Sprint 2), `balance.workshop.emberCost` i `balance.powerBudget`.
- Produces:

```ts
export const WIN_RATE_MIN = 0.35; export const WIN_RATE_MAX = 0.65;
export interface BalanceOptions { baseDeck: string; enemyId: string; games: number; seed: number; copies: number }
export type BalanceFlag = 'ok' | 'low' | 'high';
export interface BalanceRow { element; form; trait; cost; attack; health; games; wins; winRate; avgTurns; flag: BalanceFlag }
export const CSV_HEADER = 'element,form,trait,cost,attack,health,games,wins,win_rate,avg_turns,flag';
export function flagOf(winRate: number): BalanceFlag;
export function runBalance(data: CombatData, options: BalanceOptions): BalanceRow[];
export function balanceToCsv(rows: readonly BalanceRow[]): string;
```

CLI: `npm run balance -- [--deck szeptucha] [--copies 1] [--games 200] [--seed 20261130] [--enemy leszy] [--out plik.csv] [--data katalog]`. Domyślny plik: `sim-results/balans-<wróg>-<ziarno>-<gry>.csv`.

Testy przypinają (10 + 12): granice 35% i 65% są jeszcze „ok”; jeden wiersz na każdą poprawną istotę w kolejności `listValidCreatures`; wiersz niesie koszt i statystyki istoty; liczniki gier i wygranych dają odsetek i flagę; wynik deterministyczny dla ziarna; użycie budżetu z danych; **istota naprawdę trafia do talii** (talia samych osłon plus ta istota: tylko ona może wygrać walkę); `Error` bez cen Warsztatu albo dla nieznanej talii lub wroga; CSV z nagłówkiem i jednym wierszem na istotę (sam nagłówek dla pustej listy); CLI ocenia wszystkie 150 istot, drukuje raport i zapisuje CSV; 11 błędnych wywołań kończy się komunikatem `Błąd: …` po polsku, kodem 1 i bez śladu stosu.

Na co patrzeć w diffie: wszystkie istoty grają na **tych samych ziarnach** (uczciwe porównanie); `copies` kopii istoty dokładanych do talii bazowej, bez usuwania z niej kart; nazwy talii i wroga sprawdzane przez `Object.hasOwn` (`__proto__`, `toString`); `--data` czyta pliki przez ten sam `loadCombatData` co `npm run sim`.

- [ ] **Step 1: Skopiuj testy i zobacz, że padają**

Z pakietu: `tests/sim/balance.test.ts`, `tests/tools/balance-cli.test.ts`. `npm run format`.
Run: `npx vitest run tests/sim/balance.test.ts tests/tools/balance-cli.test.ts`
Expected: FAIL (brak modułów).

- [ ] **Step 2: Skopiuj implementację kontrolną i dopisz skrypt**

Z pakietu: `src/core/sim/balance.ts`, `tools/balance.ts`. W `package.json` w `scripts` dopisz zaraz po `"sim"` linię `"balance": "node tools/balance.ts"`. W `README.md` dopisz wiersz do tabeli poleceń: `npm run balance` — „bot rozgrywa walki dla każdej z 150 istot i zapisuje CSV z odsetkiem wygranych do `sim-results/` (np. `npm run balance -- --games 300`)”; w `CLAUDE.md` dopisz analogiczny punkt w liście poleceń, z opcjami z powyżej. `npm run format`.

- [ ] **Step 3: Uruchom komplet i wygeneruj pierwszy raport**

Run: `npm run typecheck`, `npm run lint`, `npm test`, potem `npm run balance -- --games 300`
Expected: testy zielone, 22 nowe przypadki; raport drukuje średni odsetek wygranych (w chmurze 44,5% przy 300 grach na istotę), liczbę istot poza przedziałem 35–65% (13 z 150, wszystkie `low`: 7 z Wężem, 4 z Krukiem i 2 z Wilkiem; Wilk tylko z Gniewem) i kończy się w kilkanaście sekund (w chmurze 12,5 s). Jeśli `git status` pokazuje `sim-results/` jako niezatrasowany katalog, dopisz `sim-results` do `.gitignore`.

- [ ] **Step 4: Commit**

```bash
git add src/core/sim tools/balance.ts tests/sim tests/tools package.json README.md CLAUDE.md .gitignore
git commit -m "feat(sim): balance report for all 150 creatures, npm run balance"
```

Raport wejdzie do S03-10; plik CSV nie jest commitowany (pochodna danych i ziarna), użytkownik uruchamia go sam, kiedy chce.

---

### Task S03-09: Używany telefon z Androidem i punkt odniesienia klatek (Ty)

**Files:**
- Modify: `docs/plan-sprintow.md` (faktyczna cena w tabeli wydatków, wiersz S03), `docs/retro/S03.md` (wynik pomiaru)

- [ ] **Step 1: Kup telefon**

Cel z tablicy sprintów: używany Android z ok. 2021 r., klasa Galaxy A52 (średnia półka z ekranem ok. 6,5″, 6 GB RAM, Android 11 lub nowszy), do 500 zł. Sprawdź przed zakupem: bateria trzyma kilka godzin, ekran bez martwych stref, telefon bez blokady konta Google ani operatora, działa USB (do debugowania). Zapisz model, rocznik i cenę.

- [ ] **Step 2: Zainstaluj APK z CI**

Na GitHubie: Actions → ostatni przebieg `CI` zielony na `main` → artefakt `bestiariusz-debug-apk` (retencja 14 dni; jeśli wygasł, wywołaj CI ponownie). Pobierz `app-debug.apk`, przenieś na telefon, zezwól na instalację z tego źródła, zainstaluj i uruchom. Expected: aplikacja pokazuje ekran PixiJS jak w kryterium S01-08.

- [ ] **Step 3: Zmierz klatki**

Włącz opcje deweloperskie i debugowanie USB, podłącz telefon do laptopa. Najprostsza metoda bez zmian w kodzie: po minucie działania aplikacji `adb shell dumpsys gfxinfo app.bestiariusz.game` (z `platform-tools` Androida) zwraca `Total frames rendered` i `Janky frames`; zapisz oba wyniki, procent klatek z poślizgiem i czas uruchomienia (od dotknięcia ikony do pierwszego ekranu). Drugi sposób: `chrome://inspect` w Chrome na laptopie, widok WebView, Narzędzia deweloperskie → Rendering → Frame Rendering Stats. Aplikacja nie ma jeszcze własnego licznika klatek; jeśli żadna metoda się nie uda, zapisz „nie zmierzono” i powód, a licznik wejdzie do sprintu z pierwszym ekranem walki (S04).

- [ ] **Step 4: Zapisz wynik**

W `docs/retro/S03.md` (sekcja „Telefon”): model, cena, wersja Androida, wynik pomiaru, uwagi. W `docs/plan-sprintow.md`, w tabeli „Wydatki w sprintach” (wiersz S03), dopisz faktyczną cenę. Wynik jest punktem odniesienia na całą grę (budżety wydajności z planu sprintów).

---

### Task S03-10: Test na papierze (Ty + Claude)

**Files:**
- Create: `docs/balans-notatki.md`
- Modify: `src/data/*.json` (po twojej decyzji), `docs/efekty-symboli.md` (jeśli zmieniają się efekty)

- [ ] **Step 1: Wybierz 20 kombinacji**

Weź raport z S03-08 (`npm run balance -- --games 300`, plik w `sim-results/`) i `docs/efekty-symboli.md`. Wybierz 10 kombinacji, które wydają ci się **najciekawsze** (efekt, który chcesz zobaczyć w akcji, zgrany z innymi), i 10 **najnudniejszych** (efekt, którego nie czuć, albo statystyki bez charakteru). Raport pomoże wybrać, ale nie zastępuje twojego wrażenia: bot nie wie, co jest zabawne.

- [ ] **Step 2: Zagraj je na papierze**

Dla każdej kombinacji ułóż na kartce Krąg z tą istotą i dwiema innymi z talii `szeptucha`, rozegraj dwie tury według `docs/zasady-walki.md` rozdziały 2, 5a i 5b i zanotuj, co się stało.

- [ ] **Step 3: Zapisz notatki**

`docs/balans-notatki.md`: 20 pozycji (kombinacja, ciekawa/nudna, jedno zdanie dlaczego, propozycja: zostaw / wzmocnij / osłab / zmień efekt). Dopisz sekcję „Ogólne”: czy walka o ok. 18 turach jest za długa (D26), czy ceny Warsztatu (D29) mają sens, czy bonus za niewydany budżet (D22) robi to, co miał.

- [ ] **Step 4: Claude przerabia notatki**

Dla każdej propozycji Claude pokazuje zmianę w danych (`src/data/symbols.json`, `balance.json`) i wynik `npm run balance` przed i po; ty zatwierdzasz. Zmiana liczb ceny, kosztu lub statystyk nie wymaga zmiany testów walki (używają zamrożonych danych), ale `tests/data/mvp-data.test.ts` i `tests/data/mvp-fight.test.ts` muszą zostać zielone. Zmiana **efektu** z tabeli to zmiana reguły: razem z danymi zmienia się tabela w `docs/efekty-symboli.md` i test `tests/data/symbol-synergies.test.ts`, za zgodą użytkownika.

- [ ] **Step 5: Commit**

```bash
git add docs/balans-notatki.md src/data docs/efekty-symboli.md
git commit -m "docs: paper balance notes and data tuned after them"
```

---

### Task S03-00: Zamknięcie sprintu

**Files:**
- Create: `docs/retro/S03.md`
- Modify: `docs/plan-sprintow.md`, `docs/ai-provenance.md`

- [ ] **Step 1: Demo na koniec sprintu**

Sprawdź i zaznacz: (1) `npm run balance -- --games 300` kończy się w < 60 s, drukuje raport i zapisuje CSV z 150 wierszami; (2) `npm run lint`, `typecheck`, `npm test`, `npm run build` zielone, CI na `main` zielone; (3) Qwen wykonał cztery zadania (S03-02, S03-03, S03-04, S03-06), każde z raportem w `results/`; (4) test różnicowy zielony (S03-06b); (5) `docs/zasady-walki.md` i `docs/efekty-symboli.md` mają datę zatwierdzenia, `docs/balans-notatki.md` ma 20 pozycji; (6) APK zbudowany z gałęzi sprintu (pobrany z CI) uruchomiony na twoim telefonie z S03-09. Sprint 3 nie zmienia żadnego ekranu, więc na telefonie zobaczysz ten sam ekran co w S01; kryterium „build sprintu zagrany na telefonie” oznacza tu, że aplikacja nadal się uruchamia z nowymi danymi i plikami językowymi.

- [ ] **Step 2: Retrospektywa (pięć linii)**

`docs/retro/S03.md`: (1) co poszło dobrze; (2) co nie (z liczbą podejść Qwena na każde z czterech zadań i powodem porażek: specyfikacja czy model); (3) godziny: nie zapisujemy; (4) odkrycia z symulacji i z papieru (m.in. długość walk po D22 i D26, luki w testach znalezione przy próbie mutacji); (5) co zmienić w Sprincie 4. Sekcja „Telefon” z S03-09.

- [ ] **Step 3: Zsynchronizuj plan sprintów**

W `docs/plan-sprintow.md`: `☐` → `☑` przy zadaniach S03-00 … S03-10; w S03-01 dopisz, że nocny test budżetu to zwykły test jednostkowy `tests/data/mvp-data.test.ts` (D32), a efekty symboli opisuje `docs/efekty-symboli.md` (D23); w S03-05 „10 scenariuszy” → „scenariusze 1–10 w `tests/combat/effects.test.ts` i E1–E10 w `docs/zasady-walki.md`”; w S03-06 zamień „test wg opisu w GDD” na „test wg `docs/efekty-symboli.md`, `tests/data/symbol-synergies.test.ts`”, a zależność „S03-05” na „S03-01” i dopisz „(D24, D25)”; w S03-07 „dodanie istoty do talii” → „zwrot karty i reszty Atramentu; talia w stanie przebiegu, S06 (D30)”; w S03-08 dopisz polecenie `npm run balance` i domyślny przedział 35–65% (D27); dopisz wpis w dzienniku zmian planu z datą, listą powyższych zmian oraz D22–D32. Uzupełnij `docs/log-godzin.csv`: dopisz wiersze `S03,S03-00 … S03-10` (godziny planowane: 2; 3; 2,5; 2,5; 3; 5; 4; 3; 4; 3; 2) i uzupełnij `godziny_faktyczne`.

- [ ] **Step 4: Rejestr plików AI**

W `docs/ai-provenance.md`, w tabeli „Rejestr plików”, dopisz wiersze dla `docs/efekty-symboli.md`, `docs/balans-notatki.md`, `docs/retro/S03.md` i planu `docs/superpowers/plans/2026-10-24-sprint-3-dane-i-warsztat.md` (człowiek: zatwierdzenie zakresu, decyzje, uwagi z gry na papierze; AI: szkice, model i wersja z nagłówka sesji, data). Wiersz `docs/zasady-walki.md` uzupełnij o wersję 0.2. W `docs/decyzje.md` nic nie dopisuj (brak nowych zależności).

- [ ] **Step 5: Commit i znacznik**

```bash
git add .
git commit -m "docs: close sprint 3"
git tag s03-done
```

Scal gałąź `sprint-3-dane-i-warsztat` do `main` po zielonym CI, tak jak w Sprincie 2. `git push` i otwarcie pull requesta tylko za zgodą użytkownika.

---

## Stan wykonania (24 X 2026)

Plan napisany 24 X 2026, **czeka na twoją recenzję** i na wybór metody wykonania (subagent-driven albo Native). Nic z kodu nie jest jeszcze wykonane na laptopie. Gotowe: ten plan, `docs/efekty-symboli.md` (propozycja), `docs/zasady-walki.md` w wersji 0.2 (zmiany czekają na zatwierdzenie w S03-01b) i pakiet plików ze sprawdzonymi w chmurze testami i implementacjami kontrolnymi; wszystko leży w repozytorium na laptopie, jeszcze niezatwierdzone w gicie. Sprint 3 startuje 30 XI 2026 (tablica sprintów), ale zadania można zacząć wcześniej, gdy S02 jest zamknięty (`s02-done`).

Rzeczy, które wymagają twojej decyzji (szczegóły w D22–D26 i w S03-01b): czy reguła „niewydany budżet daje zdrowie” zostaje (D22); czy tabela efektów z `docs/efekty-symboli.md` ci odpowiada, w tym odczytanie „Grom przeskakuje na drugi cel” (D25); zdrowie Leszego 380 i długość walki ok. 18 tur (D26).
