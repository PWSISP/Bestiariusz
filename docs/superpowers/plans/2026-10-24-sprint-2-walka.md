# Sprint 2 «Rdzeń I: walka bez grafiki» — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cała walka z Leszym jako czysty kod w `src/core/combat` (reducer, obrażenia, talia, Żar, zamiar i tura wroga, Kręgi, Obrzęd), bot-gracz i polecenie `npm run sim`, które w terminalu rozgrywa tysiące walk i zapisuje CSV; zasady sprawdzone na papierze, wartości bazowe zatwierdzone.

**Architecture:** Walka to funkcja: `reduce(state, action, env)` zwraca nowy stan i listę zdarzeń, niczego nie mutuje, a jedynym źródłem losowości jest `Rng` w `env` (tasowanie talii). Moduły o czystych sygnaturach (obrażenia, talia, Żar, zamiar, tura wroga, wykrywanie Obrzędu) pisze Qwen z gotowych specyfikacji i testów; reducer, model, schemat danych, bota i CLI wprowadza Claude. Dane walki leżą w `src/data/*.json` i przechodzą walidację zod. Po zadaniach Qwena testy różnicowe porównują jego kod z niezależnym rozwiązaniem wzorcowym na tysiącach losowych wejść.

**Tech Stack:** bez nowych zależności: TypeScript `strict` (~6.0.3), Vitest 5, zod 4, ESLint 10, Prettier, Node ≥ 22.18 (CLI uruchamia `.ts` bezpośrednio).

**Spec:** `docs/plan-sprintow.md` — sekcja „S02 · 16–29 XI 2026 · Rdzeń I: walka bez grafiki” (zadania S02-00 … S02-11), rozdziały 2–3 oraz dodatki A–B; zasady gry: `docs/zasady-walki.md` (wersja 0.1, wymaga twojego zatwierdzenia); symbole: `docs/gdd-mvp.md`. Pliki gotowe do skopiowania: `docs/superpowers/plans/sprint-2-pliki/` (opis w „Gdzie i jak to wykonać”).

## Global Constraints

Wymagania całego projektu, skopiowane ze specyfikacji; każde zadanie je dziedziczy.

- TypeScript `strict` bez wyjątków; ESLint bez ostrzeżeń (`--max-warnings 0`).
- Zero `Math.random` w `src/`; zero `Date.now` (i `new Date()`) w logice gry (`src/core`, `src/data`) — tylko ziarno i wstrzyknięty zegar.
- Zero tekstów w kodzie interfejsu: wszystko przez i18n. Rdzeń walki zwraca identyfikatory i liczby (`actionId`, `cardId`, kody odmowy), nigdy tekstów dla gracza.
- Importy między plikami źródłowymi z rozszerzeniem `.ts`; `import type` dla typów; bez `enum`, `namespace` i parametrów-pól w konstruktorach (`erasableSyntaxOnly`).
- `src/core` i `src/data` nie importują DOM, PixiJS, i18next, Capacitor, Node (`node:*`) ani warstw `ui`, `game`, `platform`, `app`. Node wolno w `tools/` i `tests/`.
- Wszystkie zmiany stanu walki przechodzą przez `reduce`; stan i dane wejściowe są niemutowalne (testy na głęboko zamrożonych obiektach).
- Gra działa offline; budżety wydajności: 1000 symulowanych walk w mniej niż 60 s (cel: poniżej 2 s).
- Żadnych nowych zależności bez wpisu w `docs/decyzje.md`.
- Qwen edytuje tylko jeden wskazany plik; po pięciu nieudanych podejściach zadanie przejmuje Claude i zapisuje powód w `docs/retro/S02.md`.
- Ziarno kanoniczne w testach: `20261102`.
- Dokumenty po polsku; kod, identyfikatory, specyfikacje dla Qwena i komunikaty commitów po angielsku (Conventional Commits). Sesja wykonująca dopisuje do commitów własną atrybucję.
- Żadnych haseł, kluczy ani tokenów w repozytorium.

## Review Focus

Wejścia i sytuacje, których specyfikacja nie rozpisuje, a które najprawdopodobniej uderzą w osobę grającą lub balansującą. Każda pozycja ma test w zadaniu, które posiada kod.

1. **Uszkodzone pliki danych walki** (karta z nieznanym symbolem, talia z nieistniejącą kartą albo z klątwą, wróg bez działań, klątwa Leszego bez karty `klatwa`, dubel `id`, ułamkowy koszt): czytelny błąd z nazwą pola, nigdy ciche `undefined` w środku walki. → S02-01b.
2. **Niedozwolona akcja** (indeks karty spoza ręki, ujemny albo ułamkowy, Krąg 3 lub −1, istota bez wskazanego Kręgu, zagranie klątwy, akcja po końcu walki): zwrot z kodem odmowy, ten sam obiekt stanu, żaden wyjątek. → S02-07b.
3. **Ręka zapchana klątwami, pusta talia i kosz**: dobieranie nie zawiesza się i nie gubi kart, a gracz zawsze może zakończyć turę. → S02-03 i test losowych walk w S02-07b (żadna karta nie ginie, ręka ≤ 5).
4. **Śmierć wroga w środku tury** (zaklęcie, atak istoty, Obrzęd): walka kończy się od razu, reszta tury się nie odbywa, nie ma następnej tury. → S02-07b (K5, R3, zaklęcie).
5. **Błędne argumenty `npm run sim`** (`--games 0`, `abc`, nieznana talia lub wróg, brak wartości po opcji): komunikat po polsku i kod wyjścia 1, nie ślad stosu. → S02-09.

## Gdzie i jak to wykonać

- **Na twoim laptopie z Windows**, w katalogu repozytorium `C:\Users\tchor\bestiariusz` (Node 24, Ollama z `qwen3-coder-64k`). Sesja startuje poleceniem `claude` i dostaje: „Wykonaj plan docs/superpowers/plans/2026-10-24-sprint-2-walka.md”. W chmurze nie ma rejestru npm, więc tam nie da się uruchomić Vitest, ESLinta ani Prettiera.
- Do repozytorium trafiają: ten plan, `docs/zasady-walki.md` i katalog `docs/superpowers/plans/sprint-2-pliki/` (nazywam go dalej **pakietem**). Pakiet odwzorowuje układ repozytorium: plik `pakiet/tests/S02-02.test.ts` kopiujesz do `tests/S02-02.test.ts`, bez zmiany treści. Katalog `docs/` nie trafia do kopii Qwena, więc rozwiązania wzorcowe z pakietu są dla niego niewidoczne, dopóki ich nie skopiujesz do `tests/reference/` (S02-07a).
- Pakiet sprawdziłem w chmurze zastępczym środowiskiem: testy uruchomione na `node:test` z cienkim zastępnikiem Vitest, `tsc` 6.0.3 z ustawieniami repozytorium i `zod/v4` z pakietu zod 3.25. Wynik: 185 przypadków testowych zielonych na implementacjach kontrolnych, ok. 40 celowych usterek wstrzykniętych w kod (mutacje) wyłapanych przez testy. **Niesprawdzone:** Vitest 5, ESLint 10, Prettier i zod 4.6. Pierwszy bieg na laptopie może więc wymagać drobnych poprawek stylu (`npm run format`) lub kodu. Reguła: jeśli test nie przechodzi, poprawiasz kod; **wartość oczekiwaną w teście zmieniasz tylko za zgodą użytkownika**, bo to zmiana reguły gry.
- Polecenia w planie działają w PowerShell 5.1 i w Git Bash; nie używam `&&`. „Skopiuj z pakietu” oznacza: skopiuj wymienione pliki na tę samą ścieżkę w repozytorium (`cp`, `Copy-Item` lub narzędzia plikowe) i uruchom `npm run format`.

## Decyzje podjęte w planie (zmień, jeśli się nie zgadzasz)

Numeracja ciągnie się z Sprintu 1 (D1–D10). Zasady gry mają osobną tabelę Z1–Z10 w `docs/zasady-walki.md`.

| # | Decyzja | Powód |
|---|---|---|
| D11 | Identyfikatory żywiołów, form i przymiotów to zwykłe `string` (aliasy `ElementId`, `FormId`, `TraitId`), nie unie literałów. | Lista symboli jest danymi (S03-01 dodaje kolejne), a nie kodem; poprawność pilnuje schemat. |
| D12 | Limit ręki i liczba kart dobieranych na turę to **5**. Dobranie ponad limit pali kartę. | Wartość z dokumentu projektowego; wcześniejsza wartość z benchmarku (10) była tylko danymi testowymi. |
| D13 | Akcje wroga `atak` i `wielokrotny` mają opcjonalną flagę `direct` (uderza w gracza, omija Kręgi). Cios Leszego jest `direct`. | Odkrycie z symulacji: bez niej każdy atak wroga trafiał w istoty, bot wygrywał 100% walk i kończył z ok. 39 z 40 zdrowia. Z flagą ok. 55% przy 160 zdrowia Leszego. Dotyczy S02-06 i dodatku w planie sprintów. |
| D14 | Obrzęd zdarza się **raz na walkę** (nie raz na żywioł); `detectRitual` zachowuje semantykę „lista użytych żywiołów”, a reducer po pierwszym Obrzędzie przekazuje wszystkie żywioły jako użyte. | Zgodne z GDD; moduł Qwena zostaje prosty i testowalny osobno. |
| D15 | Dane walki leżą w `src/data/{symbols,cards,enemies,balance,decks}.json` (w tablicy sprintów: `data/balance.json`). `loadCombatData(read)` dostaje funkcję czytającą pliki: CLI i testy podają `fs`, aplikacja w Sprincie 4 poda import z Vite. Dzięki temu `src/data` nie używa API Node. | Importy JSON z atrybutem `with { type: 'json' }` nie są zweryfikowane w Vite 8, a kopia Qwena nie zawiera `tools/` (testy w `tests/` nie mogą ich importować). |
| D16 | `src/data/symbols.json` jest **przejściowy**: 5 żywiołów, 6 form, 5 przymiotów z kosztami wariantu A (Grom 3, Niedźwiedź 4). S03-01 zastępuje go pełnymi danymi MVP. | Sprint 2 potrzebuje symboli tylko do obliczenia statystyk pięciu kart startowych. |
| D17 | Kolejność wykonania: moduły Qwena (S02-02 … S02-06, S02-08) przed reducerem S02-07. Tablica sprintu każe S02-08 po S02-07, ale `detectRitual` jest czystą funkcją; reducer składa całość. | Reducer można wtedy sprawdzić od razu z gotowymi modułami, bez zaślepek. |
| D18 | Rozwiązania wzorcowe dla modułów Qwena (`pakiet/tests/reference/`) trafiają do repozytorium **dopiero po** zaliczeniu zadań Qwena. | Kopia Qwena obejmuje `src`, `tests` i `tasks` i potrafi je czytać; nie może widzieć rozwiązania. |
| D19 | Zadania Claude (S02-01, S02-07b, S02-09) dostają implementacje kontrolne w pakiecie (`model.ts`, `creature.ts`, `reducer.ts`, `bot.ts`, `simulate.ts`, `combat-schema.ts`, CLI). Sesja wykonująca bierze je za punkt wyjścia, recenzuje i poprawia. | Są sprawdzone na tych samych testach; ręczne przepisywanie 600 linii niczego nie dodaje. |
| D20 | Testy snapshotowe z tablicy sprintu zastąpione jawnymi asercjami z wartościami. | Snapshot „zatwierdza wszystko, co wyszło”; jawna wartość pilnuje reguły. |
| D21 | Zdrowie Leszego w danych: robocze **160** (bot wygrywa 55,3%, 9,7 tury); na papierze 60. Docelową wartość ustalasz w S02-11. | Tabela wrażliwości: 140 → 76%, 150 → 64,5%, 160 → 55,3%, 170 → 43,9%, 180 → 34%. |

## Struktura plików po Sprincie 2

| Plik lub katalog | Odpowiedzialność | Zadanie |
|---|---|---|
| `src/core/types.ts` | typy symboli + aliasy `ElementId`, `FormId`, `TraitId`, `CreatureSpec` | S02-01a |
| `src/core/combat/model.ts` | typy walki: dane, stan, akcje, zdarzenia, `CombatEnv`, `CombatResult` | S02-01a |
| `src/core/combat/creature.ts` | `buildCreature`: statystyki istoty z trzech symboli | S02-01a |
| `src/core/combat/damage.ts` | `applyDamage` (Qwen) | S02-02 |
| `src/core/combat/deck.ts` | `HAND_LIMIT`, `createDeck`, `drawCards`, `endTurn` (Qwen) | S02-03 |
| `src/core/combat/ember.ts` | `EMBER_PER_TURN`, koszty i grywalność kart (Qwen) | S02-04 |
| `src/core/combat/intent.ts` | `chooseIntent` (Qwen) | S02-05 |
| `src/core/combat/enemy-turn.ts` | `resolveEnemyTurn` (Qwen) | S02-06 |
| `src/core/combat/ritual.ts` | `detectRitual` (Qwen) | S02-08 |
| `src/core/combat/reducer.ts` | `createCombat`, `reduce`, `legalActions` | S02-07b |
| `src/core/sim/bot.ts`, `simulate.ts` | bot-gracz, rozgrywanie i podsumowanie wielu walk, CSV | S02-09 |
| `src/data/combat-schema.ts` | `parseCombatData`, `loadCombatData`, `CombatDataError` (zod) | S02-01b |
| `src/data/{symbols,cards,enemies,balance,decks}.json` | dane walki; wartości ustala S02-11 | S02-01b, S02-11 |
| `tools/sim.ts` | polecenie `npm run sim` | S02-09 |
| `tasks/S02-02.md` … `S02-08.md` | specyfikacje dla Qwena (6 plików) | S02-02 … S02-08 |
| `tests/S02-0X.test.ts` | testy modułów Qwena (6 plików) | S02-02 … S02-08 |
| `tests/combat/` (`fixtures.ts`, `creature`, `circles`, `reducer`, `ritual-flow`) | zamrożone dane testowe i testy walki | S02-01a, S02-07b |
| `tests/data/combat-schema.test.ts`, `tests/sim/simulate.test.ts`, `tests/tools/sim-cli.test.ts` | schemat, symulator, CLI | S02-01b, S02-09 |
| `tests/reference/`, `tests/diff/qwen-vs-reference.test.ts` | rozwiązania wzorcowe i test różnicowy | S02-07a |
| `docs/zasady-walki.md`, `docs/papier-S02.md`, `docs/retro/S02.md` | zasady, uwagi z gry na papierze, retrospektywa | S02-10, S02-00 |

## Kolejność wykonania

Zadania Ty (S02-10, S02-11) idą równolegle z kodem. **S02-10 możesz zacząć od razu**: potrzebuje tylko `docs/zasady-walki.md`. S02-11 wymaga gotowego `npm run sim` (S02-09).

1. S02-01a → 2. S02-01b → 3. S02-02 → 4. S02-03 → 5. S02-04 → 6. S02-05 → 7. S02-06 → 8. S02-08 → 9. S02-07a → 10. S02-07b → 11. S02-09 → S02-11 → S02-00 (zamknięcie sprintu).

## Procedura zadania Qwena (S02-02 … S02-06, S02-08)

Zadania Qwena mają ten sam przebieg; sekcje zadań podają tylko to, co się różni (pliki, sygnatury, co sprawdzić w diffie).

1. Skopiuj z pakietu `tasks/<ID>.md` i `tests/<ID>.test.ts` (szkielet `src/core/combat/<moduł>.ts` jest już w repozytorium z S02-01a). `npm run format`.
2. `npx vitest run tests/<ID>.test.ts`. Expected: FAIL (`Not implemented`). Test musi nie przechodzić przed uruchomieniem Qwena.
3. `node tools/qwen-run.mjs --tasks <ID> --apply`. Expected: `<ID> … zaliczone`, plik docelowy zaktualizowany. Gdy niezaliczone, popraw specyfikację (dopisz przykład z liczbami z testu) i uruchom ponownie, do pięciu podejść; potem przejmij zadanie i zapisz powód w `docs/retro/S02.md`.
4. Zrecenzuj diff według listy „Na co patrzeć” w zadaniu.
5. `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`. Expected: zielone.
6. Commit: `git add tasks/<ID>.md tests/<ID>.test.ts src/core/combat/<moduł>.ts` i `git commit -m "feat(core): <moduł> implemented by qwen"`.

---

### Task S02-01a: Model walki, szkielety modułów, istota z trzech symboli (Claude)

**Files:**
- Modify: `src/core/types.ts` (dodaje `ElementId`, `FormId`, `TraitId`, `CreatureSpec`; reszta bez zmian)
- Create: `src/core/combat/model.ts`, `src/core/combat/creature.ts`, szkielety `damage.ts`, `deck.ts`, `ember.ts`, `intent.ts`, `enemy-turn.ts`, `ritual.ts` (w `src/core/combat/`; wszystkie funkcje rzucają `Not implemented`, typy i stałe `HAND_LIMIT = 5`, `EMBER_PER_TURN = 3` są prawdziwe)
- Test: `tests/combat/fixtures.ts`, `tests/combat/creature.test.ts`

**Interfaces:**
- Produces (`src/core/combat/model.ts`, pełny plik w pakiecie; tu typy, na których opiera się reszta sprintu):

```ts
export type CardDef =
  | { id: string; kind: 'creature'; cost: number; creature: CreatureSpec }
  | { id: string; kind: 'spell'; cost: number; element: ElementId | null; effects: readonly Effect[] }
  | { id: string; kind: 'curse' };                                  // the curse card "klatwa"; unplayable
export type Effect =                                                 // damage amounts are before resist/weak
  | { kind: 'damage'; amount: number; pierce?: boolean } | { kind: 'block'; amount: number }
  | { kind: 'heal'; amount: number } | { kind: 'draw'; count: number } | { kind: 'ember'; amount: number };
export interface CombatData { symbols: SymbolData; cards: Record<string, CardDef>; enemies: Record<string, EnemyDef>;
  balance: { playerMaxHp: number; ritual: Record<ElementId, readonly Effect[]> }; decks: Record<string, readonly string[]> }
export interface EnemyDef { id: string; maxHp: number; resist: readonly ElementId[]; weak: readonly ElementId[];
  actions: readonly (BossAction & { effects: readonly EnemyAction[] })[] }   // BossAction from intent.ts
export interface Creature extends CreatureSpec { cardId: string; attack: number; health: number; maxHealth: number }
export interface Intent { actionId: string; actions: readonly EnemyAction[] }   // EnemyAction from enemy-turn.ts
export type Phase = 'player' | 'won' | 'lost';
export interface CombatState {
  turn: number; phase: Phase; ember: number; ritualUsed: boolean; intent: Intent; deck: DeckState;
  player: { hp: number; maxHp: number; block: number; circles: readonly (Creature | null)[]; curses: number };  // circles: always 3
  enemy: { id: string; hp: number; maxHp: number; block: number; resist: readonly ElementId[]; weak: readonly ElementId[];
           stolen: readonly string[]; history: readonly string[] };
}
export type CombatAction = { type: 'playCard'; handIndex: number; circle?: number } | { type: 'endTurn' };
export type RejectReason = 'combat_over' | 'no_such_card' | 'unplayable' | 'not_enough_ember' | 'circle_required' | 'circle_occupied';
export type CombatEvent =
  | { type: 'turn_started'; turn: number; intentId: string } | { type: 'card_played'; cardId: string }
  | { type: 'creature_summoned'; circle: number; cardId: string }
  | { type: 'enemy_damaged'; source: 'spell' | 'creature' | 'ritual'; circle?: number; dealt: number; blocked: number }
  | { type: 'ritual'; element: ElementId } | { type: 'enemy_acted'; actionId: string; log: readonly string[] }
  | { type: 'creature_died'; circle: number } | { type: 'player_damaged'; amount: number }
  | { type: 'combat_won' } | { type: 'combat_lost' } | { type: 'rejected'; reason: RejectReason };
export interface CombatEnv { data: CombatData; rng: Rng }            // rng: the only source of randomness
export interface CombatResult { state: CombatState; events: readonly CombatEvent[] }
export interface CombatSetup { deck: readonly string[]; enemyId: string }
```

- Produces (`src/core/combat/creature.ts`): `buildCreature(symbols: SymbolData, cardId: string, spec: CreatureSpec): Creature` — `attack = max(0, form.baseAttack + element.attackBonus + trait.attackMod)`, `health = max(1, form.baseHealth + element.healthBonus + trait.healthMod)`, `maxHealth = health`; nieznany symbol → `Error`.
- Produces (szkielety, sygnatury jak w specyfikacjach zadań S02-02 … S02-08): `applyDamage`, `createDeck`, `drawCards`, `endTurn`, `canAfford`, `spendEmber`, `gainEmber`, `playableIndexes`, `chooseIntent`, `resolveEnemyTurn`, `detectRitual`.

- [ ] **Step 1: Skopiuj typy i szkielety**

Z pakietu: `src/core/types.ts` (porównaj `git diff`: mają być tylko dodane aliasy i `CreatureSpec`), `src/core/combat/model.ts` oraz sześć szkieletów. `npm run format`, potem `npm run typecheck`.
Expected: `typecheck tsconfig.json: ok` i `typecheck tsconfig.core.json: ok`.

- [ ] **Step 2: Napisz test, który nie przechodzi**

Skopiuj `tests/combat/fixtures.ts` (zamrożone dane testowe: 5 żywiołów, 6 form, 5 przymiotów, 11 kart, Leszy 60 zdrowia, `makeState`, `envOf`, `deepFreeze`) i `tests/combat/creature.test.ts`. Asercje testu: Wilk-ogień-Smutek ma atak 4 i zdrowie 5; Sowa-woda-Odwaga 1/6; Jeleń-ziemia-Spryt 3/7; atak nie spada poniżej 0, a zdrowie poniżej 1 (przymiot z ujemnym modyfikatorem); nieznany symbol rzuca `Error`.
Run: `npx vitest run tests/combat/creature.test.ts`
Expected: FAIL (brak `src/core/combat/creature.ts`).

- [ ] **Step 3: Zaimplementuj `buildCreature` w `src/core/combat/creature.ts`**

Wzór jak w Interfaces; implementacja kontrolna jest w pakiecie.

- [ ] **Step 4: Sprawdź i zatwierdź**

Run: `npx vitest run tests/combat/creature.test.ts`, potem `npm run format`, `npm run lint`, `npm run typecheck`.
Expected: 3 testy zielone, lint i typecheck bez błędów.

```bash
git add src/core tests/combat
git commit -m "feat(core): combat model, module stubs and creature stats"
```

---

### Task S02-01b: Dane walki i ich schemat (Claude)

**Files:**
- Create: `src/data/combat-schema.ts`, `src/data/symbols.json`, `src/data/cards.json`, `src/data/enemies.json`, `src/data/balance.json`, `src/data/decks.json`
- Test: `tests/data/combat-schema.test.ts`

**Interfaces:**
- Consumes: `parseSymbolData(raw, source)` i `SymbolDataError` z `src/data/symbol-schema.ts`; typy z `model.ts`.
- Produces:

```ts
// src/data/combat-schema.ts
export class CombatDataError extends Error {   // like SymbolDataError
  readonly source: string; readonly fieldPath: string;     // path of the first issue, e.g. "decks.szeptucha[3]"; "(root)" for the document
  readonly issues: readonly { fieldPath: string; detail: string }[];
}
export function parseCombatData(raw: unknown, source = 'combat-data'): CombatData;
// raw = { symbols, cards: CardDef[], enemies: EnemyDef[], balance, decks }; cards and enemies become records keyed by id
export function loadCombatData(read: (file: string) => string, source = 'src/data'): CombatData;
// read('symbols.json' | 'cards.json' | 'enemies.json' | 'balance.json' | 'decks.json') returns the file text; the caller supplies
// fs (tools, tests) or a bundler import (app). A file that cannot be read or parsed becomes an issue with fieldPath "<file>.json"; then parseCombatData.
```

Reguły (poza kształtem pól, który pilnuje zod `.strict()`): koszty kart ≥ 0, ilości ≥ 1, `circle` klątwy 0–2; błędy symboli z `parseSymbolData` wracają jako `symbols.<ścieżka>`; powiązania sprawdza zwykły kod po zodzie (wszystkie błędy naraz): symbol w karcie istoty i w odporności wroga istnieje; talia nie zawiera nieznanej karty ani klątwy; `id` kart, wrogów i działań wroga unikalne; każdy żywioł ma wpis w `balance.ritual`; jeśli jakieś działanie wroga zawiera klątwę, musi istnieć karta `klatwa` rodzaju `curse`.

- [ ] **Step 1: Skopiuj test, który nie przechodzi**

`tests/data/combat-schema.test.ts` (43 przypadki). Asercje: dane poprawne dają rekordy po `id` i nie mutują wejścia; 19 tabelarycznych odmów kształtu (m.in. `null`, tablica, nieznany klucz, zły rodzaj karty, ułamkowe obrażenia, pusta lista działań, `circle: 3`, `playerMaxHp: 0`, pusta talia, zepsute `symbols` → `symbols.elements[0].cost`) z dokładną ścieżką pola; 14 odmów powiązań (nieznany żywioł, forma, przymiot, zdublowane `id`, brak karty `klatwa`, brak Obrzędu dla żywiołu, klątwa w talii itd.); wszystkie błędy naraz; `loadCombatData` z podstawionym czytnikiem (poprawne pliki, brakujący plik → `cards.json`, składniowo zepsuty JSON → pole z nazwą pliku, błędy treści wciąż wykrywane); pliki z `src/data` są poprawne (Leszy, talia `szeptucha` z 12 kart, Grom 3, Niedźwiedź 4, każda karta startowa kosztuje ≤ 3).
Run: `npx vitest run tests/data/combat-schema.test.ts`
Expected: FAIL (brak modułów).

- [ ] **Step 2: Skopiuj schemat i dane**

Z pakietu: `src/data/combat-schema.ts` i pięć plików JSON. Schemat jest napisany w stylu `symbol-schema.ts` (`z.object(...).strict()`, `z.discriminatedUnion`). `npm run format`.

- [ ] **Step 3: Uruchom z prawdziwym zodem 4**

Run: `npx vitest run tests/data/combat-schema.test.ts`
Expected: 43 zielone. To pierwsze uruchomienie na zod 4.6 (w chmurze sprawdzone na `zod/v4` z 3.25); jeśli któryś przypadek zawodzi przez różnicę API (np. komunikat lub ścieżka), popraw `combat-schema.ts`, nie test.

- [ ] **Step 4: Sprawdź i zatwierdź**

Run: `npm run lint`, `npm run typecheck`, `npm test`.
Expected: zielone.

```bash
git add src/data tests/data/combat-schema.test.ts
git commit -m "feat(data): combat data files and zod schema with cross-reference checks"
```

---

### Task S02-02: Obrażenia z żywiołami (Qwen)

**Files:**
- Create: `tasks/S02-02.md`; Modify: `src/core/combat/damage.ts` (szkielet → rozwiązanie Qwena); Test: `tests/S02-02.test.ts`

**Interfaces:**
- Produces: `applyDamage(target: Combatant, hit: Hit): DamageResult`, `Combatant { hp; maxHp; block; resist: readonly ElementId[]; weak: readonly ElementId[] }`, `Hit { amount; element: ElementId | null; pierce?: boolean }`, `DamageResult { target: Combatant; blocked; dealt; overkill; killed }`.

Testy przypinają (10): zwykłe trafienie; blok pochłania pierwszy; przebicie ignoruje blok; odporność ×0,5 w dół; słabość ×1,5 w dół; odporność i słabość razem znoszą się, a żywioł liczy się przed blokiem; trafienie bez żywiołu ignoruje odporności; `overkill` i `killed`; `amount ≤ 0` nic nie robi; wejście niezmienione.

Na co patrzeć w diffie: `Math.floor` po mnożeniu (nie `round`); kolejność żywioł → blok → zdrowie; przebicie nie zużywa bloku; `killed` tylko gdy zdrowie przed trafieniem > 0; zwracany `target` to nowy obiekt.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S02-02`, moduł `damage`.

---

### Task S02-03: Talia, ręka, kosz (Qwen)

**Files:**
- Create: `tasks/S02-03.md`; Modify: `src/core/combat/deck.ts`; Test: `tests/S02-03.test.ts`

**Interfaces:**
- Produces: `HAND_LIMIT = 5`, `DeckState { draw: string[]; hand: string[]; discard: string[] }`, `createDeck(cards: readonly string[], rng: Rng): DeckState`, `drawCards(state: DeckState, n: number, rng: Rng): DeckState`, `endTurn(state: DeckState): DeckState`.

Testy przypinają (14): `HAND_LIMIT` to 5; `createDeck` tasuje dokładnie raz i nie rusza wejścia; to samo ziarno daje tę samą talię; dobieranie z wierzchu po kolei; tasowanie kosza tylko gdy talia pusta; stop, gdy talia i kosz puste; karta ponad limit ręki idzie do kosza (i może wrócić w tym samym dobieraniu); `n ≤ 0` zwraca kopię; test inwariantu (ręka ≤ 5, żadna karta nie ginie, losowe stany); `endTurn` przenosi rękę na koniec kosza z zachowaniem kolejności. Testy używają atrapy `Rng`, która rzuca przy każdej metodzie poza `shuffle` (Review Focus 3).

Na co patrzeć w diffie: `rng.shuffle` wywoływane tylko przy pustej talii z niepustym koszem i raz w `createDeck`; żadnego `rng.int`/`next`; wszystkie tablice kopiowane.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S02-03`, moduł `deck`.

---

### Task S02-04: Żar, koszty, grywalność kart (Qwen)

**Files:**
- Create: `tasks/S02-04.md`; Modify: `src/core/combat/ember.ts`; Test: `tests/S02-04.test.ts`

**Interfaces:**
- Produces: `EMBER_PER_TURN = 3`, `canAfford(ember: number, cost: number): boolean`, `spendEmber(ember: number, cost: number): number`, `gainEmber(ember: number, amount: number): number`, `playableIndexes(hand: readonly string[], costOf: (cardId: string) => number | null, ember: number): number[]`. Każdy argument liczbowy: całkowity ≥ 0, inaczej `RangeError`.

Testy przypinają (12): trzy Żary na turę; `canAfford` na granicach; `spendEmber` odejmuje i nie schodzi poniżej zera (`RangeError`); `gainEmber` bez limitu; dla `-1`, `1.5`, `NaN`, `Infinity` **każda** funkcja rzuca `RangeError`; `playableIndexes` zwraca indeksy w kolejności ręki, koszt `null` (klątwa) nigdy nie jest grywalny, ta sama karta dwa razy w ręce jest wypisana dwa razy.

Na co patrzeć w diffie: walidacja przed logiką (także w `canAfford`), `Number.isInteger`.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S02-04`, moduł `ember`. (Kryterium z tablicy sprintu „ręka nie przekracza 5” sprawdza S02-03; tu sprawdzamy Żar.)

---

### Task S02-05: Zamiar wroga (Qwen)

**Files:**
- Create: `tasks/S02-05.md`; Modify: `src/core/combat/intent.ts`; Test: `tests/S02-05.test.ts`

**Interfaces:**
- Produces: `chooseIntent(actions: readonly BossAction[], ctx: IntentContext): string` oraz typy `ConditionKind = 'playerHandAtMost' | 'bossHpBelowPct' | 'playerCirclesAtLeast'`, `Condition { when; value; bonus }`, `BossAction { id; baseWeight; conditions?; cooldown? }`, `IntentContext { playerHand; bossHp; bossMaxHp; playerCircles; history: readonly string[] }`.

Testy przypinają (9, z wrogiem Baba Jaga z benchmarku jako dane): najwyższa waga; premie warunków zmieniają wybór; `bossHpBelowPct` to porównanie ostre (<); remis → wcześniejsze działanie; pauza (cooldown) wyklucza niedawno użyte; nie trzy razy z rzędu; gdy wszystko wykluczone → pierwsze działanie; pusta lista → `Error`; argumenty niezmienione.

Na co patrzeć w diffie: `history.slice(-cooldown)`; `>=`/`<=` zgodnie ze specyfikacją; brak losowości.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S02-05`, moduł `intent`.

---

### Task S02-06: Tura wroga (Qwen)

**Files:**
- Create: `tasks/S02-06.md`; Modify: `src/core/combat/enemy-turn.ts`; Test: `tests/S02-06.test.ts`

**Interfaces:**
- Produces: `resolveEnemyTurn(player: PlayerState, boss: BossState, actions: readonly EnemyAction[]): EnemyTurnResult` z `EnemyAction = { type: 'atak'; amount; direct? } | { type: 'wielokrotny'; amount; times; direct? } | { type: 'tarcza'; amount } | { type: 'klatwa'; circle } | { type: 'kradziez' }`; `PlayerState { hp; maxHp; block; circles: (CircleCreature | null)[]; hand; discard; curses }`; `BossState { hp; maxHp; block; stolen }`; `EnemyTurnResult { player; boss; log: string[] }`. Wpisy logu: `trafienie krag<i> <n>`, `zniszczono krag<i>`, `trafienie gracz <n>`, `tarcza <n>`, `klatwa krag<i>`, `kradziez <karta>` / `kradziez brak`, `porazka`.

Testy przypinają (15, w tym nowe dla `direct`): atak trafia istotę o najwyższym ataku (remis: niższy Krąg); zniszczona istota zwalnia Krąg, nadmiar przepada; blok gracza nie chroni istot; wielokrotny wybiera cel przed każdym trafieniem; przy pustych Kręgach atak idzie w gracza przez blok; `direct: true` omija Kręgi, `direct: false` zachowuje się jak brak flagi; wielokrotny `direct` bije w gracza za każdym razem; śmierć gracza przerywa turę i zapisuje `porazka` (także po ataku `direct`); tarcza, klątwa, kradzież; pusta lista nic nie zmienia; wejścia niezmienione; wynik niezależny od kolejności kluczy w obiektach.

Na co patrzeć w diffie: cel wybierany od nowa przed każdym trafieniem; `direct` pomija wybór celu; pętla przerywana po porażce; klątwa dopisuje `'klatwa'` do kosza i zwiększa `curses` także, gdy Krąg był pusty; brak mutacji zagnieżdżonych tablic.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S02-06`, moduł `enemy-turn`. (Kryterium z tablicy sprintu „niezależność od kolejności kluczy” sprawdza ostatni test pliku.)

---

### Task S02-08: Wykrywanie Obrzędu (Qwen)

**Files:**
- Create: `tasks/S02-08.md`; Modify: `src/core/combat/ritual.ts`; Test: `tests/S02-08.test.ts`

**Interfaces:**
- Produces: `detectRitual(circles: readonly CircleContent[], usedThisCombat: readonly ElementId[]): ElementId | null` z `CircleContent = { element: ElementId } | null`; `circles.length !== 3` → `RangeError`.

Testy przypinają (7): trzy istoty jednego żywiołu; pusty Krąg → `null`; mieszane żywioły → `null`; wiatr jako dzika karta (dwa ognie + wiatr = ogień; trzy wiatry = wiatr); żywioł z listy użytych → `null`; zła liczba Kręgów → `RangeError`; argumenty niezmienione. Zasadę „raz na walkę” realizuje reducer (D14), jej testy są w S02-07b (R2, R2b).

Na co patrzeć w diffie: wiatr nie liczy się do zbioru żywiołów; trzy wiatry dają `'wiatr'`; sprawdzenie listy użytych dopiero po ustaleniu żywiołu.

- [ ] **Step 1–6:** Procedura zadania Qwena z ID `S02-08`, moduł `ritual`.

---

### Task S02-07a: Weryfikacja modułów Qwena testem różnicowym (Claude)

**Files:**
- Create: `tests/reference/{damage,deck,ember,intent,enemy-turn,ritual}.ts`, `tests/diff/qwen-vs-reference.test.ts`

**Interfaces:**
- Consumes: sześć modułów z `src/core/combat/` (po zadaniach Qwena).
- Produces: nic dla kodu; brama jakości przed reducerem.

- [ ] **Step 1: Skopiuj rozwiązania wzorcowe i test różnicowy**

Z pakietu: `tests/reference/*.ts` (sześć niezależnych implementacji, każda z komentarzem „oracle only”) i `tests/diff/qwen-vs-reference.test.ts`. `npm run format`. Pliki w `tests/reference/` nie są testami i nikt z `src/` ich nie importuje.

- [ ] **Step 2: Uruchom test różnicowy**

Run: `npx vitest run tests/diff`
Expected: 6 testów zielonych. Każdy porównuje wynik (lub nazwę wyjątku) kodu Qwena z wzorcowym na 3000 losowych wejść (ziarna 1–6): `applyDamage` (w tym ujemne kwoty, remisy odporność/słabość), `drawCards`/`endTurn`/`createDeck` (także zużycie losowości: kolejna liczba z `Rng` ma być równa), Żar (także wartości nieprawidłowe), `chooseIntent` (cooldowny, historia, puste listy), `resolveEnemyTurn` (z `direct`), `detectRitual` (zła liczba Kręgów).

- [ ] **Step 3: Sprawdź, że test różnicowy żyje**

Dla każdego z sześciu modułów wprowadź jedną celową usterkę (np. w `damage.ts` `Math.floor` → `Math.round`; w `intent.ts` `>` → `>=` przy remisie; w `enemy-turn.ts` pierwszy cel zamiast najsilniejszego), uruchom `npx vitest run tests/diff`, potwierdź FAIL i cofnij usterkę (`git checkout -- <plik>`).
Expected: sześć usterek, sześć czerwonych testów, po cofnięciu zielono.

- [ ] **Step 4: Rozbieżność = decyzja**

Jeśli któryś test różnicowy zawiedzie: wypisz wejście z komunikatu, rozstrzygnij według specyfikacji `tasks/S02-xx.md`, kto ma rację (kod Qwena czy wzorzec), popraw ten plik ręcznie i **dopisz to wejście jako przypadek do testu modułu** (`tests/S02-xx.test.ts`; po zadaniu Qwena wolno).

- [ ] **Step 5: Commit**

```bash
git add tests/reference tests/diff
git commit -m "test(core): differential tests of qwen modules against reference solutions"
```

---

### Task S02-07b: Reducer walki, Kręgi i Obrzęd (Claude)

**Files:**
- Create: `src/core/combat/reducer.ts`
- Test: `tests/combat/circles.test.ts` (K1–K10), `tests/combat/ritual-flow.test.ts` (R1–R7), `tests/combat/reducer.test.ts`

**Interfaces:**
- Consumes: wszystkie moduły z `src/core/combat/` (S02-02 … S02-08), `buildCreature`, typy z `model.ts`.
- Produces:

```ts
export function createCombat(data: CombatData, setup: CombatSetup, rng: Rng): CombatResult;   // turn 1 is already started
export function reduce(state: CombatState, action: CombatAction, env: CombatEnv): CombatResult;
export function legalActions(state: CombatState, env: CombatEnv): CombatAction[];             // playable cards (creatures: each empty circle) + endTurn; [] after the combat
```

Reguły, których sygnatury i testy nie wymuszają jednoznacznie (szczegóły liczbowe w `docs/zasady-walki.md`):
- `createCombat`: nieznany wróg lub karta w talii → `Error`; talia przez `createDeck(setup.deck, rng)`; start przez `startPlayerTurn`.
- `startPlayerTurn`: `turn + 1`, blok gracza 0, `ember = EMBER_PER_TURN`, `drawCards(deck, HAND_LIMIT)`, **potem** wybór zamiaru przez `chooseIntent` (kontekst: karty w ręce, zdrowie wroga, liczba istot, `enemy.history`), zdarzenie `turn_started`. Działanie `klatwa` w zamiarze dostaje `circle` = Krąg najsilniejszej istoty (remis: niższy numer, brak istot: 0).
- `playCard` odmawia w kolejności: `combat_over` → `no_such_card` (indeks nie jest liczbą całkowitą z zakresu ręki) → `unplayable` (klątwa) → `not_enough_ember` → `circle_required` (istota bez Kręgu 0–2) → `circle_occupied`. Odmowa zwraca **ten sam obiekt stanu** i jedno zdarzenie `rejected`. Udane zagranie: `card_played`, koszt zapłacony, karta od razu do kosza; zaklęcie wykonuje efekty po kolei; istota: `creature_summoned`, potem sprawdzenie Obrzędu (`detectRitual`, z listą wszystkich żywiołów jako użytych, gdy `ritualUsed`); Obrzęd: `ritualUsed = true`, zdarzenie `ritual`, efekty z `balance.ritual[żywioł]` z żywiołem Obrzędu. Efekty przerywają się, gdy wróg zginął.
- Obrażenia wroga zawsze przez `applyDamage` (zdarzenie `enemy_damaged` z `dealt` i `blocked`); `killed` → `phase = 'won'` i `combat_won`. `heal` nie przekracza `maxHp`.
- `endTurn`: (1) istoty atakują Krąg 0, 1, 2 (jeśli wróg zginie, koniec bez dalszych kroków); (2) blok wroga zerowany, `resolveEnemyTurn` na pokazanym zamiarze (dane gracza i wroga przepisane na `PlayerState`/`BossState`, zdrowie istot wraca do stanu), zdarzenia `creature_died`, `player_damaged`, `enemy_acted`; `actionId` dopisane do `enemy.history`; (3) zdrowie gracza ≤ 0 → `combat_lost`, `phase = 'lost'`, bez nowej tury; (4) ręka do kosza (`endTurn` z talii) i `startPlayerTurn`.
- Wartości zdarzeń i logów: patrz testy K1–K10 i R1–R7.

- [ ] **Step 1: Skopiuj testy, które nie przechodzą**

Z pakietu: `tests/combat/circles.test.ts`, `ritual-flow.test.ts`, `reducer.test.ts`. `npm run format`.
Asercje: K1–K10 i R1–R7 z `docs/zasady-walki.md` (z wartościami: np. K4 ataki 6/1/1, Leszy 52; K6 Wilk ginie, log `trafienie krag1 5`, `zniszczono krag1`; K8 log szponów i Kręgi `[null, null, 2]`; K9 klątwa niszczy Wilka, `curses = 1`; K10 Cios 12 przez 5 bloku, zdrowie 33; R1 Obrzęd ognia 21 obrażeń, Leszy 39); odmowy (po jednym przypadku na kod: indeks −1 / 0,5 / poza ręką, klątwa, za mało Żaru, brak Kręgu, Krąg 3, Krąg −1, Krąg zajęty, akcja po końcu walki) każda ze **stanem tym samym obiektem**; blok gracza znika na początku następnej tury; Żar nie przechodzi na następną turę; blok wroga znika na początku jego fazy; kradzież bierze ostatnią kartę ręki przed odrzuceniem; klątwa pokazana przy najsilniejszej istocie; reducer nie mutuje głęboko zamrożonego stanu i danych; **100 losowych walk**: ręka ≤ 5, żadna karta nie ginie, liczby w sensownych granicach, akcje z `legalActions` nigdy nie są odrzucane.
Run: `npx vitest run tests/combat`
Expected: FAIL (brak `reducer.ts`).

- [ ] **Step 2: Wprowadź `reducer.ts`**

Z pakietu: `src/core/combat/reducer.ts` (implementacja kontrolna, ok. 300 linii) jako punkt wyjścia; przeczytaj ją względem listy reguł powyżej i `docs/zasady-walki.md`. `npm run format`.

- [ ] **Step 3: Uruchom testy**

Run: `npx vitest run tests/combat`
Expected: wszystkie zielone (creature 3, circles 11, ritual-flow 9, reducer 29).

- [ ] **Step 4: Sprawdź, że testy żyją**

Wprowadź trzy usterki po jednej, uruchamiaj `npx vitest run tests/combat` i cofaj (przed pierwszą usterką `git add src/core/combat/reducer.ts`, po każdej `git checkout -- src/core/combat/reducer.ts`): (a) w `endTurn` przenieś ataki istot za fazę wroga; (b) nie ustawiaj `ritualUsed = true` po Obrzędzie; (c) w odmowie zwróć kopię stanu zamiast tego samego obiektu.
Expected: (a) czerwone testy w `circles.test.ts`, (b) czerwony R1 w `ritual-flow.test.ts`, (c) czerwone testy odmów w `reducer.test.ts` i w `circles.test.ts`. Po cofnięciu wszystko zielone.

- [ ] **Step 5: Sprawdź i zatwierdź**

Run: `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`.
Expected: zielone.

```bash
git add src/core/combat/reducer.ts tests/combat
git commit -m "feat(core): combat reducer with circles, enemy phase and ritual"
```

---

### Task S02-09: Bot testowy i symulator w terminalu (Claude)

**Files:**
- Create: `src/core/sim/bot.ts`, `src/core/sim/simulate.ts`, `tools/sim.ts`
- Modify: `package.json` (skrypt `"sim": "node tools/sim.ts"`), `tsconfig.json` (`include` dopisuje `"tools"`), `eslint.config.js` (blok z globalami Node obejmuje też `tools/**/*.ts`), `.gitignore` i `.prettierignore` (`sim-results`), `README.md` i `CLAUDE.md` (polecenie `npm run sim`)
- Test: `tests/sim/simulate.test.ts`, `tests/tools/sim-cli.test.ts`

**Interfaces:**
- Consumes: `createCombat`, `reduce`, `legalActions`; `loadCombatData` (z `fs` jako czytnikiem).
- Produces:

```ts
export function chooseBotAction(state: CombatState, env: CombatEnv): CombatAction;       // src/core/sim/bot.ts, deterministic
export interface GameResult { seed: number; won: boolean; turns: number; hpLeft: number; ritual: boolean; reason: 'won' | 'lost' | 'turn_limit' }
export interface Summary { games: number; wins: number; winRate: number; avgTurns: number; avgHpLeftOnWin: number; ritualRate: number; turnLimit: number }
export function playGame(data: CombatData, setup: CombatSetup, seed: number, turnLimit = 40): GameResult;   // throws if the bot plays an illegal action
export function runGames(data: CombatData, setup: CombatSetup, games: number, baseSeed: number, turnLimit = 40): GameResult[];   // seeds baseSeed, baseSeed+1, ...
export function summarize(results: readonly GameResult[]): Summary;                       // empty list gives zeros, no NaN
export const CSV_HEADER = 'seed,won,turns,hp_left,ritual,reason';
export function toCsv(results: readonly GameResult[]): string;                            // header + one line per game, LF
```

Bot (algorytm, bo sygnatura go nie określa): dla każdej akcji z `legalActions` oblicza wynik; wybiera najwyższy, a gdy żaden nie przekracza 0 — kończy turę. Istota: `10 + 4 × (liczba stojących istot tego samego żywiołu lub wiatru) + 30, jeśli ta istota dopełnia Obrzęd (dwie stoją, obie pasują, Obrzęd jeszcze nie był) − 0,01 × numer Kręgu`. Zaklęcie: za każdy efekt obrażeń `6 + 0,5 × kwota`, `+100`, gdy kwota ≥ zdrowia wroga; za efekt bloku `8`, gdy nie ma istot, a zamiar wroga zadaje więcej niż masz bloku, w przeciwnym razie `1`. Bot nie zna rozkładu talii ani kolejnych kart.

CLI `npm run sim -- [--games 1000] [--seed 20261102] [--deck szeptucha] [--enemy leszy] [--enemy-hp N] [--player-hp N] [--out plik.csv]`: domyślnie zapisuje `sim-results/<talia>-<wróg>-<ziarno>-<gry>.csv`; drukuje po polsku: zdrowie, wygrane (liczba i %), średnia liczba tur, średnie zdrowie po wygranej, odsetek walk z Obrzędem, przerwane (limit tur), ścieżkę CSV, czas. Błąd argumentów: `Błąd: …` i użycie na stderr, kod wyjścia 1.

- [ ] **Step 1: Skopiuj testy, które nie przechodzą**

Z pakietu: `tests/sim/simulate.test.ts` (determinizm; bot nigdy nie gra nielegalnie przez 200 ziaren; wygrywa większość walk z Leszym o 60 zdrowia; limit tur przy niepokonanym wrogu; liczby podsumowania; pusta lista bez `NaN`; CSV) i `tests/tools/sim-cli.test.ts` (raport i CSV z 21 linii; `--enemy-hp 1` daje 100% wygranych; osiem błędnych wywołań kończy się kodem 1, polskim `Błąd:` i bez śladu stosu). `npm run format`.
Run: `npx vitest run tests/sim tests/tools`
Expected: FAIL (brak modułów).

- [ ] **Step 2: Wprowadź bota, symulator i CLI**

Z pakietu: `src/core/sim/bot.ts`, `src/core/sim/simulate.ts`, `tools/sim.ts`. Zmodyfikuj `package.json`, `tsconfig.json`, `eslint.config.js`, `.gitignore`, `.prettierignore`, `README.md`, `CLAUDE.md` jak w opisie plików. `npm run format`.

- [ ] **Step 3: Uruchom testy i polecenie**

Run: `npx vitest run tests/sim tests/tools`, potem `npm run sim -- --games 1000`
Expected: testy zielone; polecenie kończy się w mniej niż 60 s (spodziewane ok. 1 s) i drukuje `Wygrane: 553 (55,3%)`, średnio 9,7 tury, 7,1 zdrowia po wygranej, Obrzęd w 78% walk, 0 przerwanych; plik `sim-results/szeptucha-leszy-20261102-1000.csv` ma 1001 linii. (Te liczby dotyczą danych z pakietu; S02-11 je zmieni.)

- [ ] **Step 4: Sprawdź błędne wywołania**

Run: `npm run sim -- --games 0`
Expected: `Błąd: --games musi być liczbą całkowitą >= 1`, linia użycia, kod wyjścia 1 (`$LASTEXITCODE` w PowerShellu, `$?` w Bashu).

- [ ] **Step 5: Sprawdź i zatwierdź**

Run: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
Expected: zielone. (`tools/sim.ts` jest teraz w `tsconfig.json`; `src/core/sim` w `tsconfig.core.json` — rdzeń nie używa API Node.)

```bash
git add src/core/sim tools tests/sim tests/tools package.json tsconfig.json eslint.config.js .gitignore .prettierignore README.md CLAUDE.md
git commit -m "feat(sim): greedy test bot and npm run sim with CSV report"
```

---

### Task S02-10: Gra na papierze (Ty)

**Files:**
- Create: `docs/papier-S02.md`
- Modify: `docs/zasady-walki.md` (linia „Zatwierdzone”, ewentualne zmiany reguł)

- [ ] **Step 1: Przeczytaj zasady**

Przeczytaj `docs/zasady-walki.md`. Jeśli któraś zasada ci się nie podoba, zaznacz ją teraz, nie po grze.

- [ ] **Step 2: Zagraj trzy walki**

Według rozdziału 10 dokumentu zasad: 12 kart, trzy kartki-Kręgi, licznik tury, Leszy z 60 zdrowia. Zagraj też na papierze trzy wybrane scenariusze z tabeli K1–K10 i R1–R7 i porównaj wynik z tabelą.

- [ ] **Step 3: Zapisz uwagi**

W `docs/papier-S02.md` minimum 10 uwag łącznie (niejasne reguły, nudne karty, tempo walki, czytelność zamiaru, wartość Obrzędu, liczba tur i zdrowie na końcu każdej walki).

- [ ] **Step 4: Claude przerabia uwagi**

Dla każdej uwagi Claude proponuje: (a) zmianę reguły (zmiana w `docs/zasady-walki.md` + test + kod, osobny commit), (b) wpis do Sprintu 3+ albo (c) wyjaśnienie. Reguły zmieniasz ty; zmiana wartości w teście bez twojej zgody jest zakazana.

- [ ] **Step 5: Zatwierdź zasady i commit**

Wpisz datę w linii „Zatwierdzone: ____”.

```bash
git add docs/papier-S02.md docs/zasady-walki.md
git commit -m "docs: paper playtest notes and approved combat rules v0.1"
```

---

### Task S02-11: Wartości bazowe (Ty + Claude)

**Files:**
- Modify: `src/data/enemies.json` (`maxHp` Leszego), `src/data/balance.json` (`playerMaxHp`, efekty Obrzędów), `src/data/cards.json` (obrażenia i blok kart startowych)
- Modify: `docs/zasady-walki.md` (tabele z liczbami, jeśli się zmieniły)

- [ ] **Step 1: Zobacz wrażliwość**

Run (po jednym razie, wartości z kolumny): `npm run sim -- --games 1000 --enemy-hp 140`, `150`, `160`, `170`, `180`.
Expected przy danych z pakietu: 76,0%, 64,5%, 55,3%, 43,9%, 34,0% wygranych. To wynik **bota**, który gra gorzej niż ty, więc człowiekowi powinno iść trochę lepiej.

- [ ] **Step 2: Wybierz wartości**

Zdecyduj o zdrowiu gracza i Leszego, obrażeniach kart i efektach Obrzędów, kierując się wrażeniem z gry na papierze (S02-10) i tabelą z kroku 1. Cel z tablicy sprintu: bot wygrywa **30–70%** walk. Wpisz wartości do plików JSON.

- [ ] **Step 3: Sprawdź**

Run: `npm run sim -- --games 1000`, potem `npm test`.
Expected: odsetek wygranych w przedziale 30–70%; testy zielone (testy walki używają zamrożonych danych `tests/combat/fixtures.ts`, więc zmiana balansu ich nie psuje; test danych sprawdza tylko poprawność i strukturę).

- [ ] **Step 4: Zatwierdź i commit**

Dopisz datę zatwierdzenia wartości w `docs/zasady-walki.md` (sekcja 7) i zaktualizuj liczby w tabelach.

```bash
git add src/data docs/zasady-walki.md
git commit -m "feat(data): tuned base values, bot wins within 30-70 percent"
```

---

### Task S02-00: Zamknięcie sprintu

**Files:**
- Create: `docs/retro/S02.md`
- Modify: `docs/plan-sprintow.md`, `docs/log-godzin.csv`

- [ ] **Step 1: Demo na koniec sprintu**

Sprawdź i zaznacz: (1) `npm run sim -- --games 1000` kończy się w < 60 s i zapisuje CSV (tablica sprintu: „demo: bot gra 1000 walk w terminalu”; Sprint 2 nie ma ekranów, więc build na telefonie nie jest częścią demo); (2) `npm run lint`, `typecheck`, `npm test`, `npm run build` zielone, CI na `main` zielone; (3) Qwen wykonał sześć zadań (S02-02 … S02-06, S02-08), każde z raportem w `results/`; (4) test różnicowy zielony (S02-07a); (5) `docs/zasady-walki.md` ma datę zatwierdzenia, `docs/papier-S02.md` co najmniej 10 uwag.

- [ ] **Step 2: Retrospektywa (pięć linii)**

`docs/retro/S02.md`: (1) co poszło dobrze; (2) co nie (z liczbą podejść Qwena na każde z sześciu zadań i powodem porażek: specyfikacja czy model); (3) godziny: plan 33 h, faktycznie ___; (4) odkrycia z gry na papierze i z symulacji (m.in. flaga `direct`, D13); (5) co zmienić w Sprincie 3.

- [ ] **Step 3: Zsynchronizuj plan sprintów**

W `docs/plan-sprintow.md`: `☐` → `☑` przy zadaniach S02; w S02-11 ścieżka `data/balance.json` → `src/data/balance.json` (D15); w S02-01 „testy snapshotowe” → „testy z jawnymi wartościami” (D20); w S02-04 kryterium „ręka nie przekracza 5” przenieś do S02-03 (tam jest `HAND_LIMIT`); w S02-06 dopisz akcje `direct` (D13); w S02-08 kryterium „raz na walkę” dopisz też do S02-07 (reducer, D14); w S02-07 „10 scenariuszy” → „scenariusze K1–K10 i R1–R7 z `docs/zasady-walki.md`”; w S03-01 dopisz, że zastępuje przejściowy `src/data/symbols.json` (D16); dopisz wpis w dzienniku zmian planu z datą i listą powyższych zmian oraz D11–D21. Uzupełnij `docs/log-godzin.csv`: dopisz wiersze `S02,S02-00 … S02-11` (godziny planowane: 2; 4; 2,5; 2,5; 2; 2,5; 2,5; 4; 2; 4; 3; 2) i uzupełnij `godziny_faktyczne`.

- [ ] **Step 4: Commit i znacznik**

```bash
git add .
git commit -m "docs: close sprint 2"
git tag s02-done
```

---

## Stan wykonania (24 X 2026)

Plan zatwierdzony przez użytkownika 24 X 2026. Metoda wykonania: **Native** (superpowers:executing-plans, jedna sesja `claude` na laptopie wykonuje zadania po kolei, na końcu jedna recenzja całej gałęzi). Plugin `typescript-native-lsp` jest włączony na koncie użytkownika; w sesji na laptopie daje diagnostykę typów (repo ma TypeScript ~6.0.3, więc zadziała wariant zapasowy `typescript-language-server`). Qwena uruchamia `tools/qwen-run.mjs` w trybie `--bare`, więc plugin go nie obejmuje.

Nic z kodu nie jest jeszcze wykonane. Gotowe: `docs/zasady-walki.md` (czeka na twoje zatwierdzenie w S02-10) i pakiet plików ze sprawdzonymi testami i implementacjami kontrolnymi; oba leżą w repozytorium razem z tym planem. Start: w katalogu repozytorium uruchom `claude` i podaj „Wykonaj plan docs/superpowers/plans/2026-10-24-sprint-2-walka.md”.
