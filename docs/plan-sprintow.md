# Bestiariusz — plan sprintów

> Plik do repozytorium gry: `docs/plan-sprintow.md`. Czytasz go ty, a Claude Code rozbija z niego zadania dla Qwena. Budżet, prawo i marketing są w dokumencie „Bestiariusz — biznesplan”, a zasady gry w dokumencie „Bestiariusz — dokument projektowy”.

Wersja 1.0 · 24 X 2026 · 32 sprinty po 2 tygodnie, od 2 XI 2026 do 23 I 2028 · ok. 985 godzin twojej pracy z ok. 1 100 dostępnych · okno premiery: 24 I – ok. 2 III 2028

## 1. Jak czytać ten plik

Plan ma trzy warstwy: fazy z bramkami i budżetem (rozdział 4), sprinty z zadaniami (rozdział 5) i tabelę kontrolną elementów aplikacji (rozdział 6). Każde zadanie ma stały identyfikator, np. `S07-04`, który jest też nazwą jego specyfikacji `tasks/S07-04.md`.

| Kolumna | Znaczenie |
|---|---|
| ID | Identyfikator zadania. `☐` oznacza do zrobienia, `☑` zrobione (Claude Code zmienia znak po zakończeniu zadania). `S07-00` to zawsze planowanie i retrospektywa sprintu. |
| Pr. | Priorytet: **M** (musi być), **S** (powinno być; przenosimy, gdy brakuje czasu), **C** (może być; odcinamy jako pierwsze). |
| Kto | Kto wykonuje zadanie: Ty, Claude, Qwen albo podwykonawca (Grafik, Muzyk, Folklorysta, Prawnik, Księgowy). |
| Kryterium akceptacji | Warunek, po którym zadanie uznajemy za skończone. Dla kodu zawsze obowiązuje też definicja ukończenia z rozdziału 3. |
| Zależy od | Zadania, które muszą być skończone wcześniej. |
| h | Twój czas w godzinach: zlecenie, przegląd wyniku, test na telefonie, decyzje. Czasu pracy Claude'a i Qwena nie wliczam. |

### Instrukcja dla Claude Code

Ten fragment skopiuj do `CLAUDE.md` repozytorium gry.

```text
Plan prac: docs/plan-sprintow.md. Na prośbę „zacznij sprint N”:
1. Przeczytaj sekcję sprintu N, rozdział 2 (zasady pracy) i rozdział 3 (definicja ukończenia).
2. Jeśli przed sprintem N jest bramka (B1–B4), sprawdź, czy docs/bramka-X.md ma zapisaną decyzję. Bez decyzji nie zaczynaj sprintu.
3. Zaproponuj kolejność zadań z uwzględnieniem kolumny „Zależy od”. Zadania z „Kto” = Ty lub podwykonawca zamień na krótką listę kroków dla człowieka i nie wykonuj ich.
4. Dla zadań Qwen napisz tasks/<ID>.md i tests/<ID>.test.ts (patrz dodatek B), uruchom tools/qwen-run.mjs, a po zaliczeniu zrecenzuj diff.
5. Po zakończeniu zadania zmień ☐ na ☑ w planie, dopisz wpis do dziennika zmian.
6. Po pięciu nieudanych podejściach Qwena zadanie przejmujesz ty i zapisujesz powód w docs/retro/Sxx.md.
```

## 2. Zasady pracy

### Kto za co odpowiada

| Kto | Zakres | Jak pracuje |
|---|---|---|
| Ty | decyzje, testy na urządzeniach, treści, kontakty z podwykonawcami, finanse | 15–20 godzin tygodniowo; sprint trwa dwa tygodnie, od poniedziałku do niedzieli |
| Claude | architekt i recenzent; sam implementuje trudne zadania (poniżej) | pisze specyfikacje i testy dla Qwena, recenzuje każdy jego diff |
| Qwen | implementacja modułów o jasnej specyfikacji | lokalnie przez Ollamę (model `qwen3-coder-64k`), jako osobny proces `claude -p` z ograniczoną listą narzędzi |
| Grafik, Muzyk, Folklorysta, Prawnik, Księgowy | wąskie zlecenia | umowa na piśmie przed pracą, z przeniesieniem praw i polami eksploatacji |

### Przepływ zadania dla Qwena

1. Claude tworzy `tasks/<ID>.md` (specyfikacja), `tests/<ID>.test.ts` (kontrakt: sygnatury, przypadki brzegowe, przykłady) i szkielet pliku z `throw new Error('Not implemented')`.
2. `node tools/qwen-run.mjs --tasks <ID>` uruchamia Qwena w świeżej kopii repozytorium. Może edytować tylko wskazany plik. Zadanie jest zaliczone, gdy testy i `tsc` przechodzą, a pliki chronione są nietknięte.
3. Claude recenzuje diff: zgodność ze specyfikacją, czytelność, wydajność, bezpieczeństwo. Dla logiki gry dodaje fuzzing względem rozwiązania wzorcowego, jeśli specyfikacja tego wymaga.
4. Po niezaliczonym podejściu Claude poprawia specyfikację lub testy i uruchamia kolejne podejście, maksymalnie pięć.

Pomiar z 24 X 2026: Qwen3 Coder 30B zaliczył 9 z 10 zadań testowych, wszystkie za pierwszym podejściem, w 13–51 sekund każde; fuzzing 9 rozwiązań nie wykazał rozbieżności względem wzorcowych. Niezaliczone było zadanie 09, generator mapy z nieprzecinającymi się krawędziami, więc w planie robi je Claude (`S08-02`).

### Co robi od razu Claude

Bez próby Qwena, z góry przypisane Claude'owi: algorytmy z wieloma jednoczesnymi ograniczeniami (generator mapy, balans), integracje SDK (Capacitor, RevenueCat, Supabase, Sentry), weryfikacja wyniku i bezpieczeństwo, migracje danych, architektura i interfejsy między modułami, profilowanie wydajności. Po pięciu nieudanych podejściach Qwena zadanie przejmuje Claude, a w retrospektywie zapisujemy, czy zawiodła specyfikacja, czy model.

### Linia cięcia przed premierą

Jeśli czas się kończy, odcinamy w tej kolejności (bez szkody dla premiery):

1. Szkielet świąt sezonowych (`S29-06`) → pierwsza aktualizacja po premierze.
2. Kręgi (`S29-03`) → pierwsza aktualizacja po premierze.
3. Ścieżka Dziad wędrowny (`S28-02`) → pierwsza aktualizacja.
4. Klątwy 7–10 → aktualizacja.
5. Kraina Góry z Żmijem i Biesem (`S26-03`, `S26-04`) → premiera z czterema krainami (Bór, Bagna, Pola, Nawia), zgodnie z planem B z biznesplanu.
6. Część form i przymiotów premiery (np. 7 × 9 × 10 = 630 istot zamiast 960).

### Rytm sprintu

| Moment | Co | Czas |
|---|---|---|
| Poniedziałek, początek | Planowanie: Claude rozbija zadania na specyfikacje, ty potwierdzasz kolejność | 1 h |
| Połowa sprintu | Kontrola: co jest zrobione, co się przesuwa | 15 min |
| Ostatni weekend | Przegląd: grasz w build sprintu na telefonie od początku do końca; retrospektywa `docs/retro/Sxx.md` (5 linii) | 1 h |

Plan celuje w 30–36 godzin na sprint przy 35 dostępnych. Co piąty sprint jest rezerwowy (S5, S10, S15, S20, S25, S30): ma mało zadań i służy do nadrabiania zaległości. Gdy sprint wykracza o więcej niż 15%, zadania S i C przechodzą do następnego sprintu.

## 3. Definicja ukończenia

### Zadanie z kodem

- Testy jednostkowe (Vitest) zielone i pokrywają nowe zachowanie; dla logiki gry także testy właściwości lub fuzzing, gdy specyfikacja tak mówi.
- `tsc --noEmit` w trybie strict bez błędów, ESLint bez ostrzeżeń.
- Zero tekstów w kodzie interfejsu (wszystko przez i18n, klucze w PL i EN) oraz zero `Math.random` i `Date.now` w logice gry (tylko ziarno i wstrzyknięty zegar).
- Interfejs działa w pionie, poziomie i na tablecie (zrzuty w CI); pola dotyku mają co najmniej 48 dp; każdy element interaktywny ma nazwę dla czytnika ekranu; informacja nigdy nie jest przekazana samym kolorem.
- Budżety: rozmiar paczki do 150 MB (cel 120 MB), 60 kl./s na telefonie testowym, pamięć do 500 MB.
- Diff zrecenzowany przez Claude'a; żadnych nowych zależności bez wpisu w `docs/decyzje.md`.
- Zadanie odhaczone w tym pliku.

### Zadanie spoza kodu

- Wynik leży w repozytorium (`docs/`, `art/`, `audio/`, `legal/`, `marketing/`).
- Dla grafiki, muzyki i tekstów jest wpis w `docs/ai-provenance.md`: co zrobił człowiek, co AI, którym modelem.
- Umowa z podwykonawcą jest podpisana przed rozpoczęciem pracy; w repozytorium nie ma haseł ani kluczy.

### Sprint

- Wszystkie zadania M zamknięte albo świadomie przeniesione, z powodem w retrospektywie.
- Build sprintu działa na telefonie testowym (APK) i w przeglądarce, a ty zagrałeś go od początku do końca.
- `docs/retro/Sxx.md` uzupełniona; plan zaktualizowany, jeśli coś się przesunęło.

### Wydanie do sklepów

- Lista `docs/qa-premiery.md` przejęta w 100% (S31), zero blokerów, sesje bez awarii ≥ 99,5%.
- Formularze sklepów zgodne z rzeczywistą telemetrią; brak nazw obcych marek; ekran Autorów z oznaczeniem treści AI.

## 4. Fazy, bramki i budżet

### Fazy

| Faza | Sprinty | Okres | Co powstaje | Bramka |
|---|---|---|---|---|
| A. Prototyp | S1–S6 | 2 XI 2026 – 24 I 2027 | Fundament, logika walki, dane 150 istot, grywalny prototyp na telefonie | B1 · koniec S6 |
| B. Vertical slice | S7–S12 | 25 I 2027 – 18 IV 2027 | Styl graficzny i muzyczny, powłoka aplikacji, mapa, Księga, kody istot, samouczek, demo w przeglądarce | B2 · koniec S12 |
| C. MVP | S13–S20 | 19 IV 2027 – 8 VIII 2027 | Trzy krainy, zakupy, Wyzwanie Dnia z rankingiem, PL i EN, prawo i sklepy, stabilność | B3 · koniec S20 |
| D. Soft launch | S21–S24 | 9 VIII 2027 – 3 X 2027 | Gra w sklepach w Polsce i Kanadzie, pomiary, strojenie, decyzja o premierze | B4 · koniec S24 |
| E. Do premiery | S25–S32 | 4 X 2027 – 23 I 2028 | Zawartość premiery (960 istot, cztery krainy z finałem, trzy ścieżki), sklepy, promocja, okno premiery | okno 24 I – ok. 2 III 2028 |

Bramki z biznesplanu mają liczbę i decyzję zapisaną z góry; szczegóły stoją w sekcjach sprintów, w których bramka zapada.

### Wydatki w sprintach

Suma pozycji z biznesplanu to 15 000 zł. Przed bramką 1 wydajesz tylko telefon (500 zł) i subskrypcję Claude (ok. 300 zł), czyli ok. 800 zł.

| Sprint | Pozycja | Kwota | Bramka przed wydatkiem |
|---|---|---|---|
| S1–S32 | Subskrypcja Claude: Pro przez cały okres; Max dodatkowo w S13–S14, S17–S18 i S26–S27 (propozycja: 3 miesiące najcięższej pracy) | 2 500 zł | — |
| S03 | Używany telefon z Androidem | 500 zł | — |
| S07 | Grafik – zaliczka | 1 500 zł | B1 |
| S07 | Prawnik – szablon umowy | 300 zł | B1 |
| S08 | Folklorysta – pierwsza konsultacja | 500 zł | B1 |
| S09 | Muzyk – zaliczka | 1 000 zł | B1 |
| S10 | Domena | 200 zł | B1 |
| S10 | Efekty dźwiękowe (plan lub biblioteka) | 100 zł | B1 |
| S11 | Prawnik – przegląd nazwy i marki | 500 zł | B1 |
| S12 | Grafik – odbiór | 2 000 zł | B1 |
| S12 | Muzyk – odbiór | 1 500 zł | B1 |
| S13 | Konta: Apple 99 USD × 2 lata + Google 25 USD | 870 zł | B2 |
| S19 | Prawnik – dokumenty i formularze | 700 zł | B2 |
| S21 | Promocja soft launchu | 300 zł | B3 |
| S25 | Folklorysta – druga konsultacja | 500 zł | B4 |
| S25 | Grafik – poprawki | 1 000 zł | B4 |
| S31 | Promocja premiery | 300 zł | B4 |
| — | Rezerwa (po odliczeniu księgowego: ok. 330 zł) | 730 zł | — |
| | **Razem** | **15 000 zł** | |

Księgowy nie ma osobnej pozycji w biznesplanie. Dwie konsultacje (S20 i S24, razem ok. 400 zł) pokrywa rezerwa.

## 5. Sprinty

### S01 · 2–15 XI 2026 · Fundament: repozytorium i fabryka

**Faza:** A. Prototyp · **Twój czas:** 32 h

**Cel:** Repozytorium, narzędzia i potok Qwen → Claude działają; pusty ekran PixiJS uruchamia się w przeglądarce i na telefonie.

**Demo na koniec:** Na telefonie widać ekran PixiJS z APK z CI; `npm test` jest zielone; Qwen wykonuje zadanie próbne w repozytorium gry.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☑ S01-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S01.md` (5 linii) uzupełniona | — | 2 |
| ☑ S01-01 | M | Repozytorium i narzędzia: Git (prywatne), Vite, TypeScript strict, ESLint, Prettier, Vitest, struktura katalogów z dodatku A | Claude | Polecenia `npm run dev`, `test`, `lint`, `typecheck` i `build` działają od zera po `npm ci`; strict bez wyjątków | — | 3 |
| ☑ S01-02 | M | Potok Qwena w repozytorium: skrypt `tools/qwen-run.mjs` (port z benchmarku), `CLAUDE.md` dla Qwena, szablon specyfikacji zadania, lista chronionych plików | Claude | Zadanie próbne wykonane przez Qwena na twoim laptopie: testy zielone, raport w `results/` | — | 4 |
| ☑ S01-03 | M | Schemat danych symboli (Żywioł, Forma, Przymiot) z kosztami mocy i walidacją wczytywania | Claude | Błędny plik danych kończy się czytelnym błędem z nazwą pola; test na 3 przykładowych symbolach | — | 2 |
| ☑ S01-04 | M | Generator liczb losowych z ziarnem (PCG32): next, int, pick, shuffle | Qwen | Ten sam ciąg dla ziarna 20261102 w Node, Chromium i WebKit (test Playwright); w `src/` zero użyć `Math.random` | S01-02 | 2 |
| ☑ S01-05 | M | Szkielet aplikacji: menedżer ekranów, pętla PixiJS v8, nakładka UI w HTML, magistrala zdarzeń | Claude | Dwa ekrany testowe przełączają się bez wycieków (test liczby obiektów po 100 przełączeniach) | S01-01 | 3 |
| ☑ S01-06 | M | Lokalizacja: i18next z ICU, pliki `pl.json` i `en.json`, typowane klucze, reguła lint „zero tekstu w kodzie interfejsu” | Qwen | „1 karta, 2 karty, 5 kart” poprawnie w PL; lint odrzuca literał tekstowy w komponencie UI | S01-02 | 2,5 |
| ☑ S01-07 | M | CI w GitHub Actions: lint, typecheck, testy i build web przy każdym pushu | Claude | Zielony pipeline na gałęzi `main`; build web poniżej 5 minut | S01-01 | 2 |
| ☑ S01-08 | M | Capacitor: platforma Android, debugowy APK budowany w CI | Claude | APK instaluje się na twoim telefonie i pokazuje ekran PixiJS | S01-05, S01-07 | 3 |
| ☑ S01-09 | M | Licencje modeli i spis wkładu AI: `docs/ai-provenance.md` (FLUX.2 klein 4B – Apache 2.0, ACE-Step 1.5 – MIT), zasada „co zrobił człowiek, co AI” | Ty | Plik istnieje, zasada opisana w README; modele FLUX.2 klein 9B i dev wykluczone z projektu | — | 1,5 |
| ☑ S01-10 | M | Konta bez opłat: prywatne repozytorium, projekt Supabase w regionie UE, roboczy serwer Discord, skrzynka e-mail projektu | Ty | Dane dostępowe w menedżerze haseł; żadnych kluczy w repozytorium | — | 2 |
| ☑ S01-11 | M | Zamrożenie zakresu MVP z Claude: lista 5 żywiołów × 6 form × 5 przymiotów z kosztami mocy (`docs/gdd-mvp.md`) | Ty | 150 kombinacji policzonych, lista zatwierdzona przez ciebie | — | 4 |
| ☑ S01-12 | S | Rytm pracy: stały kalendarz 15–20 h tygodniowo | Ty | Kalendarz na 4 tygodnie z góry | — | 1 |

### S02 · 16–29 XI 2026 · Rdzeń I: walka bez grafiki

**Faza:** A. Prototyp · **Twój czas:** 33 h

**Cel:** Logika walki działa bez interfejsu: stan, tury, karty, obrażenia, zamiary wroga, Kręgi i Obrzęd.

**Demo na koniec:** Bot rozgrywa w terminalu 1 000 walk z talią Szeptuchy; raport pokazuje odsetek wygranych.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☑ S02-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S02.md` (5 linii) uzupełniona | — | 2 |
| ☑ S02-01 | M | Model stanu walki: niemutowalny stan, jeden reducer akcji, zdarzenia | Claude | Wszystkie zmiany stanu przechodzą przez reducer; testy z jawnymi wartościami (D20) | S01-03 | 4 |
| ☑ S02-02 | M | Obrażenia z żywiołami: blok, odporności i słabości, przebicie (rozwiązanie sprawdzone w benchmarku 05) | Qwen | Testy z benchmarku zielone; fuzzing względem rozwiązania wzorcowego: 0 rozbieżności | S02-01 | 2,5 |
| ☑ S02-03 | M | Talia: dobieranie, tasowanie z ziarnem, odrzucone, koniec tury (benchmark 06) | Qwen | Testy zielone; ta sama talia dla tego samego ziarna; ręka nie przekracza 5 (`HAND_LIMIT`) | S01-04 | 2,5 |
| ☑ S02-04 | M | Żar (3 na turę), koszty kart, limit 5 kart w ręce | Qwen | Testy: nie można zagrać karty ponad Żar; koszty kart | S02-01 | 2 |
| ☑ S02-05 | M | Zamiar wroga: wybór działania z wag i warunków, cooldowny (benchmark 07) | Qwen | Testy zielone; fuzzing 0 rozbieżności; zamiar zawsze widoczny w stanie | S02-01 | 2,5 |
| ☑ S02-06 | M | Tura wroga: rozstrzygnięcie zamiarów i kolejność działań (benchmark 10) | Qwen | Testy zielone; wynik tury niezależny od kolejności kluczy w obiektach; akcje `direct` omijają Kręgi (D13) | S02-05 | 2,5 |
| ☑ S02-07 | M | Kręgi (3 miejsca): przyzywanie istot, ataki istot, kolejność akcji | Claude | Scenariusze K1–K10 i R1–R7 z `docs/zasady-walki.md` (np. istota ginie, Krąg zwalnia się); Obrzęd raz na walkę (D14) | S02-01 | 4 |
| ☑ S02-08 | M | Obrzęd: trzy istoty tego samego żywiołu w Kręgach, raz na walkę (benchmark 03) | Qwen | Testy zielone; Obrzęd nie odpala drugi raz w tej samej walce | S02-07 | 2 |
| ☑ S02-09 | M | Bot testowy (heurystyczny gracz) i CLI do symulacji tysięcy walk z raportem | Claude | `npm run sim -- --games 1000` kończy się w mniej niż 60 s i zapisuje CSV | S02-07 | 4 |
| ☑ S02-10 | M | Gra na papierze: 3 walki wg zasad GDD na kartkach, lista rzeczy, które nie działają | Ty | `docs/papier-S02.md` z minimum 10 uwagami | — | 3 |
| ☑ S02-11 | M | Wartości bazowe: zdrowie gracza i Leszego, obrażenia kart startowych (`src/data/balance.json`, D15) | Ty | Plik zatwierdzony; symulacja daje 30–70% wygranych | S02-09 | 2 |

### S03 · 30 XI – 13 XII 2026 · Rdzeń II: dane 150 istot i Warsztat

**Faza:** A. Prototyp · **Twój czas:** 34 h · **Wydatki:** Używany telefon z Androidem: 500 zł

**Cel:** Dane 150 istot, kody, legendy, efekty form i przymiotów oraz logika Warsztatu; pierwszy pomiar na telefonie z 2021 roku.

**Demo na koniec:** Symulacja balansu pokazuje win-rate dla każdej z 150 istot; APK działa na telefonie testowym.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☑ S03-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S03.md` (5 linii) uzupełniona | — | 2 |
| ☑ S03-01 | M | Dane MVP: 5 żywiołów, 6 form, 5 przymiotów z kosztami i efektami (JSON) wg `docs/gdd-mvp.md` | Claude | Wczytuje się bez błędów; budżet mocy 10 dla każdej z 150 kombinacji sprawdza zwykły test jednostkowy `tests/data/mvp-data.test.ts` (D32); efekty symboli opisuje `docs/efekty-symboli.md` (D23); zastępuje przejściowy `src/data/symbols.json` (D16) | S01-03, S01-11 | 3 |
| ☑ S03-02 | M | Ocena istoty i lista dostępnych istot (benchmark 02) | Qwen | Testy zielone; lista zgodna ze spisem z danych MVP | S03-01 | 2,5 |
| ☑ S03-03 | M | Kod istoty: 7 znaków, kodowanie, dekodowanie i suma kontrolna (benchmark 08) | Qwen | Round-trip na 20 000 losowych istot; literówka w jednym znaku wykryta; znaki mylące (0/O, 1/I) obsłużone | S03-01 | 2,5 |
| ☑ S03-04 | M | Legenda z szablonów zdań PL i EN z rodzajem gramatycznym formy (benchmark 04) | Qwen | Dla 150 istot legenda bez pustych miejsc i błędów zgody rodzaju | S03-01 | 3 |
| ☑ S03-05 | M | System efektów: haki zdarzeń (przyzwanie, atak, obrażenia, koniec tury) i kolejność rozstrzygania | Claude | Efekty dodawane jako dane i mała funkcja; scenariusze 1–10 w `tests/combat/effects.test.ts` i E1–E10 w `docs/zasady-walki.md` | S02-01 | 5 |
| ☑ S03-06 | M | Synergie pięciu żywiołów: Ogień, Woda, Ziemia, Wiatr, Grom | Qwen | Każda synergia ma test wg `docs/efekty-symboli.md`, `tests/data/symbol-synergies.test.ts` (np. Grom przeskakuje na drugi cel; D24, D25) | S03-01 | 4 |
| ☑ S03-07 | M | Warsztat – logika: wybór trzech symboli, podgląd statystyk, koszt Atramentu, zwrot karty i reszty Atramentu (talia w stanie przebiegu, S06; D30) | Claude | Niedozwolone kombinacje odrzucane z komunikatem (klucz i18n); stan niemutowalny | S03-02 | 3 |
| ☑ S03-08 | M | Test balansu: boty grają tysiące walk (`npm run balance`), raport win-rate na istotę | Claude | CSV z win-rate dla 150 istot w `sim-results/`; wyróżnia istoty poza przedziałem 35–65% (D27) | S03-06, S02-09 | 4 |
| ☐ S03-09 | M | Używany telefon z Androidem z ok. 2021 r. (klasa Galaxy A52): zakup, pierwszy build, pomiar klatek | Ty | APK z S01 działa na telefonie; wynik FPS zapisany jako punkt odniesienia | — | 3 |
| ☐ S03-10 | S | Test na papierze: 10 najciekawszych i 10 najnudniejszych kombinacji, notatki do balansu | Ty | `docs/balans-notatki.md` z 20 pozycjami | S03-01 | 2 |

### S04 · 14–27 XII 2026 · Prototyp UI: walka na telefonie

**Faza:** A. Prototyp · **Twój czas:** 31 h

**Cel:** Walka w pionie jest grywalna na telefonie: Kręgi, ręka kart, zamiary wroga, podstawowe animacje, zastępcza grafika.

**Demo na koniec:** Cała walka z Leszym rozgrywana palcem na telefonie testowym.

> Sprint przypada na święta: zaplanowano tylko ok. 30 godzin.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☑ S04-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S04.md` (5 linii) uzupełniona | — | 2 |
| ☑ S04-01 | M | Układ walki w pionie: Kręgi u góry, ręka pod kciukiem, zdrowie, Żar, koniec tury, zamiar wroga | Claude | Ekran 360×800 dp; wszystkie sterowania w zasięgu kciuka; pola dotyku ≥ 48 dp | S02-01 | 4 |
| ☑ S04-02 | M | Karty w ręce: wachlarz, wybór dotknięciem, przeciąganie na Krąg, anulowanie | Qwen | Test E2E (Playwright, dotyk): zagranie karty z ręki do Kręgu zmienia stan zgodnie z logiką | S04-01 | 3 |
| ☑ S04-03 | M | Warstwowy renderer istoty (tło żywiołu, sylwetka formy, nakładka przymiotu) z grafikami zastępczymi | Qwen | 150 istot rysuje się z 3 warstw; grafiki zastępcze wektorowe, 0 bajtów atlasu (D38) | S03-01 | 3 |
| ☑ S04-04 | M | Ikony żywiołów (wielokąty w danych, rysowane w PixiJS) rozróżnialne kształtem, nie tylko kolorem | Qwen | Pięć żywiołów odróżnialnych w skali szarości (test wizualny) | — | 2 |
| ☑ S04-05 | M | Animacje podstawowe: zagranie karty, atak, obrażenia, śmierć istoty; budżet czasu klatki | Claude | 60 kl./s na telefonie testowym w walce z 3 istotami; animacje wyłączalne flagą | S04-01 | 4 |
| ☐ S04-06 | M | Testy wizualne Playwright (Chromium; WebKit bez WebGL jest zawodny, D39): zrzuty walki w trzech rozmiarach | Claude | Po zatwierdzeniu wzorców z CI: CI porównuje zrzuty ze wzorcami; różnica powyżej 1% blokuje | S04-01 | 3 |
| ☑ S04-07 | M | Pętla gry: łączenie logiki z interfejsem; walka z Leszym (3 zamiary, wersja robocza) | Claude | Można rozegrać całą walkę do końca na telefonie | S04-01, S04-02 | 4 |
| ☑ S04-08 | M | Ekran końca walki (szkic): wygrana, porażka, przycisk dalej | Qwen | Obie ścieżki pokryte testem E2E | S04-07 | 2 |
| ☑ S04-09 | S | Granie na telefonie przez 3 wieczory; lista 20 problemów (błędy i odczucia) | Ty | `docs/playtest-S04.md` | S04-07 | 4 |

### S05 · 28 XII 2026 – 10 I 2027 · Rezerwa i przygotowanie testów bramki 1

**Faza:** A. Prototyp · **sprint rezerwowy** · **Twój czas:** 16,5 h

**Cel:** Zaległości z S01–S04 domknięte, 10 testerów umówionych, prototyp dostępny dla każdego bez instalatora developerskiego.

**Demo na koniec:** Osoba spoza projektu uruchamia prototyp z linku (web) i z APK.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S05-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S05.md` (5 linii) uzupełniona | — | 1 |
| ☐ S05-01 | M | Zaległości z S01–S04 (`docs/zaleglosci.md`) | Ty | Lista pusta albo przeniesiona z uzasadnieniem | — | 6 |
| ☐ S05-02 | M | Rekrutacja 10 testerów do bramki 1 (w tym min. 3 osoby bez doświadczenia z deckbuilderami) | Ty | 10 nazwisk z potwierdzonym terminem | — | 2 |
| ☐ S05-03 | M | Dystrybucja prototypu (GitHub Pages, D45): wersja web pod stałym adresem (iPhone przez przeglądarkę) i APK do pobrania; instrukcja dla testerów | Claude | Oba warianty uruchomione przez osobę niezwiązaną z projektem | — | 3 |
| ☐ S05-04 | M | Plan testu bramki 1: scenariusz 30 minut, ankieta (czy chcesz grać dalej, co było niejasne) | Ty | `docs/test-b1.md`; ankieta w formularzu bez danych osobowych | — | 2 |
| ☐ S05-05a | S | Dziennik walk testera: czysty moduł `src/core/telemetry/log.ts` (tworzenie, dopisywanie, serializacja, odczyt) | Qwen | Test `S05-05a` zielony; format pliku zgodny ze specyfikacją | — | 0,5 |
| ☐ S05-05b | S | Telemetria lokalna prototypu: czas walki, liczba tur, wynik – tylko w buildzie testera (D46), eksport przez schowek i plik | Claude | Plik JSON po sesji; brak wysyłania przez sieć (test E2E i test źródeł) | S05-05a | 1 |
| ☐ S05-06 | S | Rozgrzewka serwera Vite przed testami E2E (retro S04) | Claude | `npm run test:e2e` bez przekroczeń czasu na zimnym serwerze | — | 0,5 |

### S06 · 11–24 I 2027 · Prototyp do testu: pełna krótka wyprawa

**Faza:** A. Prototyp · **Twój czas:** 32,5 h

**Cel:** Prototyp 8–10 minut: trzy walki, Leszy, wybór nagrody, minimalny Warsztat. Test z 10 osobami i decyzja bramki 1.

**Demo na koniec:** Wynik testu z 10 osobami i zapisana decyzja.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S06-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S06.md` (5 linii) uzupełniona | — | 2 |
| ☐ S06-01 | M | Prototyp pionowy: krótka wyprawa (3 walki + Leszy), wybór nagrody po walce | Claude | Pełna pętla 8–10 minut bez zawieszeń na telefonie testowym | S04-07 | 4 |
| ☐ S06-02 | M | Minimalny Warsztat: wybór 3 symboli z 12 odblokowanych, podgląd, dodanie do talii | Qwen | Test E2E: utworzenie istoty i użycie jej w następnej walce | S03-07 | 3 |
| ☐ S06-03 | M | Nagrody: wybór 1 z 3 kart po walce, losowanie z ziarna | Qwen | Ta sama wyprawa dla tego samego ziarna | — | 2,5 |
| ☐ S06-04 | M | Efekty „soku”: drżenie ekranu, błyski trafień, liczby obrażeń; dźwięki tymczasowe z bibliotek CC0 | Qwen | Licencje dźwięków w `docs/`; wszystkie efekty wyłączalne | — | 3 |
| ☐ S06-05 | M | Sesje testowe z 10 osobami po 30 minut (obserwacja bez podpowiadania) i ankieta | Ty | 10 wypełnionych ankiet i notatki z obserwacji | S06-01, S06-02 | 8 |
| ☐ S06-06 | M | Analiza wyników bramki 1 z Claude i decyzja według progu z biznesplanu | Ty | `docs/bramka-1.md`: ilu testerów chce grać dalej, 5 największych problemów, decyzja | S06-05 | 3 |
| ☐ S06-07 | M | Decyzja finansowa: tak → zlecenia dla grafika i muzyka (budżet od S7); nie → dwa sprinty na zmianę walki | Ty | Decyzja zapisana w `docs/bramka-1.md` | S06-06 | 1 |
| ☐ S06-08 | S | Naprawa 5 największych problemów z testów (jeśli mieszczą się w sprincie) | Claude | Problemy zamknięte lub przeniesione do S07 z uzasadnieniem | S06-06 | 4 |
| ☐ S06-09 | S | Zrzuty i krótkie nagranie ekranu prototypu jako pierwszy materiał promocyjny | Ty | Klip 20–30 s i 5 zrzutów w `marketing/` | — | 2 |

#### Bramka B1 · koniec S06 · 24 I 2027 — Prototyp bawi testerów

| Wskaźnik | Jeśli tak | Jeśli nie |
|---|---|---|
| Co najmniej 7 z 10 testerów chce grać dalej (ankieta po 30 minutach gry). | Zlecenia dla grafika i muzyka (S7, S9); początek wydatków z budżetu. | Dwa sprinty na zmianę walki i ponowny test; drugi brak = koniec projektu. Plan przesuwa się o dwa sprinty, bufory (S10, S15) wchłaniają część opóźnienia, resztę rozstrzyga przegląd harmonogramu. |

### S07 · 25 I – 7 II 2027 · Styl i Warsztat: początek vertical slice

**Faza:** B. Vertical slice · **Twój czas:** 32 h · **Wydatki:** Grafik – zaliczka: 1 500 zł; Prawnik – szablon umowy: 300 zł

**Cel:** Umowa z grafikiem i pierwsza partia grafik; ekran Warsztatu z warstwowym renderem; zapis gry w wersji pierwszej.

**Demo na koniec:** Warsztat na telefonie: tworzysz istotę w trzech dotknięciach, zamykasz aplikację, wracasz do tego samego stanu.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S07-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S07.md` (5 linii) uzupełniona | — | 2 |
| ☐ S07-01 | M | Wybór grafika i umowa: zakres 25 grafik bazowych, terminy S7–S12, przeniesienie praw na piśmie z polami eksploatacji, zgoda na trenowanie modelu na jego pracach | Ty | Podpisana umowa; szablon sprawdzony przez prawnika (ok. 300 zł z puli 1 500 zł) | — | 4 |
| ☐ S07-02 | M | Brief techniczny dla grafika: formaty, rozmiary warstw, paleta, nazewnictwo, szablon w Krita | Claude | Grafik potwierdza zrozumienie; jedna próbna grafika zaakceptowana | S07-01 | 2 |
| ☐ S07-03 | M | Potok zasobów: atlasy, kompresja tekstur, manifest, budżet rozmiaru (alarm w CI powyżej 120 MB) | Claude | CI wypisuje rozmiar paczki; przekroczenie budżetu blokuje | — | 4 |
| ☐ S07-04 | M | Zapis gry v1: stan wyprawy i profilu (Capacitor Preferences / IndexedDB), wersjonowanie schematu, kopia poprzedniego zapisu | Qwen | Zabicie aplikacji w losowym momencie walki → wznowienie od ostatniego węzła (test) | — | 4 |
| ☐ S07-05 | M | Warsztat – ekran: siatka symboli, podgląd istoty, pasek mocy (10 punktów), animacja powstania | Qwen | Playwright: utworzenie istoty w 3 dotknięciach | S06-02 | 4 |
| ☐ S07-06 | M | Profil gracza: Atrament, odblokowane symbole (12 z 16 w MVP na start), rangi spisywacza; ekonomia z GDD w pliku danych | Claude | Odblokowanie symbolu kosztuje 100–300 Atramentu; testy przepływów | — | 4 |
| ☐ S07-07 | M | Pierwsza partia: 5 teł żywiołów i 6 sylwetek form | Grafik | Pliki źródłowe w `art/source/`; spis wkładu w `docs/ai-provenance.md` | S07-01 | 3 |
| ☐ S07-08 | S | Poprawki balansu po bramce 1: 10 zmian w `data/balance.json` według notatek z testów | Ty | Symulacja potwierdza zmiany; wpis w dzienniku zmian | — | 3 |
| ☐ S07-09 | M | Raport statusu: `docs/status.md` generowany z listy zadań | Claude | Raport pokazuje ukończone i otwarte zadania sprintów | — | 2 |

### S08 · 8–21 II 2027 · Mapa, bossowie i Tropy

**Faza:** B. Vertical slice · **Twój czas:** 34 h · **Wydatki:** Folklorysta – pierwsza konsultacja: 500 zł

**Cel:** Mapa wyprawy z ziarna, węzły (karczma, ognisko, kapliczka, warsztat), zasady bossów od folklorysty, pierwsza wersja Tropów i środowisko LoRA.

**Demo na koniec:** Przechodzisz mapę Boru dotknięciami; Leszy zapętla mapę, dopóki nie zagrasz „Odwróconej odzieży”.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S08-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S08.md` (5 linii) uzupełniona | — | 2 |
| ☐ S08-01 | M | Konsultacja zasad bossów i elit: Leszy, Utopiec, Południca, Strzyga, Licho – wierzenie, źródło, zasada walki; ustalenie, że krótkie scenariusze filmów „Prawdziwe legendy” sprawdza w ramach tej samej puli | Folklorysta | 5 kart w `docs/folklor/` z wierzeniem, źródłem bibliograficznym i zatwierdzoną zasadą | — | 3 |
| ☐ S08-02 | M | Generator mapy wyprawy z ziarna: 6–8 węzłów, rozgałęzienia bez przecinających się krawędzi, typy węzłów (algorytm z benchmarku 09 – Qwen go nie zaliczył) | Claude | Testy właściwości na 10 000 ziaren: spójność, brak przecięć, każdy węzeł osiągalny, boss na końcu; ta sama mapa w Node, Chromium i WebKit | S01-04 | 5 |
| ☐ S08-03 | M | Ekran mapy: rysowanie węzłów i ścieżek, wybór następnego węzła, ikony typów, przewijanie | Qwen | Playwright: przejście całej mapy dotknięciami; zapis po każdym węźle | S08-02 | 4 |
| ☐ S08-04 | M | Węzły: karczma (sklep za Grosze), ognisko (odpoczynek lub ulepszenie), kapliczka (wydarzenie), warsztat w wyprawie | Qwen | Każdy węzeł ma logikę i test; Grosze zerowane po wyprawie | S08-02 | 5 |
| ☐ S08-05 | M | Zasada Leszego: pętla mapy do czasu zagrania karty „Odwrócona odzież” | Claude | Test: bez karty mapa się zapętla, z kartą kraina się kończy; komunikat na ekranie | S08-02, S08-01 | 3 |
| ☐ S08-06 | M | Środowisko treningu LoRA dla FLUX.2 klein 4B na laptopie (skrypt, zbiór próbny) | Claude | Cztery warstwy próbne wygenerowane w czasie poniżej 2 minut na obraz; licencja Apache 2.0 potwierdzona | — | 4 |
| ☐ S08-07 | M | Druga partia: 5 nakładek przymiotów i ikona wstępna | Grafik | Pliki źródłowe i eksport; wpis w spisie wkładu | S07-07 | 2 |
| ☐ S08-08 | S | Tropy – projekt: 3 typy (ślad, relacja, pieśń) i ich wpływ na bossa | Ty | `docs/tropy.md` zatwierdzony | S08-01 | 3 |
| ☐ S08-09 | M | Tropy – logika: zbieranie, odsłanianie wzorca bossa, obrzęd ochronny po trzech Tropach | Qwen | Testy dla 0–3 Tropów | S08-08 | 3 |

### S09 · 22 II – 7 III 2027 · Powłoka aplikacji: splash, menu, ustawienia, dźwięk

**Faza:** B. Vertical slice · **Twój czas:** 33,5 h · **Wydatki:** Muzyk – zaliczka: 1 000 zł

**Cel:** Pierwsze ekrany standardowej aplikacji: splash, menu główne, nawigacja, ustawienia, układy pion/poziom/tablet, dźwięk i haptyka.

**Demo na koniec:** Aplikacja startuje splashem, otwiera menu, działa w pionie i poziomie, ma muzykę i ustawienia, które przetrwają restart.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S09-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S09.md` (5 linii) uzupełniona | — | 2 |
| ☐ S09-01 | M | Muzyk: wybór, umowa na piśmie (przeniesienie praw, pola eksploatacji), brief (lira korbowa lub fidel; motyw przewodni i 3 partie) | Ty | Podpisana umowa i harmonogram S9–S12 | — | 3 |
| ☐ S09-02 | M | Szkice motywów krain w ACE-Step 1.5 (3 krainy × 2 warianty) jako materiał poglądowy dla muzyka | Claude | 6 plików po 30–60 s w `audio/draft/`; wpis w spisie wkładu | — | 3 |
| ☐ S09-03 | M | Silnik audio: muzyka warstwowa reagująca na walkę, miksowanie (muzyka, efekty), wyciszenie w tle, tryb cichy iOS | Qwen | Test ręczny na obu systemach: telefon dzwoni → muzyka wstrzymana i wraca | — | 4 |
| ☐ S09-04 | M | Haptyka: wzory dla pięciu żywiołów (Grom – krótki impuls, Woda – łagodna fala), wyłącznik | Qwen | 5 wzorów; urządzenia bez wibracji nie zgłaszają błędu | — | 3 |
| ☐ S09-05 | M | Menedżer układów: pion, poziom telefonu, tablet, bezpieczne strefy, obrót bez przerywania walki | Claude | Obrót w trakcie walki nie zmienia stanu; zrzuty w 6 rozmiarach (telefon, tablet, składany) | S04-01 | 5 |
| ☐ S09-06 | M | Splash natywny i ekran ładowania (logo, pasek), ekran powitalny przy pierwszym uruchomieniu (wybór języka, „Zaczynam” → samouczek), ikona zastępcza adaptacyjna | Qwen | Start do menu poniżej 3 s na telefonie 2021 (pomiar); pierwsze uruchomienie pokazuje ekran powitalny, kolejne nie | — | 3,5 |
| ☐ S09-07 | M | Menu główne i nawigacja: Graj/Kontynuuj, Warsztat, Księga Bestii, Wyzwanie Dnia, Sklep, Ustawienia; przycisk Wstecz | Qwen | Pozycje prowadzą do ekranów-zaślepek; Wstecz Androida z menu pyta o wyjście | — | 4 |
| ☐ S09-08 | M | Ustawienia v1: język, głośność muzyki i efektów, haptyka, tryb oszczędny 30 kl./s, skala tekstu | Qwen | Ustawienia zapisują się i działają po restarcie | S07-04 | 4 |
| ☐ S09-09 | M | Trzecia partia: tła krain (Bór, Bagna, Pola) i sylwetka Leszego | Grafik | Pliki źródłowe i eksport | — | 2 |

### S10 · 8–21 III 2027 · Rezerwa: nazwa, domena, dźwięki

**Faza:** B. Vertical slice · **sprint rezerwowy** · **Twój czas:** 20 h · **Wydatki:** Domena: 200 zł; Efekty dźwiękowe (plan lub biblioteka): 100 zł

**Cel:** Sprawdzenie nazwy, domena i strona gry z listą mailową, efekty dźwiękowe i pomiar wydajności; miejsce na zaległości.

**Demo na koniec:** Strona gry działa pod własną domeną; lista zaległości z S07–S09 pusta.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S10-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S10.md` (5 linii) uzupełniona | — | 1 |
| ☐ S10-01 | M | Sprawdzenie nazwy „Bestiariusz”: UPRP, EUIPO, App Store, Google Play, itch.io, domeny | Ty | `docs/nazwa.md`; decyzja: zostaje albo zmiana | — | 3 |
| ☐ S10-02 | M | Domena i strona gry (opis, zrzuty, zapis na listę mailową bez śledzenia) | Ty | Strona po HTTPS; zapis na listę z potwierdzeniem; szkic polityki prywatności strony | S10-01 | 5 |
| ☐ S10-03 | S | Efekty dźwiękowe: wybór i generowanie 20 podstawowych, miks i normalizacja głośności | Claude | Paczka poniżej 8 MB; licencje w `docs/` | — | 3 |
| ☐ S10-04 | M | Zaległości z S07–S09 (`docs/zaleglosci.md`) | Ty | Lista pusta albo przeniesiona z uzasadnieniem | — | 5 |
| ☐ S10-05 | S | Pomiar wydajności i pamięci na telefonie 2021; 5 największych kosztów klatki | Claude | `docs/perf-S10.md`; budżet RAM 500 MB sprawdzony | — | 3 |

### S11 · 22 III – 4 IV 2027 · Księga Bestii, kody istot, samouczek, pauza

**Faza:** B. Vertical slice · **Twój czas:** 35 h · **Wydatki:** Prawnik – przegląd nazwy i marki: 500 zł

**Cel:** Księga Bestii, udostępnianie karty z kodem i QR, wklejanie kodu, Tropy w interfejsie, samouczek, pauza; przegląd prawny nazwy i zasad wobec marki.

**Demo na koniec:** Wysyłasz sobie kartę istoty z jednego telefonu na drugi i dodajesz ją jako Gościa; nowa osoba przechodzi samouczek.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S11-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S11.md` (5 linii) uzupełniona | — | 2 |
| ☐ S11-01 | M | Przegląd nazwy i zasad wobec marki Wiedźmin (lista zakazanych nazw, grafik, słów kluczowych), szkic regulaminu oraz polityki prywatności strony i demo | Prawnik | Pisemne uwagi prawnika; poprawki wprowadzone (500 zł z puli) | S10-01 | 3 |
| ☐ S11-02 | M | Księga Bestii – ekran: siatka 150 istot, nieodkryte jako cienie, filtr żywiołu, strona istoty z legendą | Qwen | Playwright: otwarcie strony istoty; na tablecie rozkładówka | S03-04 | 5 |
| ☐ S11-03 | M | Udostępnianie karty: obrazek 1080 × 1350 z ilustracją, legendą, kodem i QR; systemowe menu Udostępnij | Qwen | Obrazek generowany lokalnie w poniżej 1 s; kod także tekstem obok QR | S03-03 | 4 |
| ☐ S11-04 | M | Wklejanie kodu istoty: pole, walidacja, podgląd, dodanie jako Gość (1 na wyprawę) | Qwen | Błędny kod → komunikat; poprawny dodaje Gościa w nowej wyprawie | S11-03 | 3 |
| ☐ S11-05 | M | Tropy – ekrany: wioski i kapliczki z wydarzeniami, karty Tropów w dzienniku | Qwen | Playwright: zdobycie 3 Tropów i obrzęd ochronny przed bossem | S08-09 | 4 |
| ☐ S11-06 | M | Samouczek v1: pierwsza walka prowadzona (6 kroków), podpowiedzi kontekstowe, pominięcie dla wracających | Claude | 10 osób spoza projektu kończy samouczek bez pomocy (próba w S12) | — | 4 |
| ☐ S11-07 | M | Pauza w walce: wznów, ustawienia, porzuć wyprawę (z potwierdzeniem), wróć do menu | Qwen | Porzucenie wymaga potwierdzenia; stan zapisany | S09-07 | 3 |
| ☐ S11-08 | M | Ekran Autorów i wersji: autorzy, podwykonawcy, licencje bibliotek (generowane z `package.json`), oznaczenie treści tworzonych z AI, numer wersji i budowy | Qwen | Ekran dostępny z Ustawień; lista licencji powstaje w buildzie; test zgodności z `docs/ai-provenance.md` | S09-08 | 3 |
| ☐ S11-09 | M | Motyw przewodni (wersja robocza) | Muzyk | Plik do akceptacji; uwagi w jednej rundzie | — | 2 |
| ☐ S11-10 | M | Czwarta partia: Utopiec, Strzyga, Licho i ikony interfejsu | Grafik | Pliki źródłowe i eksport | — | 2 |

### S12 · 5–18 IV 2027 · Demo w przeglądarce i bramka 2

**Faza:** B. Vertical slice · **Twój czas:** 32 h · **Wydatki:** Grafik – odbiór: 2 000 zł; Muzyk – odbiór: 1 500 zł

**Cel:** Publiczne demo (Bór, Leszy, Warsztat, Księga, kody istot) na itch.io i stronie gry, Discord, pierwsze filmy, pomiar wydajności.

**Demo na koniec:** Link do demo działa w Chrome, Safari na iPhonie i Firefoxie; Discord jest otwarty.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S12-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S12.md` (5 linii) uzupełniona | — | 2 |
| ☐ S12-01 | M | Tryb demo (flaga): Bór i Leszy, Warsztat, Księga, kody istot; bez zakupów i rankingu; przyciski zapisu na listę i Discord | Claude | Pełne demo 8–10 minut; flaga nie wpływa na wersję pełną | S11-06 | 4 |
| ☐ S12-02 | M | Build web na itch.io i stronę gry: ładowanie poniżej 8 s na 4G, rozmiar poniżej 40 MB, zapis w IndexedDB | Claude | Działa w Chrome, Safari iOS i Firefoxie; zrzuty w CI | S12-01 | 4 |
| ☐ S12-03 | M | Pomiar kryterium bramki 2: 60 kl./s na telefonie 2021 (3 sesje po 10 min), RAM poniżej 500 MB, start poniżej 3 s | Ty | `docs/bramka-2-pomiar.md` z liczbami | S12-02 | 3 |
| ☐ S12-04 | M | Discord: kanały (błędy, kody istot, testy), zasady, powitanie | Ty | Serwer publiczny; zaproszenie na stronie gry | — | 2 |
| ☐ S12-05 | M | Premiera demo: posty na r/roguelites, r/AndroidGaming, polskich forach; informacja prasowa do polskich mediów | Ty | 5 postów i 10 wiadomości do mediów, bez spamu | S12-02 | 4 |
| ☐ S12-06 | M | Pierwszy film „Prawdziwe legendy” (Leszy): scenariusz od Claude, sprawdzony przez folklorystę, montaż | Ty | Film 30–45 s opublikowany na 3 platformach | S08-01 | 4 |
| ☐ S12-07 | M | Zbieranie opinii: formularz w demo i skrypt zapisujący odpowiedzi do arkusza (bez danych osobowych) | Claude | Odpowiedzi trafiają do arkusza | S12-01 | 2 |
| ☐ S12-08 | S | Poprawki z testu samouczka i 10 najczęstszych błędów demo | Qwen | Lista zamknięta lub przeniesiona do S13 | S12-01 | 3 |
| ☐ S12-09 | M | Motyw przewodni (wersja końcowa) i 3 nagrane partie | Muzyk | Odbiór; przeniesienie praw potwierdzone na piśmie | S11-09 | 2 |
| ☐ S12-10 | M | Odbiór 25 grafik bazowych, ikona aplikacji (wersja końcowa) | Grafik | Komplet plików źródłowych; przeniesienie praw potwierdzone; ikona w repozytorium | — | 2 |

#### Bramka B2 · koniec S12 · 18 IV 2027 — Demo i wydajność

| Wskaźnik | Jeśli tak | Jeśli nie |
|---|---|---|
| 60 kl./s na telefonie z 2021 r. (pomiar w S12) oraz 300 osób w społeczności w 6 tygodni od demo (pomiar w S15, do 30 V 2027). | MVP i konta w sklepach. Konta (S13) powstają po spełnieniu pierwszej części; druga część nie wstrzymuje kodu. | Analiza opinii, poprawki demo, mocniejszy marketing treściami (plan filmów w S15). |

### S13 · 19 IV – 2 V 2027 · Konta w sklepach, iOS i kraina Bagna

**Faza:** C. MVP · **Twój czas:** 34 h · **Wydatki:** Konta: Apple 99 USD × 2 lata + Google 25 USD: 870 zł

**Cel:** Konta deweloperskie, buildy iOS (TestFlight) i Android (testy wewnętrzne), kraina Bagna z Utopcem i Strzygą, migracje zapisu.

**Demo na koniec:** Ta sama wersja uruchomiona na iPhonie (TestFlight) i na Androidzie (testy wewnętrzne); wyprawa przez Bór i Bagna.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S13-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S13.md` (5 linii) uzupełniona | — | 2 |
| ☐ S13-01 | M | Konta w sklepach: Apple Developer (99 USD rocznie), Google Play Console (25 USD jednorazowo), weryfikacja tożsamości; wniosek do programu Apple dla małych firm | Ty | Oba konta aktywne, dane w menedżerze haseł; wniosek złożony | — | 3 |
| ☐ S13-02 | M | iOS: projekt w Codemagic (macOS), podpisywanie, build do TestFlight, manifest prywatności | Claude | Build iOS w TestFlight uruchamia się na iPhonie testera | S13-01 | 5 |
| ☐ S13-03 | M | Android: kanał testów wewnętrznych, podpisywanie w Play App Signing, AAB, kontrola rozmiaru | Claude | AAB poniżej 150 MB; instalacja z testów wewnętrznych | S13-01 | 4 |
| ☐ S13-04 | M | Kraina Bagna: dane 6 przeciwników, mapa, tło, muzyka robocza | Qwen | Boty przechodzą krainę z win-rate 40–60% dla talii startowej | — | 4 |
| ☐ S13-05 | M | Boss Utopiec: zasada walki (z konsultacji S8) i logika zamiarów | Claude | Testy zasady; bot rozgrywa walkę do końca | — | 4 |
| ☐ S13-06 | M | Elita Strzyga: dwie dusze, druga faza silniejsza | Claude | Po pokonaniu pierwszej duszy elita wstaje z lepszymi statystykami (test) | — | 3 |
| ☐ S13-07 | M | Migracje zapisu v1→v2, zapisy archiwalne, naprawa uszkodzonego zapisu z kopii | Qwen | 10 zapisów testowych (w tym uszkodzone) wczytuje się bez awarii | S07-04 | 3 |
| ☐ S13-08 | M | Warstwy dla Bagien: generowanie w FLUX.2 klein 4B z LoRA, wybór i retusz w Krita; spis wkładu | Ty | Tło, Utopiec, Strzyga i 6 przeciwników w stylu bazowym; wpis w `docs/ai-provenance.md` | S08-06 | 3 |
| ☐ S13-09 | S | Test iOS na dwóch urządzeniach (własne i znajomych) | Ty | Lista różnic względem Androida | S13-02 | 3 |

### S14 · 3–16 V 2027 · Licho, wydarzenia i podsumowanie wyprawy

**Faza:** C. MVP · **Twój czas:** 35 h

**Cel:** Elita Licho, silnik wydarzeń z wyborami moralnymi, karczma i ognisko, ekran podsumowania wyprawy, rangi spisywacza i trzy poziomy Klątw.

**Demo na koniec:** Pełna wyprawa przez Bór i Bagna kończy się ekranem podsumowania z nagrodą Atramentu.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S14-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S14.md` (5 linii) uzupełniona | — | 2 |
| ☐ S14-01 | M | Elita Licho: zasada walki i dane | Qwen | Testy zasady; bot przechodzi walkę | — | 3 |
| ☐ S14-02 | M | Wydarzenia w kapliczkach: wybory moralne z konsekwencjami w dalszej części wyprawy (oszczędzony potwór wraca jako sojusznik lub zagrożenie) | Claude | 12 wydarzeń w danych; testy rozgałęzień i konsekwencji | — | 5 |
| ☐ S14-03 | M | Teksty: 12 wydarzeń, opisy bossów i krain (PL) | Claude | Teksty w plikach tłumaczeń; wersja do przeglądu folklorysty w S25 | S14-02 | 4 |
| ☐ S14-04 | M | Karczma i ognisko – ekrany: sklep, leczenie, usuwanie kart, ulepszanie | Qwen | Playwright: kupno, usunięcie karty i ulepszenie w jednej wyprawie | — | 4 |
| ☐ S14-05 | M | Ekran podsumowania wyprawy: Atrament, nowo odkryte istoty, postęp rang spisywacza | Qwen | Atrament 40–80 za wyprawę (test na botach) | — | 4 |
| ☐ S14-06 | M | Rangi spisywacza (10) i poziomy Klątw 1–3 (3 z 10 w MVP) | Claude | Wybór poziomu wpływa na parametry wyprawy; testy | — | 4 |
| ☐ S14-07 | S | Granie całą wyprawą 3 razy; lista uwag o balansie i odczuciach | Ty | `docs/playtest-S14.md` | — | 4 |
| ☐ S14-08 | M | Warstwy dla Licha i interfejsu mapy (LoRA, wybór, retusz) | Ty | Gotowe do wczytania w grze | — | 2 |
| ☐ S14-09 | M | Legendy ręczne 1–10: Claude proponuje, ty redagujesz (nagroda za odkrycie wyjątkowych kombinacji) | Ty | 10 legend w `data/legends-manual.json` PL (EN w S17–S19) | — | 3 |

### S15 · 17–30 V 2027 · Rezerwa i pomiar bramki 2 (społeczność)

**Faza:** C. MVP · **sprint rezerwowy** · **Twój czas:** 20 h

**Cel:** Pomiar drugiego kryterium bramki 2 (300 osób w 6 tygodni od demo), zaległości, poprawki z opinii i test iOS całej wyprawy.

**Demo na koniec:** Raport bramki 2 z liczbami; lista zaległości pusta.

> Druga część bramki 2 (społeczność). Pierwsza część (60 kl./s) została sprawdzona w S12, dlatego konta w sklepach powstały w S13.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S15-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S15.md` (5 linii) uzupełniona | — | 1 |
| ☐ S15-01 | M | Pomiar celu bramki 2: liczba osób w społeczności po 6 tygodniach od demo (cel 300), analiza opinii | Ty | `docs/bramka-2.md` z liczbami i decyzją | — | 3 |
| ☐ S15-02 | M | Zaległości z S13–S14 (`docs/zaleglosci.md`) | Ty | Lista pusta albo przeniesiona z uzasadnieniem | — | 6 |
| ☐ S15-03 | S | Poprawki demo i plan czterech filmów, jeśli społeczność poniżej progu | Claude | Plan filmów w `marketing/`; poprawki z opinii zamknięte | S15-01 | 4 |
| ☐ S15-04 | S | Test iOS: pełna wyprawa na iPhonie, lista różnic z Androidem | Ty | Różnice zgłoszone jako zadania | — | 3 |
| ☐ S15-05 | S | Legendy ręczne 11–20 | Ty | 10 legend w `data/legends-manual.json` | S14-09 | 3 |

### S16 · 31 V – 13 VI 2027 · Pola, Południca i Wyzwanie Dnia (klient)

**Faza:** C. MVP · **Twój czas:** 35 h

**Cel:** Kraina Pola z zagadkami Południcy, klient Wyzwania Dnia (to samo ziarno wszędzie), balans trzech krain.

**Demo na koniec:** Dwa telefony z różnymi systemami dostają tę samą wyprawę dnia; pełna wyprawa przez trzy krainy trwa 20–25 minut.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S16-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S16.md` (5 linii) uzupełniona | — | 2 |
| ☐ S16-01 | M | Kraina Pola i boss Południca: zagadki co trzecią turę rozwiązywane kartą, kara za złą odpowiedź | Claude | 20 zagadek w danych (PL); testy; bot rozgrywa walkę | — | 6 |
| ☐ S16-02 | M | Pola: 6 przeciwników, tło, mapa, muzyka robocza | Qwen | Boty przechodzą krainę z win-rate 40–60% | — | 4 |
| ☐ S16-03 | M | Wyzwanie Dnia – klient: ziarno z daty (UTC), ta sama talia startowa, zapis wyniku lokalnie, powtórka ruchów | Claude | Dwa urządzenia z różnymi systemami dają identyczną wyprawę; test na 365 datach | S01-04 | 5 |
| ☐ S16-04 | M | Muzyka dla Bagien i Pól: warianty i pętle w ACE-Step na bazie nagranych partii muzyka, wybór i miks | Ty | 2 utwory + pętle bojowe; wpis w spisie wkładu (ludzka partia + AI) | S12-09 | 3 |
| ☐ S16-05 | M | Warstwy dla Pól i Południcy (LoRA, wybór, retusz) | Ty | Gotowe do wczytania w grze | — | 2 |
| ☐ S16-06 | M | Nocne symulacje trzech krain: win-rate wyprawy 25–45% bez Klątwy | Claude | Raport; korekty tylko w plikach danych | S16-02 | 4 |
| ☐ S16-07 | M | Test balansu: cała wyprawa (20–25 min), 5 podejść, notatki | Ty | `docs/playtest-S16.md` | S16-06 | 4 |
| ☐ S16-08 | S | Filmy „Prawdziwe legendy” 2 i 3 (Południca, Utopiec) | Ty | Dwa filmy opublikowane | — | 2 |
| ☐ S16-09 | M | Legendy ręczne 21–30 | Ty | 10 legend w `data/legends-manual.json` | S15-05 | 3 |

### S17 · 14–27 VI 2027 · Zakupy, sklep i angielski interfejs

**Faza:** C. MVP · **Twój czas:** 33 h

**Cel:** Zakup pełnej gry (RevenueCat), ekran sklepu, paywall po pierwszej krainie, zasady ofert, wybór wyprawy z Klątwami i tłumaczenie EN interfejsu.

**Demo na koniec:** Zakup testowy w sandboxie odblokowuje krainy na iPhonie i Androidzie; interfejs działa po angielsku.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S17-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S17.md` (5 linii) uzupełniona | — | 2 |
| ☐ S17-01 | M | Zakupy: RevenueCat (`@revenuecat/purchases-capacitor`), produkt „Pełna gra”, uprawnienia z pamięcią podręczną offline | Claude | Zakup w sandboxie iOS i Android odblokowuje krainy; po restarcie bez sieci nadal odblokowane | S13-02, S13-03 | 6 |
| ☐ S17-02 | M | Ekran sklepu: opis produktu, cena lokalna z RevenueCat, „Przywróć zakupy”, stany błędów (anulowano, brak sieci, oczekujące) | Qwen | Każdy stan ma czytelny komunikat; Playwright z atrapą sklepu | S17-01 | 4 |
| ☐ S17-03 | M | Paywall po pierwszej krainie: zapowiedź kolejnych krain bez presji, wejście ze sklepu i z mapy | Claude | Pierwsza kraina i Wyzwanie Dnia bez zakupu; brak okien w trakcie wyprawy | S17-01 | 3 |
| ☐ S17-04 | M | Zasady ofert: najwyżej jedna oferta na sesję, nigdy w trakcie wyprawy ani po przegranej; personalizacja na urządzeniu | Claude | Testy reguł; żaden profil nie opuszcza urządzenia | S17-03 | 3 |
| ☐ S17-05 | M | Produkty w konsolach sklepów: nazwa, opis, ceny PL/USA; przegląd mechanizmów rodzinnych (Chmura rodzinna Apple, Family Link) | Ty | Produkt widoczny w sandboxie; opis wymienia całą zawartość zakupu | — | 3 |
| ☐ S17-06 | M | Tłumaczenie EN interfejsu: menu, ustawienia, sklep, walka | Claude | 100% kluczy interfejsu w `en.json` | — | 3 |
| ☐ S17-07 | M | Pseudolokalizacja i testy układu: zapas 35% na dłuższe teksty | Qwen | Zrzuty z pseudolokalizacją bez ucięć w 6 rozmiarach | S17-06 | 3 |
| ☐ S17-08 | M | Ekran przygotowania wyprawy: ścieżka Szeptuchy, wybór Klątwy 1–3 lub bez Klątwy, talia | Qwen | Wybór zapisuje się; wyprawa startuje z wybranymi parametrami | S14-06 | 3 |
| ☐ S17-09 | S | Test zakupów na obu platformach z kontami testowymi (w tym brak sieci i anulowanie) | Ty | Lista przypadków w `docs/test-zakupow.md` przejęta w 100% | S17-01 | 3 |

### S18 · 28 VI – 11 VII 2027 · Ranking Wyzwania Dnia, linki i tryb offline

**Faza:** C. MVP · **Twój czas:** 35 h

**Cel:** Serwer rankingu (Supabase UE) z weryfikacją wyniku przez odtworzenie ruchów, ekran Wyzwania Dnia, kolejka offline, linki do wyzwań od znajomych.

**Demo na koniec:** Wynik z telefonu trafia do rankingu; podrobiony zapis ruchów jest odrzucony; link „pokonaj Leszego moją talią” otwiera grę.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S18-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S18.md` (5 linii) uzupełniona | — | 2 |
| ☐ S18-01 | M | Serwer rankingu: tabele, polityki dostępu (RLS), funkcje; anonimowy identyfikator gracza bez e-maila | Claude | Żaden punkt końcowy nie przyjmuje wyniku bez ważnego zapisu ruchów; testy RLS | S01-10 | 5 |
| ☐ S18-02 | M | Weryfikacja wyniku przez odtworzenie zapisu ruchów po stronie serwera (ta sama logika gry) | Claude | Podrobiony wynik odrzucony; 100 przebiegów botów zgodnych | S18-01 | 6 |
| ☐ S18-03 | M | Ekran Wyzwania Dnia: ziarno, odliczanie, najlepsze wyniki, twoje miejsce, wynik jako rząd ikon żywiołów do wklejenia | Qwen | Format wyniku stały; Playwright | S18-02 | 4 |
| ☐ S18-04 | M | Kolejka wyników offline: zapis lokalny, wysyłka po powrocie sieci, ponawianie z limitem | Qwen | 5 wyników offline → wysłane po włączeniu sieci, bez duplikatów | S18-02 | 3 |
| ☐ S18-05 | M | Linki „pokonaj Leszego moją talią”: kod wyzwania, linki uniwersalne (Android App Links, iOS Universal Links), strona zastępcza | Qwen | Link otwiera grę z talią albo sklep, gdy gry brak | — | 5 |
| ☐ S18-06 | M | Baner stanu sieci i obsługa braku sieci na ekranach online | Claude | Każdy ekran online ma stan offline; gra nigdy nie czeka na sieć | — | 2 |
| ☐ S18-07 | M | Nagroda 30 Atramentu za Wyzwanie Dnia i ekran nagrody | Qwen | Nagroda naliczana raz dziennie (test na zmianie dat) | S18-03 | 2 |
| ☐ S18-08 | S | Test rankingu na trzech urządzeniach i próba oszustwa (modyfikacja zapisu) | Ty | Raport w `docs/test-rankingu.md` | S18-02 | 3 |
| ☐ S18-09 | S | Legendy ręczne 31–40 | Ty | 10 legend w `data/legends-manual.json` | S16-09 | 3 |

### S19 · 12–25 VII 2027 · Prawo, prywatność i strony w sklepach

**Faza:** C. MVP · **Twój czas:** 34 h · **Wydatki:** Prawnik – dokumenty i formularze: 700 zł

**Cel:** Polityka prywatności, regulamin, zgody, analityka i raporty awarii za zgodą, usuwanie danych, formularze sklepów, test zamknięty Google Play, angielskie treści.

**Demo na koniec:** Pierwsze uruchomienie pokazuje zgody; gra działa w pełni bez nich; test zamknięty Google Play trwa.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S19-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S19.md` (5 linii) uzupełniona | — | 2 |
| ☐ S19-01 | M | Polityka prywatności, regulamin gry (ranking, nadużycia), przegląd formularzy i umów z podwykonawcami | Prawnik | Dokumenty PL/EN pod stałym adresem; pisemne uwagi (700 zł z puli) | — | 3 |
| ☐ S19-02 | M | Zgody w ekranie powitalnym: wybór języka, polityka, regulamin, osobne przełączniki analityki i raportów awarii (domyślnie wyłączone) | Qwen | Gra działa w pełni bez zgód; ustawienia można zmienić później | — | 4 |
| ☐ S19-03 | M | Analityka własna (zdarzenia anonimowe do Supabase UE) i raportowanie awarii (Sentry UE, bez danych osobowych) – tylko za zgodą | Claude | Bez zgody zero zapytań sieciowych; ze zgodą zdarzenia z listy w `docs/telemetria.md` | S19-02 | 5 |
| ☐ S19-04 | M | Usuń moje dane: kasowanie lokalne i serwerowe (wyniki po anonimowym identyfikatorze) | Claude | Po usunięciu brak wyników w rankingu; test E2E | — | 3 |
| ☐ S19-05 | M | Formularze sklepów: Data safety (Google), etykiety prywatności (Apple), kwestionariusz IARC, wiek, deklaracja szyfrowania | Ty | Formularze zgodne z telemetrią; kopie w `docs/sklepy/` | S19-03 | 5 |
| ☐ S19-06 | M | Test zamknięty Google Play: 12 testerów z Discorda, 14 dni, zaproszenia i przypomnienia | Ty | 12 testerów dołączyło; licznik 14 dni uruchomiony | — | 3 |
| ☐ S19-07 | M | Strony w sklepach (PL i EN): tytuł, opis, słowa kluczowe bez obcych marek, zrzuty ekranu generowane z gry | Ty | Komplet w obu sklepach; brak zakazanych nazw (lista z S11) | — | 4 |
| ☐ S19-08 | M | Tłumaczenie EN treści gry: legendy, wydarzenia, zagadki; paczka dla korekty natywnej | Claude | 100% kluczy w `en.json`; plik dla korektorów | — | 3 |
| ☐ S19-09 | M | Zlecenie korekty EN ochotnikom z Discorda (native speakerzy) | Ty | Dwie osoby potwierdziły; termin do końca S20 | S19-08 | 2 |

### S20 · 26 VII – 8 VIII 2027 · Rezerwa i bramka 3

**Faza:** C. MVP · **sprint rezerwowy** · **Twój czas:** 26,5 h · **Wydatki:** Księgowy – konsultacja (z rezerwy): ok. 250 zł

**Cel:** Bug bash na trzech urządzeniach, poprawki blokerów, audyt dostępności, korekta EN i decyzja o soft launchu.

**Demo na koniec:** Raport bramki 3: awarie, kompletność PL i EN, decyzja.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S20-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S20.md` (5 linii) uzupełniona | — | 1 |
| ☐ S20-01 | M | Bug bash: 5 pełnych wypraw na 3 urządzeniach (Android 2021, nowy Android, iPhone), zgłoszenia w repozytorium | Ty | Lista błędów z priorytetami | — | 6 |
| ☐ S20-02 | M | Poprawki blokerów i błędów krytycznych z bug bashu | Claude | 0 otwartych blokerów; sesje bez awarii ≥ 99,5% w teście zamkniętym | S20-01 | 5 |
| ☐ S20-03 | M | Audyt dostępności: TalkBack i VoiceOver przez menu, ustawienia, mapę i walkę; skala tekstu 200%; kontrast | Ty | Lista usterek; krytyczne naprawione w S20 lub S23 | — | 4 |
| ☐ S20-04 | M | Wprowadzenie poprawek EN od korektorów | Ty | Wszystkie uwagi zamknięte | S19-09 | 2 |
| ☐ S20-05 | M | Konsultacja przed soft launchem: VAT w sprzedaży przez Apple i Google, dokumentowanie przychodu w walutach obcych, koszty sprzed założenia działalności | Księgowy | Pisemne odpowiedzi na 3 pytania z biznesplanu; limit działalności nierejestrowanej sprawdzony dla 2027 r. | — | 1,5 |
| ☐ S20-06 | M | Weryfikacja bramki 3: PL i EN kompletne, sesje bez awarii, test zamknięty 14 dni; decyzja o soft launchu | Ty | `docs/bramka-3.md` | S20-02, S20-04 | 2 |
| ☐ S20-07 | M | Zgłoszenie do produkcji Google (po 14 dniach testu) i do recenzji Apple; dostępność tylko PL i Kanada | Ty | Wnioski złożone; plan na wypadek odrzucenia | S20-06 | 2 |
| ☐ S20-08 | S | Legendy ręczne 41–50 | Ty | Komplet 50 legend w PL; wersje EN od Claude dołączone w tym samym sprincie | S18-09 | 3 |

#### Bramka B3 · koniec S20 · 8 VIII 2027 — Stabilne MVP w PL i EN

| Wskaźnik | Jeśli tak | Jeśli nie |
|---|---|---|
| Sesje bez awarii ≥ 99,5% w teście zamkniętym; PL i EN kompletne. | Soft launch w Polsce i Kanadzie (S21). | Poprawki zamiast nowej zawartości; soft launch przesuwa się o sprint. |

### S21 · 9–22 VIII 2027 · Soft launch: Polska i Kanada

**Faza:** D. Soft launch · **Twój czas:** 34 h · **Wydatki:** Promocja soft launchu: 300 zł

**Cel:** Gra w sklepach w Polsce i Kanadzie, pulpit wskaźników, promocja soft launchu, obsługa opinii i pierwsze hotfixy.

**Demo na koniec:** Dane z pierwszych dni w pulpicie; pierwsze opinie w sklepach mają odpowiedzi.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S21-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S21.md` (5 linii) uzupełniona | — | 2 |
| ☐ S21-01 | M | Wydanie w Polsce i Kanadzie (Google Play, App Store), wersja 0.9.0 | Ty | Gra widoczna w sklepach obu krajów; zakup działa na produkcji (test własnym kontem) | S20-07 | 3 |
| ☐ S21-02 | M | Pulpit soft launchu: widoki SQL w Supabase (D1, D7, D30, sesja, konwersja, udostępnienia, awarie) w jednym arkuszu | Claude | Dane od 1. dnia; definicje w `docs/metryki.md` | — | 5 |
| ☐ S21-03 | M | Promocja soft launchu: kody dla twórców, wpisy na forach, zaproszenia z Discorda | Ty | Wydano nie więcej niż 300 zł; co najmniej 5 twórców dostało kod | S21-01 | 5 |
| ☐ S21-04 | M | Obsługa: odpowiedzi na opinie 2× w tygodniu, skrzynka wsparcia, szablony | Ty | Szablony w `docs/wsparcie.md` | — | 3 |
| ☐ S21-05 | M | Ekran Pomoc: FAQ, formularz zgłoszenia z wersją i logiem (za zgodą), link do Discorda | Qwen | Zgłoszenie dochodzi z numerem wersji; bez danych osobowych | — | 4 |
| ☐ S21-06 | M | Prośba o ocenę w sklepie: po 3. wygranej wyprawie, nigdy po porażce, najwyżej raz na 90 dni | Qwen | Testy reguł; natywne okno oceny | — | 3 |
| ☐ S21-07 | M | Hotfixy z pierwszych 10 dni | Claude | Poprawki wydane w ciągu 48 godzin od zgłoszenia blokera | S21-02 | 6 |
| ☐ S21-08 | M | Codzienne sprawdzanie pulpitu i awarii (15 minut dziennie przez 2 tygodnie) | Ty | Zapis obserwacji w `docs/soft-launch-dziennik.md` | S21-02 | 3 |

### S22 · 23 VIII – 5 IX 2027 · Analiza lejka i strojenie

**Faza:** D. Soft launch · **Twój czas:** 33 h

**Cel:** Wnioski z pierwszych dwóch tygodni, poprawki lejka, strojenie balansu i ekonomii, eksport zapisu, aktualizacje wymuszone.

**Demo na koniec:** Raport „soft launch 1” z listą 10 problemów i poprawkami; zapis przenosi się na drugi telefon.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S22-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S22.md` (5 linii) uzupełniona | — | 2 |
| ☐ S22-01 | M | Analiza D1 i D7 po 2 tygodniach; 10 największych problemów w lejku (samouczek, pierwsza wyprawa, sklep) | Ty | `docs/soft-launch-1.md` | S21-02 | 4 |
| ☐ S22-02 | M | Poprawki lejka: samouczek, pierwsza wyprawa, czytelność zamiarów | Claude | Zmiany wdrożone; porównanie wskaźników przed i po | S22-01 | 6 |
| ☐ S22-03 | M | Strojenie balansu i ekonomii na zmierzonych danych (zmiany tylko w plikach danych) | Claude | Zmiany w `data/*.json` z komentarzem wskaźnika | S22-01 | 5 |
| ☐ S22-04 | M | Eksport i import zapisu (plik lub kod z podpisem); reguły kopii zapasowej Androida i iCloud | Qwen | Przeniesienie profilu na drugi telefon bez utraty Atramentu i odblokowań | — | 5 |
| ☐ S22-05 | M | Zalecana i wymuszona aktualizacja: minimalna wersja w Supabase, ekran aktualizacji, tryb konserwacji | Qwen | Po podniesieniu minimalnej wersji stara aplikacja pokazuje ekran z linkiem do sklepu | — | 4 |
| ☐ S22-06 | C | Przypomnienie o Wyzwaniu Dnia: powiadomienie lokalne (domyślnie wyłączone, jedno dziennie) | Qwen | Włączane w ustawieniach; zero powiadomień bez zgody | — | 3 |
| ☐ S22-07 | M | Wywiady z 5 graczami z Discorda (20 minut): co zrozumieli, co ich zatrzymało | Ty | Notatki w `docs/wywiady.md` | — | 4 |

### S23 · 6–19 IX 2027 · Dopracowanie: udostępnianie, wydajność, błędy, konwersja

**Faza:** D. Soft launch · **Twój czas:** 34 h

**Cel:** Test formatów karty do udostępniania, poprawki dostępności, wydajność na słabych telefonach, komplet ekranów błędów, analiza konwersji.

**Demo na koniec:** Wskaźniki udostępnień i konwersji z propozycją zmian; wszystkie stany błędów mają ekran.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S23-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S23.md` (5 linii) uzupełniona | — | 2 |
| ☐ S23-01 | M | Test trzech formatów karty udostępnianej i zdarzenie „share” (bez treści) | Claude | Porównanie odsetka udostępnień po 10 dniach | — | 4 |
| ☐ S23-02 | M | Poprawki dostępności z audytu S20 (priorytet 1 i 2) | Qwen | Usterki krytyczne i wysokie zamknięte; ponowny test czytnikiem | — | 5 |
| ☐ S23-03 | M | Wydajność: profilowanie na podstawie danych o urządzeniach; tryb oszczędny domyślnie na słabych telefonach | Claude | Wykrywanie klasy urządzenia; 30 kl./s na urządzeniach poniżej progu | — | 5 |
| ☐ S23-04 | M | Komplet ekranów błędów i stanów pustych (brak miejsca, zapis uszkodzony, zakup niedostępny, brak sieci) | Qwen | Lista stanów w `docs/stany.md`, każdy z zrzutem i testem | — | 4 |
| ☐ S23-05 | M | Analiza konwersji do pełnej gry i ścieżki do paywallu; wnioski o cenie i zapowiedziach | Ty | `docs/konwersja.md` | — | 4 |
| ☐ S23-06 | M | Poprawki wg wniosków z konwersji (opis produktu, miejsce zapowiedzi; bez presji) | Claude | Zmiany wdrożone; zasady etyczne z GDD zachowane | S23-05 | 4 |
| ☐ S23-07 | S | Głosowanie społeczności nad nowym symbolem (pilot na Discordzie) | Ty | Wynik zapisany w `docs/glosowanie-1.md` | — | 3 |
| ☐ S23-08 | M | Obsługa i hotfixy tygodniowe | Ty | Odpowiedzi na wszystkie opinie z 7 dni | — | 3 |

### S24 · 20 IX – 3 X 2027 · Bramka 4: wyniki soft launchu

**Faza:** D. Soft launch · **Twój czas:** 32 h · **Wydatki:** Księgowy – druga konsultacja (z rezerwy): ok. 150 zł

**Cel:** Zebrane dane z 8 tygodni, decyzja o premierze, prognoza na zmierzonych liczbach, konsultacja z księgowym, plan zakresu premiery.

**Demo na koniec:** Dokument bramki 4 z tabelą „cel i wynik” oraz decyzją.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S24-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S24.md` (5 linii) uzupełniona | — | 2 |
| ☐ S24-01 | M | Dane z 8 tygodni soft launchu vs cele (D1 ≥ 40%, D7 ≥ 15%, konwersja ≥ 5%, sesje bez awarii ≥ 99,5%, ocena ≥ 4,5) | Ty | `docs/bramka-4.md` z tabelą „cel i wynik” | — | 5 |
| ☐ S24-02 | M | Decyzja bramki 4: premiera, strojenie 2–4 sprinty albo rozmowa z wydawcą (konwersja poniżej 2%) | Ty | Decyzja zapisana wraz ze skutkami dla S25+ | S24-01 | 2 |
| ☐ S24-03 | M | Prognoza premiery na zmierzonych liczbach (zamiana założeń z biznesplanu) | Claude | Zaktualizowany arkusz; próg zwrotu przeliczony | S24-01 | 3 |
| ☐ S24-04 | M | Druga konsultacja – forma na premierę: działalność, VAT w sprzedaży przez Apple i Google, ryczałt lub skala, IP Box, ulga na start | Księgowy | Pisemne wnioski; decyzja o założeniu działalności do S28 | — | 3 |
| ☐ S24-05 | C | Opcjonalnie: lista 5 wydawców mobilnych i szkic oferty | Ty | Tylko jeśli bramka 4 jest poniżej celów | S24-01 | 4 |
| ☐ S24-06 | M | Plan treści premiery z priorytetami M/S/C (które symbole, krainy, ścieżki) | Claude | `docs/zakres-premiery.md` z linią cięcia | S24-01 | 3 |
| ☐ S24-07 | M | Sprawdzenie kwalifikacji do programu Google Play Level Up i potwierdzenie programu Apple dla małych firm | Ty | Statusy zapisane w `docs/sklepy/` | — | 2 |
| ☐ S24-08 | M | Hotfixy i poprawki z danych | Qwen | Lista zamknięta lub przeniesiona do S25 | — | 5 |
| ☐ S24-09 | S | Filmy i społeczność: dwa filmy „Prawdziwe legendy”, odpowiedzi na Discordzie | Ty | Dwa filmy opublikowane | — | 3 |

#### Bramka B4 · koniec S24 · 3 X 2027 — Wyniki soft launchu

| Wskaźnik | Jeśli tak | Jeśli nie |
|---|---|---|
| D1 ≥ 40%, D7 ≥ 15%, konwersja do pełnej gry ≥ 5% (oraz sesje bez awarii ≥ 99,5%, ocena ≥ 4,5). | Premiera globalna w oknie 24 I – ok. 2 III 2028. | Strojenie przez 2–4 sprinty (S26–S29 zamieniają się w strojenie, zakres premiery wg linii cięcia); przy konwersji poniżej 2% rozmowa z wydawcą lub zmiana modelu ceny. |

Po premierze (IV 2028) kolejna decyzja: 850 kupujących (zwrot gotówki) → dodatki i sezony; poniżej → tylko poprawki i decyzja o Steamie lub kolejnym projekcie.

### S25 · 4–17 X 2027 · Rezerwa: folklorysta, grafik, zamrożenie zakresu premiery

**Faza:** E. Do premiery · **sprint rezerwowy** · **Twój czas:** 19 h · **Wydatki:** Folklorysta – druga konsultacja: 500 zł; Grafik – poprawki: 1 000 zł

**Cel:** Recenzja tekstów i zasad nowych bossów, poprawki grafik po soft launchu, zamrożenie zakresu premiery wg bramki 4.

**Demo na koniec:** Zatwierdzony `docs/zakres-premiery.md`; teksty MVP sprawdzone przez folklorystę.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S25-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S25.md` (5 linii) uzupełniona | — | 1 |
| ☐ S25-01 | M | Recenzja tekstów wierzeń z MVP (bossowie, krainy, 12 wydarzeń, 20 zagadek, opisy w Księdze) oraz zasad nowych bossów i elit (Żmij, Weles, Bies, Baba Jaga); lista źródeł do tekstów premiery | Folklorysta | Pisemne uwagi i bibliografia; poprawki MVP wprowadzone (500 zł, reszta puli 1 000 zł) | — | 3 |
| ☐ S25-02 | M | Poprawki grafik po soft launchu i szkice ikon nowych symboli jako wzór dla LoRA | Grafik | Pliki źródłowe; spis wkładu uzupełniony (1 000 zł, reszta puli 4 500 zł) | — | 3 |
| ☐ S25-03 | M | Zaległości i przegląd harmonogramu; zamrożenie zakresu premiery z linią cięcia | Ty | `docs/zakres-premiery.md` zatwierdzony | S24-06 | 6 |
| ☐ S25-04 | M | Założenie działalności gospodarczej, jeśli tak wynika z konsultacji (CEIDG), konto firmowe | Ty | Działalność aktywna albo zapisana decyzja z terminem w S28 | S24-04 | 3 |
| ☐ S25-05 | S | Poprawki i hotfixy po bramce 4 | Qwen | Lista zamknięta lub przeniesiona do S26 | — | 3 |

### S26 · 18–31 X 2027 · Zawartość premiery I: Mróz, Słońce, Góry

**Faza:** E. Do premiery · **Twój czas:** 35 h

**Cel:** Dwa nowe żywioły, trzy nowe formy, kraina Góry z Żmijem i Biesem, nowa struktura wyprawy (dwie losowe krainy z czterech i finał).

**Demo na koniec:** Wyprawa składa się z dwóch losowych krain i finału (tymczasowo zaślepka Nawii); 315 istot do odkrycia.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S26-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S26.md` (5 linii) uzupełniona | — | 2 |
| ☐ S26-01 | M | Żywioły Mróz i Słońce: reguły synergii w danych, haki w kodzie, testy | Claude | Synergie testowane; win-rate 35–65% w nocnych symulacjach | — | 5 |
| ☐ S26-02 | M | Formy Dzik, Sum, Koń: dane, efekty, legendy PL i EN | Qwen | Licznik istot: 7 żywiołów × 9 form × 5 przymiotów = 315; legendy bez pustych pól | S26-01 | 4 |
| ☐ S26-03 | M | Kraina Góry i boss Żmij (zasada od folklorysty z S25) | Claude | Testy zasady; bot rozgrywa walkę | S25-01 | 6 |
| ☐ S26-04 | M | Elita Bies i 6 przeciwników Gór | Qwen | Boty przechodzą krainę z win-rate 40–60% | S26-03 | 4 |
| ☐ S26-05 | M | Struktura wyprawy na premierę: dwie losowe krainy z czterech i finałowa Nawia; generator wypraw i Wyzwanie Dnia dla nowej struktury | Claude | Stare zapisy działają; test 10 000 ziaren: każda wyprawa ma 2 krainy i finał | — | 5 |
| ☐ S26-06 | M | Warstwy dla Mrozu, Słońca, Dzika, Suma, Konia, Gór, Żmija i Biesa (LoRA, wybór, retusz) | Ty | Komplet w stylu bazowym; spis wkładu | — | 3 |
| ☐ S26-07 | M | Muzyka Gór: warianty i pętle w ACE-Step na bazie partii muzyka | Ty | Utwór + pętla bojowa; wpis w spisie wkładu | — | 2 |
| ☐ S26-08 | S | Playtest trzech wypraw z nową zawartością | Ty | `docs/playtest-S26.md` | S26-05 | 4 |

### S27 · 1–14 XI 2027 · Zawartość premiery II: Nawia, Weles, 960 istot

**Faza:** E. Do premiery · **Twój czas:** 35 h

**Cel:** Żywioł Nawia, pięć nowych przymiotów, trzy nowe formy, kraina Nawia z Welesem jako finał, elita Baba Jaga, Księga na 960 stron.

**Demo na koniec:** Pełna wyprawa z finałem Welesa; licznik pokazuje 960 istot.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S27-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S27.md` (5 linii) uzupełniona | — | 2 |
| ☐ S27-01 | M | Żywioł Nawia i 5 nowych przymiotów (Zazdrość, Wierność, Szaleństwo, Spokój, Duma): reguły, dane, testy | Claude | 8 żywiołów × 9 form × 10 przymiotów = 720; win-rate 35–65% w symulacjach | — | 6 |
| ☐ S27-02 | M | Formy Kot, Pająk, Ropucha: dane, efekty, legendy PL i EN | Qwen | Licznik istot = 960; legendy bez pustych pól | S27-01 | 4 |
| ☐ S27-03 | M | Kraina Nawia i boss Weles (finał), zasada walki | Claude | Testy zasady; bot rozgrywa finał | S25-01 | 6 |
| ☐ S27-04 | M | Elita Baba Jaga: kradzież karty, przywołanie sługi, klątwa na Krąg; wagi zależne od liczby kart w ręce | Qwen | Test: im mniej kart gracza, tym częściej klątwa | — | 4 |
| ☐ S27-05 | M | Warstwy dla Nawii, nowych form i przymiotów, Welesa i Baby Jagi (LoRA, wybór, retusz) | Ty | Komplet w stylu bazowym; spis wkładu | — | 3 |
| ☐ S27-06 | M | Muzyka Nawii: motyw finałowy – warianty i pętle w ACE-Step na bazie partii muzyka | Ty | Utwór + pętla bojowa; wpis w spisie wkładu | — | 2 |
| ☐ S27-07 | S | Księga Bestii na 960 stron: filtry (żywioł, forma, przymiot), wirtualizacja listy | Qwen | Przewijanie 960 pozycji w 60 kl./s na telefonie 2021 | S27-02 | 4 |
| ☐ S27-08 | S | Playtest finału | Ty | `docs/playtest-S27.md` | S27-03 | 4 |

### S28 · 15–28 XI 2027 · Ścieżki, Klątwy i materiały sklepowe

**Faza:** E. Do premiery · **Twój czas:** 33 h

**Cel:** Ścieżki Guślarza i Dziada wędrownego, Klątwy 4–10, wpisy w sklepach z zapisami przedpremierowymi, trailer, grafika do sklepów, firma.

**Demo na koniec:** Trzy ścieżki do wyboru, dziesięć poziomów Klątw; strony sklepowe z zapisami przedpremierowymi.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S28-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S28.md` (5 linii) uzupełniona | — | 2 |
| ☐ S28-01 | M | Ścieżka Guślarz: przywoływanie duchów poległych istot (Dziady), talia startowa | Claude | Mechanika + 20 kart + test botów | — | 6 |
| ☐ S28-02 | S | Ścieżka Dziad wędrowny: pieśni wzmacniane kolejnością kart | Claude | Mechanika + 20 kart; test sekwencji | — | 6 |
| ☐ S28-03 | M | Klątwy 4–10: parametry w danych, ekran wyboru, nagrody | Qwen | 10 poziomów; Atrament skaluje się zgodnie z tabelą w danych | S14-06 | 4 |
| ☐ S28-04 | M | Strony w sklepach (PL/EN) pod premierę i zapisy przedpremierowe (Google Play) oraz zamówienia przedpremierowe (App Store) | Ty | Wpisy aktywne; liczba zapisów monitorowana | — | 4 |
| ☐ S28-05 | M | Trailer 30–45 s i zrzuty premiery (nagrywane automatycznie z gry, poprawiane ręcznie) | Ty | Pliki w wymaganych formatach obu sklepów | S28-04 | 5 |
| ☐ S28-06 | M | Grafika do sklepów (finał) i ikona w wariantach sezonowych | Grafik | Komplet plików zgodnych z wymaganiami sklepów (reszta puli 4 500 zł z S25) | — | 3 |
| ☐ S28-07 | M | Założenie działalności i zmiana sprzedawcy w sklepach, jeśli dotąd konta były osobiste | Ty | Wpisy w sklepach zgodne z formą prawną; potwierdzenie od księgowego | S25-04 | 3 |

### S29 · 29 XI – 12 XII 2027 · Balans 960 istot, teksty, regresja, wydajność

**Faza:** E. Do premiery · **Twój czas:** 34 h

**Cel:** Balans wszystkich kombinacji, teksty i źródła premiery, Kręgi i szkielet świąt (do odcięcia), pełna regresja, wydajność z pełną zawartością.

**Demo na koniec:** Raport balansu 960 istot i raport wydajności; regresja zielona.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S29-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S29.md` (5 linii) uzupełniona | — | 2 |
| ☐ S29-01 | M | Nocne symulacje balansu 960 istot i korekty kosztów mocy w danych | Claude | ≥ 95% istot w przedziale win-rate 35–65%; reszta uzasadniona w `docs/balans.md` | — | 6 |
| ☐ S29-02 | M | Teksty premiery: opisy bossów, krain i 30 symboli ze źródłami (lista folklorysty z S25), wersja EN | Claude | Teksty w plikach tłumaczeń; opisy źródeł w Księdze | S25-01 | 5 |
| ☐ S29-03 | C | Kręgi (wersja podstawowa): grupa do 30 osób, kod zaproszenia, wspólna Kronika odkryć, cel tygodniowy | Claude | Dwóch testerów dołącza kodem; Kronika synchronizuje się | — | 8 |
| ☐ S29-04 | M | Pełna regresja: testy E2E dla czterech krain, trzech ścieżek, 10 Klątw i zakupów z atrapą sklepu | Qwen | Regresja w CI poniżej 20 minut, zielona | — | 5 |
| ☐ S29-05 | M | Wydajność premiery: pomiar RAM i klatek na telefonie 2021 z pełną zawartością; rozmiar paczki | Claude | Cel 120 MB, twardy limit 150 MB; 60 kl./s w walce | — | 4 |
| ☐ S29-06 | C | Szkielet świąt sezonowych: kalendarz obrzędowy w danych, odblokowanie datą offline (bez zawartości) | Qwen | Zegar testowy aktywuje wydarzenie | — | 4 |

### S30 · 13–26 XII 2027 · Rezerwa przed premierą

**Faza:** E. Do premiery · **sprint rezerwowy** · **Twój czas:** 14 h

**Cel:** Zaległości, przegląd ryzyk, decyzja o linii cięcia i test premierowy na trzech urządzeniach.

**Demo na koniec:** Lista ryzyk i decyzja o tym, co wypada z premiery, jeśli czas się kończy.

> Sprint przypada na święta: planowane tylko ok. 14 godzin.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S30-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S30.md` (5 linii) uzupełniona | — | 1 |
| ☐ S30-01 | M | Zaległości i przegląd ryzyk premiery; decyzja o linii cięcia | Ty | `docs/ryzyka-premiery.md` z decyzjami | — | 5 |
| ☐ S30-02 | M | Test premierowy: pełne przejście każdą ścieżką na trzech urządzeniach | Ty | Lista błędów z priorytetami | — | 6 |
| ☐ S30-03 | S | Korekta EN nowych tekstów przez ochotników z Discorda | Ty | Poprawki wprowadzone | — | 2 |

### S31 · 27 XII 2027 – 9 I 2028 · Wersja kandydująca i recenzje sklepów

**Faza:** E. Do premiery · **Twój czas:** 35 h · **Wydatki:** Promocja premiery: 300 zł

**Cel:** Zamrożenie zawartości, pełne QA, poprawki, zgłoszenie do recenzji, promocja premiery, kontrola zgodności prawnej.

**Demo na koniec:** Wersja 1.0.0 złożona do recenzji w obu sklepach.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S31-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S31.md` (5 linii) uzupełniona | — | 2 |
| ☐ S31-01 | M | Zamrożenie zawartości, wersja 1.0.0-rc1, lista znanych błędów | Claude | Gałąź release; lista błędów w repozytorium | — | 3 |
| ☐ S31-02 | M | Pełne QA wg listy `docs/qa-premiery.md`: zakupy, przywracanie, rankingi, zapisy, orientacje, tablet, dostępność | Ty | Lista przejęta w 100%, blokery = 0 | S31-01 | 10 |
| ☐ S31-03 | M | Poprawki blokerów wersji kandydującej | Claude | Brak otwartych blokerów | S31-02 | 6 |
| ☐ S31-04 | M | Zgłoszenie wersji 1.0.0 do recenzji Apple i Google z ręcznym wydaniem | Ty | W recenzji lub zatwierdzone; plan na odrzucenie | S31-03 | 3 |
| ☐ S31-05 | M | Promocja premiery: kody dla twórców, informacja prasowa, kalendarz wydarzenia łowieckiego | Ty | Wydano nie więcej niż 300 zł | — | 5 |
| ☐ S31-06 | M | Kontrola zgodności: brak nazw obcych marek, oznaczenie AI w ekranie Autorów, spis wkładu człowieka w repozytorium | Ty | Lista kontrolna prawna; ekran Autorów z oznaczeniem | — | 3 |
| ☐ S31-07 | S | Szablony wydarzeń łowieckich do uruchomienia w 48 godzin po zapowiedziach CDPR (bez nazw i grafik marki) | Ty | 2 szablony w danych, test włączenia | — | 3 |

### S32 · 10–23 I 2028 · Premiera: okno 24 I – ok. 2 III 2028

**Faza:** E. Do premiery · **Twój czas:** 29 h

**Cel:** Poprawki po recenzjach, listy kontrolne, test końcowy wersji z produkcji, wybór dnia premiery, plan pierwszych tygodni.

**Demo na koniec:** Wersja zatwierdzona w sklepach, data premiery wybrana, komunikaty gotowe.

| ID | Pr. | Zadanie | Kto | Kryterium akceptacji | Zależy od | h |
|---|---|---|---|---|---|---|
| ☐ S32-00 | M | Planowanie sprintu, demo na koniec i retrospektywa | Ty | Claude rozbił zadania na specyfikacje; build sprintu zagrany przez ciebie na telefonie; `docs/retro/S32.md` (5 linii) uzupełniona | — | 2 |
| ☐ S32-01 | M | Poprawki po recenzjach sklepów | Claude | Ponowne zgłoszenia złożone w ciągu 24 godzin od odrzucenia | — | 5 |
| ☐ S32-02 | M | Listy kontrolne premiery: strona gry, Discord, lista mailowa, filmy, wsparcie, szablony odpowiedzi, kopie kluczy podpisu | Ty | Każda pozycja potwierdzona | — | 5 |
| ☐ S32-03 | M | Test końcowy wersji z produkcji (wydanie wewnętrzne): zakup, ranking, kod istoty | Ty | Brak błędów blokujących | — | 5 |
| ☐ S32-04 | M | Ustalenie dnia premiery w oknie 24 I – ok. 2 III 2028 (stan recenzji, zapowiedzi CD Projekt Red) | Ty | Data zapisana, komunikat gotowy | — | 2 |
| ☐ S32-05 | S | Plan pierwszych 4 tygodni po premierze: dyżury, hotfixy, odpowiedzi na opinie | Ty | `docs/po-premierze.md` | — | 3 |
| ☐ S32-06 | M | Retrospektywa projektu: koszty vs budżet, decyzje | Ty | `docs/retro-projekt.md` | — | 3 |
| ☐ S32-07 | S | Wideo i posty odliczające do premiery | Ty | Minimum 3 materiały | — | 4 |

## 6. Tabela kontrolna: element aplikacji → sprint

Każdy standardowy element aplikacji ma co najmniej jedno zadanie. Kolumna „Od” pokazuje sprint pierwszej implementacji, „Do” sprint ostatniego zadania, które go dotyka.

| Element aplikacji | Od | Do | Zadania |
|---|---|---|---|
| Splash natywny i ekran ładowania | S9 | S9 | S09-06 |
| Ikona aplikacji (adaptacyjna) i nazwa pod ikoną | S9 | S12 | S09-06, S12-10 |
| Ekran powitalny przy pierwszym uruchomieniu (język, zgody, start) | S9 | S19 | S09-06, S19-02 |
| Zgody: polityka prywatności, regulamin, analityka, raporty awarii | S19 | S19 | S19-01, S19-02 |
| Samouczek (pierwsza walka prowadzona) i podpowiedzi | S11 | S11 | S11-06 |
| Menu główne i nawigacja | S9 | S9 | S09-07 |
| Przygotowanie wyprawy (ścieżka, Klątwa, talia) | S14 | S28 | S14-06, S17-08, S28-01, S28-02, S28-03 |
| Mapa wyprawy | S8 | S8 | S08-02, S08-03 |
| Ekran walki | S4 | S9 | S04-01, S09-05 |
| Pauza i wyjście z wyprawy | S11 | S11 | S11-07 |
| Nagrody i podsumowanie wyprawy | S4 | S18 | S04-08, S06-01, S14-05, S18-07 |
| Warsztat | S3 | S7 | S03-07, S06-02, S07-05 |
| Księga Bestii | S11 | S27 | S11-02, S27-07 |
| Wyzwanie Dnia i ranking | S16 | S26 | S16-03, S18-01, S18-03, S26-05 |
| Ustawienia | S9 | S19 | S09-08, S19-02 |
| Muzyka, dźwięki, miksowanie, zachowanie w tle | S6 | S27 | S06-04, S09-03, S10-03, S16-04, S26-07, S27-06 |
| Haptyka | S9 | S9 | S09-04 |
| Sklep, paywall, przywracanie zakupów | S17 | S17 | S17-01, S17-02, S17-03 |
| Zakupy na kontach dzieci (mechanizmy rodzinne sklepów) | S17 | S17 | S17-05 |
| Udostępnianie karty, kod, QR, wklejanie kodu | S3 | S23 | S03-03, S11-03, S11-04, S18-03, S23-01 |
| Linki do wyzwań od znajomych | S18 | S18 | S18-05 |
| Zapis gry: autozapis, wznowienie, migracje, naprawa | S7 | S26 | S07-04, S08-03, S13-07, S22-04, S26-05 |
| Eksport i import zapisu (nowy telefon) | S22 | S22 | S22-04 |
| Tło, przerwania, orientacja, safe area, przycisk Wstecz | S1 | S9 | S01-08, S09-03, S09-05, S09-07 |
| Układ tabletu i składanych ekranów | S9 | S31 | S09-05, S11-02, S31-02 |
| Dostępność (skala tekstu, kontrast, ikony, czytnik ekranu) | S4 | S31 | S04-04, S09-08, S20-03, S23-02, S31-02 |
| Lokalizacja PL/EN | S1 | S30 | S01-06, S03-04, S09-08, S14-03, S14-09, S15-05, S16-09, S17-06, S17-07, S18-09, S19-08, S20-04, S20-08, S29-02, S30-03 |
| Autorzy, licencje, oznaczenie AI, wersja | S1 | S31 | S01-09, S07-01, S09-01, S11-08, S31-06 |
| Pomoc, FAQ, zgłoszenie błędu, kontakt | S12 | S23 | S12-07, S21-04, S21-05, S23-08 |
| Prośba o ocenę w sklepie | S21 | S21 | S21-06 |
| Zalecana i wymuszona aktualizacja, tryb konserwacji | S22 | S22 | S22-05 |
| Stan offline i kolejka wyników | S18 | S18 | S18-04, S18-06 |
| Analityka i raportowanie awarii (za zgodą) | S5 | S23 | S05-05a, S05-05b, S19-03, S21-02, S23-01 |
| Powiadomienia lokalne (opcjonalne) | S22 | S22 | S22-06 |
| Ekrany błędów i stany puste | S13 | S23 | S13-07, S17-02, S18-06, S23-04 |
| Usuwanie danych i prawa RODO | S18 | S19 | S18-01, S19-02, S19-04 |
| Wydajność i tryb oszczędny | S3 | S29 | S03-09, S04-05, S07-03, S09-06, S09-08, S10-05, S12-02, S12-03, S23-03, S27-07, S29-05 |
| Strony w sklepach i materiały | S17 | S28 | S17-05, S19-07, S21-01, S28-04, S28-05 |
| Formularze sklepów (prywatność, wiek, IARC) | S13 | S31 | S13-02, S19-01, S19-05, S31-04 |
| Podpisywanie, kanały wydań, CI/CD, wersjonowanie | S1 | S32 | S01-01, S01-07, S01-08, S04-06, S05-03, S07-03, S13-01, S13-02, S13-03, S19-06, S20-07, S21-01, S24-07, S31-01, S31-04, S32-01 |
| Wersja web (demo) i strona gry | S5 | S12 | S05-03, S10-02, S12-01, S12-02 |
| Kręgi (grupy) | S29 | S29 | S29-03 |
| Święta sezonowe (szkielet) | S29 | S31 | S29-06, S31-07 |

## Dodatek A. Struktura repozytorium

```text
bestiariusz/
  src/core/       czysta logika gry bez PixiJS i DOM: stan, reducer, RNG, mapa, balans
  src/data/       dane: symbole, karty, bossowie, wydarzenia (JSON + schematy)
  src/game/       sceny PixiJS: walka, mapa, Warsztat, Księga Bestii
  src/ui/         nakładka HTML/CSS: menu, ustawienia, sklep, zgody, pomoc
  src/platform/   opakowania Capacitor: zakupy, haptyka, zapis, udostępnianie, linki, powiadomienia
  src/i18n/       pl.json, en.json, konfiguracja ICU
  server/         Supabase: migracje SQL, funkcje, polityki dostępu (RLS)
  tools/          qwen-run.mjs, symulacje balansu, zrzuty ekranu, pulpit soft launchu
  tasks/          specyfikacje zadań dla Qwena (<ID>.md)
  tests/          testy jednostkowe i E2E (Playwright: Chromium i WebKit)
  art/  audio/  legal/  marketing/
  docs/           ten plik, bramki, retrospektywy, decyzje, ai-provenance.md
```

## Dodatek B. Szablon specyfikacji zadania dla Qwena

```text
# S07-04 — Zapis gry v1
Plik do edycji: src/platform/save.ts   (jedyny plik, który wolno zmienić)
Cel: jedno zdanie, co moduł robi i kto go używa.
Sygnatury (nie zmieniaj): eksportowane typy i funkcje ze szkieletu.
Zasady: funkcje czyste, bez Math.random i Date.now, bez nowych zależności, tylko import type dla typów.
Przypadki brzegowe: lista z przykładami wejście → wynik.
Testy: tests/S07-04.test.ts (nie edytuj).
Gotowe, gdy: node --test, tsc --noEmit i lint przechodzą bez błędów.
```

## Dodatek C. Godziny

| Faza | Sprinty | Godziny planowane | Z tego sprinty rezerwowe |
|---|---|---|---|
| A. Prototyp | S1–S6 | 178,5 | 16 |
| B. Vertical slice | S7–S12 | 186,5 | 20 |
| C. MVP | S13–S20 | 252,5 | 46,5 |
| D. Soft launch | S21–S24 | 133 | 0 |
| E. Do premiery | S25–S32 | 234 | 33 |
| **Razem** | S1–S32 | **984,5** | |

Dostępne: 32 sprinty × ok. 35 h, czyli ok. 1 100 h. Zapas planu: ok. 116 h na zadania, które urosną.

## Dodatek D. Odchylenia od biznesplanu (do zatwierdzenia)

Przy rozpisywaniu zadań musiałem doprecyzować kilka miejsc, w których biznesplan był niespójny albo niekompletny.

1. **Prawnik:** umowa z grafikiem jest potrzebna przed pierwszym zleceniem (S7), a biznesplan ustawia prawnika dopiero w S11. Plan dodaje w S7 krótką konsultację szablonu (300 zł); pozycja 1 500 zł dzieli się na S7 (300 zł), S11 (500 zł) i S19 (700 zł).
2. **Księgowy:** biznesplan wymaga pytań do księgowego przed soft launchem, ale nie ma na to pozycji. Plan zakłada dwie konsultacje (S20 i S24, razem ok. 400 zł) z rezerwy 730 zł.
3. **Bramka 2** w biznesplanie ma dwa wskaźniki o różnych terminach (wydajność w S12, społeczność po 6 tygodniach, czyli w S15), a konta w sklepach są w S13. Plan dzieli bramkę na dwie części: konta powstają po wydajności, a słabe wyniki społeczności zwiększają udział marketingu.
4. **Grafik i muzyk po S12:** nowe krainy powstają z warstw generowanych w FLUX.2 klein 4B z LoRA i z pętli ACE-Step na bazie nagranych partii; grafik wraca w S25 i S28 (poprawki, grafika do sklepów). Zgadza się to z budżetem (4 500 zł i 2 500 zł), ale oznacza, że po S12 sam wybierasz i retuszujesz wyniki.
5. **Subskrypcja Claude Max:** miesiące Max (S13–S14, S17–S18, S26–S27) to propozycja; biznesplan mówi tylko o trzech miesiącach w okresach największej pracy.
6. **Kręgi i święta sezonowe** mają priorytet C: GDD zalicza je do rzeczy poza MVP, a plan premiery nie ma dla nich zapasu czasu. Wypadają pierwsze, jeśli bufory się wyczerpią.
7. **Poziomy Klątw:** MVP ma 3 z 10 (poziomy 1–3), pozostałe 4–10 dochodzą w S28.

## Dziennik zmian planu

| Data | Zmiana |
|---|---|
| 24 X 2026 | Wersja 1.0: 32 sprinty, 4 bramki, tabela kontrolna elementów aplikacji. |
| 24 X 2026 | Sprint 2: ukończone S02-01 … S02-09 (kod walki, moduły Qwena, test różnicowy, reducer, bot i `npm run sim`). Synchronizacja planu z decyzjami D11–D21 przy zamknięciu sprintu (S02-00). |
| 24 X 2026 | Synchronizacja po Sprincie 2 (decyzje D11–D21 z `docs/superpowers/plans/2026-10-24-sprint-2-walka.md`): S02-01 jawne wartości zamiast snapshotów; kryterium „ręka ≤ 5” z S02-04 do S02-03; S02-06 akcje `direct`; S02-07 scenariusze K1–K10 i R1–R7 oraz Obrzęd raz na walkę; S02-11 ścieżka `src/data/balance.json`; S03-01 zastępuje przejściowe `symbols.json`. |
| 24 X 2026 | Sprint 2: S02-10 zamknięte bez uwag (decyzja właściciela; kryterium „minimum 10 uwag” świadomie pominięte, zapis w `docs/papier-S02.md`), zasady walki v0.1 zatwierdzone. S02-11: wartości bazowe zatwierdzone bez zmian (gracz 40 zdrowia, Leszy 160; bot 55,3% wygranych). |
| 25 X 2026 | Sprint 3: ukończone S03-01 … S03-08 (dane MVP z efektami, cztery moduły Qwena za pierwszym podejściem, test różnicowy, system efektów, Warsztat, `npm run balance`). S03-01b: Leszy 380 zdrowia, tabela efektów i odczytanie Gromu zatwierdzone, reguła D22 zostaje. Synchronizacja opisów zadań z decyzjami D22–D32 przy zamknięciu sprintu (S03-00). |
| 25 X 2026 | Synchronizacja po Sprincie 3 (decyzje D22–D32 z `docs/superpowers/plans/2026-10-24-sprint-3-dane-i-warsztat.md`): S03-01 nocny test budżetu to zwykły test jednostkowy (D32), efekty symboli w `docs/efekty-symboli.md` (D23); S03-05 scenariusze 1–10 w `tests/combat/effects.test.ts` i E1–E10 w zasadach walki; S03-06 test wg `docs/efekty-symboli.md`, zależność S03-01 zamiast S03-05 (D24, D25); S03-07 zwrot karty i reszty Atramentu, talia w stanie przebiegu w S06 (D30); S03-08 zadanie bez słowa „nocny”, polecenie `npm run balance` i przedział 35–65% (D27). Zdrowie Leszego 160 → 380 (Z14, S03-01b); reguła D22 (niewydany budżet mocy daje zdrowie) i dane efektów zastępują opis z GDD. |
| 25 X 2026 | Rezygnacja z zapisywania godzin faktycznych: usunięty `docs/log-godzin.csv` i wszystkie kroki „uzupełnij log godzin” (S01-12, S07-09, S32-06, zadania -00, definicja ukończenia). Kolumna `h` zostaje jako szacunek planu. |
| 25 X 2026 | Sprint 4: ukończone S04-01 … S04-05, S04-07, S04-08 (warstwa `src/view`, pięć modułów Qwena, test różnicowy, pętla gry, ekran walki i wyniku, testy E2E w Chromium). Odstępstwa: S04-03 grafiki zastępcze wektorowe zamiast atlasu (D38); S04-04 wielokąty w danych zamiast SVG; S04-06 tylko Chromium (D39), wzorce zrzutów z CI, wykonawca Claude zamiast Qwena (to klej E2E). Otwarte: S04-06 (wzorce zrzutów po pierwszym biegu CI), S04-09 i S04-00. |
| 25 X 2026 | Sprint 4: S04-00 i S04-09 zaliczone decyzją właściciela (bez playtestu na liście 20 pozycji i bez pomiaru FPS; punkt odniesienia klatek na A56 nadal nieznany). Otwarte: S04-06 krok 3 (wzorce zrzutów z CI) i zielone CI gałęzi sprintu. |
| 25 X 2026 | Porządki: odhaczone S01-00 … S01-12 (w tym S01-01 … S01-09, S01-11 z dowodami: repozytorium, CI, retro, `gdd-mvp.md`), S02-00 i S03-00. Sprint 5: S05-05 rozbite na S05-05a (Qwen) i S05-05b (Claude), dodane S05-06; plan w `docs/superpowers/plans/2026-10-25-sprint-5-rezerwa-i-testy-bramki-1.md` (decyzje D45–D49). Zaległości S03-09 i S03-10 trafiają do `docs/zaleglosci.md`. |
