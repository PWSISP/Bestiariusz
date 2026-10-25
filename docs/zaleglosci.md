# Zaległości z Sprintów 1–4 (S05-01)

Stan na 25 X 2026. Lista powstała z retrospektyw S01–S04 i z `docs/plan-sprintow.md`. Dla każdej pozycji wybierz: **zrobić teraz**, **przenieść** (z uzasadnieniem i sprintem) albo **skreślić** (z uzasadnieniem). Kryterium S05-01: lista pusta albo każda pozycja przeniesiona z uzasadnieniem.

| # | Skąd | Pozycja | Propozycja Claude'a | Decyzja |
|---|---|---|---|---|
| 1 | S03-09, retro S03 | Telefon (A56): model, cena, Android, FPS na ekranie testowym zapisane w retro S03 (sekcja „Telefon”) | **Zrobić teraz, 10 min.** Telefon masz, brakuje liczb. Wpisz do retro S03 model, cenę, wersję Androida i FPS (patrz pozycja 2) | ☐ |
| 2 | S04-09, retro S04 | Pomiar klatek na A56 (`?fps=1`, walka z trzema istotami): FPS i p95. Bez tej liczby nie ma punktu odniesienia do bramki 2 (60 kl./s) | **Zrobić teraz, 10 min.** Otwórz grę w przeglądarce z `?fps=1` (na stronie testowej po S05-03: `…/?fps=1`), zagraj jedną walkę, wpisz FPS i p95 do retro S04 pkt 4 | ☐ |
| 3 | S03-10 | `docs/balans-notatki.md`: 10 najciekawszych i 10 najnudniejszych kombinacji istot | **Przenieść do S06-02** (Warsztat na ekranie: wtedy kombinacje da się wybrać palcem, nie z CSV). Uzasadnienie: dziś notatki powstałyby z tabeli, a nie z gry; 13 istot z flagą `low` i tak czeka na strojenie po testach bramki 1 | ☐ |
| 4 | S04-06 krok 3 | Wzorce zrzutów wizualnych z CI zatwierdzone, drugi bieg CI zielony | Wzorce `*-chromium-linux.png` leżą już w repozytorium. **Potwierdź:** CI na `main` zielone z `visual.spec.ts` | ☐ |
| 5 | Retro S01, S02, S03, S04 | „Przed tagiem”: `npm run lint`, `typecheck`, `npm test`, `build` zielone i CI zielone na gałęzi sprintu; tagi `s02-done`, `s03-done`, `s04-done` | **Zrobić teraz.** `git tag` pokaże, których brakuje; po scaleniu gałęzi i zielonym CI dostawiasz brakujące | ☐ |
| 6 | Retro S02 5(c) | Drobiazgi z recenzji S02 (komunikaty `sim --help`, błąd zapisu CSV, `reduce` z nieznaną akcją, `intent.ts` i `ritual.ts` bez komunikatów błędów…) | **Skreślić** zgodnie z decyzją z 24 X 2026 („nie wracamy bez nowego powodu”); wracają tylko, gdy któryś przeszkodzi | ☐ |
| 7 | Retro S03 5(a) | 13 istot z flagą `low` (zacząć od Węża i Kruka) | **Przenieść do S06-08** (naprawa problemów po teście): strojenie ma sens po tym, jak testerzy powiedzą, co boli | ☐ |
| 8 | Retro S03 5(b) | Teksty trzech legend specjalnych (`legend.special.*`) i ceny Warsztatu (`emberCost` 2, `inkPerPower` 4) to szkice (D29, D31) | **Przenieść do S06-02** (ekran Warsztatu) | ☐ |
| 9 | Retro S03 5(e) | Przykład w `README.md` odtwarza stare zdrowie Leszego (160 zamiast 380) | **Zrobić teraz, 2 min:** poprawić przykład (Claude Code, jednym commitem) | ☐ |
| 10 | Retro S03 4(a), 5(d) | Walki trwają ok. 18 tur; jeśli męczą, wariant z niższym zdrowiem Leszego (Z14) | **Przenieść do S06-05** jako pytanie do testerów (ankieta: „walka była za długa / w sam raz / za krótka”) | ☐ |
| 11 | Retro S04 5(b) | Przekroczenia czasu przy `page.goto` na zimnym serwerze w E2E | Zrobione w S05-06 (rozgrzewka serwera) | ☑ |
| 12 | Retro S04 4 | Brak `docs/playtest-S04.md` (20 pozycji) | **Skreślić:** zaliczone decyzją właściciela 25 X 2026; uwagi z gry zgłaszasz na bieżąco | ☐ |

Po wypełnieniu kolumny „Decyzja” przenieś pozycje „przenieść” do wierszy właściwych zadań w `docs/plan-sprintow.md` (kolumna „Kryterium akceptacji” lub nowy wiersz) i dopisz wpis do dziennika zmian.
