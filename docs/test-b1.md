# Test bramki 1 — plan (S05-04, szkic Claude'a do akceptacji)

Bramka B1 (koniec S06): **co najmniej 7 z 10 testerów chce grać dalej** po 30 minutach gry. Ten dokument opisuje, jak to zmierzyć. Szkic: Claude (Anthropic), Claude Sonnet 5.5, 25 X 2026; zakres, pytania i kryteria zatwierdza właściciel.

## Kto

10 osób, w tym **co najmniej 3 bez doświadczenia z deckbuilderami** (gry typu Slay the Spire, Hearthstone, Monster Train). Reszta: osoby grające w gry mobilne. Nie rekrutuj samych znajomych z branży. Listę z nazwiskami i terminami trzymaj poza repozytorium (jest publiczne); do repozytorium trafiają tylko liczby.

## Co dostaje tester

Link do strony `…/testy/` (instrukcja, gra w przeglądarce, APK). Bez instalatora deweloperskiego. Wersja gry na dzień testu ma numer w `wersja.txt`.

## Scenariusz 30 minut

| Minuty | Co | Uwagi prowadzącego |
|---|---|---|
| 0–3 | Powitanie, zgoda na notatki, „testujemy grę, nie ciebie”, prośba o myślenie na głos | Nie tłumacz zasad, nie pokazuj gry |
| 3–25 | Swobodna gra od otwarcia linku | Notuj bez podpowiadania: gdzie się zatrzymuje, co dotyka na próżno, co mówi. Pomagaj tylko, gdy coś się zepsuło (zawieszenie, biała strona) |
| 25–28 | Eksport danych (przycisk „Zapisz dane testu” na ekranie wyniku) i wysłanie ich prowadzącemu | Sprawdź, czy tester sam znalazł przycisk |
| 28–30 | Ankieta (poniżej) | Tester wypełnia sam |

## Co notujesz (bez podpowiadania)

1. Czas do pierwszego zagranego zaklęcia i do pierwszej istoty w Kręgu.
2. Czy zrozumiał zamiar wroga (ikona nad Leszym) bez pytania.
3. Czy dotknięciem trafia karty z brzegów ręki.
4. Momenty znudzenia, frustracji i uśmiechu (zdanie, które padło).
5. Czy skończył pierwszą walkę i czy chciał drugą.

## Ankieta (formularz bez danych osobowych)

Bez imienia, e-maila i numeru telefonu; tester dostaje numer od 1 do 10. Pytania:

1. **Czy chcesz grać dalej?** Zdecydowanie nie / Raczej nie / Raczej tak / Zdecydowanie tak. *(Wskaźnik bramki: „tak” = dwie ostatnie odpowiedzi.)*
2. Co było najbardziej niejasne? (otwarte)
3. Co było najlepsze? (otwarte)
4. Długość walki: za krótka / w sam raz / za długa.
5. Czy rozumiałeś, co robi Leszy w swojej turze? Tak / Częściowo / Nie.
6. Czy karty w ręku dało się dotknąć wygodnie? Tak / Czasem nie trafiałem / Nie.
7. Jak często grasz w gry karciane? Nigdy / Rzadko / Regularnie.
8. Jaki masz telefon (model)? (otwarte, potrzebne do wydajności)

## Dane z gry

Plik z przycisku „Zapisz dane testu”: czas walk, liczba tur, wynik. Analiza w S06-06 razem z ankietą i notatkami. Zgoda: tester wie z instrukcji, jakie dane zbiera gra i że wysyła je sam.

## Do uzupełnienia przez właściciela

- [ ] Lista 10 testerów z terminami (S05-02)
- [ ] Formularz założony; link do ankiety wklejony tutaj: ___
- [ ] Zatwierdzone: ___ (data)
