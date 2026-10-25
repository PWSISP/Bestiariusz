# Wyprawa (prototyp S06)

Stan na 25 X 2026. Opis pętli, którą testerzy zagrają w bramce 1, i liczby, które można stroić po testach (S06-08). Kod: `src/core/run/`, `src/game/game.ts`, `src/game/screens/{route,reward,workshop}-screen.ts`. Dane: blok `expedition` w `src/data/balance.json`.

## Pętla

1. **Trasa**: cztery walki w stałej kolejności, ostatnia to boss. Na ekranie: zdrowie, Atrament, wielkość talii, przyciski „Do walki” i „Warsztat”, przełączniki efektów.
2. **Walka** z talią wyprawy, zdrowiem przeniesionym z poprzedniej walki i wrogiem z kolejnego etapu. Ziarno walki to `deriveSeed(ziarno wyprawy, numer etapu)`.
3. **Po wygranej**: zdrowie rośnie o `healBetween` (nie ponad maksimum), Atrament o `inkPerWin`. Ekran **nagrody**: 3 różne karty z puli, wybierasz jedną albo „Pomiń”. Ta sama wyprawa (to samo ziarno) daje te same propozycje.
4. **Warsztat** (z trasy, między walkami): trzy symbole, podgląd istoty i ceny, „Stwórz”. Karta trafia do talii, Atrament maleje. W prototypie odblokowane są wszystkie symbole (5 żywiołów, 6 form, 5 cech); odblokowywanie przyjdzie później (D53).
5. **Koniec**: porażka w dowolnej walce kończy wyprawę; wygrana z Leszym też. Ekran wyniku ma przycisk „Nowa wyprawa”.

Wyprawa trwa 4 walki po ok. 5–18 tur każda: dla człowieka 9–10 minut.

## Wrogowie

| Etap | Wróg | Zdrowie | Odporny na | Słaby na | Charakter |
|---|---|---|---|---|---|
| 1 | Utopiec | 100 | woda | grom | słabe ciosy (3), tarcza 6, od 2 istot na stole „wciągnięcie” 2×2 |
| 2 | Strzyga | 120 | wiatr | ogień | cios 5, wysysanie (kradzież karty + 2), poniżej połowy zdrowia „wrzask” z tarczą 8 |
| 3 | Południca | 150 | ogień | woda | kosa 6, upał 2×3 pomija blok, od 2 istot klątwa i cios 2 |
| 4 | Leszy | 380 | patrz `zasady-walki.md` | | bez zmian względem S04 |

## Liczby do strojenia (`balance.json` → `expedition`)

| Pole | Wartość | Co zmienia |
|---|---|---|
| `healBetween` | 12 | zdrowie odzyskane po wygranej walce |
| `rewardChoices` | 3 | ile kart w ofercie |
| `rewardPool` | 10 kart | 6 zaklęć (Iskra, Piorun, Źródło, Podmuch, Skała, Ognisko) i 4 istoty (po jednej na żywioł) |
| `startInk`, `inkPerWin` | 12, 12 | po pierwszej wygranej starcza na najtańszą istotę (24 Atramentu, np. Woda-Kruk-Smutek) |

## Pomiar botem (chmura, 25 X 2026)

500 wypraw bota z losowym wyborem nagrody, bez Warsztatu (`src/core/sim/run-sim.ts`, ziarna 20261102 + i). Odsetek wypraw, które wygrały co najmniej n walk: **1,00 / 1,00 / 1,00 / 0,93 / 0,13**. Czyli bot pokonuje trzy pierwsze etapy prawie zawsze, a wyprawę kończy w 13%. Spadek na bossie wynika z rozcieńczenia talii przypadkowymi nagrodami; człowiek wybiera i korzysta z Warsztatu, więc to dolne ograniczenie, nie prognoza. **Ryzyko:** jeśli testerzy będą przegrywać z Leszym masowo, pokrętła w tabeli wyżej są pierwszym krokiem w S06-08.

## Ograniczenia prototypu

- Brak zapisu wyprawy: zamknięcie aplikacji kończy ją (zapis gry to S07).
- Grafiki nowych wrogów to proste kształty wektorowe (jak w D38).
- Dźwięki są syntezowane (`docs/dzwieki.md`).
- `?duel=1` (tylko build deweloperski) włącza dawny pojedynek z Leszym, na którym stoją testy walki.
